import type { APIRoute } from 'astro';
import { logDeployError } from '../../lib/logDeployError';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const { deploymentId, vercelToken, userId, userEmail, templateId, templateName, repoName, githubRepoUrl } = await request.json();

        if (!deploymentId || !vercelToken) {
            return new Response(JSON.stringify({ error: 'Parâmetros de verificação ausentes.' }), { status: 400 });
        }

        const res = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${vercelToken}` }
        });

        if (!res.ok) {
            return new Response(JSON.stringify({ error: 'Não foi possível verificar o status do deploy.' }), { status: 502 });
        }

        const data = await res.json();

        // Se houver alias oficiais de produção atrelados a este deploy, pegar o primeiro
        const finalUrl = data.alias && data.alias.length > 0 ? data.alias[0] : data.url;

        // Se falhou, tentar pegar o log do build + logar no Supabase
        let errorLog = '';
        let refCode = '';
        if (data.readyState === 'ERROR' || data.readyState === 'CANCELED') {
            try {
                const logRes = await fetch(
                    `https://api.vercel.com/v3/deployments/${deploymentId}/events?builds=1&direction=backward&limit=50`,
                    { headers: { 'Authorization': `Bearer ${vercelToken}` } }
                );
                if (logRes.ok) {
                    const events: any[] = await logRes.json();
                    const errorEvents = events
                        .filter(e => e.type === 'stderr' || (e.text && /error/i.test(e.text)))
                        .map(e => e.text || e.payload?.text || '')
                        .filter(Boolean)
                        .slice(-15);
                    errorLog = errorEvents.join('\n');
                }
            } catch {}

            // Logar no Supabase (silencioso — não bloqueia resposta)
            try {
                refCode = await logDeployError({
                    userId, userEmail, stage: 'build_failed',
                    templateId, templateName, repoName,
                    errorMessage: data.errorMessage || `Build ${data.readyState}`,
                    buildLog: errorLog,
                    inspectorUrl: data.inspectorUrl || '',
                    vercelDeploymentId: deploymentId,
                    githubRepoUrl,
                });
            } catch {}
        }

        return new Response(JSON.stringify({
            readyState: data.readyState,
            url: finalUrl,
            errorMessage: data.errorMessage || '',
            errorLog,
            inspectorUrl: data.inspectorUrl || '',
            refCode,
        }), { status: 200 });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};
