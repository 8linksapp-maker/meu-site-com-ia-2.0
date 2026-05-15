import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Lightbulb, Loader2, Search, ChevronDown, ChevronUp, ExternalLink,
    Calendar, User, Tag, Clock, Sparkles, BarChart3, Save, Check, X,
    Trophy, ThumbsUp, Flame,
} from 'lucide-react';

interface TemplateRequest {
    id: string;
    user_id: string;
    user_email: string;
    user_name: string;
    business_type: string;
    niche: string;
    target_audience: string;
    features: string[];
    content_scale: string;
    reference_urls: string[];
    style_preference: string;
    urgency: string;
    extra_notes: string;
    status: string;
    admin_note: string;
    created_at: string;
    won_week_start: string | null;
    production_target_date: string | null;
    votes_week?: number;
    votes_total?: number;
}

function getCurrentWeekStart(): string {
    const now = new Date();
    const dow = now.getUTCDay();
    const offset = (dow + 6) % 7;
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - offset);
    monday.setUTCHours(0, 0, 0, 0);
    return monday.toISOString().slice(0, 10);
}

function getNextWednesday(): string {
    const now = new Date();
    const dow = now.getUTCDay();
    const daysToSunday = (7 - dow) % 7 || 7;
    const launchOffsetDays = daysToSunday + 3;
    const launch = new Date(now);
    launch.setUTCDate(now.getUTCDate() + launchOffsetDays);
    launch.setUTCHours(0, 0, 0, 0);
    return launch.toISOString().slice(0, 10);
}

const BUSINESS_LABELS: Record<string, string> = {
    ecommerce: 'Loja Online',
    blog: 'Blog / Portal',
    landing: 'Landing Page',
    institucional: 'Site Institucional',
    'servicos-locais': 'Serviços Locais',
    restaurante: 'Restaurante / Café',
    portfolio: 'Portfólio',
    curso: 'Curso / Infoproduto',
    afiliados: 'Reviews / Afiliados',
    comunidade: 'Comunidade / Fórum',
    eventos: 'Eventos / Agendamento',
    imobiliaria: 'Imobiliária',
    saas: 'SaaS / Startup',
    outro: 'Outro',
};

const FEATURE_LABELS: Record<string, string> = {
    blog: 'Blog',
    loja: 'Loja',
    catalogo: 'Catálogo',
    'portfolio-galeria': 'Galeria',
    agendamento: 'Agendamento',
    'contato-avancado': 'Contato avançado',
    newsletter: 'Newsletter',
    whatsapp: 'WhatsApp',
    mapa: 'Mapa',
    'multi-idioma': 'Multi-idioma',
    'area-membros': 'Área membros',
    calculadora: 'Calculadora',
    depoimentos: 'Depoimentos',
    faq: 'FAQ',
    equipe: 'Equipe',
    'afiliados-ecommerce': 'Afiliados',
    pix: 'PIX',
    'pdf-download': 'PDF',
};

const STYLE_LABELS: Record<string, string> = {
    'moderno-minimalista': 'Moderno e minimalista',
    'colorido-vibrante': 'Colorido e vibrante',
    'elegante-sofisticado': 'Elegante e sofisticado',
    'profissional-corporativo': 'Profissional / corporativo',
    'divertido-casual': 'Divertido e casual',
    'rustico-natural': 'Rústico / natural',
    'tech-futurista': 'Tech / futurista',
    'nao-sei': 'Sem preferência',
};

const URGENCY_LABELS: Record<string, { label: string; color: string }> = {
    agora: { label: 'Agora', color: 'bg-red-100 text-red-700' },
    '30d': { label: '30 dias', color: 'bg-amber-100 text-amber-700' },
    '90d': { label: '90 dias', color: 'bg-blue-100 text-blue-700' },
    'sem-pressa': { label: 'Sem pressa', color: 'bg-slate-100 text-slate-700' },
};

const SCALE_LABELS: Record<string, string> = {
    '1-5': '1-5 páginas',
    '6-20': '6-20 páginas',
    '21-50': '21-50 páginas',
    '50+': '50+ páginas',
};

const STATUSES = [
    { value: 'new', label: 'Nova', color: 'bg-blue-100 text-blue-700' },
    { value: 'in_review', label: 'Em análise', color: 'bg-amber-100 text-amber-700' },
    { value: 'planned', label: 'Aprovada', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'in_progress', label: 'Em produção', color: 'bg-violet-100 text-violet-700' },
    { value: 'delivered', label: 'Entregue', color: 'bg-emerald-100 text-emerald-700' },
    { value: 'declined', label: 'Não viável', color: 'bg-gray-100 text-gray-600' },
];

export default function TemplateRequestsManager() {
    const [requests, setRequests] = useState<TemplateRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [urgencyFilter, setUrgencyFilter] = useState('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);

    useEffect(() => {
        load();
    }, []);

    async function load() {
        setLoading(true);
        setError('');
        try {
            const { data, error } = await supabase
                .from('template_requests')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            const list = (data as TemplateRequest[]) || [];
            const ids = list.map(r => r.id);
            const weekStart = getCurrentWeekStart();
            const weekMap: Record<string, number> = {};
            const totalMap: Record<string, number> = {};
            if (ids.length) {
                const { data: votes } = await supabase
                    .from('template_request_votes')
                    .select('request_id, week_start')
                    .in('request_id', ids);
                (votes || []).forEach((v: any) => {
                    totalMap[v.request_id] = (totalMap[v.request_id] || 0) + 1;
                    if (v.week_start === weekStart) weekMap[v.request_id] = (weekMap[v.request_id] || 0) + 1;
                });
            }
            setRequests(list.map(r => ({ ...r, votes_week: weekMap[r.id] || 0, votes_total: totalMap[r.id] || 0 })));
        } catch (e: any) {
            setError(e?.message || 'Erro ao carregar solicitações.');
        } finally {
            setLoading(false);
        }
    }

    async function markAsWeekChampion(id: string) {
        if (!confirm('Marcar essa solicitação como campeã da semana? Vai setar production_target_date pra próxima quarta e status pra "in_progress".')) return;
        setSavingId(id);
        try {
            const { error } = await supabase
                .from('template_requests')
                .update({
                    status: 'in_progress',
                    won_week_start: getCurrentWeekStart(),
                    production_target_date: getNextWednesday(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id);
            if (error) throw error;
            await load();
        } catch (e: any) {
            alert('Erro: ' + (e?.message || 'falha ao marcar'));
        } finally {
            setSavingId(null);
        }
    }

    async function updateStatus(id: string, status: string) {
        setSavingId(id);
        try {
            const { error } = await supabase
                .from('template_requests')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            setRequests(prev => prev.map(r => (r.id === id ? { ...r, status } : r)));
        } catch (e: any) {
            alert('Erro: ' + (e?.message || 'falha ao salvar'));
        } finally {
            setSavingId(null);
        }
    }

    async function saveNote(id: string, note: string) {
        setSavingId(id);
        try {
            const { error } = await supabase
                .from('template_requests')
                .update({ admin_note: note, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (error) throw error;
            setRequests(prev => prev.map(r => (r.id === id ? { ...r, admin_note: note } : r)));
        } catch (e: any) {
            alert('Erro: ' + (e?.message || 'falha ao salvar'));
        } finally {
            setSavingId(null);
        }
    }

    const filtered = useMemo(() => {
        return requests.filter(r => {
            if (statusFilter !== 'all' && r.status !== statusFilter) return false;
            if (typeFilter !== 'all' && r.business_type !== typeFilter) return false;
            if (urgencyFilter !== 'all' && r.urgency !== urgencyFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                const haystack = `${r.user_name} ${r.user_email} ${r.niche} ${r.target_audience} ${r.extra_notes} ${BUSINESS_LABELS[r.business_type] || r.business_type}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [requests, search, statusFilter, typeFilter, urgencyFilter]);

    const stats = useMemo(() => {
        const total = requests.length;
        const byStatus = STATUSES.reduce<Record<string, number>>((acc, s) => {
            acc[s.value] = requests.filter(r => r.status === s.value).length;
            return acc;
        }, {});
        const byType = Object.keys(BUSINESS_LABELS).reduce<Record<string, number>>((acc, t) => {
            const c = requests.filter(r => r.business_type === t).length;
            if (c > 0) acc[t] = c;
            return acc;
        }, {});
        const top3Types = Object.entries(byType).sort(([, a], [, b]) => b - a).slice(0, 3);
        const featureCounter: Record<string, number> = {};
        requests.forEach(r => r.features?.forEach(f => { featureCounter[f] = (featureCounter[f] || 0) + 1; }));
        const top3Features = Object.entries(featureCounter).sort(([, a], [, b]) => b - a).slice(0, 3);
        const urgent = requests.filter(r => r.urgency === 'agora' && ['new', 'in_review'].includes(r.status)).length;
        const openForVoting = requests.filter(r => ['new', 'in_review', 'planned', 'in_progress'].includes(r.status));
        const leader = openForVoting.reduce<TemplateRequest | null>((best, r) =>
            !best || (r.votes_week || 0) > (best.votes_week || 0) ? r : best, null);
        const totalVotesThisWeek = openForVoting.reduce((s, r) => s + (r.votes_week || 0), 0);
        return { total, byStatus, top3Types, top3Features, urgent, leader, totalVotesThisWeek };
    }, [requests]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-[#7c3aed]" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 border border-red-100 rounded-xl text-red-700">
                <p className="font-semibold mb-1">Erro ao carregar</p>
                <p className="text-sm">{error}</p>
                <p className="text-xs mt-3 text-red-600">
                    Possível causa: a tabela <code>template_requests</code> ainda não foi criada.
                    Rode o SQL em <code>supabase/migrations/20260515_template_requests.sql</code> no Supabase Studio.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatCard icon={Lightbulb} label="Total" value={stats.total} color="violet" />
                <StatCard icon={ThumbsUp} label="Votos esta semana" value={stats.totalVotesThisWeek} color="violet" />
                <StatCard icon={Clock} label="Urgentes pendentes" value={stats.urgent} color="red" />
                <StatCard icon={Sparkles} label="Novas" value={stats.byStatus.new || 0} color="blue" />
            </div>

            {/* Leader da semana */}
            {stats.leader && (stats.leader.votes_week || 0) > 0 && (
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-5">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center shrink-0">
                            <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700 flex items-center gap-1.5">
                                <Flame className="w-3 h-3" /> Líder da semana
                            </p>
                            <p className="text-lg font-bold text-gray-900 truncate">{stats.leader.niche}</p>
                            <p className="text-sm text-gray-600 mt-0.5">
                                {BUSINESS_LABELS[stats.leader.business_type] || stats.leader.business_type} ·
                                Pedido por <strong>{stats.leader.user_name}</strong> ·
                                <span className="text-amber-700 font-bold ml-1">{stats.leader.votes_week} votos</span>
                            </p>
                        </div>
                        {!stats.leader.won_week_start && (
                            <button
                                onClick={() => markAsWeekChampion(stats.leader!.id)}
                                disabled={savingId === stats.leader.id}
                                className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-sm font-bold rounded-xl shadow-sm transition-colors"
                            >
                                {savingId === stats.leader.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                                Marcar como campeã
                            </button>
                        )}
                    </div>
                </div>
            )}

            {(stats.top3Types.length > 0 || stats.top3Features.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {stats.top3Types.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <BarChart3 className="w-4 h-4 text-gray-400" />
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Tipos mais pedidos</p>
                            </div>
                            <div className="space-y-2">
                                {stats.top3Types.map(([type, count]) => (
                                    <div key={type} className="flex items-center justify-between text-sm">
                                        <span className="font-semibold text-gray-700">{BUSINESS_LABELS[type] || type}</span>
                                        <span className="text-[#7c3aed] font-bold">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {stats.top3Features.length > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="w-4 h-4 text-gray-400" />
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Funcionalidades mais pedidas</p>
                            </div>
                            <div className="space-y-2">
                                {stats.top3Features.map(([feature, count]) => (
                                    <div key={feature} className="flex items-center justify-between text-sm">
                                        <span className="font-semibold text-gray-700">{FEATURE_LABELS[feature] || feature}</span>
                                        <span className="text-[#7c3aed] font-bold">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Filtros */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-5 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar por nicho, email, audiência..."
                            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#7c3aed] focus:bg-white"
                        />
                    </div>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="md:col-span-3 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#7c3aed]">
                        <option value="all">Todos os status</option>
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label} ({stats.byStatus[s.value] || 0})</option>)}
                    </select>
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="md:col-span-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#7c3aed]">
                        <option value="all">Todos os tipos</option>
                        {Object.entries(BUSINESS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <select value={urgencyFilter} onChange={e => setUrgencyFilter(e.target.value)} className="md:col-span-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#7c3aed]">
                        <option value="all">Toda urgência</option>
                        {Object.entries(URGENCY_LABELS).map(([v, l]) => <option key={v} value={v}>{l.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Lista */}
            {filtered.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                    <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-600 font-semibold">Nenhuma solicitação encontrada</p>
                    <p className="text-sm text-gray-400 mt-1">Aguarde os alunos preencherem o formulário.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map(r => (
                        <RequestCard
                            key={r.id}
                            request={r}
                            expanded={expandedId === r.id}
                            onToggle={() => setExpandedId(prev => (prev === r.id ? null : r.id))}
                            onStatusChange={status => updateStatus(r.id, status)}
                            onNoteSave={note => saveNote(r.id, note)}
                            onMarkChampion={() => markAsWeekChampion(r.id)}
                            saving={savingId === r.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function StatCard({ icon: Icon, label, value, color }: {
    icon: React.ElementType; label: string; value: number; color: 'violet' | 'red' | 'blue' | 'emerald';
}) {
    const colors = {
        violet: 'from-violet-500 to-violet-600',
        red: 'from-red-500 to-red-600',
        blue: 'from-blue-500 to-blue-600',
        emerald: 'from-emerald-500 to-emerald-600',
    };
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${colors[color]} flex items-center justify-center mb-2`}>
                <Icon className="w-4 h-4 text-white" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
        </div>
    );
}

function RequestCard({ request, expanded, onToggle, onStatusChange, onNoteSave, onMarkChampion, saving }: {
    request: TemplateRequest;
    expanded: boolean;
    onToggle: () => void;
    onStatusChange: (s: string) => void;
    onNoteSave: (n: string) => void;
    onMarkChampion: () => void;
    saving: boolean;
}) {
    const [noteEdit, setNoteEdit] = useState(request.admin_note || '');
    const [noteDirty, setNoteDirty] = useState(false);
    const statusCfg = STATUSES.find(s => s.value === request.status) || STATUSES[0];
    const urgencyCfg = URGENCY_LABELS[request.urgency] || URGENCY_LABELS['sem-pressa'];

    useEffect(() => {
        setNoteEdit(request.admin_note || '');
        setNoteDirty(false);
    }, [request.id, request.admin_note]);

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-gray-300 transition-colors">
            <button onClick={onToggle} className="w-full flex items-center gap-4 p-4 text-left">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${statusCfg.color}`}>{statusCfg.label}</span>
                        {request.won_week_start && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                <Trophy className="w-3 h-3" /> Campeã
                            </span>
                        )}
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${urgencyCfg.color}`}>{urgencyCfg.label}</span>
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                            {BUSINESS_LABELS[request.business_type] || request.business_type}
                        </span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{request.niche}</p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {request.user_email}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(request.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-center px-2.5 py-1.5 bg-violet-50 text-violet-700 rounded-lg">
                        <div className="flex items-center gap-1 font-bold text-sm">
                            <ThumbsUp className="w-3.5 h-3.5" />
                            {request.votes_week || 0}
                        </div>
                        <p className="text-[9px] uppercase font-bold tracking-wider opacity-70">semana</p>
                    </div>
                    {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-5 pt-2 border-t border-gray-100 space-y-4 bg-gray-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                        <Field label="Público-alvo">{request.target_audience}</Field>
                        <Field label="Escala estimada">{SCALE_LABELS[request.content_scale] || request.content_scale}</Field>
                        <Field label="Estilo">{STYLE_LABELS[request.style_preference] || request.style_preference}</Field>
                        <Field label="Aluno">{request.user_name} <span className="text-gray-400">({request.user_email})</span></Field>
                    </div>

                    {request.features?.length > 0 && (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5"><Tag className="w-3 h-3" /> Funcionalidades</p>
                            <div className="flex flex-wrap gap-1.5">
                                {request.features.map(f => (
                                    <span key={f} className="text-xs font-semibold px-2.5 py-1 bg-violet-50 text-violet-700 rounded-md">
                                        {FEATURE_LABELS[f] || f}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {request.reference_urls?.length > 0 && (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">URLs de referência</p>
                            <div className="space-y-1">
                                {request.reference_urls.map((u, i) => (
                                    <a key={i} href={u} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{u}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {request.extra_notes && (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Notas do aluno</p>
                            <p className="text-sm text-gray-700 bg-white border border-gray-200 rounded-lg p-3 whitespace-pre-wrap">{request.extra_notes}</p>
                        </div>
                    )}

                    {/* Voting stats inline */}
                    <div className="flex items-center gap-3 flex-wrap text-xs">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-violet-100 text-violet-700 rounded-md font-bold">
                            <ThumbsUp className="w-3 h-3" />
                            {request.votes_week || 0} esta semana
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-md font-bold">
                            <ThumbsUp className="w-3 h-3" />
                            {request.votes_total || 0} total
                        </div>
                        {request.production_target_date && (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md font-bold">
                                <Sparkles className="w-3 h-3" />
                                Sai em {new Date(request.production_target_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </div>
                        )}
                    </div>

                    {/* Admin controls */}
                    <div className="pt-2 border-t border-gray-200">
                        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Ações do admin</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                            <select
                                value={request.status}
                                onChange={e => onStatusChange(e.target.value)}
                                disabled={saving}
                                className="md:col-span-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold focus:outline-none focus:border-[#7c3aed]"
                            >
                                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            {!request.won_week_start && (
                                <button
                                    onClick={onMarkChampion}
                                    disabled={saving}
                                    className="md:col-span-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-white rounded-lg text-sm font-bold transition-colors"
                                >
                                    <Trophy className="w-4 h-4" />
                                    Marcar campeã
                                </button>
                            )}
                            <a
                                href={`mailto:${request.user_email}?subject=Sua sugestão de template — ${encodeURIComponent(request.niche)}`}
                                className={`flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-semibold text-gray-700 transition-colors ${request.won_week_start ? 'md:col-span-2' : 'md:col-span-1'}`}
                            >
                                <ExternalLink className="w-4 h-4" />
                                Email
                            </a>
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-gray-600 mb-1 block">Nota interna</label>
                            <textarea
                                value={noteEdit}
                                onChange={e => { setNoteEdit(e.target.value); setNoteDirty(e.target.value !== (request.admin_note || '')); }}
                                rows={2}
                                placeholder="Notas internas — não visível pro aluno..."
                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#7c3aed]"
                            />
                            {noteDirty && (
                                <button
                                    onClick={() => onNoteSave(noteEdit)}
                                    disabled={saving}
                                    className="mt-2 flex items-center gap-2 px-3 py-1.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-semibold rounded-lg disabled:opacity-60"
                                >
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Salvar nota
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">{label}</p>
            <p className="text-sm text-gray-800">{children}</p>
        </div>
    );
}
