/**
 * deployHook.ts — Helpers idempotentes pra Deploy Hook + env DEPLOY_HOOK_URL.
 *
 * Usado em 2 lugares:
 * 1. Provisionamento de site novo (deploy.ts) — com retry pra evitar drop por glitch transitório
 * 2. Self-healing (api/admin/ensure-deploy-hook.ts) — recupera sites antigos sem hook
 */

const HOOK_NAME = 'CMS Deploy';
const ENV_KEY = 'DEPLOY_HOOK_URL';

export interface CreateHookResult {
    url: string | null;
    attempts: number;
    lastError?: string;
}

/** Lê os deploy hooks já existentes no projeto Vercel. */
export async function fetchExistingHook(vercelToken: string, projectId: string): Promise<string | null> {
    const r = await fetch(`https://api.vercel.com/v9/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${vercelToken}` },
    });
    if (!r.ok) return null;
    const proj = await r.json();
    const hooks = proj?.link?.deployHooks ?? [];
    const existing = hooks
        .filter((h: any) => h.name === HOOK_NAME)
        .sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0];
    return existing?.url ?? null;
}

/** Cria deploy hook com retry exponencial. Backoff: 1s, 3s, 5s. */
export async function createDeployHookWithRetry(
    vercelToken: string,
    projectId: string,
    opts: { tries?: number } = {}
): Promise<CreateHookResult> {
    const tries = opts.tries ?? 3;
    const delays = [1000, 3000, 5000]; // ms entre tentativas
    let lastError: string | undefined;

    for (let i = 0; i < tries; i++) {
        try {
            const r = await fetch(`https://api.vercel.com/v1/projects/${projectId}/deploy-hooks`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: HOOK_NAME, ref: 'main' }),
            });
            if (r.ok) {
                const data = await r.json();
                const hooks = data?.link?.deployHooks ?? [];
                const fresh = hooks
                    .filter((h: any) => h.name === HOOK_NAME)
                    .sort((a: any, b: any) => (b.createdAt ?? 0) - (a.createdAt ?? 0))[0];
                if (fresh?.url) return { url: fresh.url, attempts: i + 1 };
                lastError = 'resposta sem hook url';
            } else {
                const txt = await r.text().catch(() => '');
                lastError = `HTTP ${r.status}: ${txt.slice(0, 150)}`;
            }
        } catch (e: any) {
            lastError = e?.message || 'fetch exception';
        }
        if (i < tries - 1) await new Promise(res => setTimeout(res, delays[i] ?? 5000));
    }
    return { url: null, attempts: tries, lastError };
}

/** POST env DEPLOY_HOOK_URL no projeto. Se já existir (409), faz PATCH. Idempotente. */
export async function ensureDeployHookEnv(
    vercelToken: string,
    projectId: string,
    hookUrl: string
): Promise<{ ok: boolean; mode: 'created' | 'updated' | 'failed'; lastError?: string }> {
    const post = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            key: ENV_KEY,
            value: hookUrl,
            type: 'encrypted',
            target: ['production', 'preview', 'development'],
        }),
    });
    if (post.ok) return { ok: true, mode: 'created' };

    const txt = await post.text().catch(() => '');
    if (post.status === 409 || /already exists/i.test(txt)) {
        // Já existe: descobre o id e faz PATCH
        const list = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, {
            headers: { Authorization: `Bearer ${vercelToken}` },
        }).then(r => r.json()).catch(() => ({}));
        const cur = (list.envs || []).find((e: any) => e.key === ENV_KEY);
        if (!cur) return { ok: false, mode: 'failed', lastError: 'POST 409 mas GET não encontrou env' };
        const patch = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${cur.id}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${vercelToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                value: hookUrl,
                type: 'encrypted',
                target: ['production', 'preview', 'development'],
            }),
        });
        return patch.ok
            ? { ok: true, mode: 'updated' }
            : { ok: false, mode: 'failed', lastError: `PATCH HTTP ${patch.status}` };
    }
    return { ok: false, mode: 'failed', lastError: `POST HTTP ${post.status}: ${txt.slice(0, 150)}` };
}

export interface EnsureHookResult {
    ok: boolean;
    alreadyHad: boolean;
    hookUrl: string | null;
    attempts: number;
    lastError?: string;
}

/**
 * Garante que o projeto tem env DEPLOY_HOOK_URL apontando pra um hook válido.
 * - Se a env já existe → no-op (alreadyHad: true)
 * - Se hook existe mas falta env → reusa hook + cria env
 * - Se nada existe → cria hook (com retry) + cria env
 */
export async function ensureProjectHasDeployHook(
    vercelToken: string,
    projectId: string
): Promise<EnsureHookResult> {
    // 1. Env já existe?
    const list = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env`, {
        headers: { Authorization: `Bearer ${vercelToken}` },
    }).then(r => r.json()).catch(() => ({}));
    const existingEnv = (list.envs || []).find((e: any) => e.key === ENV_KEY);
    if (existingEnv) return { ok: true, alreadyHad: true, hookUrl: null, attempts: 0 };

    // 2. Tem hook salvo no projeto mas falta env (raro, mas possível)?
    let hookUrl = await fetchExistingHook(vercelToken, projectId);
    let attempts = 0;

    // 3. Se não tem hook, cria com retry
    if (!hookUrl) {
        const created = await createDeployHookWithRetry(vercelToken, projectId);
        attempts = created.attempts;
        if (!created.url) {
            return { ok: false, alreadyHad: false, hookUrl: null, attempts, lastError: created.lastError };
        }
        hookUrl = created.url;
    }

    // 4. Cria env DEPLOY_HOOK_URL
    const envSet = await ensureDeployHookEnv(vercelToken, projectId, hookUrl);
    if (!envSet.ok) {
        return { ok: false, alreadyHad: false, hookUrl, attempts, lastError: envSet.lastError };
    }

    return { ok: true, alreadyHad: false, hookUrl, attempts };
}
