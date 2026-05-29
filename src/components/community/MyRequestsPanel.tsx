import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Loader2, FileText, Trophy, Calendar, ThumbsUp, Sparkles,
    Check, MessageCircle, X, Hammer,
} from 'lucide-react';
import { Card, Banner } from '../ui';

interface MyRequest {
    id: string;
    business_type: string;
    niche: string;
    target_audience: string;
    features: string[];
    status: string;
    admin_note: string;
    created_at: string;
    won_week_start: string | null;
    production_target_date: string | null;
    votes_count?: number;
}

const BUSINESS_LABELS: Record<string, string> = {
    ecommerce: 'Loja Online', blog: 'Blog / Portal', landing: 'Landing Page',
    institucional: 'Site Institucional', 'servicos-locais': 'Serviços Locais',
    restaurante: 'Restaurante / Café', portfolio: 'Portfólio', curso: 'Curso / Infoproduto',
    afiliados: 'Reviews / Afiliados', comunidade: 'Comunidade / Fórum',
    eventos: 'Eventos / Agendamento', imobiliaria: 'Imobiliária', saas: 'SaaS / Startup',
    outro: 'Outro',
};

// Fluxo feliz: new → in_review → planned → in_progress → delivered
// Caminho alternativo terminal: declined
type StatusKey = 'new' | 'in_review' | 'planned' | 'in_progress' | 'delivered' | 'declined';

const TIMELINE_STEPS: { key: StatusKey; label: string; short: string }[] = [
    { key: 'new',         label: 'Nova',         short: 'Nova' },
    { key: 'in_review',   label: 'Em análise',   short: 'Análise' },
    { key: 'planned',     label: 'Aprovada',     short: 'Aprovada' },
    { key: 'in_progress', label: 'Em produção',  short: 'Produção' },
    { key: 'delivered',   label: 'Entregue',     short: 'Entregue' },
];

const NEXT_STEP_COPY: Record<string, string> = {
    new:         'Aguardando análise da equipe — normalmente em 2 dias úteis.',
    in_review:   'Equipe avaliando viabilidade técnica e demanda.',
    planned:     'Aprovada. Entra na votação semanal junto às outras ideias.',
    in_progress: 'Em produção. Será entregue ao vivo na sexta às 19h BRT.',
    delivered:   'Disponível no acervo de templates.',
    declined:    'Não conseguimos produzir esse template — veja resposta da equipe abaixo.',
};

export default function MyRequestsPanel({ onGoToCreate }: { onGoToCreate?: () => void }) {
    const [requests, setRequests] = useState<MyRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        setError('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('Faça login pra ver suas solicitações.');
                return;
            }
            const { data, error: e } = await supabase
                .from('template_requests')
                .select('*')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false });
            if (e) throw e;

            const ids = (data || []).map(r => r.id);
            const votesMap: Record<string, number> = {};
            if (ids.length) {
                const { data: votes } = await supabase
                    .from('template_request_votes')
                    .select('request_id')
                    .in('request_id', ids);
                (votes || []).forEach((v: { request_id: string }) => {
                    votesMap[v.request_id] = (votesMap[v.request_id] || 0) + 1;
                });
            }

            setRequests((data || []).map(r => ({ ...r, votes_count: votesMap[r.id] || 0 })));
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Erro ao carregar.');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-coral-terra" />
                <p className="text-cafe-medio text-sm">Carregando…</p>
            </div>
        );
    }

    if (error) {
        return <Banner tone="error">{error}</Banner>;
    }

    if (requests.length === 0) {
        return (
            <Card padding="lg">
                <div className="text-center py-6">
                    <div className="w-14 h-14 rounded-full bg-coral-wash flex items-center justify-center mx-auto mb-4">
                        <FileText className="w-6 h-6 text-coral-terra" />
                    </div>
                    <p className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                        Você ainda não enviou solicitação nenhuma.
                    </p>
                    <p className="text-sm text-cafe-medio mt-1 mb-5 max-w-md mx-auto">
                        Que tipo de template você gostaria de ver na MSIA? Sugira e os outros alunos votam.
                    </p>
                    {onGoToCreate && (
                        <button
                            type="button"
                            onClick={onGoToCreate}
                            className="inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-5 py-2.5 rounded-[12px] font-semibold text-sm transition-colors active:scale-[0.98] min-h-[44px]"
                        >
                            Fazer primeira solicitação
                        </button>
                    )}
                </div>
            </Card>
        );
    }

    const totalVotes = requests.reduce((sum, r) => sum + (r.votes_count || 0), 0);
    const wonCount = requests.filter(r => r.won_week_start).length;

    return (
        <div className="space-y-5">
            {/* Stats em linha editorial */}
            <div className="grid grid-cols-3 divide-x divide-borda-cafe border-y border-borda-cafe py-5">
                <SmallStat icon={FileText} label="Solicitações" value={requests.length} />
                <SmallStat icon={ThumbsUp} label="Votos recebidos" value={totalVotes} />
                <SmallStat icon={Trophy} label="Campeãs" value={wonCount} highlight={wonCount > 0} />
            </div>

            {/* Lista */}
            <div className="space-y-3">
                {requests.map(r => (
                    <RequestCard key={r.id} request={r} />
                ))}
            </div>
        </div>
    );
}

function RequestCard({ request: r }: { request: MyRequest }) {
    const isDeclined = r.status === 'declined';
    const hasAdminNote = r.admin_note && r.admin_note.trim().length > 0;
    const nextCopy = NEXT_STEP_COPY[r.status] || NEXT_STEP_COPY.new;

    return (
        <Card padding="md">
            <div className="space-y-4">
                {/* Cabeçalho: nicho + chips contextuais + votos */}
                <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                            {r.won_week_start && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-mostarda-amber text-carvao-quente rounded-full uppercase tracking-wide">
                                    <Trophy className="w-3 h-3" /> Campeã
                                </span>
                            )}
                            <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 bg-cream-elevated text-cafe-medio rounded-full">
                                {BUSINESS_LABELS[r.business_type] || r.business_type}
                            </span>
                        </div>
                        <p className="font-semibold text-carvao-quente truncate">{r.niche}</p>
                        <p className="text-xs text-cafe-cinza-quente mt-1 flex items-center gap-3 flex-wrap tabular-nums">
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            {r.production_target_date && (
                                <span className="flex items-center gap-1 text-coral-terra font-semibold">
                                    <Sparkles className="w-3 h-3" />
                                    Sai em {new Date(r.production_target_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-cream-elevated text-cafe-medio rounded-[8px] font-semibold text-sm shrink-0 tabular-nums">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        {r.votes_count || 0}
                    </div>
                </div>

                {/* Timeline */}
                {isDeclined ? (
                    <DeclinedTimeline />
                ) : (
                    <StatusTimeline currentStatus={r.status as StatusKey} />
                )}

                {/* Next-step copy */}
                <p className="text-xs text-cafe-medio leading-snug">
                    {nextCopy}
                </p>

                {/* Resposta do admin */}
                {hasAdminNote && (
                    <div className={`flex items-start gap-3 p-3 rounded-[10px] border ${
                        isDeclined
                            ? 'bg-[oklch(96%_0.015_35)] border-[oklch(85%_0.060_35)]'
                            : 'bg-[oklch(96%_0.020_145)] border-verde-oliva/30'
                    }`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                            isDeclined ? 'bg-[oklch(80%_0.080_35)]' : 'bg-verde-oliva'
                        }`}>
                            <MessageCircle className="w-3.5 h-3.5 text-papel-craft" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold uppercase tracking-[0.12em] ${
                                isDeclined ? 'text-[oklch(40%_0.090_35)]' : 'text-[oklch(40%_0.060_145)]'
                            }`}>
                                Resposta da equipe
                            </p>
                            <p className="text-sm text-carvao-quente mt-1 leading-relaxed whitespace-pre-wrap">
                                {r.admin_note}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </Card>
    );
}

function StatusTimeline({ currentStatus }: { currentStatus: StatusKey }) {
    const currentIdx = TIMELINE_STEPS.findIndex(s => s.key === currentStatus);
    const safeIdx = currentIdx === -1 ? 0 : currentIdx;
    const isDelivered = currentStatus === 'delivered';

    return (
        <div className="flex items-start" role="list" aria-label="Status da solicitação">
            {TIMELINE_STEPS.map((step, i) => {
                const done = i < safeIdx || isDelivered;
                const current = i === safeIdx && !isDelivered;
                const future = i > safeIdx;
                const lineActive = i < safeIdx || (i === safeIdx && isDelivered);

                return (
                    <div key={step.key} className="flex-1 flex items-start" role="listitem">
                        <div className="flex flex-col items-center flex-1 min-w-0">
                            <div className="flex items-center w-full">
                                {/* Linha esquerda */}
                                <div className={`h-px flex-1 ${i === 0 ? 'invisible' : lineActive ? 'bg-verde-oliva' : 'bg-borda-cafe'}`} />
                                {/* Bolinha */}
                                <div
                                    className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                        done
                                            ? 'bg-verde-oliva text-papel-craft'
                                            : current
                                                ? 'bg-coral-terra text-papel-craft ring-4 ring-coral-wash'
                                                : 'bg-cream-elevated border border-borda-cafe text-cafe-cinza-quente'
                                    }`}
                                    aria-label={step.label}
                                    aria-current={current ? 'step' : undefined}
                                >
                                    {done ? (
                                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                    ) : current && step.key === 'in_progress' ? (
                                        <Hammer className="w-3.5 h-3.5" />
                                    ) : (
                                        <span className="tabular-nums text-xs font-bold">{i + 1}</span>
                                    )}
                                </div>
                                {/* Linha direita */}
                                <div className={`h-px flex-1 ${i === TIMELINE_STEPS.length - 1 ? 'invisible' : i < safeIdx ? 'bg-verde-oliva' : 'bg-borda-cafe'}`} />
                            </div>
                            <span className={`mt-1.5 text-[11px] font-semibold text-center leading-tight ${
                                current ? 'text-coral-terra' : done ? 'text-carvao-quente' : 'text-cafe-cinza-quente'
                            }`}>
                                <span className="hidden sm:inline">{step.label}</span>
                                <span className="sm:hidden">{step.short}</span>
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function DeclinedTimeline() {
    return (
        <div className="flex items-start">
            {/* Nova ✓ */}
            <div className="flex-1 flex flex-col items-center">
                <div className="flex items-center w-full">
                    <div className="h-px flex-1 invisible" />
                    <div className="relative z-10 w-7 h-7 rounded-full flex items-center justify-center bg-verde-oliva text-papel-craft shrink-0">
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                    </div>
                    <div className="h-px flex-1 bg-[oklch(80%_0.060_35)]" style={{ borderTop: '1px dashed' }} />
                </div>
                <span className="mt-1.5 text-[11px] font-semibold text-carvao-quente">Nova</span>
            </div>
            {/* Não viável */}
            <div className="flex-1 flex flex-col items-center">
                <div className="flex items-center w-full">
                    <div className="h-px flex-1 bg-[oklch(80%_0.060_35)]" style={{ borderTop: '1px dashed' }} />
                    <div className="relative z-10 w-7 h-7 rounded-full flex items-center justify-center bg-[oklch(55%_0.110_35)] text-papel-craft shrink-0 ring-4 ring-[oklch(94%_0.025_35)]">
                        <X className="w-3.5 h-3.5" strokeWidth={3} />
                    </div>
                    <div className="h-px flex-1 invisible" />
                </div>
                <span className="mt-1.5 text-[11px] font-semibold text-[oklch(45%_0.110_35)]">Não viável</span>
            </div>
        </div>
    );
}

function SmallStat({
    icon: Icon, label, value, highlight = false,
}: {
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
