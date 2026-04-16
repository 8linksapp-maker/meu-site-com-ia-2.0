import type { APIRoute } from 'astro';
import { Octokit } from '@octokit/rest';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { logDeployError } from '../../lib/logDeployError';

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

async function deleteVercelProject(token: string, projectId: string) {
    try {
        await fetch(`https://api.vercel.com/v9/projects/${projectId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
    } catch { /* best-effort */ }
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
            const vercelRes = await fetch('https://api.vercel.com/v9/projects', {
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

        // 3. Adicionar Variáveis de Ambiente
        const envVars = [
            { key: 'GITHUB_TOKEN', value: githubToken, type: 'encrypted', target: ['production', 'preview', 'development'] },
            { key: 'GITHUB_OWNER', value: githubUsername, type: 'plain', target: ['production', 'preview', 'development'] },
            { key: 'GITHUB_REPO', value: safeRepoName, type: 'plain', target: ['production', 'preview', 'development'] }
        ];
        if (adminPassword) {
            envVars.push({ key: 'ADMIN_SECRET', value: adminPassword, type: 'encrypted', target: ['production', 'preview', 'development'] });
        }

        const envRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(envVars)
        });

        if (!envRes.ok) {
            // Rollback: deletar projeto Vercel + repo GitHub
            if (vercelProjectCreated) await deleteVercelProject(vercelToken, projectId);
            if (repoCreated) await deleteGithubRepo(octokit, githubUsername, safeRepoName);
            return new Response(JSON.stringify({ error: 'Erro ao configurar o projeto. Tente novamente ou atualize seus tokens.' }), { status: 500 });
        }

        // 4. Disparar Deploy
        await new Promise(r => setTimeout(r, 3000));

        const deployRes = await fetch(`https://api.vercel.com/v13/deployments`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: safeRepoName,
                project: projectId,
                target: 'production',
                gitSource: { type: 'github', repoId: githubRepoId, ref: 'main' }
            })
        });

        if (!deployRes.ok) {
            // Não faz rollback aqui — repo e projeto já estão criados e podem ser reusados
            return new Response(JSON.stringify({ error: 'Repositório e projeto criados, mas o deploy inicial falhou. Acesse a Vercel para redeployar manualmente.' }), { status: 500 });
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

        const deployData = await deployRes.json();

        return new Response(JSON.stringify({
            success: true,
            repoUrl: newRepoHtmlUrl,
            deploymentId: deployData.id,
            siteSlug: safeRepoName,
            githubOwner: githubUsername,
        }), { status: 200 });
    } catch (error: any) {
        // Rollback em caso de erro inesperado
        if (octokit && repoCreated && githubUsername && safeRepoName) {
            await deleteGithubRepo(octokit, githubUsername, safeRepoName);
        }
        if (projectId && vercelProjectCreated && vercelToken_) {
            await deleteVercelProject(vercelToken_, projectId);
        }
        return new Response(JSON.stringify({ error: 'Erro inesperado ao criar o site. Tente novamente.' }), { status: 500 });
    }
};
