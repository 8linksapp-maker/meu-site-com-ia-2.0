import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
    ThumbsUp, Trophy, Loader2, Sparkles, Video,
    Store, FileText, Megaphone, Building2, Briefcase, UtensilsCrossed,
    UserCircle2, GraduationCap, Link2, Users, Calendar as CalendarIcon,
    Home as HomeIcon, Cog, HelpCircle, Flame, Hammer, AlertCircle,
} from 'lucide-react';
import { Card, Banner } from '../ui';

const BUSINESS_ICONS: Record<string, React.ElementType> = {
    ecommerce: Store, blog: FileText, landing: Megaphone, institucional: Building2,
    'servicos-locais': Briefcase, restaurante: UtensilsCrossed, portfolio: UserCircle2,
    curso: GraduationCap, afiliados: Link2, comunidade: Users, eventos: CalendarIcon,
    imobiliaria: HomeIcon, saas: Cog, outro: HelpCircle,
};

const BUSINESS_LABELS: Record<string, string> = {
    ecommerce: 'Loja Online', blog: 'Blog / Portal', landing: 'Landing Page',
    institucional: 'Site Institucional', 'servicos-locais': 'Serviços Locais',
    restaurante: 'Restaurante / Café', portfolio: 'Portfólio', curso: 'Curso / Infoproduto',
    afiliados: 'Reviews / Afiliados', comunidade: 'Comunidade / Fórum',
    eventos: 'Eventos / Agendamento', imobiliaria: 'Imobiliária', saas: 'SaaS / Startup',
    outro: 'Outro',
};

interface RequestWithVotes {
    id: string;
    user_id: string;
    user_name: string;
    business_type: string;
    niche: string;
    features: string[];
    style_preference: string;
    extra_notes: string;
    status: string;
    created_at: string;
    won_week_start: string | null;
    production_target_date: string | null;
    votes_count: number;
    user_voted: boolean;
}

// ── Ciclo semanal ───────────────────────────────────────────────────────
// Votação: Domingo 00:00 BRT → Sábado 12:00 BRT.
// Launch: Sexta seguinte 19:00 BRT (YouTube).
// BRT = UTC-3.

function getCurrentWeekStart(): string {
    const now = new Date();
    const dow = now.getUTCDay();
    const sunday = new Date(now);
    sunday.setUTCDate(now.getUTCDate() - dow);
    sunday.setUTCHours(0, 0, 0, 0);
    return sunday.toISOString().slice(0, 10);
}
function getPreviousWeekStart(): string {
    const cur = new Date(getCurrentWeekStart() + 'T00:00:00Z');
    cur.setUTCDate(cur.getUTCDate() - 7);
    return cur.toISOString().slice(0, 10);
}
function getCloseAt(): Date {
    const now = new Date();
    const dow = now.getUTCDay();
    const daysToSaturday = (6 - dow + 7) % 7;
    const close = new Date(now);
    close.setUTCDate(now.getUTCDate() + daysToSaturday);
    close.setUTCHours(15, 0, 0, 0);
    if (close.getTime() <= now.getTime()) close.setUTCDate(close.getUTCDate() + 7);
    return close;
}
function getNextOpenAt(): Date {
    const now = new Date();
    const dow = now.getUTCDay();
    const daysToSunday = (7 - dow) % 7 || 7;
    const open = new Date(now);
    open.setUTCDate(now.getUTCDate() + daysToSunday);
    open.setUTCHours(3, 0, 0, 0);
    return open;
}
function getNextLaunchAt(): Date {
    const now = new Date();
    const dow = now.getUTCDay();
    const daysToFriday = (5 - dow + 7) % 7;
    const friday = new Date(now);
    friday.setUTCDate(now.getUTCDate() + daysToFriday);
    friday.setUTCHours(22, 0, 0, 0); // 22h UTC = 19h BRT
    if (friday.getTime() <= now.getTime()) friday.setUTCDate(friday.getUTCDate() + 7);
    return friday;
}
function isVotingOpen(): boolean {
    const now = new Date();
    const dow = now.getUTCDay();
    if (dow === 6) {
        return now.getUTCHours() < 15;
    }
    return getCloseAt().getTime() > now.getTime();
}

function useCountdown(target: Date) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const i = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(i);
    }, []);
    const diff = Math.max(0, target.getTime() - now);
    const days = Math.floor(diff / 86_400_000);
    const hours = Math.floor((diff % 86_400_000) / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    return { days, hours, minutes, total: diff };
}

export default function VotingPanel() {
    const [requests, setRequests] = useState<RequestWithVotes[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [voting, setVoting] = useState<Record<string, boolean>>({});
    const [winner, setWinner] = useState<RequestWithVotes | null>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | string>('all');
    const [inProduction, setInProduction] = useState<RequestWithVotes | null>(null);

    const myVotesCount = useMemo(
        () => requests.reduce((n, r) => n + (r.user_voted ? 1 : 0), 0),
        [requests],
    );

    const weekStart = getCurrentWeekStart();
    const closeAt = getCloseAt();
    const nextOpenAt = getNextOpenAt();
    const launchAt = getNextLaunchAt();
    const votingOpen = isVotingOpen();
    const countdown = useCountdown(votingOpen ? closeAt : nextOpenAt);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        setError('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const uid = session?.user.id || null;
            setCurrentUserId(uid);

            const { data: reqs, error: reqErr } = await supabase
                .from('template_requests')
                .select('*')
                .in('status', ['new', 'in_review', 'planned', 'in_progress'])
                .order('created_at', { ascending: false });
            if (reqErr) throw reqErr;

            const ids = (reqs || []).map(r => r.id);
            const { data: votes } = ids.length
                ? await supabase
                    .from('template_request_votes')
                    .select('request_id, user_id')
                    .in('request_id', ids)
                    .eq('week_start', weekStart)
                : { data: [] };

            const votesByReq: Record<string, { count: number; mine: boolean }> = {};
            (votes || []).forEach((v: { request_id: string; user_id: string }) => {
                if (!votesByReq[v.request_id]) votesByReq[v.request_id] = { count: 0, mine: false };
                votesByReq[v.request_id].count++;
                if (uid && v.user_id === uid) votesByReq[v.request_id].mine = true;
            });

            const ranked: RequestWithVotes[] = (reqs || []).map(r => ({
                ...r,
                votes_count: votesByReq[r.id]?.count || 0,
                user_voted: votesByReq[r.id]?.mine || false,
            })).sort((a, b) => {
                if (b.votes_count !== a.votes_count) return b.votes_count - a.votes_count;
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            });

            setRequests(ranked);

            const prevWeek = getPreviousWeekStart();
            const { data: winnerData } = await supabase
                .from('template_requests')
                .select('*')
                .eq('won_week_start', prevWeek)
                .limit(1)
                .maybeSingle();
            if (winnerData) setWinner({ ...winnerData, votes_count: 0, user_voted: false });

            const { data: prodData } = await supabase
                .from('template_requests')
                .select('*')
                .eq('status', 'in_progress')
                .not('won_week_start', 'is', null)
                .order('won_week_start', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (prodData) setInProduction({ ...prodData, votes_count: 0, user_voted: false });
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Erro ao carregar.');
        } finally {
            setLoading(false);
        }
    }

    async function toggleVote(req: RequestWithVotes) {
        if (!currentUserId) {
            alert('Você precisa estar logado pra votar.');
            return;
        }
        setVoting(prev => ({ ...prev, [req.id]: true }));
        try {
            if (req.user_voted) {
                const { error: delErr } = await supabase
                    .from('template_request_votes')
                    .delete()
                    .eq('request_id', req.id)
                    .eq('user_id', currentUserId)
                    .eq('week_start', weekStart);
                if (delErr) throw delErr;
                setRequests(prev => recompute(prev.map(r => r.id === req.id
                    ? { ...r, votes_count: Math.max(0, r.votes_count - 1), user_voted: false }
                    : r)));
            } else {
                const { error: insErr } = await supabase
                    .from('template_request_votes')
                    .insert({ request_id: req.id, user_id: currentUserId, week_start: weekStart });
                if (insErr) throw insErr;
                setRequests(prev => recompute(prev.map(r => r.id === req.id
                    ? { ...r, votes_count: r.votes_count + 1, user_voted: true }
                    : r)));
            }
        } catch (e: unknown) {
            alert('Erro: ' + (e instanceof Error ? e.message : 'falha ao votar'));
        } finally {
            setVoting(prev => ({ ...prev, [req.id]: false }));
        }
    }

    function recompute(list: RequestWithVotes[]): RequestWithVotes[] {
        return [...list].sort((a, b) => {
            if (b.votes_count !== a.votes_count) return b.votes_count - a.votes_count;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
    }

    const businessTypes = useMemo(() => {
        const set = new Set<string>();
        requests.forEach(r => set.add(r.business_type));
        return Array.from(set);
    }, [requests]);

    const visible = useMemo(() => {
        if (filter === 'all') return requests;
        return requests.filter(r => r.business_type === filter);
    }, [requests, filter]);

    const leaderVotes = requests[0]?.votes_count || 0;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-coral-terra" />
                <p className="text-cafe-medio text-sm">Carregando solicitações…</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Hero ciclo semanal */}
            <Card padding="lg" className="!border-coral-terra/30">
                <div className="space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-coral-wash flex items-center justify-center shrink-0">
                            <Trophy className="w-5 h-5 text-coral-terra" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-coral-terra uppercase tracking-[0.12em]">
                                Votação da semana
                            </p>
                            <h2 className="font-display text-xl md:text-2xl font-normal text-carvao-quente tracking-tight mt-0.5">
                                {votingOpen ? 'O mais votado vira template ao vivo' : 'Votação encerrada · próxima rodada em breve'}
                            </h2>
                            <p className="text-sm text-cafe-medio mt-1 leading-relaxed">
                                {votingOpen ? (
                                    <>Vota fecha <strong className="text-carvao-quente">sábado às 12h BRT</strong> · O campeão é entregue <strong className="text-carvao-quente">sexta seguinte às 19h ao vivo no YouTube</strong> · Nova rodada inicia domingo de manhã.</>
                                ) : (
                                    <>Resultado dessa semana já fechou. Próxima rodada começa <strong className="text-carvao-quente">domingo 00h BRT</strong>.</>
                                )}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <CountdownBlock value={countdown.days} label="dias" sub={votingOpen ? 'pra fechar' : 'pra abrir'} />
                        <CountdownBlock value={countdown.hours} label="h" sub={votingOpen ? 'pra fechar' : 'pra abrir'} />
                        <CountdownBlock value={countdown.minutes} label="min" sub={votingOpen ? 'pra fechar' : 'pra abrir'} />
                        <div className="bg-cream-elevated border border-borda-cafe rounded-[10px] p-3 col-span-2 md:col-span-1 flex flex-col justify-center">
                            <p className="text-xs font-bold text-coral-terra uppercase tracking-[0.12em] flex items-center gap-1.5">
                                <Video className="w-3 h-3" /> Live launch
                            </p>
                            <p className="font-display text-base font-normal text-carvao-quente tracking-tight mt-1 leading-tight">
                                Sex {launchAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </p>
                            <p className="text-xs text-cafe-medio tabular-nums">19h BRT no YouTube</p>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Em construção */}
            {inProduction && (
                <Card padding="lg" className="!border-mostarda-amber/40 !bg-[oklch(96%_0.025_80)]">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-mostarda-amber flex items-center justify-center shrink-0">
                            <Hammer className="w-5 h-5 text-carvao-quente" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-mostarda-amber text-carvao-quente text-xs font-semibold rounded-full uppercase tracking-wide mb-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-carvao-quente opacity-50" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-carvao-quente" />
                                </span>
                                Em construção
                            </div>
                            <p className="font-display text-xl font-normal text-carvao-quente tracking-tight truncate">
                                {inProduction.niche}
                            </p>
                            <p className="text-sm text-cafe-medio mt-1">
                                {BUSINESS_LABELS[inProduction.business_type] || inProduction.business_type}
                                {' · '}
                                <span className="text-coral-terra font-semibold">Ideia de {inProduction.user_name}</span>
                            </p>
                            {inProduction.production_target_date && (
                                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-cream-surface border border-borda-cafe rounded-[8px]">
                                    <Video className="w-4 h-4 text-vermelho-tijolo" />
                                    <span className="text-sm font-semibold text-carvao-quente tabular-nums">
                                        Live launch: {new Date(inProduction.production_target_date + 'T00:00:00Z')
                                            .toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                                        {' · '}
                                        <span className="text-coral-terra">19h BRT</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>
            )}

            {/* Campeão semana passada (se diferente do em-construção) */}
            {winner && winner.id !== inProduction?.id && (
                <Card padding="md" className="!border-verde-oliva/30 !bg-[oklch(96%_0.020_145)]">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-verde-oliva flex items-center justify-center shrink-0">
                            <Trophy className="w-5 h-5 text-papel-craft" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-[oklch(40%_0.060_145)] uppercase tracking-[0.12em]">
                                Campeão da semana passada
                            </p>
                            <p className="font-display text-lg font-normal text-carvao-quente tracking-tight truncate mt-0.5">
                                {winner.niche}
                            </p>
                            <p className="text-sm text-cafe-medio mt-0.5">
                                {BUSINESS_LABELS[winner.business_type] || winner.business_type}
                                {' · Ideia de '}
                                <strong className="text-carvao-quente">{winner.user_name}</strong>
                            </p>
                        </div>
                    </div>
                </Card>
            )}

            {/* Filtro por tipo */}
            {businessTypes.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <FilterChip
                        label="Todos"
                        count={requests.length}
                        active={filter === 'all'}
                        onClick={() => setFilter('all')}
                    />
                    {businessTypes.map(t => {
                        const count = requests.filter(r => r.business_type === t).length;
                        return (
                            <FilterChip
                                key={t}
                                label={BUSINESS_LABELS[t] || t}
                                count={count}
                                active={filter === t}
                                onClick={() => setFilter(t)}
                            />
                        );
                    })}
                </div>
            )}

            {/* Indicador pessoal de votos da semana */}
            {votingOpen && requests.length > 0 && currentUserId && (
                <div className="flex items-center justify-between gap-3 px-1">
                    {myVotesCount === 0 ? (
                        <p className="text-sm text-cafe-medio leading-snug">
                            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-coral-wash text-coral-terra text-xs font-bold mr-2 align-middle">!</span>
                            Você ainda não apoiou nenhuma ideia. <strong className="text-carvao-quente">Vote em quantas quiser</strong> — mais apoio, mais chance de virar template.
                        </p>
                    ) : (
                        <p className="text-sm text-cafe-medio leading-snug">
                            <ThumbsUp className="w-4 h-4 inline mr-2 text-coral-terra fill-coral-terra align-text-bottom" />
                            Você apoiou <strong className="text-carvao-quente tabular-nums">{myVotesCount}</strong>{' '}
                            {myVotesCount === 1 ? 'ideia' : 'ideias'} essa semana.
                        </p>
                    )}
                </div>
            )}

            {error && (
                <Banner tone="error" icon={<AlertCircle className="w-5 h-5" />}>
                    {error}
                </Banner>
            )}

            {/* Lista ranqueada */}
            {visible.length === 0 ? (
                <Card padding="lg">
                    <div className="text-center py-6">
                        <Sparkles className="w-10 h-10 text-cafe-cinza-quente mx-auto mb-3" />
                        <p className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                            Nenhuma solicitação pra votar ainda.
                        </p>
                        <p className="text-sm text-cafe-medio mt-1">
                            Seja o primeiro, vai na aba "Solicitar".
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-2.5">
                    {visible.map(r => (
                        <VoteCard
                            key={r.id}
                            request={r}
                            position={requests.findIndex(x => x.id === r.id) + 1}
                            isLeader={r.votes_count > 0 && r.votes_count === leaderVotes}
                            onVote={() => toggleVote(r)}
                            voting={!!voting[r.id]}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────

function CountdownBlock({ value, label, sub }: { value: number; label: string; sub: string }) {
    return (
        <div className="bg-cream-elevated border border-borda-cafe rounded-[10px] p-3 flex flex-col justify-center">
            <p className="font-display text-2xl md:text-3xl font-normal text-carvao-quente tabular-nums leading-none tracking-tight">
                {String(value).padStart(2, '0')}
                <span className="text-base font-semibold ml-1 text-cafe-medio">{label}</span>
            </p>
            <p className="text-xs uppercase font-semibold tracking-wide text-cafe-cinza-quente mt-1.5">{sub}</p>
        </div>
    );
}

function FilterChip({
    label, count, active, onClick,
}: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors min-h-[36px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra ${
                active
                    ? 'bg-coral-terra text-papel-craft'
                    : 'bg-cream-elevated text-cafe-medio hover:bg-coral-wash hover:text-terracota-profundo border border-borda-cafe'
            }`}
        >
            {label}
            <span className={`tabular-nums px-1.5 py-0.5 rounded-full text-xs font-bold ${
                active ? 'bg-papel-craft/20 text-papel-craft' : 'bg-cream-surface text-cafe-cinza-quente'
            }`}>
                {count}
            </span>
        </button>
    );
}

function VoteCard({
    request, position, isLeader, onVote, voting,
}: {
    request: RequestWithVotes;
    position: number;
    isLeader: boolean;
    onVote: () => void;
    voting: boolean;
}) {
    const Icon = BUSINESS_ICONS[request.business_type] || HelpCircle;
    const isPodium = position <= 3 && request.votes_count > 0;
    const podiumEmoji = position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉';

    return (
        <div
            className={`bg-cream-surface border rounded-[12px] p-4 transition-shadow duration-200 ${
                isLeader ? '!border-coral-terra/40' : 'border-borda-cafe'
            }`}
            style={{ boxShadow: isLeader ? '0 6px 16px -4px rgba(80, 40, 20, 0.08)' : '0 1px 2px 0 rgba(80, 40, 20, 0.04)' }}
        >
            <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center font-semibold text-sm shrink-0 ${
                    position === 1 ? 'bg-mostarda-amber text-carvao-quente'
                    : position === 2 ? 'bg-cream-elevated text-cafe-medio border border-borda-cafe'
                    : position === 3 ? 'bg-coral-wash text-terracota-profundo'
                    : 'bg-cream-elevated text-cafe-cinza-quente'
                }`}>
                    {isPodium ? <span className="text-base">{podiumEmoji}</span> : <span className="tabular-nums">#{position}</span>}
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-cream-elevated text-cafe-medio rounded-full">
                            <Icon className="w-3 h-3" />
                            {BUSINESS_LABELS[request.business_type] || request.business_type}
                        </span>
                        {isLeader && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-coral-terra text-papel-craft rounded-full uppercase tracking-wide">
                                <Flame className="w-3 h-3" /> Líder
                            </span>
                        )}
                    </div>
                    <p className="font-semibold text-carvao-quente leading-snug">{request.niche}</p>
                    {request.extra_notes && (
                        <p className="text-sm text-cafe-medio mt-1 line-clamp-2 leading-relaxed">
                            {request.extra_notes}
                        </p>
                    )}
                    {request.features && request.features.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {request.features.slice(0, 4).map(f => (
                                <span key={f} className="text-xs font-semibold px-1.5 py-0.5 bg-coral-wash text-terracota-profundo rounded">
                                    {f.replace(/-/g, ' ')}
                                </span>
                            ))}
                            {request.features.length > 4 && (
                                <span className="text-xs text-cafe-cinza-quente">+{request.features.length - 4}</span>
                            )}
                        </div>
                    )}
                    <p className="text-xs text-cafe-cinza-quente mt-2 inline-flex items-center gap-2 tabular-nums">
                        <span>Pedido por <strong className="text-cafe-medio">{request.user_name}</strong></span>
                        <span>·</span>
                        <span>{new Date(request.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                    </p>
                </div>

                <button
                    type="button"
                    onClick={onVote}
                    disabled={voting}
                    aria-label={request.user_voted ? 'Remover seu voto' : 'Votar nesta solicitação'}
                    className={`shrink-0 flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-[12px] border transition-colors min-w-[72px] min-h-[68px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra disabled:opacity-50 ${
                        request.user_voted
                            ? 'bg-coral-terra text-papel-craft border-coral-terra hover:bg-terracota-profundo'
                            : 'bg-cream-elevated text-carvao-quente border-borda-cafe hover:bg-coral-wash hover:text-terracota-profundo hover:border-coral-terra/30'
                    }`}
                >
                    {voting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : request.user_voted ? (
                        <>
                            <ThumbsUp className="w-5 h-5 fill-current" />
                            <span className="text-xs font-semibold leading-none">Votado</span>
                        </>
                    ) : (
                        <>
                            <ThumbsUp className="w-5 h-5" />
                            <span className="font-display text-lg font-normal tabular-nums leading-none">
                                {request.votes_count}
                            </span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
