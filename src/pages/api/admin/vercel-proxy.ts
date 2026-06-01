import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { Octokit } from '@octokit/rest';

export const prerender = false;

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status });

type OwnedSite = {
    id: string;
    user_id: string;
    github_repo: string | null;
    github_owner: string | null;
    vercel_project_id: string | null;
};

type AuthContext = {
    userId: string;
    site: OwnedSite;
    vercelToken: string;
    supabaseAdmin: ReturnType<typeof createClient>;
};

/**
 * Valida o access_token do Supabase, resolve o site pelo projectId e confirma
 * que ele pertence ao usuário autenticado. Retorna o contexto autorizado OU
 * uma Response de erro pronta pra devolver (401/403/409/500).
 *
 * - Fecha o IDOR: nenhum handler age sobre um projectId sem provar o dono.
 * - Mata o fallback global do token: o token Vercel vem do dono resolvido,
 *   nunca do VERCEL_TOKEN da plataforma (o projeto vive na conta Vercel do
 *   usuário, então o global daria 404 silencioso).
 */
async function authorizeSite(request: Request, projectId: string): Promise<AuthContext | Response> {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return json({ error: 'Configuração do servidor incompleta' }, 500);
    }

    const token = request.headers.get('Authorization')?.split('Bearer ')[1]?.trim();
    if (!token) return json({ error: 'Não autorizado' }, 401);

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // 1. Validar o usuário pelo access_token (mesmo padrão de my-sites.ts).
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !authData.user?.id) {
        return json({ error: 'Sessão inválida ou expirada' }, 401);
    }
    const userId = authData.user.id;

    // 2. Resolver o site pelo projectId E travar no dono autenticado.
    //    O .eq('user_id') é o gate de segurança; o .or() casa tanto sites
    //    com vercel_project_id quanto os resolvidos por nome de repo.
    const { data: sites, error: siteError } = await supabaseAdmin
        .from('user_sites')
        .select('id, user_id, github_repo, github_owner, vercel_project_id')
        .eq('user_id', userId)
        .or(`vercel_project_id.eq.${projectId},github_repo.ilike.%${projectId}%`)
        .limit(1);

    if (siteError) return json({ error: 'Erro ao verificar o site' }, 500);
    const site = sites && sites.length > 0 ? (sites[0] as OwnedSite) : null;
    if (!site) {
        // Não existe OU não é do usuário — não revela qual (anti-enumeração).
        return json({ error: 'Site não encontrado ou acesso negado' }, 403);
    }

    // 3. Token Vercel do dono. Sem fallback global silencioso (P2).
    const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('vercel_token')
        .eq('id', userId)
        .limit(1);
    const vercelToken = profiles && profiles.length > 0 ? profiles[0].vercel_token : null;
    if (!vercelToken) {
        return json({ error: 'Conta Vercel não conectada. Reconecte suas contas para gerenciar este site.' }, 409);
    }

    return { userId, site, vercelToken, supabaseAdmin };
}

export const GET: APIRoute = async ({ request, url }) => {
    try {
        const projectId = url.searchParams.get('projectId');
        const type = url.searchParams.get('type') || 'project';
        const domain = url.searchParams.get('domain');

        if (!projectId) return json({ error: 'Project ID ausente' }, 400);

        const auth = await authorizeSite(request, projectId);
        if (auth instanceof Response) return auth;
        const { vercelToken } = auth;

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
            headers: { 'Authorization': `Bearer ${vercelToken}` }
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), { status: response.status });

    } catch (err: any) {
        return json({ error: err.message }, 500);
    }
};

export const POST: APIRoute = async ({ request, url }) => {
    try {
        const projectId = url.searchParams.get('projectId');
        const type = url.searchParams.get('type');

        if (!projectId) return json({ error: 'Project ID ausente' }, 400);

        const auth = await authorizeSite(request, projectId);
        if (auth instanceof Response) return auth;
        const { vercelToken } = auth;

        const body = await request.json();

        let vercelUrl = '';
        if (type === 'add-domain') {
            vercelUrl = `https://api.vercel.com/v9/projects/${projectId}/domains`;
        } else if (type === 'add-env') {
            vercelUrl = `https://api.vercel.com/v10/projects/${projectId}/env`;
        }

        if (!vercelUrl) return json({ error: 'Ação inválida' }, 400);

        const response = await fetch(vercelUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${vercelToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), { status: response.status });

    } catch (err: any) {
        return json({ error: err.message }, 500);
    }
};

export const PATCH: APIRoute = async ({ request, url }) => {
    try {
        const projectId = url.searchParams.get('projectId');
        const envId = url.searchParams.get('envId');

        if (!projectId || !envId) return json({ error: 'Project ID ou Env ID ausente' }, 400);

        const auth = await authorizeSite(request, projectId);
        if (auth instanceof Response) return auth;
        const { vercelToken } = auth;

        const body = await request.json();

        const response = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${envId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${vercelToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), { status: response.status });

    } catch (err: any) {
        return json({ error: err.message }, 500);
    }
};

export const DELETE: APIRoute = async ({ request, url }) => {
    try {
        const projectId = url.searchParams.get('projectId');
        const domain = url.searchParams.get('domain');
        const envId = url.searchParams.get('envId');

        if (!projectId) return json({ error: 'Project ID ausente' }, 400);

        const auth = await authorizeSite(request, projectId);
        if (auth instanceof Response) return auth;
        const { site, vercelToken, userId, supabaseAdmin } = auth;

        // Remover um domínio do projeto.
        if (domain) {
            const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${vercelToken}` }
            });
            return json({ success: res.ok || res.status === 204 }, 200);
        }

        // Remover uma variável de ambiente do projeto.
        if (envId) {
            const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${envId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${vercelToken}` }
            });
            return json({ success: res.ok || res.status === 204 }, 200);
        }

        // Excluir o site inteiro: Vercel + GitHub + linha do banco.
        // Retorno granular pra UI poder avisar limpeza parcial (P1).
        let githubDeleted: boolean | null = site.github_repo ? false : null;
        let orphanRepo: string | undefined;

        // 1. Vercel — 404 conta como "já não existe" (idempotente).
        const vRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${vercelToken}` }
        });
        const vercelDeleted = vRes.ok || vRes.status === 404;

        // Se a Vercel falhou, o site continua no ar. Aborta ANTES de mexer no
        // banco — senão o site some da carteira mas segue online (P1#1).
        if (!vercelDeleted) {
            return json({
                success: false,
                error: 'Não conseguimos remover o site da Vercel. Ele continua no ar. Tente novamente em instantes.',
                vercelDeleted: false,
                githubDeleted,
                dbDeleted: false,
            }, 502);
        }

        // 2. GitHub — best-effort, mas reporta a falha em vez de engolir (P1#2).
        if (site.github_repo) {
            const { data: profiles } = await supabaseAdmin
                .from('profiles')
                .select('github_token')
                .eq('id', userId)
                .limit(1);
            const userGithubToken = profiles && profiles.length > 0 ? profiles[0].github_token : null;

            const [parsedOwner, parsedRepo] = site.github_repo.includes('/')
                ? site.github_repo.split('/')
                : [site.github_owner, site.github_repo];
            const owner = parsedOwner || site.github_owner;
            const repo = parsedRepo;
            orphanRepo = `${owner}/${repo}`;

            if (userGithubToken) {
                try {
                    const octokit = new Octokit({ auth: userGithubToken });
                    await octokit.repos.delete({ owner: owner || '', repo: repo || '' });
                    githubDeleted = true;
                    orphanRepo = undefined;
                } catch (gErr) {
                    // PAT pode não ter escopo delete_repo → repo fica órfão.
                    console.error('GitHub Delete Error:', gErr);
                    githubDeleted = false;
                }
            } else {
                githubDeleted = false;
            }
        }

        // 3. Banco — Vercel já saiu, tira da carteira.
        const { error: dbErr } = await supabaseAdmin.from('user_sites').delete().eq('id', site.id);
        const dbDeleted = !dbErr;

        if (!dbDeleted) {
            return json({
                success: false,
                error: 'O site foi removido da Vercel, mas não conseguimos atualizar sua carteira. Recarregue a página.',
                vercelDeleted: true,
                githubDeleted,
                dbDeleted: false,
                ...(orphanRepo ? { orphanRepo } : {}),
            }, 500);
        }

        // Sucesso: site fora do ar e fora da carteira. Repo órfão é só aviso.
        return json({
            success: true,
            vercelDeleted: true,
            githubDeleted,
            dbDeleted: true,
            ...(orphanRepo ? { orphanRepo } : {}),
        }, 200);

    } catch (err: any) {
        return json({ error: err.message }, 500);
    }
};
