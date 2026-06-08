import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;
export const maxDuration = 60;

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

const json = (body: unknown, status: number) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
function generatePassword(len = 16): string {
    const bytes = new Uint8Array(len);
    crypto.getRandomValues(bytes);
    let out = '';
    for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
    return out;
}

/**
 * POST /api/admin/reset-admin-secret
 * Body: { projectId }
 *
 * Reseta a env var ADMIN_SECRET do site (Vercel), regerando uma senha aleatória,
 * e dispara redeploy pra novo valor entrar em vigor. Aluno recupera acesso ao
 * /admin do site dele sem virar ticket.
 *
 * - Auth: Bearer token do Supabase (mesmo padrão de my-sites.ts/vercel-proxy.ts).
 * - Autorização: confirma que o projectId pertence ao usuário (anti-IDOR).
 * - Idempotência: se ADMIN_SECRET não existe, cria. Se existe, faz PATCH.
 * - Resposta: { ok: true, newPassword } — senha aparece UMA VEZ; não persiste.
 */
export const POST: APIRoute = async ({ request }) => {
    try {
        if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return json({ error: 'Configuração do servidor incompleta' }, 500);

        // 1. Auth
        const token = request.headers.get('Authorization')?.split('Bearer ')[1]?.trim();
        if (!token) return json({ error: 'Não autorizado' }, 401);

        const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !authData.user?.id) return json({ error: 'Sessão inválida ou expirada' }, 401);
        const userId = authData.user.id;

        // 2. Body
        const body = await request.json().catch(() => null) as any;
        const projectId: string | undefined = body?.projectId;
        if (!projectId) return json({ error: 'projectId é obrigatório' }, 400);

        // 3. Site pertence ao usuário?
        const { data: sites } = await supabaseAdmin
            .from('user_sites')
            .select('id, vercel_project_id, github_owner, github_repo')
            .eq('user_id', userId)
            .or(`vercel_project_id.eq.${projectId},github_repo.ilike.%${projectId}%`)
            .limit(1);
        const site = sites && sites.length > 0 ? sites[0] : null;
        if (!site) return json({ error: 'Site não encontrado ou acesso negado' }, 403);
        const realProjectId = site.vercel_project_id || projectId;

        // 4. Vercel token do dono
        const { data: profiles } = await supabaseAdmin
            .from('profiles')
            .select('vercel_token')
            .eq('id', userId)
            .limit(1);
        const vercelToken = profiles && profiles.length > 0 ? profiles[0].vercel_token : null;
        if (!vercelToken) return json({ error: 'Conta Vercel não conectada. Reconecte suas contas pra resetar a senha.' }, 409);

        // 5. Detecta team (contas Vercel novas só têm team)
        let teamQs = '';
        try {
            const teamsRes = await fetch('https://api.vercel.com/v2/teams', { headers: { Authorization: `Bearer ${vercelToken}` } });
            if (teamsRes.ok) {
                const { teams } = await teamsRes.json();
                const teamId = teams?.[0]?.id;
                if (teamId) teamQs = `?teamId=${teamId}`;
            }
        } catch { /* fallback pra conta pessoal */ }

        // 6. Encontra env ADMIN_SECRET
        const envListRes = await fetch(`https://api.vercel.com/v9/projects/${realProjectId}/env${teamQs}`, {
            headers: { Authorization: `Bearer ${vercelToken}` },
        });
        if (!envListRes.ok) {
            const t = await envListRes.text().catch(() => '');
            return json({ error: `Erro ao listar envs do projeto Vercel (${envListRes.status}): ${t.slice(0, 200)}` }, 502);
        }
        const envList = await envListRes.json();
        const existing = (envList.envs || []).find((e: any) => e.key === 'ADMIN_SECRET');

        // 7. Gera senha nova e aplica
        const newPassword = generatePassword(16);
        const envBody = {
            key: 'ADMIN_SECRET',
            value: newPassword,
            type: 'encrypted',
            target: ['production', 'preview', 'development'],
        };

        if (existing) {
            // PATCH
            const patchSep = teamQs ? '&' : '?';
            const patchRes = await fetch(`https://api.vercel.com/v9/projects/${realProjectId}/env/${existing.id}${teamQs}`, {
                method: 'PATCH',
                headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ value: newPassword, type: 'encrypted', target: ['production', 'preview', 'development'] }),
            });
            if (!patchRes.ok) {
                const t = await patchRes.text().catch(() => '');
                return json({ error: `Erro ao atualizar ADMIN_SECRET (${patchRes.status}): ${t.slice(0, 200)}` }, 502);
            }
        } else {
            // POST (cria)
            const postRes = await fetch(`https://api.vercel.com/v10/projects/${realProjectId}/env${teamQs}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(envBody),
            });
            if (!postRes.ok) {
                const t = await postRes.text().catch(() => '');
                return json({ error: `Erro ao criar ADMIN_SECRET (${postRes.status}): ${t.slice(0, 200)}` }, 502);
            }
        }

        // 8. Trigger redeploy pra nova env entrar em vigor (env só pega em next build)
        let deployTriggered = false;
        try {
            const projRes = await fetch(`https://api.vercel.com/v9/projects/${realProjectId}${teamQs}`, {
                headers: { Authorization: `Bearer ${vercelToken}` },
            });
            if (projRes.ok) {
                const proj = await projRes.json();
                const hook = (proj?.link?.deployHooks || []).find((h: any) => h.name === 'CMS Deploy');
                if (hook?.url) {
                    const hr = await fetch(hook.url, { method: 'POST' });
                    deployTriggered = hr.ok;
                }
            }
        } catch { /* deploy não disparou — env tá salva mesmo assim */ }

        return json({
            ok: true,
            newPassword,
            deployTriggered,
            message: deployTriggered
                ? 'Nova senha gerada. Aguarde ~2 min pelo deploy aplicar antes de tentar logar.'
                : 'Nova senha salva, mas não consegui disparar o redeploy automático. Tente "Reativar deploy manual" ou refaça o deploy manual.',
        }, 200);

    } catch (err: any) {
        return json({ error: err?.message || 'Erro interno' }, 500);
    }
};
