import type { APIRoute } from 'astro';
import { Octokit } from '@octokit/rest';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { logDeployError } from '../../lib/logDeployError';
import { createDeployHookWithRetry, ensureDeployHookEnv } from '../../lib/deployHook';

const deploySchema = z.object({
    userId: z.string().optional(),
    templateRepo: z.string().min(1, 'Template é obrigatório'),
    templateId: z.string().optional(),
    templateName: z.string().optional(),
    newRepoName: z.string().min(1, 'Escolha um nome para o repositório do seu site.').max(100, 'Nome do repositório muito longo (máx. 100 caracteres)'),
    adminPassword: z.string().max(200).optional(),
    githubToken: z.string().min(1, 'Token do GitHub é obrigatório'),
    vercelToken: z.string().min(1, 'Token da Vercel é obrigatório'),
});

export const prerender = false;

/** Mensagem amigável + código de referência para o aluno */
function friendlyError(refCode: string, stage: string): string {
    const stages: Record<string, string> = {
        github_repo: 'Não conseguimos criar o repositório GitHub.',
        vercel_project: 'Não conseguimos criar o projeto na Vercel.',
        env_vars: 'Não conseguimos configurar as variáveis de ambiente.',
        deploy_trigger: 'Não conseguimos iniciar o deploy.',
        build_failed: 'O site foi criado, mas houve um erro na compilação.',
    };
    const msg = stages[stage] || 'Ocorreu um erro ao criar o site.';
    return `${msg} Nossa equipe já foi notificada. Se precisar de ajuda, envie este código ao suporte: ${refCode}`;
}

// Helpers de cleanup para rollback em caso de falha
async function deleteGithubRepo(octokit: InstanceType<typeof Octokit>, owner: string, repo: string) {
    try { await octokit.repos.delete({ owner, repo }); } catch { /* best-effort */ }
}

async function deleteVercelProject(token: string, projectId: string, teamId?: string) {
    try {
        const qs = teamId ? `?teamId=${teamId}` : '';
        await fetch(`https://api.vercel.com/v9/projects/${projectId}${qs}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch { /* best-effort */ }
}

/**
 * Detecta o team do usuario na Vercel. Contas novas Vercel sao criadas direto
 * em Team (Hobby pessoal foi desativado pra new accounts). Sem teamId, chamadas
 * /v9/projects retornam 401/403 "not_authorized" mesmo com token valido.
 */
async function detectVercelTeam(token: string): Promise<string> {
    try {
        const r = await fetch('https://api.vercel.com/v2/teams', {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!r.ok) return '';
        const { teams } = await r.json();
        return teams?.[0]?.id || '';
    } catch { return ''; }
}

export const POST: APIRoute = async ({ request }) => {
    let octokit: InstanceType<typeof Octokit> | null = null;
    let githubUsername = '';
    let safeRepoName = '';
    let projectId = '';
    let repoCreated = false;
    let vercelProjectCreated = false;

    let userEmail = '';
    let templateId_ = '';
    let templateName_ = '';
    let vercelToken_ = '';
    let vercelTeamId_ = '';

    try {
        const rawBody = await request.json();
        const parsed = deploySchema.safeParse(rawBody);
        if (!parsed.success) {
            const msg = parsed.error.issues.map(i => i.message).join('; ');
            return new Response(JSON.stringify({ error: msg }), { status: 400 });
        }
        const { userId, templateRepo, templateId, templateName, newRepoName, adminPassword, githubToken, vercelToken } = parsed.data;
        vercelToken_ = vercelToken;
        templateId_ = templateId || '';
        templateName_ = templateName || '';

        // 0. Validação de Assinatura + capturar email
        const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
        const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
        if (userId && supabaseUrl && serviceKey) {
            const supabaseAdmin = createClient(supabaseUrl, serviceKey);
            const { data: profiles } = await supabaseAdmin.from('profiles').select('subscription_status').eq('id', userId);
            const isSubscriber = profiles?.some(p => p.subscription_status === 'active');
            if (!isSubscriber) {
                return new Response(JSON.stringify({ error: 'Sua assinatura está inativa. Ative seu plano para criar sites.' }), { status: 403 });
            }
            try {
                const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
                userEmail = userData?.user?.email || '';
            } catch {}
        }

        // Validar token GitHub
        octokit = new Octokit({ auth: githubToken });
        try {
            const { data: user } = await octokit.users.getAuthenticated();
            githubUsername = user.login;
        } catch {
            return new Response(JSON.stringify({ error: 'Token do GitHub inválido ou expirado. Atualize-o em Configurações > Integração.' }), { status: 401 });
        }

        // Detectar Team Vercel — contas novas exigem teamId em todas chamadas /v9/projects
        const vercelTeamId = await detectVercelTeam(vercelToken);
        vercelTeamId_ = vercelTeamId;
        const teamQs = vercelTeamId ? `?teamId=${vercelTeamId}` : '';

        safeRepoName = newRepoName
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');

        let cleanTemplate = templateRepo.trim()
            .replace('https://github.com/', '')
            .replace('http://github.com/', '')
            .replace('github.com/', '');
        if (cleanTemplate.endsWith('/')) cleanTemplate = cleanTemplate.slice(0, -1);
        const [templateOwner, parsedTemplateName] = cleanTemplate.split('/');

        // 1. Criar repositório a partir do template
        let newRepoHtmlUrl = '';
        let githubRepoId = '';
        try {
            const res = await octokit.repos.createUsingTemplate({
                template_owner: templateOwner,
                template_repo: parsedTemplateName,
                name: safeRepoName,
                private: true,
            });
            newRepoHtmlUrl = res.data.html_url;
            githubRepoId = res.data.id.toString();
            repoCreated = true;
            await new Promise(r => setTimeout(r, 3000));
        } catch (err: any) {
            const msg = err.message || '';
            // Erros que NÃO são bugs — são problemas do usuário, não precisa logar
            if (msg.includes('Name already exists')) {
                return new Response(JSON.stringify({ error: `Já existe um repositório chamado "${safeRepoName}" na sua conta GitHub. Escolha outro nome.` }), { status: 409 });
            }
            if (msg.includes('Not Found')) {
                return new Response(JSON.stringify({ error: 'Template não encontrado. Entre em contato com o suporte.' }), { status: 404 });
            }
            // Token GitHub sem permissão pra criar repos a partir de template.
            // Acontece com PAT fine-grained sem "Administration: Read and write",
            // ou com PAT clássico sem o escopo `repo`. Detalhamos a causa pra
            // o aluno não precisar abrir ticket — passo a passo pronto.
            const noPermission = msg.includes('Resource not accessible by personal access token')
                || msg.includes('Resource not accessible by integration')
                || (err.status === 403 && /token|permission|scope/i.test(msg));
            if (noPermission) {
                return new Response(JSON.stringify({
                    error: [
                        '🔒 Seu token do GitHub não tem permissão pra criar repositórios novos.',
                        '',
                        'Isso acontece quando o token foi criado sem o escopo certo. A solução mais rápida é gerar um token clássico novo:',
                        '',
                        '1. Acesse: https://github.com/settings/tokens/new',
                        '2. Note: MeuSiteComIA',
                        '3. Expiration: 1 year (ou No expiration)',
                        '4. Marque o escopo "repo" (vai habilitar tudo dentro dele)',
                        '5. Clique "Generate token" no fim da página',
                        '6. Copie o token (começa com ghp_...)',
                        '7. Volte aqui em Configurações → cole no campo Token do GitHub → Salvar',
                        '8. Volte em Publicar template e tente de novo',
                        '',
                        'Se preferiu fine-grained: edite seu token em https://github.com/settings/personal-access-tokens e marque "Administration: Read and write" nas Repository permissions.',
                    ].join('\n'),
                    code: 'github_token_no_permission',
                }), { status: 403 });
            }
            // Token GitHub expirou ou foi revogado.
            const tokenInvalid = err.status === 401
                || msg.includes('Bad credentials')
                || msg.includes('token expired');
            if (tokenInvalid) {
                return new Response(JSON.stringify({
                    error: [
                        '🔑 Seu token do GitHub expirou ou foi revogado.',
                        '',
                        'Gere um novo:',
                        '1. Acesse: https://github.com/settings/tokens/new',
                        '2. Note: MeuSiteComIA',
                        '3. Expiration: 1 year (ou No expiration)',
                        '4. Marque o escopo "repo"',
                        '5. Clique "Generate token"',
                        '6. Copie e cole em Configurações → Token do GitHub → Salvar',
                    ].join('\n'),
                    code: 'github_token_invalid',
                }), { status: 401 });
            }
            // Erros reais — logar
            const refCode = await logDeployError({
                userId, userEmail, stage: 'github_repo',
                templateId: templateId_, templateName: templateName_, repoName: safeRepoName,
                errorMessage: msg, httpStatus: err.status, rawResponse: err.response?.data,
            });
            return new Response(JSON.stringify({
                error: friendlyError(refCode, 'github_repo'),
                refCode,
            }), { status: 400 });
        }

        // 2. Criar Projeto na Vercel
        try {
            const vercelRes = await fetch(`https://api.vercel.com/v9/projects${teamQs}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${vercelToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: safeRepoName,
                    framework: 'astro',
                    gitRepository: {
                        repo: `${githubUsername}/${safeRepoName}`,
                        type: 'github'
                    }
                })
            });
            if (!vercelRes.ok) {
                const errData = await vercelRes.json().catch(() => ({}));
                const errMsg = errData.error?.message || `HTTP ${vercelRes.status}`;
                const errCode = errData.error?.code || '';

                // Log visível nos Vercel Function Logs
                console.error('[deploy] VERCEL_PROJECT_FAIL', {
                    status: vercelRes.status,
                    errCode,
                    errMsg,
                    rawResponse: errData,
                    userEmail,
                    repoName: safeRepoName,
                    githubUsername,
                });

                // Erro de conflito: não é bug, não loga
                if (errMsg.includes('already exist') || errCode === 'conflict') {
                    throw new Error(`Já existe um projeto "${safeRepoName}" na Vercel. Escolha outro nome.`);
                }

                // Erros específicos com mensagem acionável
                const lowerMsg = errMsg.toLowerCase();

                // 🎯 Mais comum: GitHub integration não instalada na Vercel
                if (lowerMsg.includes('install the github integration') || lowerMsg.includes('github integration first')) {
                    if (repoCreated) await deleteGithubRepo(octokit, githubUsername, safeRepoName);
                    return new Response(JSON.stringify({
                        error: '⚠️ Você precisa instalar a integração do GitHub na sua Vercel antes de criar sites.\n\n📋 Passo a passo:\n1. Acesse: https://vercel.com/integrations/github\n2. Clique em "Add Integration"\n3. Escolha sua conta Vercel e autorize o acesso ao GitHub\n4. Volte aqui e tente criar o site novamente',
                    }), { status: 400 });
                }

                // GitHub não conectado como Login Connection na Vercel
                if (lowerMsg.includes('login connection') || lowerMsg.includes('failed to link')) {
                    if (repoCreated) await deleteGithubRepo(octokit, githubUsername, safeRepoName);
                    return new Response(JSON.stringify({
                        error: '⚠️ Sua conta GitHub não está conectada à Vercel como método de login.\n\n📋 Passo a passo:\n1. Acesse: https://vercel.com/account/login-connections\n2. Clique em "Connect" ao lado de GitHub\n3. Autorize o acesso\n4. Volte aqui e tente criar o site novamente\n\n💡 Isso é diferente da integração do GitHub — é a conexão de login da sua conta Vercel.',
                    }), { status: 400 });
                }

                if (vercelRes.status === 401 || errCode === 'forbidden' || errCode === 'not_authorized') {
                    if (repoCreated) await deleteGithubRepo(octokit, githubUsername, safeRepoName);
                    return new Response(JSON.stringify({
                        error: 'Seu token da Vercel expirou ou está inválido. Gere um novo em https://vercel.com/account/tokens e atualize em Configurações > Integração.',
                    }), { status: 401 });
                }
                if (errCode === 'not_found' || lowerMsg.includes('not found') || lowerMsg.includes('repo not found')) {
                    if (repoCreated) await deleteGithubRepo(octokit, githubUsername, safeRepoName);
                    return new Response(JSON.stringify({
                        error: 'A Vercel não conseguiu acessar seu repositório GitHub.\n\n📋 Solução:\n1. Acesse: https://vercel.com/integrations/github\n2. Instale/reative a integração do GitHub\n3. Tente novamente',
                    }), { status: 400 });
                }
                if (errCode === 'missing_scope' || lowerMsg.includes('scope')) {
                    if (repoCreated) await deleteGithubRepo(octokit, githubUsername, safeRepoName);
                    return new Response(JSON.stringify({
                        error: 'Seu token da Vercel não tem as permissões necessárias.\n\n📋 Solução:\n1. Acesse: https://vercel.com/account/tokens\n2. Crie um novo token com escopo "Full Account"\n3. Atualize em Configurações > Integração',
                    }), { status: 403 });
                }

                // Logar erro real (best-effort)
                const refCode = await logDeployError({
                    userId, userEmail, stage: 'vercel_project',
                    templateId: templateId_, templateName: templateName_, repoName: safeRepoName,
                    errorMessage: errMsg, errorCode: errCode, httpStatus: vercelRes.status,
                    githubRepoUrl: newRepoHtmlUrl, rawResponse: errData,
                });

                if (repoCreated) await deleteGithubRepo(octokit, githubUsername, safeRepoName);
                // Inclui a mensagem real da Vercel no erro (curto) pra debug enquanto migration não está aplicada
                return new Response(JSON.stringify({
                    error: `${friendlyError(refCode, 'vercel_project')}\n\nDetalhes técnicos: ${errMsg}${errCode ? ` (${errCode})` : ''}`,
                    refCode,
                }), { status: 400 });
            }
            const vercelData = await vercelRes.json();
            projectId = vercelData.id;
            vercelProjectCreated = true;
        } catch (err: any) {
            if (repoCreated) await deleteGithubRepo(octokit, githubUsername, safeRepoName);
            // Se já tem refCode na mensagem, apenas repassa
            if (err.message && err.message.startsWith('Já existe')) {
                return new Response(JSON.stringify({ error: err.message }), { status: 409 });
            }
            const refCode = await logDeployError({
                userId, userEmail, stage: 'vercel_project',
                templateId: templateId_, templateName: templateName_, repoName: safeRepoName,
                errorMessage: err.message || 'Erro desconhecido', githubRepoUrl: newRepoHtmlUrl,
            });
            return new Response(JSON.stringify({
                error: friendlyError(refCode, 'vercel_project'),
                refCode,
            }), { status: 400 });
        }

        // 2.5. Criar Deploy Hook com retry (1s/3s/5s entre tentativas).
        // Se falhar TODAS as 3 tentativas, loggamos como warning mas NÃO abortamos —
        // o site funciona sem hook (só perde "Salvar dispara redeploy" no admin),
        // e o endpoint /api/admin/ensure-deploy-hook permite recuperar depois.
        const hookResult = await createDeployHookWithRetry(vercelToken, projectId, {}, vercelTeamId);
        let deployHookWarning: string | null = null;
        if (!hookResult.url) {
            const refCode = await logDeployError({
                userId, userEmail, stage: 'env_vars',
                templateId: templateId_, templateName: templateName_, repoName: safeRepoName,
                errorMessage: `Deploy hook não criado após ${hookResult.attempts} tentativas: ${hookResult.lastError}`,
                githubRepoUrl: newRepoHtmlUrl,
                rawResponse: { attempts: hookResult.attempts, lastError: hookResult.lastError },
            });
            deployHookWarning = `Deploy hook não foi criado (ref ${refCode}). Recupere em /admin → Sites → Reativar deploy manual.`;
        }

        // 3. Adicionar Variáveis de Ambiente (sem DEPLOY_HOOK_URL ainda — vai depois pra evitar race)
        const envVars: Array<{ key: string; value: string; type: string; target: string[] }> = [
            { key: 'GITHUB_TOKEN', value: githubToken, type: 'encrypted', target: ['production', 'preview', 'development'] },
            { key: 'GITHUB_OWNER', value: githubUsername, type: 'plain', target: ['production', 'preview', 'development'] },
            { key: 'GITHUB_REPO', value: safeRepoName, type: 'plain', target: ['production', 'preview', 'development'] }
        ];
        if (adminPassword) {
            envVars.push({ key: 'ADMIN_SECRET', value: adminPassword, type: 'encrypted', target: ['production', 'preview', 'development'] });
        }

        const envRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env${teamQs}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(envVars)
        });

        if (!envRes.ok) {
            // Rollback: deletar projeto Vercel + repo GitHub
            if (vercelProjectCreated) await deleteVercelProject(vercelToken, projectId, vercelTeamId);
            if (repoCreated) await deleteGithubRepo(octokit, githubUsername, safeRepoName);
            return new Response(JSON.stringify({ error: 'Erro ao configurar o projeto. Tente novamente ou atualize seus tokens.' }), { status: 500 });
        }

        // 3.5. Setar DEPLOY_HOOK_URL via helper idempotente (suporta POST + PATCH se existir).
        if (hookResult.url) {
            const envSet = await ensureDeployHookEnv(vercelToken, projectId, hookResult.url, vercelTeamId);
            if (!envSet.ok) {
                // env não foi setada mas hook existe — site funciona, só não tem deploy manual.
                // Loggamos pra recovery posterior.
                const refCode = await logDeployError({
                    userId, userEmail, stage: 'env_vars',
                    templateId: templateId_, templateName: templateName_, repoName: safeRepoName,
                    errorMessage: `DEPLOY_HOOK_URL env falhou: ${envSet.lastError}`,
                    githubRepoUrl: newRepoHtmlUrl,
                    rawResponse: envSet,
                });
                deployHookWarning = `Deploy hook configurado parcialmente (ref ${refCode}). Recupere em /admin → Sites → Reativar deploy manual.`;
            }
        }

        // 4. Disparar Deploy inicial via gitSource API. A integração Vercel<>GitHub
        // leva alguns segundos pra indexar o repo recém-criado — fazemos retry com
        // backoff antes de desistir. Mesmo se TODOS os retries falharem, o webhook
        // automático do Vercel cuida do primeiro deploy (não bloqueia o save).
        let deployRes: Response | null = null;
        let deployBody: any = null;
        const backoff = [3000, 5000, 8000, 12000];
        for (const wait of backoff) {
            await new Promise(r => setTimeout(r, wait));
            deployRes = await fetch(`https://api.vercel.com/v13/deployments${teamQs}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: safeRepoName,
                    project: projectId,
                    target: 'production',
                    gitSource: { type: 'github', repoId: githubRepoId, ref: 'main' }
                })
            });
            if (deployRes.ok) { deployBody = await deployRes.json().catch(() => null); break; }
            // 400/404 nos primeiros segundos = ainda indexando, vale re-tentar.
            // Qualquer outro status = erro real, desiste.
            if (![400, 404].includes(deployRes.status)) break;
        }

        if (!deployRes || !deployRes.ok) {
            // Trigger manual falhou — mas o WEBHOOK AUTOMÁTICO do Vercel (criado quando
            // ligamos gitRepository no project) dispara o primeiro deploy sozinho em ~30s.
            // Não bloqueamos o save — só logamos pra recovery se webhook também falhar.
            const errBody = deployRes ? await deployRes.text().catch(() => '') : '';
            await logDeployError({
                userId, userEmail, stage: 'deploy_trigger',
                templateId: templateId_, templateName: templateName_, repoName: safeRepoName,
                errorMessage: `Manual deploy trigger failed after retries — relying on Vercel git webhook. Last status: ${deployRes?.status} ${errBody.slice(0, 200)}`,
                httpStatus: deployRes?.status,
                githubRepoUrl: newRepoHtmlUrl,
            });
            // continua o fluxo — não retorna erro pro aluno
        }

        // 5. Salvar no banco
        if (userId && supabaseUrl && serviceKey) {
            const supabaseAdmin = createClient(supabaseUrl, serviceKey);
            await supabaseAdmin.from('user_sites').insert({
                user_id: userId,
                template_id: templateId || null,
                github_owner: githubUsername,
                github_repo: safeRepoName,
                vercel_project_id: projectId
            }).then(() => {}).catch(() => {});
        }

        return new Response(JSON.stringify({
            success: true,
            repoUrl: newRepoHtmlUrl,
            deploymentId: deployBody?.id ?? null,
            siteSlug: safeRepoName,
            githubOwner: githubUsername,
            ...(deployHookWarning ? { warning: deployHookWarning } : {}),
        }), { status: 200 });
    } catch (error: any) {
        // Rollback em caso de erro inesperado
        if (octokit && repoCreated && githubUsername && safeRepoName) {
            await deleteGithubRepo(octokit, githubUsername, safeRepoName);
        }
        if (projectId && vercelProjectCreated && vercelToken_) {
            await deleteVercelProject(vercelToken_, projectId, vercelTeamId_);
        }
        return new Response(JSON.stringify({ error: 'Erro inesperado ao criar o site. Tente novamente.' }), { status: 500 });
    }
};
