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

        // Validação básica do payload
        if (!payload || typeof payload !== 'object') {
            console.error('[WEBHOOK] Payload vazio ou inválido');
            return new Response(JSON.stringify({ error: 'Payload inválido' }), { status: 400 });
        }

        // Parsing flexível (Kiwify envia o pedido em 'order' ou root)
        let order = payload.order || (payload.webhook_event_type ? payload : null);

        if (!order) {
            console.error('[WEBHOOK] Payload sem dados de pedido:', JSON.stringify(payload).slice(0, 200));
            return new Response(JSON.stringify({ error: 'Dados do pedido não encontrados' }), { status: 400 });
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
                // ✅ FIX: usa listUsers em vez de generateLink para NÃO disparar email extra
                // generateLink({ type: 'magiclink' }) envia email automático e consome o rate limit!
                console.log(`Usuário já existe ou erro: ${createError.message}. Recuperando ID via listUsers...`);
                const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();

                const existingUser = listData?.users?.find(u => u.email === customerEmail);
                if (!existingUser) throw new Error(`Falha ao recuperar usuário existente: ${createError.message}`);

                userId = existingUser.id;
                console.log(`[OK] Usuário existente recuperado: ${userId} (sem enviar email)`);
            } else {
                userId = newUser.user.id;
                console.log(`Novo usuário criado: ${userId}. Enviando email de redefinição de senha...`);

                const redirectURL = `${siteUrl.replace(/\/$/, '')}/update-password`;

                // Envia o email de "resetar senha", que serve tanto para CRIAR a primeira senha
                // quanto para redefinir. É o único email enviado pelo webhook.
                const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(customerEmail, {
                    redirectTo: redirectURL,
                });

                if (resetError) {
                    console.error(`[ALERTA] Falha ao enviar email para ${customerEmail}: ${resetError.message}. O aluno pode usar "Primeiro acesso" na tela de login.`);
                } else {
                    console.log(`[OK] E-mail de redefinição enviado para: ${customerEmail}`);
                }
            }

            const rawProductId = String(order?.Product?.product_id || order?.product_id || payload?.product_id || 'manual');
            const productName = String(order?.Product?.product_name || order?.product_name || payload?.product_name || 'Produto');

            // 3. Garantir Perfil Base (Legacy constraint)
            const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
                id: userId,
                product_id: 'main_product',
                product_name: productName,
                subscription_status: 'active',
                payment_provider: 'kiwify',
                kiwify_subscription_id: subscriptionId,
                subscription_period_end: expiryDate ? new Date(expiryDate).toISOString() : null,
                updated_at: new Date().toISOString()
            }, { onConflict: 'id,product_id' });

            if (profileError) throw profileError;

            // 4. Mapear Pós-Compra para a nova Tabela de Cursos (user_courses)
            const { data: matchedCourses, error: coursesQueryError } = await supabaseAdmin
                .from('courses')
                .select('id, title, kiwify_product_ids');

            if (coursesQueryError) console.error(`[ERRO] Falha ao buscar cursos: ${coursesQueryError.message}`);

            let coursesAssigned = 0;
            if (matchedCourses && matchedCourses.length > 0) {
                for (const course of matchedCourses) {
                    if (course.kiwify_product_ids && course.kiwify_product_ids.includes(rawProductId)) {
                        await supabaseAdmin.from('user_courses').upsert({
                            user_id: userId,
                            course_id: course.id,
                            expires_at: expiryDate ? new Date(expiryDate).toISOString() : null
                        }, { onConflict: 'user_id,course_id' });
                        coursesAssigned++;
                        console.log(`Curso "${course.title}" liberado! (Matches ID: ${rawProductId})`);
                    }
                }
            }

            if (coursesAssigned === 0) {
                console.error(`[ALERTA] Product ID "${rawProductId}" não está vinculado a nenhum curso. O aluno ${customerEmail} não recebeu acesso a cursos. Configure o ID do produto no Painel Admin > Cursos.`);
            } else {
                console.log(`[OK] ${coursesAssigned} curso(s) liberado(s) para ${customerEmail}`);
            }

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
