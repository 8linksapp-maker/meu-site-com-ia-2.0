import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseKey = Deno.env.get('SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
// Defina essa variável SITE_URL no seu painel Supabase > Edge Functions > Secrets
// Ex: https://meusaas.vercel.app para enviar os clientes para a porta da frente
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

            // 1. Tentar criar usuário diretamente (Já confirmado para evitar travas)
            // Se o 'password' não for enviado, o novo motor do Supabase enxerga como "Invite" silencioso e dispara email inoportuno.
            // Geramos uma senha forte aleatória, confirmamos o email, e deixamos o restPassword assumir a frente depois.
            const tempPassword = crypto.randomUUID() + 'A!1';
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: customerEmail,
                password: tempPassword,
                email_confirm: true,
                user_metadata: { name: customerName, source: 'kiwify' }
            });

            if (createError) {
                console.log(`Usuário já existe. Recuperando ID...`);
                // Geramos um link (magiclink) apenas para capturar o objeto do usuário e o ID silenciosamente
                const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
                    type: 'magiclink',
                    email: customerEmail
                });

                if (!linkData?.user) throw new Error(`Falha ao recuperar usuário: ${createError.message}`);
                userId = linkData.user.id;
            } else {
                userId = newUser.user.id;
                console.log(`Novo usuário criado: ${userId}`);

                // 2. DISPARO DO E-MAIL DE ACESSO OFICIAL DO SUPABASE (Reset Password para o /login)
                console.log(`Enviando e-mail de acesso via Reset Password para: ${siteUrl}`);
                const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(customerEmail, {
                    redirectTo: siteUrl,
                });
                if (resetError) {
                    console.warn("Aviso: Falha ao enviar e-mail de reset (Rate Limit/Spam), mas seguindo o processo de cadastro...", resetError.message);
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

        } else if (eventType === 'subscription_canceled') {
            // Cancelamento apenas desativa a renovação, o acesso ao app quem manda é o 'subscription_period_end'
            // Os repositórios e a Vercel continuam intactos.
            console.log(`Assinatura Canceada (Renovação Desligada): ${subscriptionId}. O site do cliente fica vivo e o acesso ao painel continuará até o vencimento.`);

        } else if (eventType === 'order_refunded' || eventType === 'chargeback') {
            console.log(`[ALERTA TÁTICO] Recebido Reembolso/Chargeback do ID: ${subscriptionId}`);

            // Calculo de Segurança: Verificar se foi feito DENTRO da Garantia de 7 dias.
            let isWithin7Days = true;
            const approvedDateStr = order.created_at || order.order_approved_date || order.updated_at;
            if (approvedDateStr) {
                const approvedDate = new Date(approvedDateStr);
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - approvedDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 7) {
                    isWithin7Days = false;
                    console.log(`🛡️ Reembolso após 7 dias de garantia (${diffDays} dias). O painel será bloqueado, MAS os sites na Vercel e Github NÃO serão deletados.`);
                }
            }

            // 1. Achar a vítima no Supabase
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('id, github_token, vercel_token')
                .eq('kiwify_subscription_id', subscriptionId)
                .single();

            if (profile) {
                // Inativa o login no seu painel SaaS sumariamente (Bloqueia o cliente e encerra o serviço)
                await supabaseAdmin.from('profiles').update({ subscription_status: 'inactive' }).eq('id', profile.id);

                // 2. Apagar Sites da tabela user_sites APENAS se estiver na regra dos 7 dias
                if (isWithin7Days) {
                    const { data: sites } = await supabaseAdmin.from('user_sites').select('*').eq('user_id', profile.id);

                    if (sites && sites.length > 0) {
                        console.log(`Início da destruição de ${sites.length} site(s)...`);
                        for (const site of sites) {

                            // DESTRÓI NO GITHUB
                            if (profile.github_token && site.github_owner && site.github_repo) {
                                try {
                                    const ghRes = await fetch(`https://api.github.com/repos/${site.github_owner}/${site.github_repo}`, {
                                        method: 'DELETE',
                                        headers: {
                                            'Authorization': `Bearer ${profile.github_token}`,
                                            'Accept': 'application/vnd.github.v3+json',
                                            'User-Agent': 'SaaS-Admin-Wipeout'
                                        }
                                    });
                                    if (ghRes.ok) console.log(`✓ GitHub Repo deletado: ${site.github_repo}`);
                                } catch (e) {
                                    console.error(`Falha ao deletar github repo ${site.github_repo}`, e);
                                }
                            }

                            // DESTRÓI NA VERCEL
                            if (profile.vercel_token && site.vercel_project_id) {
                                try {
                                    const vcRes = await fetch(`https://api.vercel.com/v9/projects/${site.vercel_project_id}`, {
                                        method: 'DELETE',
                                        headers: {
                                            'Authorization': `Bearer ${profile.vercel_token}`
                                        }
                                    });
                                    if (vcRes.ok) console.log(`✓ Vercel Project deletado: ${site.vercel_project_id}`);
                                } catch (e) {
                                    console.error(`Falha ao deletar vercel project ${site.vercel_project_id}`, e);
                                }
                            }
                        }

                        // Excluímos as referências do banco
                        await supabaseAdmin.from('user_sites').delete().eq('user_id', profile.id);
                        console.log(`Tudo limpo e finalizado. Sites e repósitos excluídos com sucesso.`);
                    } else {
                        console.log(`Usuário não possuía nenhum site construído.`);
                    }
                } else {
                    console.log(`Procedimento letal de wipeout de sites ignorado por estar fora do prazo de garantia de 7 dias.`);
                }
            } else {
                console.log(`Usuário não encontrado via Subscription ID da Kiwify.`);
            }
        }

        return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });

    } catch (err: any) {
        console.error(`[ERRO CRÍTICO ENCONTRADO]:`, err);
        const msg = err?.message || JSON.stringify(err) || 'Erro Desconhecido';
        return new Response(JSON.stringify({ error: msg }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
    }
});
