import type { APIRoute } from 'astro';
import { Octokit } from '@octokit/rest';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        const { userId, templateRepo, templateId, newRepoName, adminPassword, githubToken, vercelToken } = await request.json();

        if (!githubToken || !vercelToken) {
            return new Response(JSON.stringify({ error: 'Tokens do Github e Vercel são obrigatórios. Configure-os na aba de Integração.' }), { status: 400 });
        }

        // 0. Validação Crítica de Assinatura via Servidor
        const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
        const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
        if (userId && supabaseUrl && serviceKey) {
            const supabaseAdmin = createClient(supabaseUrl, serviceKey);
            const { data: profiles } = await supabaseAdmin.from('profiles').select('subscription_status').eq('id', userId);
            const isSubscriber = profiles?.some(p => p.subscription_status === 'active');
            if (!isSubscriber) {
                return new Response(JSON.stringify({ error: 'Sua assinatura na plataforma encontra-se inativa no momento. Para criar deploys e repositórios, é necessário ter um plano ativo.' }), { status: 403 });
            }
        }

        const octokit = new Octokit({ auth: githubToken });
        const { data: user } = await octokit.users.getAuthenticated();
        const githubUsername = user.login;

        const safeRepoName = newRepoName
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // remove acentos
            .replace(/[^a-z0-9-]/g, '-') // caracteres especiais por hífen
            .replace(/-+/g, '-') // múltiplos hifens viram um só
            .replace(/^-|-$/g, ''); // remove do começo e final

        let cleanTemplate = templateRepo.trim()
            .replace('https://github.com/', '')
            .replace('http://github.com/', '')
            .replace('github.com/', '');
        if (cleanTemplate.endsWith('/')) cleanTemplate = cleanTemplate.slice(0, -1);

        const [templateOwner, templateName] = cleanTemplate.split('/');

        // 1. Criar repositório a partir do template
        let newRepoHtmlUrl = '';
        let githubRepoId = '';
        try {
            const res = await octokit.repos.createUsingTemplate({
                template_owner: templateOwner,
                template_repo: templateName,
                name: safeRepoName,
                private: true,
            });
            newRepoHtmlUrl = res.data.html_url;
            githubRepoId = res.data.id.toString();

            // Aguarda um pouco para o Github processar a criação do repo
            await new Promise(r => setTimeout(r, 3000));
        } catch (err: any) {
            return new Response(JSON.stringify({ error: 'Erro ao criar repositório no Github (verifique se já existe um com esse nome ou se o token tem permissão): ' + err.message }), { status: 400 });
        }

        // 2. Criar Projeto na Vercel
        let projectId = '';
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
            const vercelData = await vercelRes.json();
            if (!vercelRes.ok) throw new Error(vercelData.error?.message || 'Erro Vercel');
            projectId = vercelData.id;
        } catch (err: any) {
            return new Response(JSON.stringify({ error: 'Erro ao criar projeto na Vercel: ' + err.message }), { status: 400 });
        }

        // 3. Adicionar Variáveis de Ambiente do CMS
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
            headers: {
                'Authorization': `Bearer ${vercelToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(envVars)
        });

        if (!envRes.ok) {
            const errLog = await envRes.json();
            throw new Error(errLog.error?.message || 'Falha ao injetar variáveis de ambiente na Vercel');
        }
        // 4. Disparar o Deploy inicial 
        // Aguarda mais 3 segundos extras para garantir que o Github terminou de gerar os arquivos
        await new Promise(r => setTimeout(r, 3000));

        const deployRes = await fetch(`https://api.vercel.com/v13/deployments`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${vercelToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: safeRepoName,
                project: projectId,
                target: 'production',
                gitSource: {
                    type: 'github',
                    repoId: githubRepoId,
                    ref: 'main' // Branch padrão do Astro/Templates
                }
            })
        });

        if (!deployRes.ok) {
            const errLog = await deployRes.json();
            throw new Error('Projeto criado, mas falha ao forçar o Deploy: ' + (errLog.error?.message || 'Desconhecido'));
        }

        // 5. Guardar registro no Banco de Dados para controle (Webhook Wipeout)
        if (userId) {
            const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
            const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
            if (supabaseUrl && serviceKey) {
                const supabaseAdmin = createClient(supabaseUrl, serviceKey);
                await supabaseAdmin.from('user_sites').insert({
                    user_id: userId,
                    template_id: templateId || null,
                    github_owner: githubUsername,
                    github_repo: safeRepoName,
                    vercel_project_id: projectId
                });
            }
        }

        const deployData = await deployRes.json();

        return new Response(JSON.stringify({
            success: true,
            repoUrl: newRepoHtmlUrl,
            deploymentId: deployData.id
        }), { status: 200 });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
};
