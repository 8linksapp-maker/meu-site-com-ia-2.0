import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

// Supabase Admin para ler tokens de perfil com segurança
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export const GET: APIRoute = async ({ request, url }) => {
    try {
        const projectId = url.searchParams.get('projectId');
        const action = url.searchParams.get('action'); // 'getEnv' ou nulo para info do projeto

        if (!projectId) return new Response(JSON.stringify({ error: 'Project ID ausente' }), { status: 400 });

        // 1. Validar usuário autenticado
        const authHeader = request.headers.get('Authorization');
        const tokenToken = authHeader?.split('Bearer ')[1];
        if (!tokenToken) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(tokenToken);
        if (authError || !authData.user) return new Response(JSON.stringify({ error: 'Sessão inválida' }), { status: 401 });

        // 2. Buscar o Vercel Token do perfil do usuário
        const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('vercel_token')
            .eq('id', authData.user.id)
            .single();

        if (profileError || !profile?.vercel_token) {
            return new Response(JSON.stringify({ error: 'Token da Vercel não configurado no seu perfil.' }), { status: 400 });
        }

        const userVercelToken = profile.vercel_token;

        // 3. Se a ação for buscar o segredo (Auto-Login)
        if (action === 'getEnv') {
            // Primeiro: Listar variáveis para achar o ID da ADMIN_SECRET
            const listEnvRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, {
                headers: { 'Authorization': `Bearer ${userVercelToken}` }
            });
            const envsData = await listEnvRes.json();

            if (!listEnvRes.ok) throw new Error(envsData.error?.message || 'Erro ao listar envs na Vercel');

            const adminSecretEnv = envsData.envs?.find((e: any) => e.key === 'ADMIN_SECRET');

            if (!adminSecretEnv) {
                return new Response(JSON.stringify({ error: 'Variável ADMIN_SECRET não encontrada neste projeto na Vercel.' }), { status: 404 });
            }

            // Segundo: Buscar o valor descriptografado (Vercel permite isso via API se tiver o ID)
            // Nota: Para variáveis 'encrypted', o valor pode vir mascarado se não for o dono, 
            // mas como estamos usando o token do próprio usuário, deve retornar.
            const envValRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${adminSecretEnv.id}`, {
                headers: { 'Authorization': `Bearer ${userVercelToken}` }
            });
            const valData = await envValRes.json();

            if (!envValRes.ok) throw new Error(valData.error?.message || 'Erro ao obter valor do segredo');

            return new Response(JSON.stringify({ secret: valData.value }), { status: 200 });
        }

        // 4. Buscar dados gerais do projeto (Comportamento padrão)
        const response = await fetch(`https://api.vercel.com/v9/projects/${projectId}`, {
            headers: { 'Authorization': `Bearer ${userVercelToken}` }
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Erro Vercel');

        return new Response(JSON.stringify(data), { status: 200 });

    } catch (err: any) {
        console.error('[VERCEL PROXY ERROR]:', err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};

export const DELETE: APIRoute = async ({ request, url }) => {
    // Mantendo esqueleto para futuras implementações
    return new Response(JSON.stringify({ success: true }), { status: 200 });
};
