/**
 * logDeployError.ts — Helper para registrar erros de deploy
 *
 * Estratégia dupla:
 * 1. Tenta salvar no Supabase (deploy_errors) — se a tabela existir
 * 2. SEMPRE loga no console (aparece nos Vercel Function Logs)
 * 3. SEMPRE retorna um refCode pro aluno mostrar ao suporte
 */

import { createClient } from '@supabase/supabase-js';

interface LogErrorInput {
    userId?: string;
    userEmail?: string;
    stage: 'github_repo' | 'vercel_project' | 'env_vars' | 'deploy_trigger' | 'build_failed';
    templateId?: string;
    templateName?: string;
    repoName?: string;
    errorMessage: string;
    errorCode?: string;
    httpStatus?: number;
    buildLog?: string;
    inspectorUrl?: string;
    vercelDeploymentId?: string;
    githubRepoUrl?: string;
    rawResponse?: any;
}

function generateRefCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'ERR-';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

export async function logDeployError(input: LogErrorInput): Promise<string> {
    const refCode = generateRefCode();

    // 1. SEMPRE logar no console (aparece nos Vercel Function Logs da plataforma)
    //    Formato estruturado para facilitar busca por refCode
    console.error('[DEPLOY_ERROR]', JSON.stringify({
        refCode,
        timestamp: new Date().toISOString(),
        stage: input.stage,
        userEmail: input.userEmail,
        templateName: input.templateName,
        repoName: input.repoName,
        errorMessage: input.errorMessage,
        errorCode: input.errorCode,
        httpStatus: input.httpStatus,
        inspectorUrl: input.inspectorUrl,
        githubRepoUrl: input.githubRepoUrl,
        buildLog: input.buildLog?.substring(0, 2000),
        rawResponse: input.rawResponse,
    }, null, 2));

    const payload = {
        refCode,
        timestamp: new Date().toISOString(),
        stage: input.stage,
        userId: input.userId || null,
        userEmail: input.userEmail || null,
        templateId: input.templateId || null,
        templateName: input.templateName || null,
        repoName: input.repoName || null,
        errorMessage: input.errorMessage,
        errorCode: input.errorCode || null,
        httpStatus: input.httpStatus || null,
        buildLog: input.buildLog || null,
        inspectorUrl: input.inspectorUrl || null,
        vercelDeploymentId: input.vercelDeploymentId || null,
        githubRepoUrl: input.githubRepoUrl || null,
        rawResponse: input.rawResponse || null,
        resolved: false,
    };

    // 2. SEMPRE tenta salvar no repo privado platform-logs via GitHub API
    const ghToken = import.meta.env.PLATFORM_GITHUB_TOKEN
        || import.meta.env.GITHUB_TOKEN
        || process.env.PLATFORM_GITHUB_TOKEN
        || process.env.GITHUB_TOKEN
        || '';
    if (ghToken) {
        try {
            const content = Buffer.from(JSON.stringify(payload, null, 2)).toString('base64');
            const path = `errors/${refCode}.json`;
            const res = await fetch(
                `https://api.github.com/repos/8linksapp-maker/platform-logs/contents/${path}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${ghToken}`,
                        'Accept': 'application/vnd.github+json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: `log: ${refCode} ${input.stage}`,
                        content,
                    }),
                }
            );
            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                console.error('[logDeployError] GitHub write failed:', res.status, e.message);
            }
        } catch (e: any) {
            console.error('[logDeployError] GitHub exception:', e.message);
        }
    }

    // 3. Tenta Supabase também (se estiver configurado — opcional)
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
    const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (supabaseUrl && serviceKey) {
        try {
            const supabase = createClient(supabaseUrl, serviceKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            });
            await supabase.from('deploy_errors').insert({
                ref_code: refCode,
                user_id: input.userId || null,
                user_email: input.userEmail || null,
                stage: input.stage,
                template_id: input.templateId || null,
                template_name: input.templateName || null,
                repo_name: input.repoName || null,
                error_message: input.errorMessage,
                error_code: input.errorCode || null,
                http_status: input.httpStatus || null,
                build_log: input.buildLog || null,
                inspector_url: input.inspectorUrl || null,
                vercel_deployment_id: input.vercelDeploymentId || null,
                github_repo_url: input.githubRepoUrl || null,
                raw_response: input.rawResponse || null,
            });
        } catch { /* silencioso — se tabela não existe, ignora */ }
    }

    return refCode;
}
