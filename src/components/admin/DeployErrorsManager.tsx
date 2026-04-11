import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

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
    github_repo: { label: 'GitHub Repo', color: 'bg-gray-100 text-gray-700' },
    vercel_project: { label: 'Vercel Project', color: 'bg-purple-100 text-purple-700' },
    env_vars: { label: 'Env Vars', color: 'bg-yellow-100 text-yellow-700' },
    deploy_trigger: { label: 'Deploy Trigger', color: 'bg-orange-100 text-orange-700' },
    build_failed: { label: 'Build Failed', color: 'bg-red-100 text-red-700' },
};

export default function DeployErrorsManager() {
    const [errors, setErrors] = useState<DeployError[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
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

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando erros...</div>;

    return (
        <div>
            {/* Header */}
            <div className="mb-4 flex flex-wrap gap-3 items-center">
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por código, email, repo ou erro..."
                    className="flex-1 min-w-[250px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                />
                <button
                    onClick={load}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700"
                >
                    Recarregar
                </button>
                <span className="text-sm text-gray-500">
                    {total} erro{total !== 1 ? 's' : ''} {total > 50 && '(mostrando 50 mais recentes)'}
                </span>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Lista */}
            {filtered.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
                    Nenhum erro encontrado. 🎉
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(err => {
                        const stage = STAGE_LABELS[err.stage] || { label: err.stage, color: 'bg-gray-100 text-gray-700' };
                        const isExpanded = expanded === err.refCode;
                        return (
                            <div key={err.refCode} className="bg-white rounded-lg border border-red-200 shadow-sm overflow-hidden">
                                <div
                                    className="p-4 flex items-start gap-4 cursor-pointer hover:bg-gray-50"
                                    onClick={() => setExpanded(isExpanded ? null : err.refCode)}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <code className="text-xs font-mono bg-slate-900 text-emerald-300 px-2 py-0.5 rounded">{err.refCode}</code>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${stage.color}`}>{stage.label}</span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(err.timestamp).toLocaleString('pt-BR')}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium text-gray-800 mt-1 line-clamp-2">{err.errorMessage}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {err.userEmail || 'sem email'}
                                            {err.repoName && <> · <span className="font-mono">{err.repoName}</span></>}
                                            {err.templateName && <> · {err.templateName}</>}
                                        </p>
                                    </div>
                                    <button className="text-gray-400 hover:text-gray-600 shrink-0 text-lg">
                                        {isExpanded ? '▼' : '▶'}
                                    </button>
                                </div>

                                {isExpanded && (
                                    <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                            {err.httpStatus && <div><span className="font-semibold text-gray-600">HTTP:</span> <span className="font-mono">{err.httpStatus}</span></div>}
                                            {err.errorCode && <div><span className="font-semibold text-gray-600">Code:</span> <span className="font-mono">{err.errorCode}</span></div>}
                                        </div>

                                        <div>
                                            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Mensagem de Erro</p>
                                            <pre className="text-xs bg-white border border-gray-200 rounded p-3 overflow-x-auto whitespace-pre-wrap text-red-700">{err.errorMessage}</pre>
                                        </div>

                                        {err.buildLog && (
                                            <div>
                                                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Build Log</p>
                                                <pre className="text-xs bg-slate-900 text-slate-100 rounded p-3 overflow-x-auto whitespace-pre-wrap max-h-64">{err.buildLog}</pre>
                                            </div>
                                        )}

                                        {err.rawResponse && (
                                            <details>
                                                <summary className="text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer">Raw Response</summary>
                                                <pre className="text-xs bg-white border border-gray-200 rounded p-3 overflow-x-auto whitespace-pre-wrap mt-2">{JSON.stringify(err.rawResponse, null, 2)}</pre>
                                            </details>
                                        )}

                                        <div className="flex gap-3 flex-wrap">
                                            {err.inspectorUrl && (
                                                <a href={err.inspectorUrl} target="_blank" rel="noopener" className="text-xs font-semibold text-violet-600 hover:text-violet-800">
                                                    → Ver log no Vercel
                                                </a>
                                            )}
                                            {err.githubRepoUrl && (
                                                <a href={err.githubRepoUrl} target="_blank" rel="noopener" className="text-xs font-semibold text-violet-600 hover:text-violet-800">
                                                    → Repositório GitHub
                                                </a>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => markResolved(err.refCode)}
                                            className="px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700"
                                        >
                                            Marcar como Resolvido
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
