import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const siteUrl = Deno.env.get('SITE_URL') ?? 'https://meusaas.vercel.app';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
    // CORS Preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    try {
        const payload = await req.json();

        // Parsing flexível (Kiwify envia o pedido em 'order' ou root)
        let order = payload.order || (payload.webhook_event_type ? payload : null);

        if (!order) {
            console.error('Payload inválido: Pedido não encontrado.');
            return new Response('Payload inválido', { status: 400 });
        }

        const eventType = payload.webhook_event_type || order.order_status;
        const customerEmail = (order.Customer?.email || '').replace(/\s/g, '');
        const customerName = order.Customer?.full_name || 'Cliente';
        const subscriptionId = order.subscription_id || order.order_id || 'manual';

        console.log(`--- [WEBHOOK] Evento: ${eventType} | Email: ${customerEmail} ---`);

        if (eventType === 'order_approved' || order.order_status === 'paid') {
            const expiryDate = order.Subscription?.next_payment || order.order_approved_date;

            if (!customerEmail) throw new Error('Email do cliente ausente');

            let userId: string;

            // 1. Tentar criar usuário diretamente
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: customerEmail,
                email_confirm: true,
                user_metadata: { name: customerName, source: 'kiwify' }
            });

            if (createError) {
                console.log(`Usuário já existe ou erro: ${createError.message}. Recuperando ID...`);
                const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
                    type: 'magiclink',
                    email: customerEmail
                });

                if (!linkData?.user) throw new Error(`Falha ao recuperar usuário: ${createError.message}`);
                userId = linkData.user.id;
            } else {
                userId = newUser.user.id;
                console.log(`Novo usuário criado: ${userId}. Enviando Reset Password...`);

                const redirectURL = `${siteUrl.replace(/\/$/, '')}/update-password`;

                const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(customerEmail, {
                    redirectTo: redirectURL,
                });

                if (resetError) {
                    console.error(`[ERRO ENVIO E-MAIL]: ${resetError.message}`);
                } else {
                    console.log(`E-mail de reset enviado com sucesso para: ${customerEmail}`);
                }
            }

            // 3. Garantir Perfil e Data de Expiração
            const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
                id: userId,
                subscription_status: 'active',
                payment_provider: 'kiwify',
                kiwify_subscription_id: subscriptionId,
                subscription_period_end: expiryDate ? new Date(expiryDate).toISOString() : null,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

            if (profileError) throw profileError;
            console.log(`Acesso garantido para ${userId} na Kiwify.`);

        } else if (eventType === 'order_refunded' || eventType === 'chargeback' || eventType === 'subscription_canceled') {
            console.log(`Revogando acesso: ${subscriptionId}`);
            await supabaseAdmin
                .from('profiles')
                .update({ subscription_status: 'inactive' })
                .eq('kiwify_subscription_id', subscriptionId);
        }

        return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (err: any) {
        const msg = err?.message || 'Erro desconhecido';
        console.error(`[ERRO]: ${msg}`);
        return new Response(JSON.stringify({ error: msg }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
});
