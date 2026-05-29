import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Lightbulb, Loader2, Search, ChevronDown, ChevronUp, ExternalLink,
    Calendar, User, Tag, Sparkles, BarChart3, Save, Check,
    Trophy, ThumbsUp, Flame, Mail,
} from 'lucide-react';
import { PageHeader, StatusBadge } from '../ui/admin';
import Pagination from '../ui/admin/Pagination';
import type { StatusTone } from '../ui/admin';
import { Card, Banner, Textarea } from '../ui';

interface TemplateRequest {
    id: string;
    user_id: string;
    user_email: string;
    user_name: string;
    business_type: string;
    niche: string;
    target_audience?: string;
    features: string[];
    content_scale?: string;
    reference_urls: string[];
    style_preference: string;
    urgency?: string;
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
    const sunday = new Date(now);
    sunday.setUTCDate(now.getUTCDate() - dow);
    sunday.setUTCHours(0, 0, 0, 0);
    return sunday.toISOString().slice(0, 10);
}

function getNextFridayLaunch(): string {
    const now = new Date();
    const dow = now.getUTCDay();
    const daysToFriday = (5 - dow + 7) % 7 || 7;
    const friday = new Date(now);
    friday.setUTCDate(now.getUTCDate() + daysToFriday);
    friday.setUTCHours(0, 0, 0, 0);
    return friday.toISOString().slice(0, 10);
}

const BUSINESS_LABELS: Record<string, string> = {
    ecommerce: 'Loja Online', blog: 'Blog / Portal', landing: 'Landing Page',
    institucional: 'Site Institucional', 'servicos-locais': 'Serviços Locais',
    restaurante: 'Restaurante / Café', portfolio: 'Portfólio', curso: 'Curso / Infoproduto',
    afiliados: 'Reviews / Afiliados', comunidade: 'Comunidade / Fórum',
    eventos: 'Eventos / Agendamento', imobiliaria: 'Imobiliária', saas: 'SaaS / Startup',
    outro: 'Outro',
};

const FEATURE_LABELS: Record<string, string> = {
    blog: 'Blog', loja: 'Loja', catalogo: 'Catálogo', 'portfolio-galeria': 'Galeria',
    agendamento: 'Agendamento', 'contato-avancado': 'Contato avançado', newsletter: 'Newsletter',
    whatsapp: 'WhatsApp', mapa: 'Mapa', 'multi-idioma': 'Multi-idioma',
    'area-membros': 'Área membros', calculadora: 'Calculadora', depoimentos: 'Depoimentos',
    faq: 'FAQ', equipe: 'Equipe', 'afiliados-ecommerce': 'Afiliados', pix: 'PIX', 'pdf-download': 'PDF',
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

const SCALE_LABELS: Record<string, string> = {
    '1-5': '1-5 páginas', '6-20': '6-20 páginas', '21-50': '21-50 páginas', '50+': '50+ páginas',
};

const STATUSES: { value: string; label: string; tone: StatusTone }[] = [
    { value: 'new',         label: 'Nova',         tone: 'info' },
    { value: 'in_review',   label: 'Em análise',   tone: 'pending' },
    { value: 'planned',     label: 'Aprovada',     tone: 'success' },
    { value: 'in_progress', label: 'Em produção',  tone: 'active' },
    { value: 'delivered',   label: 'Entregue',     tone: 'success' },
    { value: 'declined',    label: 'Não viável',   tone: 'neutral' },
];

export default function TemplateRequestsManager() {
    const [requests, setRequests] = useState<TemplateRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [page, setPage] = useState(1);
    const REQUESTS_PAGE_SIZE = 15;
    useEffect(() => { setPage(1); }, [search, statusFilter, typeFilter]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [savingId, setSavingId] = useState<string | null>(null);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        setError('');
        try {
            const { data, error: e } = await supabase
                .from('template_requests')
                .select('*')
                .order('created_at', { ascending: false });
            if (e) throw e;
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
                (votes || []).forEach((v: { request_id: string; week_start: string }) => {
                    totalMap[v.request_id] = (totalMap[v.request_id] || 0) + 1;
                    if (v.week_start === weekStart) weekMap[v.request_id] = (weekMap[v.request_id] || 0) + 1;
                });
            }
            setRequests(list.map(r => ({ ...r, votes_week: weekMap[r.id] || 0, votes_total: totalMap[r.id] || 0 })));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Erro ao carregar.');
        } finally {
            setLoading(false);
        }
    }

    async function markAsWeekChampion(id: string) {
        if (!confirm('Marcar como campeã da semana? Vai setar status pra "Em produção" + data de launch pra próxima sexta 19h BRT.')) return;
        setSavingId(id);
        try {
            const { error: e } = await supabase
                .from('template_requests')
                .update({
                    status: 'in_progress',
                    won_week_start: getCurrentWeekStart(),
                    production_target_date: getNextFridayLaunch(),
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id);
            if (e) throw e;
            await load();
        } catch (e: unknown) {
            alert('Erro: ' + (e instanceof Error ? e.message : 'falha'));
        } finally {
            setSavingId(null);
        }
    }

    async function updateStatus(id: string, status: string) {
        setSavingId(id);
        try {
            const { error: e } = await supabase
                .from('template_requests')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (e) throw e;
            setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        } catch (e: unknown) {
            alert('Erro: ' + (e instanceof Error ? e.message : 'falha'));
        } finally {
            setSavingId(null);
        }
    }

    async function saveNote(id: string, note: string) {
        setSavingId(id);
        try {
            const { error: e } = await supabase
                .from('template_requests')
                .update({ admin_note: note, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (e) throw e;
            setRequests(prev => prev.map(r => r.id === id ? { ...r, admin_note: note } : r));
        } catch (e: unknown) {
            alert('Erro: ' + (e instanceof Error ? e.message : 'falha'));
        } finally {
            setSavingId(null);
        }
    }

    const filtered = useMemo(() => {
        return requests.filter(r => {
            if (statusFilter !== 'all' && r.status !== statusFilter) return false;
            if (typeFilter !== 'all' && r.business_type !== typeFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                const haystack = `${r.user_name} ${r.user_email} ${r.niche} ${r.extra_notes} ${BUSINESS_LABELS[r.business_type] || r.business_type}`.toLowerCase();
                if (!haystack.includes(q)) return false;
            }
            return true;
        });
    }, [requests, search, statusFilter, typeFilter]);

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
        const openForVoting = requests.filter(r => ['new', 'in_review', 'planned', 'in_progress'].includes(r.status));
        const leader = openForVoting.reduce<TemplateRequest | null>((best, r) =>
            !best || (r.votes_week || 0) > (best.votes_week || 0) ? r : best, null);
        const totalVotesThisWeek = openForVoting.reduce((s, r) => s + (r.votes_week || 0), 0);
        return { total, byStatus, top3Types, top3Features, leader, totalVotesThisWeek };
    }, [requests]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-coral-terra" />
                <p className="text-cafe-medio text-sm">Carregando sugestões…</p>
            </div>
        );
    }

    if (error) {
        return (
            <Banner tone="error" title="Erro ao carregar">
                {error}
                <span className="block mt-1 text-xs">
                    Possível causa: tabela <code className="font-mono">template_requests</code> não criada.
                    Rode <code className="font-mono">supabase/migrations/20260515_template_requests.sql</code>.
                </span>
            </Banner>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            <PageHeader
                title="Sugestões de templates"
                tagline="Solicitações dos alunos pra criar templates novos. Mais votada vira o template da semana."
            />

            {/* Stats em linha editorial */}
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-borda-cafe border-y border-borda-cafe py-5">
                <StatItem icon={Lightbulb} label="Total" value={stats.total} />
                <StatItem icon={ThumbsUp} label="Votos esta semana" value={stats.totalVotesThisWeek} highlight />
                <StatItem icon={Sparkles} label="Novas" value={stats.byStatus.new || 0} />
                <StatItem icon={Check} label="Entregues" value={stats.byStatus.delivered || 0} />
            </div>

            {/* Leader da semana */}
            {stats.leader && (stats.leader.votes_week || 0) > 0 && (
                <Card padding="lg" className="!border-mostarda-amber/40 !bg-[oklch(96%_0.025_80)]">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-mostarda-amber flex items-center justify-center shrink-0">
                            <Trophy className="w-5 h-5 text-carvao-quente" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[oklch(40%_0.110_80)] flex items-center gap-1.5">
                                <Flame className="w-3 h-3" /> Líder da semana
                            </p>
                            <p className="font-display text-xl font-normal text-carvao-quente tracking-tight truncate mt-0.5">
                                {stats.leader.niche}
                            </p>
                            <p className="text-sm text-cafe-medio mt-0.5">
                                {BUSINESS_LABELS[stats.leader.business_type] || stats.leader.business_type}
                                {' · Pedido por '}
                                <strong className="text-carvao-quente">{stats.leader.user_name}</strong>
                                {' · '}
                                <span className="text-coral-terra font-semibold">{stats.leader.votes_week} {stats.leader.votes_week === 1 ? 'voto' : 'votos'}</span>
                            </p>
                        </div>
                        {!stats.leader.won_week_start && (
                            <button
                                type="button"
                                onClick={() => markAsWeekChampion(stats.leader!.id)}
                                disabled={savingId === stats.leader.id}
                                className="shrink-0 inline-flex items-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-4 py-2.5 rounded-[10px] font-semibold text-sm transition-colors disabled:opacity-60 min-h-[40px]"
                            >
                                {savingId === stats.leader.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
                                Marcar como campeã
                            </button>
                        )}
                    </div>
                </Card>
            )}

            {/* Top types + features */}
            {(stats.top3Types.length > 0 || stats.top3Features.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stats.top3Types.length > 0 && (
                        <Card padding="md" className="space-y-3">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-cafe-cinza-quente" />
                                <p className="text-xs font-bold uppercase tracking-[0.12em] text-cafe-cinza-quente">
                                    Tipos mais pedidos
                                </p>
                            </div>
                            <div className="space-y-2">
                                {stats.top3Types.map(([type, count]) => (
                                    <div key={type} className="flex items-center justify-between text-sm">
                                        <span className="font-semibold text-carvao-quente">{BUSINESS_LABELS[type] || type}</span>
                                        <span className="text-coral-terra font-semibold tabular-nums">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                    {stats.top3Features.length > 0 && (
                        <Card padding="md" className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-cafe-cinza-quente" />
                                <p className="text-xs font-bold uppercase tracking-[0.12em] text-cafe-cinza-quente">
                                    Funcionalidades mais pedidas
                                </p>
                            </div>
                            <div className="space-y-2">
                                {stats.top3Features.map(([feature, count]) => (
                                    <div key={feature} className="flex items-center justify-between text-sm">
                                        <span className="font-semibold text-carvao-quente">{FEATURE_LABELS[feature] || feature}</span>
                                        <span className="text-coral-terra font-semibold tabular-nums">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>
            )}

            {/* Filtros */}
            <Card padding="md">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-6 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cafe-cinza-quente" />
                        <input
                            type="search"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Buscar por nicho, email, aluno…"
                            className="w-full pl-9 pr-4 py-2.5 bg-cream-surface border border-borda-cafe rounded-[10px] text-sm focus:outline-none focus:border-coral-terra min-h-[40px]"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                        className="md:col-span-3 px-3 py-2.5 bg-cream-surface border border-borda-cafe rounded-[10px] text-sm focus:outline-none focus:border-coral-terra min-h-[40px]"
                    >
                        <option value="all">Todos status</option>
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label} ({stats.byStatus[s.value] || 0})</option>)}
                    </select>
                    <select
                        value={typeFilter}
                        onChange={e => setTypeFilter(e.target.value)}
                        className="md:col-span-3 px-3 py-2.5 bg-cream-surface border border-borda-cafe rounded-[10px] text-sm focus:outline-none focus:border-coral-terra min-h-[40px]"
                    >
                        <option value="all">Todos tipos</option>
                        {Object.entries(BUSINESS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                </div>
            </Card>

            {/* Lista */}
            {filtered.length === 0 ? (
                <Card padding="lg">
                    <div className="text-center py-6">
                        <Lightbulb className="w-10 h-10 text-cafe-cinza-quente mx-auto mb-3" />
                        <p className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                            Nenhuma sugestão encontrada.
                        </p>
                        <p className="text-sm text-cafe-medio mt-1">
                            {search || statusFilter !== 'all' || typeFilter !== 'all'
                                ? 'Tenta outro filtro.'
                                : 'Aguarde alunos preencherem o formulário.'}
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-2.5">
                    {filtered.slice((page - 1) * REQUESTS_PAGE_SIZE, page * REQUESTS_PAGE_SIZE).map(r => (
                        <RequestCard
                            key={r.id}
                            request={r}
                            expanded={expandedId === r.id}
                            onToggle={() => setExpandedId(prev => prev === r.id ? null : r.id)}
                            onStatusChange={status => updateStatus(r.id, status)}
                            onNoteSave={note => saveNote(r.id, note)}
                            onMarkChampion={() => markAsWeekChampion(r.id)}
                            saving={savingId === r.id}
                        />
                    ))}
                    <Pagination
                        page={page}
                        pageSize={REQUESTS_PAGE_SIZE}
                        total={filtered.length}
                        onPageChange={setPage}
                        label="sugestões"
                    />
                </div>
            )}
        </div>
    );
}

function StatItem({ icon: Icon, label, value, highlight = false }: {
    icon: React.ElementType;
    label: string;
    value: number;
    highlight?: boolean;
}) {
    return (
        <div className="flex flex-col items-start px-4 md:px-6">
            <div className={`flex items-center gap-2 mb-2 ${highlight ? 'text-coral-terra' : 'text-cafe-cinza-quente'}`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
            </div>
            <p className={`font-display text-3xl md:text-4xl font-normal tabular-nums tracking-tight leading-none ${
                highlight ? 'text-coral-terra' : 'text-carvao-quente'
            }`}>
                {value}
            </p>
        </div>
    );
}

function RequestCard({
    request, expanded, onToggle, onStatusChange, onNoteSave, onMarkChampion, saving,
}: {
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

    useEffect(() => {
        setNoteEdit(request.admin_note || '');
        setNoteDirty(false);
    }, [request.id, request.admin_note]);

    return (
        <Card padding="md" className="!p-0 overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-coral-wash/40 transition-colors"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <StatusBadge tone={statusCfg.tone}>{statusCfg.label}</StatusBadge>
                        {request.won_week_start && (
                            <StatusBadge tone="pending" icon={<Trophy className="w-3 h-3" />}>
                                Campeã
                            </StatusBadge>
                        )}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cream-elevated text-cafe-medio">
                            {BUSINESS_LABELS[request.business_type] || request.business_type}
                        </span>
                    </div>
                    <p className="font-semibold text-carvao-quente truncate">{request.niche}</p>
                    <p className="text-xs text-cafe-cinza-quente mt-1 flex items-center gap-3 flex-wrap tabular-nums">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {request.user_email}</span>
                        <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(request.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex flex-col items-center px-2.5 py-1.5 bg-coral-wash text-terracota-profundo rounded-[8px]">
                        <div className="flex items-center gap-1 font-semibold text-sm tabular-nums">
                            <ThumbsUp className="w-3.5 h-3.5" />
                            {request.votes_week || 0}
                        </div>
                        <p className="text-xs uppercase font-semibold tracking-wide opacity-80">semana</p>
                    </div>
                    {expanded
                        ? <ChevronUp className="w-5 h-5 text-cafe-cinza-quente" />
                        : <ChevronDown className="w-5 h-5 text-cafe-cinza-quente" />}
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-5 pt-2 border-t border-borda-cafe space-y-4 bg-cream-elevated/40">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                        <DetailField label="Estilo">
                            {STYLE_LABELS[request.style_preference] || request.style_preference}
                        </DetailField>
                        <DetailField label="Aluno">
                            {request.user_name}{' '}
                            <span className="text-cafe-cinza-quente">({request.user_email})</span>
                        </DetailField>
                        {request.target_audience && (
                            <DetailField label="Público-alvo (legacy)">{request.target_audience}</DetailField>
                        )}
                        {request.content_scale && (
                            <DetailField label="Escala (legacy)">
                                {SCALE_LABELS[request.content_scale] || request.content_scale}
                            </DetailField>
                        )}
                    </div>

                    {request.features?.length > 0 && (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-cafe-cinza-quente mb-2 flex items-center gap-1.5">
                                <Tag className="w-3 h-3" /> Funcionalidades
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                                {request.features.map(f => (
                                    <span key={f} className="text-xs font-semibold px-2 py-1 bg-coral-wash text-terracota-profundo rounded">
                                        {FEATURE_LABELS[f] || f}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {request.reference_urls?.length > 0 && (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-cafe-cinza-quente mb-2">
                                URLs de referência
                            </p>
                            <div className="space-y-1">
                                {request.reference_urls.map((u, i) => (
                                    <a
                                        key={i}
                                        href={u}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm text-coral-terra hover:text-terracota-profundo transition-colors"
                                    >
                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                        <span className="truncate font-mono">{u}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                    {request.extra_notes && (
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-cafe-cinza-quente mb-2">
                                Notas do aluno
                            </p>
                            <p className="text-sm text-carvao-quente bg-cream-surface border border-borda-cafe rounded-[8px] p-3 whitespace-pre-wrap leading-relaxed">
                                {request.extra_notes}
                            </p>
                        </div>
                    )}

                    {/* Voting stats */}
                    <div className="flex items-center gap-3 flex-wrap text-xs">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-coral-wash text-terracota-profundo rounded-md font-semibold tabular-nums">
                            <ThumbsUp className="w-3 h-3" />
                            {request.votes_week || 0} esta semana
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-cream-elevated text-cafe-medio rounded-md font-semibold tabular-nums">
                            <ThumbsUp className="w-3 h-3" />
                            {request.votes_total || 0} total
                        </span>
                        {request.production_target_date && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[oklch(94%_0.020_145)] text-[oklch(40%_0.060_145)] rounded-md font-semibold tabular-nums">
                                <Sparkles className="w-3 h-3" />
                                Sai em {new Date(request.production_target_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </span>
                        )}
                    </div>

                    {/* Admin controls */}
                    <div className="pt-3 border-t border-borda-cafe space-y-3">
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-cafe-cinza-quente">
                            Ações do admin
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <select
                                value={request.status}
                                onChange={e => onStatusChange(e.target.value)}
                                disabled={saving}
                                className="px-3 py-2 bg-cream-surface border border-borda-cafe rounded-[8px] text-sm font-semibold text-carvao-quente focus:outline-none focus:border-coral-terra min-h-[40px]"
                            >
                                {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            {!request.won_week_start && (
                                <button
                                    type="button"
                                    onClick={onMarkChampion}
                                    disabled={saving}
                                    className="inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-3 py-2 rounded-[8px] text-sm font-semibold transition-colors disabled:opacity-60 min-h-[40px]"
                                >
                                    <Trophy className="w-4 h-4" />
                                    Marcar campeã
                                </button>
                            )}
                            <a
                                href={`mailto:${request.user_email}?subject=Sua sugestão de template — ${encodeURIComponent(request.niche)}`}
                                className={`inline-flex items-center justify-center gap-2 bg-cream-elevated hover:bg-coral-wash text-cafe-medio hover:text-terracota-profundo border border-borda-cafe px-3 py-2 rounded-[8px] text-sm font-semibold transition-colors min-h-[40px] ${request.won_week_start ? 'md:col-span-2' : ''}`}
                            >
                                <Mail className="w-4 h-4" />
                                Responder por e-mail
                            </a>
                        </div>
                        <div>
                            <label htmlFor={`note-${request.id}`} className="text-xs font-semibold text-cafe-cinza-quente mb-1.5 block">
                                Nota interna
                            </label>
                            <Textarea
                                id={`note-${request.id}`}
                                value={noteEdit}
                                onChange={e => {
                                    setNoteEdit(e.target.value);
                                    setNoteDirty(e.target.value !== (request.admin_note || ''));
                                }}
                                rows={2}
                                placeholder="Notas internas (não visível pro aluno)…"
                            />
                            {noteDirty && (
                                <button
                                    type="button"
                                    onClick={() => onNoteSave(noteEdit)}
                                    disabled={saving}
                                    className="mt-2 inline-flex items-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-3 py-1.5 rounded-[8px] text-sm font-semibold transition-colors disabled:opacity-60"
                                >
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Salvar nota
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-cafe-cinza-quente mb-1">{label}</p>
            <p className="text-sm text-carvao-quente">{children}</p>
        </div>
    );
}
