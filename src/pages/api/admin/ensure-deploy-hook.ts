import type { APIRoute } from 'astro';
import { supabaseAdmin, verifyAdmin } from '../../../lib/verifyAdmin';
import { ensureProjectHasDeployHook } from '../../../lib/deployHook';

export const prerender = false;
export const maxDuration = 60;

/**
 * POST /api/admin/ensure-deploy-hook
 * Body: { user_site_id }  OU  { vercel_project_id, user_id }
 *
 * Self-healing endpoint pra recuperar sites que ficaram sem DEPLOY_HOOK_URL
 * (sintoma: "Deploy manual ainda não está configurado neste site").
 *
 * Idempotente:
 * - Se env já existe → retorna alreadyHad: true sem fazer nada
 * - Se hook existe mas falta env → reusa hook + cria env
 * - Se nada existe → cria hook (com retry) + cria env
 */
export const POST: APIRoute = async ({ request }) => {
    try {
        await verifyAdmin(request);

        const body = await request.json();
        let projectId: string | undefined = body.vercel_project_id;
        let userId: string | undefined = body.user_id;

        if (body.user_site_id) {
            const { data: site } = await supabaseAdmin
                .from('user_sites')
                .select('user_id, vercel_project_id, github_owner, github_repo')
                .eq('id', body.user_site_id)
                .single();
            if (!site) throw new Error('user_site_id não encontrado');
            projectId = site.vercel_project_id;
            userId = site.user_id;
        }

        if (!projectId) throw new Error('vercel_project_id ou user_site_id é obrigatório');
        if (!userId) throw new Error('user_id obrigatório (ou user_site_id pra resolver)');

        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('vercel_token')
            .eq('id', userId)
            .single();
        if (!profile?.vercel_token) throw new Error('Dono do site não tem vercel_token configurado');

        // Detecta team Vercel pra passar nas chamadas /v9/projects (contas novas exigem)
        let vercelTeamId = '';
        try {
            const teamsRes = await fetch('https://api.vercel.com/v2/teams', {
                headers: { Authorization: `Bearer ${profile.vercel_token}` },
            });
            if (teamsRes.ok) {
                const { teams } = await teamsRes.json();
                vercelTeamId = teams?.[0]?.id || '';
            }
        } catch { /* fallback pra conta pessoal */ }

        const result = await ensureProjectHasDeployHook(profile.vercel_token, projectId, vercelTeamId);

        return new Response(JSON.stringify(result), { status: result.ok ? 200 : 500 });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
};
