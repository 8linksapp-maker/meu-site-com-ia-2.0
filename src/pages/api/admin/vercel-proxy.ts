import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';

export const prerender = false;

// Token central da Vercel (Deve estar no .env)
const VERCEL_TOKEN = import.meta.env.VERCEL_TOKEN;

export const GET: APIRoute = async ({ request, url }) => {
    try {
        const projectId = url.searchParams.get('projectId');
        if (!projectId) return new Response(JSON.stringify({ error: 'Project ID ausente' }), { status: 400 });

        // 1. Validar usuário
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

        // 2. Buscar dados na Vercel (Exemplo: Deploys)
        const response = await fetch(`https://api.vercel.com/v9/projects/${projectId}?teamId=`, {
            headers: { 'Authorization': `Bearer ${VERCEL_TOKEN}` }
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), { status: 200 });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};

export const DELETE: APIRoute = async ({ request, url }) => {
    // Lógica para deletar projeto na Vercel
    // ...
    return new Response(JSON.stringify({ success: true }), { status: 200 });
};
