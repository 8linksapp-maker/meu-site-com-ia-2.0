import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const { deploymentId, vercelToken } = await request.json();

        if (!deploymentId || !vercelToken) {
            return new Response(JSON.stringify({ error: 'Faltam parametros de checagem' }), { status: 400 });
        }

        const res = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${vercelToken}`
            }
        });

        const data = await res.json();

        if (!res.ok) {
            return new Response(JSON.stringify({ error: data.error?.message || 'Erro ao checar status' }), { status: 400 });
        }

        // Se houver alias oficiais de produção atrelados a este deploy, pegar o primeiro (A url global mais curta e bonita)
        // Caso contrário, cai back pra URL compilada
        const finalUrl = data.alias && data.alias.length > 0 ? data.alias[0] : data.url;

        return new Response(JSON.stringify({
            readyState: data.readyState,
            url: finalUrl
        }), { status: 200 });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};
