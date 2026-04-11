/**
 * logDeployError.ts — Helper para registrar erros de deploy no Supabase
 *
 * Retorna um código curto de referência (ERR-XXXXXX) para mostrar ao aluno.
 * Todos os erros ficam no admin em /admin/errors para suporte.
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
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
    const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !serviceKey) {
        console.error('[logDeployError] Supabase not configured');
        return 'ERR-XXXXXX';
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const refCode = generateRefCode();

    try {
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

        if (error) {
            console.error('[logDeployError] Failed to save:', error);
        }
    } catch (e) {
        console.error('[logDeployError] Exception:', e);
    }

    return refCode;
}
