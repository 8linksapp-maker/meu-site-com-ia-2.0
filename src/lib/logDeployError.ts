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

    // 2. Tenta salvar no Supabase (só funciona se a migration foi aplicada)
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
    const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (supabaseUrl && serviceKey) {
        try {
            const supabase = createClient(supabaseUrl, serviceKey, {
                auth: { autoRefreshToken: false, persistSession: false }
            });
            const { error } = await supabase.from('deploy_errors').insert({
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
            if (error && error.code !== 'PGRST205') {
                console.error('[logDeployError] Supabase insert failed:', error.code, error.message);
            }
        } catch (e: any) {
            console.error('[logDeployError] Exception:', e.message);
        }
    }

    return refCode;
}
