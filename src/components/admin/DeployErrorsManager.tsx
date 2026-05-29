import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Pagination from '../ui/admin/Pagination';

const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

interface DeployError {
    refCode: string;
    timestamp: string;
    stage: string;
    userId?: string | null;
    userEmail?: string | null;
    templateId?: string | null;
    templateName?: string | null;
    repoName?: string | null;
    errorMessage: string;
    errorCode?: string | null;
    httpStatus?: number | null;
    buildLog?: string | null;
    inspectorUrl?: string | null;
    vercelDeploymentId?: string | null;
    githubRepoUrl?: string | null;
    rawResponse?: any;
}

const STAGE_LABELS: Record<string, { label: string; color: string }> = {
    github_repo:    { label: 'GitHub Repo',    color: 'bg-cream-elevated text-cafe-medio' },
    vercel_project: { label: 'Vercel Project', color: 'bg-coral-wash text-coral-terra' },
    env_vars:       { label: 'Env Vars',       color: 'bg-[oklch(94%_0.035_80)] text-[oklch(40%_0.110_80)]' },
    deploy_trigger: { label: 'Deploy Trigger', color: 'bg-[oklch(94%_0.045_50)] text-[oklch(45%_0.120_50)]' },
    build_failed:   { label: 'Build Failed',   color: 'bg-[oklch(94%_0.025_28)] text-vermelho-tijolo' },
};

export default function DeployErrorsManager() {
    const [errors, setErrors] = useState<DeployError[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const ERRORS_PAGE_SIZE = 20;
    useEffect(() => { setPage(1); }, [search]);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [total, setTotal] = useState(0);
    const [error, setError] = useState('');

    useEffect(() => { load(); }, []);

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                setError('Você precisa estar logado.');
                setLoading(false);
                return;
            }

            const res = await fetch('/api/admin/deploy-errors', {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || `Erro ${res.status}`);
            } else {
                setErrors(data.errors || []);
                setTotal(data.total || 0);
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const markResolved = async (refCode: string) => {
        if (!confirm(`Marcar ${refCode} como resolvido? (será removido do painel)`)) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`/api/admin/deploy-errors?ref=${refCode}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session?.access_token}` },
            });
            setErrors(prev => prev.filter(e => e.refCode !== refCode));
            setTotal(t => Math.max(0, t - 1));
        } catch {}
    };

    const filtered = errors.filter(e => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            e.refCode.toLowerCase().includes(q) ||
            (e.userEmail || '').toLowerCase().includes(q) ||
            (e.repoName || '').toLowerCase().includes(q) ||
            (e.templateName || '').toLowerCase().includes(q) ||
            e.errorMessage.toLowerCase().includes(q)
        );
    });

    if (loading) return <div className="p-8 text-center text-cafe-cinza-quente">Carregando erros…</div>;

    return (
        <div className="pb-8">
            {/* Header */}
            <div className="mb-6 flex flex-wrap gap-3 items-center border-b border-borda-cafe pb-4">
                <h1 className="font-display text-2xl md:text-[1.625rem] font-normal text-carvao-quente tracking-tight leading-tight mr-auto">
                    Logs de erros
                </h1>
                <span className="text-sm text-cafe-cinza-quente tabular-nums">
                    {total} {total === 1 ? 'erro' : 'erros'} {total > 50 && '(mostrando 50 mais recentes)'}
                </span>
                <button
                    type="button"
                    onClick={load}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-cafe-medio hover:text-coral-terra hover:bg-coral-wash rounded-[8px] transition-colors min-h-[36px]"
                >
                    Recarregar
                </button>
            </div>

            <div className="mb-4">
                <input
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por código, email, repo ou erro…"
                    className="w-full max-w-md px-4 py-2.5 bg-cream-elevated text-carvao-quente text-sm font-normal rounded-[10px] border border-borda-cafe focus:border-coral-terra focus:outline-none transition-colors placeholder:text-cafe-cinza-quente min-h-[40px]"
                />
            </div>

            {error && (
                <div className="mb-4 p-4 bg-[oklch(94%_0.025_28)] border border-[oklch(80%_0.080_28)] rounded-[10px] text-sm text-vermelho-tijolo">
                    {error}
                </div>
            )}

            {/* Lista */}
            {filtered.length === 0 ? (
                <div className="bg-cream-surface rounded-[12px] border border-borda-cafe p-12 text-center">
                    <p className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                        Nenhum erro encontrado.
                    </p>
                    <p className="text-sm text-cafe-cinza-quente mt-1">Tudo rodando limpo por aqui.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.slice((page - 1) * ERRORS_PAGE_SIZE, page * ERRORS_PAGE_SIZE).map(err => {
                        const stage = STAGE_LABELS[err.stage] || { label: err.stage, color: 'bg-cream-elevated text-cafe-medio' };
                        const isExpanded = expanded === err.refCode;
                        return (
                            <div key={err.refCode} className="bg-cream-surface rounded-[12px] border border-borda-cafe overflow-hidden">
                                <div
                                    className="p-4 flex items-start gap-4 cursor-pointer hover:bg-cream-elevated transition-colors"
                                    onClick={() => setExpanded(isExpanded ? null : err.refCode)}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <code className="text-xs font-mono bg-carvao-quente text-papel-craft px-2 py-0.5 rounded">{err.refCode}</code>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${stage.color}`}>{stage.label}</span>
                                            <span className="text-xs text-cafe-cinza-quente tabular-nums">
                                                {new Date(err.timestamp).toLocaleString('pt-BR')}
                                            </span>
                                        </div>
                                        <p className="text-sm font-semibold text-carvao-quente mt-1 line-clamp-2">{err.errorMessage}</p>
                                        <p className="text-xs text-cafe-cinza-quente mt-0.5">
                                            {err.userEmail || 'sem email'}
                                            {err.repoName && <> · <span className="font-mono">{err.repoName}</span></>}
                                            {err.templateName && <> · {err.templateName}</>}
                                        </p>
                                    </div>
                                    <button type="button" className="text-cafe-cinza-quente hover:text-coral-terra shrink-0 text-lg" aria-label={isExpanded ? 'Colapsar' : 'Expandir'}>
                                        {isExpanded ? '▼' : '▶'}
                                    </button>
                                </div>

                                {isExpanded && (
                                    <div className="border-t border-borda-cafe p-4 bg-cream-elevated/50 space-y-4">
                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                            {err.httpStatus && <div><span className="font-semibold text-cafe-medio">HTTP:</span> <span className="font-mono text-carvao-quente">{err.httpStatus}</span></div>}
                                            {err.errorCode && <div><span className="font-semibold text-cafe-medio">Code:</span> <span className="font-mono text-carvao-quente">{err.errorCode}</span></div>}
                                        </div>

                                        <div>
                                            <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em] mb-1">Mensagem de erro</p>
                                            <pre className="text-xs bg-cream-surface border border-borda-cafe rounded-[8px] p-3 overflow-x-auto whitespace-pre-wrap text-vermelho-tijolo">{err.errorMessage}</pre>
                                        </div>

                                        {err.buildLog && (
                                            <div>
                                                <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em] mb-1">Build log</p>
                                                <pre className="text-xs bg-carvao-quente text-papel-craft rounded-[8px] p-3 overflow-x-auto whitespace-pre-wrap max-h-64">{err.buildLog}</pre>
                                            </div>
                                        )}

                                        {err.rawResponse && (
                                            <details>
                                                <summary className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em] cursor-pointer hover:text-coral-terra">Raw response</summary>
                                                <pre className="text-xs bg-cream-surface border border-borda-cafe rounded-[8px] p-3 overflow-x-auto whitespace-pre-wrap mt-2 text-carvao-quente">{JSON.stringify(err.rawResponse, null, 2)}</pre>
                                            </details>
                                        )}

                                        <div className="flex gap-3 flex-wrap">
                                            {err.inspectorUrl && (
                                                <a href={err.inspectorUrl} target="_blank" rel="noopener" className="text-xs font-semibold text-coral-terra hover:text-terracota-profundo underline">
                                                    Ver log no Vercel →
                                                </a>
                                            )}
                                            {err.githubRepoUrl && (
                                                <a href={err.githubRepoUrl} target="_blank" rel="noopener" className="text-xs font-semibold text-coral-terra hover:text-terracota-profundo underline">
                                                    Repositório GitHub →
                                                </a>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => markResolved(err.refCode)}
                                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-verde-oliva text-papel-craft rounded-[10px] hover:bg-[oklch(35%_0.075_145)] transition-colors min-h-[40px]"
                                        >
                                            Marcar como resolvido
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <Pagination
                        page={page}
                        pageSize={ERRORS_PAGE_SIZE}
                        total={filtered.length}
                        onPageChange={setPage}
                        label="erros"
                    />
                </div>
            )}
        </div>
    );
}
