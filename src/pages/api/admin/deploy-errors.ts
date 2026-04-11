/**
 * /api/admin/deploy-errors — lista erros do repo privado platform-logs
 *
 * Usa o GITHUB_TOKEN da plataforma para ler os arquivos JSON.
 * Valida que quem chama é admin via Supabase auth.
 */

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

async function verifyAdmin(request: Request): Promise<boolean> {
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
    const serviceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';
    if (!supabaseUrl || !serviceKey) return false;

    const auth = request.headers.get('Authorization');
    const token = auth?.split('Bearer ')[1];
    if (!token) return false;

    try {
        const supabase = createClient(supabaseUrl, serviceKey, {
            auth: { autoRefreshToken: false, persistSession: false }
        });
        const { data: { user } } = await supabase.auth.getUser(token);
        if (!user) return false;

        const { data: profiles } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id);
        return profiles?.some(p => p.role === 'admin') || false;
    } catch {
        return false;
    }
}

export const GET: APIRoute = async ({ request }) => {
    if (!await verifyAdmin(request)) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
    }

    const ghToken = import.meta.env.PLATFORM_GITHUB_TOKEN
        || import.meta.env.GITHUB_TOKEN
        || process.env.PLATFORM_GITHUB_TOKEN
        || process.env.GITHUB_TOKEN
        || '';
    if (!ghToken) {
        return new Response(JSON.stringify({ error: 'GitHub token não configurado na plataforma' }), { status: 500 });
    }

    try {
        // 1. Listar arquivos em errors/
        const listRes = await fetch(
            `https://api.github.com/repos/8linksapp-maker/platform-logs/contents/errors`,
            {
                headers: {
                    'Authorization': `Bearer ${ghToken}`,
                    'Accept': 'application/vnd.github+json',
                },
            }
        );

        if (!listRes.ok) {
            return new Response(JSON.stringify({ error: 'Erro ao listar logs', errors: [] }), { status: 200 });
        }

        const files: any[] = await listRes.json();
        const errorFiles = files
            .filter(f => f.name.startsWith('ERR-') && f.name.endsWith('.json'))
            .sort((a, b) => b.name.localeCompare(a.name)); // mais recentes primeiro

        // 2. Baixar conteúdo de cada arquivo (limite 50 mais recentes)
        const errors = await Promise.all(
            errorFiles.slice(0, 50).map(async (f) => {
                try {
                    const res = await fetch(f.download_url, {
                        headers: { 'Authorization': `Bearer ${ghToken}` },
                    });
                    if (!res.ok) return null;
                    const data = await res.json();
                    return { ...data, _sha: f.sha };
                } catch {
                    return null;
                }
            })
        );

        return new Response(JSON.stringify({
            errors: errors.filter(Boolean).sort((a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            ),
            total: errorFiles.length,
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message, errors: [] }), { status: 500 });
    }
};

// DELETE — marca como resolvido (move para errors-resolved/)
export const DELETE: APIRoute = async ({ request }) => {
    if (!await verifyAdmin(request)) {
        return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
    }

    const url = new URL(request.url);
    const refCode = url.searchParams.get('ref');
    if (!refCode) {
        return new Response(JSON.stringify({ error: 'ref obrigatório' }), { status: 400 });
    }

    const ghToken = import.meta.env.PLATFORM_GITHUB_TOKEN
        || import.meta.env.GITHUB_TOKEN
        || process.env.PLATFORM_GITHUB_TOKEN
        || process.env.GITHUB_TOKEN
        || '';
    if (!ghToken) {
        return new Response(JSON.stringify({ error: 'GitHub token não configurado' }), { status: 500 });
    }

    try {
        // Pega SHA do arquivo atual
        const fileRes = await fetch(
            `https://api.github.com/repos/8linksapp-maker/platform-logs/contents/errors/${refCode}.json`,
            { headers: { 'Authorization': `Bearer ${ghToken}`, 'Accept': 'application/vnd.github+json' } }
        );
        if (!fileRes.ok) {
            return new Response(JSON.stringify({ error: 'Erro não encontrado' }), { status: 404 });
        }
        const fileData = await fileRes.json();

        // Delete
        await fetch(
            `https://api.github.com/repos/8linksapp-maker/platform-logs/contents/errors/${refCode}.json`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${ghToken}`,
                    'Accept': 'application/vnd.github+json',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: `resolved: ${refCode}`,
                    sha: fileData.sha,
                }),
            }
        );

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
