import { useState, useEffect, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { supabase } from '../../lib/supabase';
import { getTodayBR } from '../../lib/dateBR';
import { useVotingStreak } from '../../hooks/useVotingStreak';
import {
    ThumbsUp, Trophy, Calendar, Clock, Loader2, Sparkles, ExternalLink,
    Store, FileText, Megaphone, Building2, Briefcase, UtensilsCrossed,
    UserCircle2, GraduationCap, Link2, Users, Calendar as CalendarIcon,
    Home as HomeIcon, Cog, HelpCircle, ChevronRight, Flame, Video, Lock,
    Hammer, X, Info, Palette, CheckCircle2,
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

const FEATURE_LABELS: Record<string, string> = {
    blog: 'Blog / posts',
    loja: 'Loja com checkout',
    catalogo: 'Catálogo (sem checkout)',
    'portfolio-galeria': 'Galeria / portfólio',
    agendamento: 'Agendamento',
    'contato-avancado': 'Contato avançado',
    newsletter: 'Newsletter',
    whatsapp: 'WhatsApp',
    mapa: 'Mapa / localização',
    'multi-idioma': 'Multi-idioma',
    'area-membros': 'Área de membros',
    calculadora: 'Calculadora / orçamento',
    depoimentos: 'Depoimentos',
    faq: 'FAQ',
    equipe: 'Equipe / autores',
    'afiliados-ecommerce': 'Afiliados (Amazon/ML/Shopee)',
    pix: 'Pagamento PIX',
    'pdf-download': 'Download de PDFs',
};

interface RequestWithVotes {
    id: string;
    user_id: string;
    user_name: string;
    business_type: string;
    niche: string;
    features: string[];
    style_preference: string;
    reference_urls?: string[];
    extra_notes: string;
    target_audience?: string;
    status: string;
    created_at: string;
    won_week_start: string | null;
    production_target_date: string | null;
    votes_count: number;        // acumulado da semana
    user_voted_today: boolean;  // 1 voto por dia
}

// Ciclo: Domingo 00:00 BRT → Sábado 12:00 BRT (votação aberta).
// Launch da semana = Sexta seguinte 20:00 BRT (live YouTube).
// BRT = UTC-3 (sem DST no Brasil atualmente).

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
    friday.setUTCHours(23, 0, 0, 0);
    if (friday.getTime() <= now.getTime()) friday.setUTCDate(friday.getUTCDate() + 7);
    return friday;
}
function isVotingOpen(): boolean {
    const now = new Date();
    const dow = now.getUTCDay();
    if (dow === 6) return now.getUTCHours() < 15;
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
    const [selected, setSelected] = useState<RequestWithVotes | null>(null);

    const streak = useVotingStreak();
    const [todayVotersCount, setTodayVotersCount] = useState(0);
    const [toast, setToast] = useState<string | null>(null);
    const [bumpId, setBumpId] = useState<string | null>(null);

    const weekStart = getCurrentWeekStart();
    const today = getTodayBR();
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

            // Total da semana (pra ranking)
            const { data: weekVotes } = ids.length
                ? await supabase
                    .from('template_request_votes')
                    .select('request_id')
                    .in('request_id', ids)
                    .eq('week_start', weekStart)
                : { data: [] };

            // Voto do user HOJE (pra saber se pode votar de novo)
            const { data: todayVotes } = ids.length && uid
                ? await supabase
                    .from('template_request_votes')
                    .select('request_id')
                    .in('request_id', ids)
                    .eq('user_id', uid)
                    .eq('vote_date', today)
                : { data: [] };

            const weekCount: Record<string, number> = {};
            (weekVotes || []).forEach((v: any) => {
                weekCount[v.request_id] = (weekCount[v.request_id] || 0) + 1;
            });
            const votedToday = new Set((todayVotes || []).map((v: any) => v.request_id));

            const ranked: RequestWithVotes[] = (reqs || []).map(r => ({
                ...r,
                votes_count: weekCount[r.id] || 0,
                user_voted_today: votedToday.has(r.id),
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
            if (winnerData) setWinner({ ...winnerData, votes_count: 0, user_voted_today: false });

            const { data: prodData } = await supabase
                .from('template_requests')
                .select('*')
                .eq('status', 'in_progress')
                .not('won_week_start', 'is', null)
                .order('won_week_start', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (prodData) setInProduction({ ...prodData, votes_count: 0, user_voted_today: false });

            // Social proof: quantos alunos votaram HOJE (qualquer proposta).
            // RPC entregue pelo Jurandir; em caso de erro/ausencia ficamos com 0.
            try {
                const { data: votersData } = await supabase.rpc('get_today_voters_count');
                setTodayVotersCount(Number(votersData) || 0);
            } catch {
                /* silent — chip simplesmente nao aparece */
            }
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
            if (req.user_voted_today) {
                const { error } = await supabase
                    .from('template_request_votes')
                    .delete()
                    .eq('request_id', req.id)
                    .eq('user_id', currentUserId)
                    .eq('vote_date', today);
                if (error) throw error;
                applyVoteUpdate(req.id, -1, false);
            } else {
                const { error } = await supabase
                    .from('template_request_votes')
                    .insert({
                        request_id: req.id,
                        user_id: currentUserId,
                        week_start: weekStart,
                        vote_date: today,
                    });
                if (error) throw error;

                // Capturar streak antes pra comparar com novo apos refetch
                const prevStreak = streak.currentStreak;
                // Se eh o 1o voto do user no dia, ele entra na contagem de votantes
                const userHadVotedTodayBefore = requests.some((r) => r.user_voted_today);

                applyVoteUpdate(req.id, +1, true);

                // Confetti — so em voto novo, nunca em unvote
                confetti({
                    particleCount: 60,
                    spread: 70,
                    origin: { y: 0.6 },
                    ticks: 80,
                });

                // Bump no numero do request votado (300ms)
                setBumpId(req.id);
                window.setTimeout(() => setBumpId(null), 300);

                // Incrementa social proof local se foi o 1o voto do dia
                if (!userHadVotedTodayBefore) {
                    setTodayVotersCount((c) => c + 1);
                }

                // Refetch streak; dispara toast se aumentou e ja tem >=2 dias seguidos
                const newStreak = await streak.refetch();
                if (newStreak.currentStreak > prevStreak && newStreak.currentStreak >= 2) {
                    setToast(`🔥 ${newStreak.currentStreak} dias seguidos! Continua amanhã pra não quebrar.`);
                    window.setTimeout(() => setToast(null), 2500);
                }
            }
        } catch (e: any) {
            alert('Erro: ' + (e?.message || 'falha ao votar'));
        } finally {
            setVoting(prev => ({ ...prev, [req.id]: false }));
        }
    }

    function applyVoteUpdate(id: string, delta: number, votedToday: boolean) {
        const updater = (list: RequestWithVotes[]) => recompute(list.map(r => r.id === id
            ? { ...r, votes_count: Math.max(0, r.votes_count + delta), user_voted_today: votedToday }
            : r));
        setRequests(updater);
        setSelected(prev => prev && prev.id === id
            ? { ...prev, votes_count: Math.max(0, prev.votes_count + delta), user_voted_today: votedToday }
            : prev);
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
    const votedSomethingToday = requests.some(r => r.user_voted_today);

    // Derivado pra painel "Sua semana"
    const votedTodayCount = useMemo(
        () => requests.filter(r => r.user_voted_today).length,
        [requests],
    );
    // TODO Fase 1.1: trocar stub por RPC dedicada (votos do user na semana corrente).
    // Por enquanto usa totalVoteDays (historico geral) — Genilson ciente.
    const weekVotesCount = streak.totalVoteDays;

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
                        <h2 className="text-xl font-bold">
                            {votingOpen ? 'Mais votado vira template ao vivo' : 'Votação encerrada — próxima começa em breve'}
                        </h2>
                    </div>
                    <p className="text-purple-100 text-sm mb-3 max-w-2xl">
                        {votingOpen ? (
                            <>
                                Votação fecha <strong>sábado 12:00 BRT</strong> · O campeão é entregue <strong>sexta seguinte às 20h ao vivo no YouTube</strong> · Nova votação inicia no domingo de manhã.
                            </>
                        ) : (
                            <>
                                Resultado dessa semana já fechou. Próxima rodada começa <strong>domingo 00:00 BRT</strong> com as solicitações abertas.
                            </>
                        )}
                    </p>
                    {/* Aviso voto diário + social proof */}
                    {votingOpen && (
                        <div className="flex flex-wrap items-center gap-2 mb-5">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 backdrop-blur rounded-full">
                                <Info className="w-3.5 h-3.5 text-yellow-200" />
                                <span className="text-xs font-bold">
                                    Você pode dar <strong className="text-yellow-200">1 voto por dia</strong> em cada solicitação — volta amanhã pra reforçar!
                                </span>
                            </div>
                            {todayVotersCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full">
                                    <span aria-hidden="true">👥</span>
                                    <span className="tabular-nums">{todayVotersCount}</span>
                                    {todayVotersCount === 1 ? 'aluno votou hoje' : 'alunos votaram hoje'}
                                </span>
                            )}
                        </div>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <CountdownBlock value={countdown.days} label="d" sub={votingOpen ? 'pra fechar' : 'pra abrir'} />
                        <CountdownBlock value={countdown.hours} label="h" sub={votingOpen ? 'pra fechar' : 'pra abrir'} />
                        <CountdownBlock value={countdown.minutes} label="min" sub={votingOpen ? 'pra fechar' : 'pra abrir'} />
                        <div className="bg-white/15 backdrop-blur rounded-xl p-3 col-span-2 md:col-span-1 flex flex-col">
                            <p className="text-[10px] uppercase font-bold tracking-widest text-purple-100 flex items-center gap-1">
                                <Video className="w-3 h-3" /> Live launch
                            </p>
                            <p className="text-sm font-bold mt-1 leading-tight">
                                Sex {launchAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </p>
                            <p className="text-[11px] text-purple-100 font-semibold">20:00 BRT no YouTube</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Painel "Sua semana" — engagement pessoal do user */}
            {currentUserId && streak.totalVoteDays >= 1 && (
                <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 md:p-5">
                    <h3 className="text-sm font-bold text-violet-900 mb-3">Sua semana</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl shrink-0" aria-hidden="true">🔥</span>
                            <div className="min-w-0">
                                <div className="text-xl font-bold text-violet-900 tabular-nums leading-tight">
                                    {streak.currentStreak} {streak.currentStreak === 1 ? 'dia' : 'dias'}
                                </div>
                                <div className="text-xs text-violet-700">
                                    seguidos{streak.longestStreak > streak.currentStreak ? ` · recorde: ${streak.longestStreak}` : ''}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl shrink-0" aria-hidden="true">✓</span>
                            <div className="min-w-0">
                                <div className="text-xl font-bold text-violet-900 tabular-nums leading-tight">
                                    {votedTodayCount} {votedTodayCount === 1 ? 'proposta' : 'propostas'}
                                </div>
                                <div className="text-xs text-violet-700">votadas hoje</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-2xl shrink-0" aria-hidden="true">⚡</span>
                            <div className="min-w-0">
                                <div className="text-xl font-bold text-violet-900 tabular-nums leading-tight">
                                    {weekVotesCount} {weekVotesCount === 1 ? 'voto' : 'votos'}
                                </div>
                                <div className="text-xs text-violet-700">seus essa semana</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bloco "Em construção" */}
            {inProduction && (
                <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-5">
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-amber-500 text-white rounded-full">
                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Em construção</span>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center shrink-0 shadow-md">
                            <Hammer className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1 min-w-0 pr-20">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-amber-700 mb-0.5">Template sendo construído agora</p>
                            <p className="text-xl font-black text-gray-900 truncate leading-tight">{inProduction.niche}</p>
                            <p className="text-sm text-gray-700 mt-1">
                                {BUSINESS_LABELS[inProduction.business_type] || inProduction.business_type} ·
                                <span className="text-amber-700 font-bold ml-1">Ideia de {inProduction.user_name}</span>
                            </p>
                            {inProduction.production_target_date && (
                                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-amber-200 rounded-lg">
                                    <Video className="w-4 h-4 text-red-600" />
                                    <span className="text-sm font-bold text-gray-800">
                                        Live launch: {new Date(inProduction.production_target_date + 'T00:00:00Z')
                                            .toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                                        <span className="text-amber-700"> · 20:00 BRT</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Campeão semana passada */}
            {winner && winner.id !== inProduction?.id && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shrink-0">
                            <Trophy className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">Campeão da semana passada</p>
                            <p className="text-lg font-bold text-gray-900 truncate">{winner.niche}</p>
                            <p className="text-sm text-gray-600 mt-0.5">
                                {BUSINESS_LABELS[winner.business_type] || winner.business_type} · Ideia de <strong>{winner.user_name}</strong>
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
                    {visible.map((r) => (
                        <VoteCard
                            key={r.id}
                            request={r}
                            position={requests.findIndex(x => x.id === r.id) + 1}
                            isLeader={r.votes_count > 0 && r.votes_count === leaderVotes}
                            onVote={() => toggleVote(r)}
                            onOpen={() => setSelected(r)}
                            voting={!!voting[r.id]}
                            bumping={bumpId === r.id}
                        />
                    ))}
                </div>
            )}

            {/* Modal de detalhes */}
            {selected && (
                <DetailModal
                    request={selected}
                    onClose={() => setSelected(null)}
                    onVote={() => toggleVote(selected)}
                    voting={!!voting[selected.id]}
                    bumping={bumpId === selected.id}
                />
            )}

            {/* Toast de streak (apos voto novo que aumenta a sequencia) */}
            {toast && (
                <div
                    role="status"
                    aria-live="polite"
                    className="fixed bottom-4 right-4 z-[200] bg-amber-500 text-white px-4 py-3 rounded-xl shadow-lg animate-streak-toast max-w-[90vw] text-sm font-semibold"
                >
                    {toast}
                </div>
            )}
        </div>
    );
}

function CountdownBlock({ value, label, sub }: { value: number; label: string; sub: string }) {
    return (
        <div className="bg-white/15 backdrop-blur rounded-xl p-3">
            <p className="text-3xl font-black tabular-nums leading-none">{String(value).padStart(2, '0')}<span className="text-base font-bold ml-1 opacity-70">{label}</span></p>
            <p className="text-[10px] uppercase font-bold tracking-widest text-purple-100 mt-1.5">{sub}</p>
        </div>
    );
}

function VoteCard({ request, position, isLeader, onVote, onOpen, voting, bumping }: {
    request: RequestWithVotes;
    position: number;
    isLeader: boolean;
    onVote: () => void;
    onOpen: () => void;
    voting: boolean;
    bumping: boolean;
}) {
    const Icon = BUSINESS_ICONS[request.business_type] || HelpCircle;
    const podium = position <= 3 && request.votes_count > 0;
    const positionColor = position === 1 ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-300'
        : position === 2 ? 'bg-slate-100 text-slate-700 ring-2 ring-slate-300'
            : position === 3 ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-300'
                : 'bg-gray-50 text-gray-500';

    return (
        <div
            onClick={onOpen}
            className={`group bg-white border-2 rounded-2xl p-4 transition-all cursor-pointer ${
                isLeader ? 'border-amber-300 shadow-md shadow-amber-100' : 'border-gray-200 hover:border-[#7c3aed]'
            }`}
        >
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
                        <span className="ml-auto text-[10px] font-semibold text-gray-400 group-hover:text-[#7c3aed] inline-flex items-center gap-0.5 transition-colors">
                            ver detalhes <ChevronRight className="w-3 h-3" />
                        </span>
                    </div>
                    <p className="font-bold text-gray-900 leading-snug">{request.niche}</p>
                    {request.extra_notes && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{request.extra_notes}</p>
                    )}
                    {request.features && request.features.length > 0 && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {request.features.slice(0, 4).map(f => (
                                <span key={f} className="text-[10px] font-semibold px-1.5 py-0.5 bg-violet-50 text-violet-700 rounded">
                                    {FEATURE_LABELS[f] || f.replace(/-/g, ' ')}
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
                <VoteButton
                    request={request}
                    voting={voting}
                    onVote={onVote}
                    bumping={bumping}
                />
            </div>
        </div>
    );
}

function VoteButton({ request, voting, onVote, large = false, bumping = false }: {
    request: RequestWithVotes; voting: boolean; onVote: () => void; large?: boolean; bumping?: boolean;
}) {
    const voted = request.user_voted_today;
    const sizeClasses = large ? 'px-5 py-3.5 min-w-[96px]' : 'px-4 py-3 min-w-[72px]';
    const numberClasses = large ? 'text-2xl' : 'text-lg';

    return (
        <button
            onClick={(e) => { e.stopPropagation(); onVote(); }}
            disabled={voting}
            title={voted ? 'Você votou hoje — volta amanhã pra reforçar!' : 'Dar meu voto de hoje'}
            className={`shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl border-2 transition-all ${sizeClasses} ${
                voted
                    ? 'border-[#7c3aed] bg-[#7c3aed] text-white shadow-md shadow-purple-500/30'
                    : 'border-gray-200 hover:border-[#7c3aed] hover:bg-violet-50 text-gray-700'
            } disabled:opacity-50`}
        >
            {voting ? (
                <Loader2 className={`${large ? 'w-6 h-6' : 'w-5 h-5'} animate-spin`} />
            ) : (
                <>
                    {voted ? (
                        <CheckCircle2 className={`${large ? 'w-6 h-6' : 'w-5 h-5'} fill-current`} />
                    ) : (
                        <ThumbsUp className={`${large ? 'w-6 h-6' : 'w-5 h-5'}`} />
                    )}
                    <span className={`${numberClasses} font-black tabular-nums leading-none inline-block ${bumping ? 'animate-bump' : ''}`}>{request.votes_count}</span>
                    {large && (
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                            {voted ? 'Votou hoje' : 'Votar hoje'}
                        </span>
                    )}
                </>
            )}
        </button>
    );
}

function DetailModal({ request, onClose, onVote, voting, bumping }: {
    request: RequestWithVotes;
    onClose: () => void;
    onVote: () => void;
    voting: boolean;
    bumping: boolean;
}) {
    const Icon = BUSINESS_ICONS[request.business_type] || HelpCircle;

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
            onClick={onClose}
        >
            <div
                className="relative bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="relative bg-gradient-to-br from-violet-50 to-fuchsia-50 px-6 pt-6 pb-5 border-b border-violet-100">
                    <button
                        onClick={onClose}
                        aria-label="Fechar"
                        className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-gray-600 flex items-center justify-center transition-colors shadow-sm"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="flex items-start gap-3 pr-12">
                        <div className="w-12 h-12 bg-[#7c3aed] rounded-xl flex items-center justify-center shrink-0">
                            <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <span className="inline-block text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 bg-white text-[#7c3aed] rounded-md mb-1.5">
                                {BUSINESS_LABELS[request.business_type] || request.business_type}
                            </span>
                            <h2 className="text-xl font-black text-gray-900 leading-tight">{request.niche}</h2>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-2 flex-wrap">
                                <span>Ideia de <strong className="text-gray-700">{request.user_name}</strong></span>
                                <span>·</span>
                                <span>{new Date(request.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 overflow-y-auto flex-1 space-y-5">
                    {request.target_audience && (
                        <Section title="Público-alvo" icon={Users}>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{request.target_audience}</p>
                        </Section>
                    )}

                    {request.features && request.features.length > 0 && (
                        <Section title={`Funcionalidades pedidas (${request.features.length})`} icon={Sparkles}>
                            <div className="flex flex-wrap gap-1.5">
                                {request.features.map(f => (
                                    <span key={f} className="text-xs font-semibold px-2.5 py-1 bg-violet-50 text-violet-700 rounded-md border border-violet-100">
                                        {FEATURE_LABELS[f] || f.replace(/-/g, ' ')}
                                    </span>
                                ))}
                            </div>
                        </Section>
                    )}

                    {request.style_preference && (
                        <Section title="Estilo visual" icon={Palette}>
                            <span className="inline-block text-sm font-semibold px-3 py-1.5 bg-gray-100 text-gray-800 rounded-lg">
                                {STYLE_LABELS[request.style_preference] || request.style_preference}
                            </span>
                        </Section>
                    )}

                    {request.reference_urls && request.reference_urls.length > 0 && (
                        <Section title="Sites de referência" icon={Link2}>
                            <div className="space-y-1.5">
                                {request.reference_urls.map((u, i) => (
                                    <a
                                        key={i}
                                        href={u}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline break-all"
                                    >
                                        <ExternalLink className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{u}</span>
                                    </a>
                                ))}
                            </div>
                        </Section>
                    )}

                    {request.extra_notes && (
                        <Section title="Comentários do autor" icon={Info}>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded-lg p-3">
                                {request.extra_notes}
                            </p>
                        </Section>
                    )}
                </div>

                {/* Footer com voto destacado */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Votos acumulados na semana</p>
                        <p className="text-2xl font-black text-gray-900">{request.votes_count}</p>
                    </div>
                    <div className="text-right text-[11px] text-gray-500 max-w-[180px] leading-tight mr-2">
                        1 voto por dia.<br />
                        {request.user_voted_today
                            ? <span className="text-emerald-600 font-bold">✓ Você já votou hoje!</span>
                            : 'Vote hoje pra ajudar o template a virar real.'}
                    </div>
                    <VoteButton request={request} voting={voting} onVote={onVote} large bumping={bumping} />
                </div>
            </div>
        </div>
    );
}

function Section({ title, icon: Icon, children }: {
    title: string; icon: React.ElementType; children: React.ReactNode;
}) {
    return (
        <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" />
                {title}
            </p>
            {children}
        </div>
    );
}
