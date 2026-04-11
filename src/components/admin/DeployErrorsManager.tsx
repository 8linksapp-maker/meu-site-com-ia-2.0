import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

interface DeployError {
    id: string;
    ref_code: string;
    user_email: string | null;
    stage: string;
    template_name: string | null;
    repo_name: string | null;
    error_message: string;
    error_code: string | null;
    http_status: number | null;
    build_log: string | null;
    inspector_url: string | null;
    github_repo_url: string | null;
    raw_response: any;
    resolved: boolean;
    notes: string | null;
    created_at: string;
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
    const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved');
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        load();
    }, [filter]);

    const load = async () => {
        setLoading(true);
        let query = supabase.from('deploy_errors').select('*').order('created_at', { ascending: false }).limit(200);
        if (filter === 'unresolved') query = query.eq('resolved', false);
        if (filter === 'resolved') query = query.eq('resolved', true);
        const { data, error } = await query;
        if (!error && data) setErrors(data as DeployError[]);
        setLoading(false);
    };

    const toggleResolved = async (id: string, current: boolean) => {
        await supabase.from('deploy_errors').update({ resolved: !current }).eq('id', id);
        setErrors(prev => prev.map(e => e.id === id ? { ...e, resolved: !current } : e));
    };

    const updateNotes = async (id: string, notes: string) => {
        await supabase.from('deploy_errors').update({ notes }).eq('id', id);
        setErrors(prev => prev.map(e => e.id === id ? { ...e, notes } : e));
    };

    const filtered = errors.filter(e => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            e.ref_code.toLowerCase().includes(q) ||
            (e.user_email || '').toLowerCase().includes(q) ||
            (e.repo_name || '').toLowerCase().includes(q) ||
            (e.template_name || '').toLowerCase().includes(q) ||
            e.error_message.toLowerCase().includes(q)
        );
    });

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando erros...</div>;

    return (
        <div>
            {/* Filtros */}
            <div className="mb-4 flex flex-wrap gap-3 items-center">
                <div className="flex gap-2 bg-gray-100 rounded-lg p-1">
                    {(['unresolved', 'resolved', 'all'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                filter === f ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            {f === 'unresolved' ? 'Abertos' : f === 'resolved' ? 'Resolvidos' : 'Todos'}
                        </button>
                    ))}
                </div>
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por código, email, repo ou erro..."
                    className="flex-1 min-w-[300px] px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                />
                <button
                    onClick={load}
                    className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700"
                >
                    Recarregar
                </button>
            </div>

            {/* Lista */}
            {filtered.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-500">
                    Nenhum erro encontrado.
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(err => {
                        const stage = STAGE_LABELS[err.stage] || { label: err.stage, color: 'bg-gray-100 text-gray-700' };
                        const isExpanded = expanded === err.id;
                        return (
                            <div key={err.id} className={`bg-white rounded-lg border ${err.resolved ? 'border-gray-200 opacity-60' : 'border-red-200'} shadow-sm overflow-hidden`}>
                                {/* Header */}
                                <div
                                    className="p-4 flex items-start gap-4 cursor-pointer hover:bg-gray-50"
                                    onClick={() => setExpanded(isExpanded ? null : err.id)}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <code className="text-xs font-mono bg-slate-900 text-emerald-300 px-2 py-0.5 rounded">{err.ref_code}</code>
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${stage.color}`}>{stage.label}</span>
                                            {err.resolved && <span className="text-xs font-semibold px-2 py-0.5 rounded bg-green-100 text-green-700">✓ Resolvido</span>}
                                            <span className="text-xs text-gray-500">{new Date(err.created_at).toLocaleString('pt-BR')}</span>
                                        </div>
                                        <p className="text-sm font-medium text-gray-800 mt-1 truncate">{err.error_message}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {err.user_email || 'sem email'}
                                            {err.repo_name && <> · <span className="font-mono">{err.repo_name}</span></>}
                                            {err.template_name && <> · tema: {err.template_name}</>}
                                        </p>
                                    </div>
                                    <button className="text-gray-400 hover:text-gray-600 shrink-0">
                                        {isExpanded ? '▼' : '▶'}
                                    </button>
                                </div>

                                {/* Expanded */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-4">
                                        {/* Details */}
                                        <div className="grid grid-cols-2 gap-4 text-xs">
                                            {err.http_status && (
                                                <div><span className="font-semibold text-gray-600">HTTP:</span> <span className="font-mono">{err.http_status}</span></div>
                                            )}
                                            {err.error_code && (
                                                <div><span className="font-semibold text-gray-600">Code:</span> <span className="font-mono">{err.error_code}</span></div>
                                            )}
                                        </div>

                                        {/* Error message */}
                                        <div>
                                            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Mensagem de Erro</p>
                                            <pre className="text-xs bg-white border border-gray-200 rounded p-3 overflow-x-auto whitespace-pre-wrap text-red-700">{err.error_message}</pre>
                                        </div>

                                        {/* Build log */}
                                        {err.build_log && (
                                            <div>
                                                <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Build Log</p>
                                                <pre className="text-xs bg-slate-900 text-slate-100 rounded p-3 overflow-x-auto whitespace-pre-wrap max-h-64">{err.build_log}</pre>
                                            </div>
                                        )}

                                        {/* Raw response */}
                                        {err.raw_response && (
                                            <details>
                                                <summary className="text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer">Raw Response</summary>
                                                <pre className="text-xs bg-white border border-gray-200 rounded p-3 overflow-x-auto whitespace-pre-wrap mt-2">{JSON.stringify(err.raw_response, null, 2)}</pre>
                                            </details>
                                        )}

                                        {/* Links */}
                                        <div className="flex gap-3 flex-wrap">
                                            {err.inspector_url && (
                                                <a href={err.inspector_url} target="_blank" rel="noopener" className="text-xs font-semibold text-violet-600 hover:text-violet-800">
                                                    → Ver log completo no Vercel
                                                </a>
                                            )}
                                            {err.github_repo_url && (
                                                <a href={err.github_repo_url} target="_blank" rel="noopener" className="text-xs font-semibold text-violet-600 hover:text-violet-800">
                                                    → Repositório GitHub
                                                </a>
                                            )}
                                        </div>

                                        {/* Notas */}
                                        <div>
                                            <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">Notas</p>
                                            <textarea
                                                defaultValue={err.notes || ''}
                                                onBlur={e => updateNotes(err.id, e.target.value)}
                                                placeholder="Adicione notas sobre este erro..."
                                                rows={2}
                                                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-violet-500"
                                            />
                                        </div>

                                        {/* Action */}
                                        <button
                                            onClick={() => toggleResolved(err.id, err.resolved)}
                                            className={`px-4 py-2 text-sm font-semibold rounded-lg ${
                                                err.resolved
                                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                    : 'bg-green-600 text-white hover:bg-green-700'
                                            }`}
                                        >
                                            {err.resolved ? 'Reabrir' : 'Marcar como Resolvido'}
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
