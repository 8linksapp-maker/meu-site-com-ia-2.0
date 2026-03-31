import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { Octokit } from '@octokit/rest';

export const prerender = false;

const VERCEL_TOKEN = import.meta.env.VERCEL_TOKEN;
const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// Helper para obter o token correto do usuário ou o global
async function getVercelToken(projectId: string) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return VERCEL_TOKEN;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Tenta achar o site para descobrir quem é o dono
    const { data: siteData } = await supabaseAdmin
        .from('user_sites')
        .select('user_id')
        .or(`vercel_project_id.eq.${projectId},github_repo.ilike.%${projectId}%`)
        .single();

    if (siteData) {
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('vercel_token')
            .eq('id', siteData.user_id)
            .limit(1);

        const profile = profiles && profiles.length > 0 ? profiles[0] : null;
        if (profile?.vercel_token) return profile.vercel_token;
    }

    return VERCEL_TOKEN;
}

export const GET: APIRoute = async ({ request, url }) => {
    try {
        const projectId = url.searchParams.get('projectId');
        const type = url.searchParams.get('type') || 'project';
        const domain = url.searchParams.get('domain');

        if (!projectId) return new Response(JSON.stringify({ error: 'Project ID ausente' }), { status: 400 });

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

        const token = await getVercelToken(projectId);

        let vercelUrl = `https://api.vercel.com/v9/projects/${projectId}`;
        let method = 'GET';

        if (type === 'deploys') {
            vercelUrl = `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=10`;
        } else if (type === 'domains') {
            vercelUrl = `https://api.vercel.com/v9/projects/${projectId}/domains`;
        } else if (type === 'envs') {
            vercelUrl = `https://api.vercel.com/v9/projects/${projectId}/env`;
        } else if (type === 'verify-domain' && domain) {
            vercelUrl = `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}/verify`;
            method = 'POST';
        }

        const response = await fetch(vercelUrl, {
            method,
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), { status: response.status });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};

export const POST: APIRoute = async ({ request, url }) => {
    try {
        const projectId = url.searchParams.get('projectId');
        const type = url.searchParams.get('type');

        if (!projectId) return new Response(JSON.stringify({ error: 'Project ID ausente' }), { status: 400 });

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

        const token = await getVercelToken(projectId);
        const body = await request.json();

        let vercelUrl = '';
        if (type === 'add-domain') {
            vercelUrl = `https://api.vercel.com/v9/projects/${projectId}/domains`;
        } else if (type === 'add-env') {
            vercelUrl = `https://api.vercel.com/v10/projects/${projectId}/env`;
        }

        if (!vercelUrl) return new Response(JSON.stringify({ error: 'Ação inválida' }), { status: 400 });

        const response = await fetch(vercelUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), { status: response.status });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};

export const PATCH: APIRoute = async ({ request, url }) => {
    try {
        const projectId = url.searchParams.get('projectId');
        const envId = url.searchParams.get('envId');

        if (!projectId || !envId) return new Response(JSON.stringify({ error: 'Project ID ou Env ID ausente' }), { status: 400 });

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

        const token = await getVercelToken(projectId);
        const body = await request.json();

        const response = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${envId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), { status: response.status });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};

export const DELETE: APIRoute = async ({ request, url }) => {
    try {
        const projectId = url.searchParams.get('projectId');
        const domain = url.searchParams.get('domain');
        const envId = url.searchParams.get('envId');

        if (!projectId) return new Response(JSON.stringify({ error: 'Project ID ausente' }), { status: 400 });

        const authHeader = request.headers.get('Authorization');
        if (!authHeader) return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });

        const token = await getVercelToken(projectId);

        if (domain) {
            const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return new Response(JSON.stringify({ success: res.status === 204 }), { status: 200 });
        }

        if (envId) {
            const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${envId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return new Response(JSON.stringify({ success: res.status === 204 || res.status === 200 }), { status: 200 });
        }

        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
            throw new Error('Configuração do servidor incompleta');
        }

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        const { data: sites } = await supabaseAdmin
            .from('user_sites')
            .select('*')
            .or(`vercel_project_id.eq.${projectId},github_repo.ilike.%${projectId}%`)
            .limit(1);

        const siteData = sites && sites.length > 0 ? sites[0] : null;

        if (!siteData) {
            const vRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return new Response(JSON.stringify({ success: vRes.ok }), { status: 200 });
        }

        const { data: profiles } = await supabaseAdmin.from('profiles').select('github_token').eq('id', siteData.user_id).limit(1);
        const userGithubToken = profiles && profiles.length > 0 ? profiles[0].github_token : null;

        await fetch(`https://api.vercel.com/v9/projects/${projectId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (userGithubToken && siteData.github_repo) {
            try {
                const octokit = new Octokit({ auth: userGithubToken });
                const [owner, repo] = siteData.github_repo.includes('/')
                    ? siteData.github_repo.split('/')
                    : [siteData.github_owner, siteData.github_repo];

                await octokit.repos.delete({ owner: owner || siteData.github_owner, repo });
            } catch (gErr) {
                console.error('GitHub Delete Error:', gErr);
            }
        }

        await supabaseAdmin.from('user_sites').delete().eq('id', siteData.id);

        return new Response(JSON.stringify({ success: true }), { status: 200 });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
