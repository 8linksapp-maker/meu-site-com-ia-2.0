import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
    ThumbsUp, Trophy, Calendar, Clock, Loader2, Sparkles, ExternalLink,
    Store, FileText, Megaphone, Building2, Briefcase, UtensilsCrossed,
    UserCircle2, GraduationCap, Link2, Users, Calendar as CalendarIcon,
    Home as HomeIcon, Cog, HelpCircle, ChevronRight, Flame,
} from 'lucide-react';

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
    target_audience: string;
    features: string[];
    style_preference: string;
    urgency: string;
    extra_notes: string;
    status: string;
    created_at: string;
    won_week_start: string | null;
    production_target_date: string | null;
    votes_count: number;
    user_voted: boolean;
}

// Monday-based ISO week
function getCurrentWeekStart(): string {
    const now = new Date();
    const dow = now.getUTCDay();
    const offset = (dow + 6) % 7; // Mon=0..Sun=6
    const monday = new Date(now);
    monday.setUTCDate(now.getUTCDate() - offset);
    monday.setUTCHours(0, 0, 0, 0);
    return monday.toISOString().slice(0, 10);
}
function getPreviousWeekStart(): string {
    const cur = new Date(getCurrentWeekStart() + 'T00:00:00Z');
    cur.setUTCDate(cur.getUTCDate() - 7);
    return cur.toISOString().slice(0, 10);
}
function getNextSunday(): Date {
    const now = new Date();
    const dow = now.getUTCDay();
    const daysToSunday = (7 - dow) % 7 || 7;
    const sunday = new Date(now);
    sunday.setUTCDate(now.getUTCDate() + daysToSunday);
    sunday.setUTCHours(23, 59, 59, 0);
    return sunday;
}
function getNextWednesday(): Date {
    // Quarta seguinte ao próximo domingo de fechamento
    const sun = getNextSunday();
    const wed = new Date(sun);
    wed.setUTCDate(sun.getUTCDate() + 3);
    wed.setUTCHours(0, 0, 0, 0);
    return wed;
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

    const weekStart = getCurrentWeekStart();
    const closeAt = getNextSunday();
    const launchAt = getNextWednesday();
    const countdown = useCountdown(closeAt);

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
            (votes || []).forEach((v: any) => {
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

            // Busca campeão da semana anterior (publicado na quarta atual)
            const prevWeek = getPreviousWeekStart();
            const { data: winnerData } = await supabase
                .from('template_requests')
                .select('*')
                .eq('won_week_start', prevWeek)
                .limit(1)
                .maybeSingle();
            if (winnerData) setWinner({ ...winnerData, votes_count: 0, user_voted: false });
        } catch (e: any) {
            setError(e?.message || 'Erro ao carregar.');
        } finally {
            setLoading(false);
        }
    }

    async function toggleVote(req: RequestWithVotes) {
        if (!currentUserId) {
            alert('Você precisa estar logado para votar.');
            return;
        }
        setVoting(prev => ({ ...prev, [req.id]: true }));
        try {
            if (req.user_voted) {
                const { error } = await supabase
                    .from('template_request_votes')
                    .delete()
                    .eq('request_id', req.id)
                    .eq('user_id', currentUserId)
                    .eq('week_start', weekStart);
                if (error) throw error;
                setRequests(prev => recompute(prev.map(r => r.id === req.id
                    ? { ...r, votes_count: Math.max(0, r.votes_count - 1), user_voted: false }
                    : r)));
            } else {
                const { error } = await supabase
                    .from('template_request_votes')
                    .insert({ request_id: req.id, user_id: currentUserId, week_start: weekStart });
                if (error) throw error;
                setRequests(prev => recompute(prev.map(r => r.id === req.id
                    ? { ...r, votes_count: r.votes_count + 1, user_voted: true }
                    : r)));
            }
        } catch (e: any) {
            alert('Erro: ' + (e?.message || 'falha ao votar'));
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
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-[#7c3aed]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Hero: ciclo semanal */}
            <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-2xl p-6 text-white">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                <div className="relative">
                    <div className="flex items-center gap-2 mb-2">
                        <Trophy className="w-5 h-5" />
                        <h2 className="text-xl font-bold">Campeão da semana vira template real</h2>
                    </div>
                    <p className="text-purple-100 text-sm mb-5 max-w-2xl">
                        Toda solicitação aberta entra na votação da semana. A mais votada até <strong>domingo 23:59 UTC</strong> é
                        marcada como campeã, entra em produção e é entregue na <strong>quarta-feira seguinte</strong>.
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <CountdownBlock value={countdown.days} label="dias" />
                        <CountdownBlock value={countdown.hours} label="horas" />
                        <CountdownBlock value={countdown.minutes} label="min" />
                        <div className="bg-white/15 backdrop-blur rounded-xl p-3 col-span-2 md:col-span-1">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-purple-100">Próximo launch</p>
                            <p className="text-base font-bold mt-1 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" />
                                {launchAt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Campeão semana passada — em produção */}
            {winner && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                            <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">Em produção pra quarta</p>
                            <p className="text-lg font-bold text-gray-900 truncate">{winner.niche}</p>
                            <p className="text-sm text-gray-600 mt-0.5">
                                {BUSINESS_LABELS[winner.business_type] || winner.business_type} · Pedido por {winner.user_name}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Filtro por tipo */}
            {businessTypes.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                            filter === 'all' ? 'bg-[#7c3aed] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        Todos ({requests.length})
                    </button>
                    {businessTypes.map(t => {
                        const count = requests.filter(r => r.business_type === t).length;
                        return (
                            <button
                                key={t}
                                onClick={() => setFilter(t)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                                    filter === t ? 'bg-[#7c3aed] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {BUSINESS_LABELS[t] || t} ({count})
                            </button>
                        );
                    })}
                </div>
            )}

            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
            )}

            {/* Lista ranqueada */}
            {visible.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
                    <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-700 font-semibold">Nenhuma solicitação pra votar ainda</p>
                    <p className="text-sm text-gray-500 mt-1">Seja o primeiro — vai na aba "Solicitar".</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {visible.map((r, idx) => (
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

function CountdownBlock({ value, label }: { value: number; label: string }) {
    return (
        <div className="bg-white/15 backdrop-blur rounded-xl p-3">
            <p className="text-3xl font-black tabular-nums">{String(value).padStart(2, '0')}</p>
            <p className="text-[10px] uppercase font-bold tracking-widest text-purple-100 mt-1">{label} pra fechar</p>
        </div>
    );
}

function VoteCard({ request, position, isLeader, onVote, voting }: {
    request: RequestWithVotes; position: number; isLeader: boolean; onVote: () => void; voting: boolean;
}) {
    const Icon = BUSINESS_ICONS[request.business_type] || HelpCircle;
    const podium = position <= 3 && request.votes_count > 0;
    const positionColor = position === 1 ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300'
        : position === 2 ? 'bg-slate-100 text-slate-700 ring-2 ring-slate-300'
            : position === 3 ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300'
                : 'bg-gray-50 text-gray-500';

    return (
        <div className={`bg-white border-2 rounded-2xl p-4 transition-all ${
            isLeader ? 'border-amber-300 shadow-md shadow-amber-100' : 'border-gray-200 hover:border-gray-300'
        }`}>
            <div className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${positionColor}`}>
                    {podium ? (position === 1 ? '🥇' : position === 2 ? '🥈' : '🥉') : `#${position}`}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md">
                            <Icon className="w-3 h-3" />
                            {BUSINESS_LABELS[request.business_type] || request.business_type}
                        </span>
                        {isLeader && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-100 text-amber-700 rounded-md">
                                <Flame className="w-3 h-3" /> Líder
                            </span>
                        )}
                    </div>
                    <p className="font-bold text-gray-900 leading-snug">{request.niche}</p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{request.target_audience}</p>
                    {request.features && request.features.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {request.features.slice(0, 4).map(f => (
                                <span key={f} className="text-[10px] font-semibold px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded">
                                    {f.replace(/-/g, ' ')}
                                </span>
                            ))}
                            {request.features.length > 4 && (
                                <span className="text-[10px] text-gray-400">+{request.features.length - 4}</span>
                            )}
                        </div>
                    )}
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-2">
                        <span>Pedido por <strong className="text-gray-600">{request.user_name}</strong></span>
                        <span>·</span>
                        <span>{new Date(request.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                    </p>
                </div>
                <button
                    onClick={onVote}
                    disabled={voting}
                    className={`shrink-0 flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-xl border-2 transition-all min-w-[72px] ${
                        request.user_voted
                            ? 'border-[#7c3aed] bg-[#7c3aed] text-white shadow-md shadow-purple-500/30'
                            : 'border-gray-200 hover:border-[#7c3aed] hover:bg-violet-50 text-gray-700'
                    } disabled:opacity-50`}
                >
                    {voting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <ThumbsUp className={`w-5 h-5 ${request.user_voted ? 'fill-current' : ''}`} />
                            <span className="text-lg font-black tabular-nums leading-none">{request.votes_count}</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
