import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, FileText, Trophy, Calendar, ThumbsUp, Sparkles, ChevronRight } from 'lucide-react';

interface MyRequest {
    id: string;
    business_type: string;
    niche: string;
    target_audience: string;
    features: string[];
    status: string;
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

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
    new: { label: 'Nova', bg: 'bg-blue-100', text: 'text-blue-700' },
    in_review: { label: 'Em análise', bg: 'bg-amber-100', text: 'text-amber-700' },
    planned: { label: 'Aprovada', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    in_progress: { label: 'Em produção', bg: 'bg-violet-100', text: 'text-violet-700' },
    delivered: { label: 'Entregue', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    declined: { label: 'Não viável', bg: 'bg-gray-100', text: 'text-gray-600' },
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
                (votes || []).forEach((v: any) => {
                    votesMap[v.request_id] = (votesMap[v.request_id] || 0) + 1;
                });
            }

            setRequests((data || []).map(r => ({ ...r, votes_count: votesMap[r.id] || 0 })));
        } catch (e: any) {
            setError(e?.message || 'Erro ao carregar.');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-[#7c3aed]" />
            </div>
        );
    }

    if (error) {
        return <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>;
    }

    if (requests.length === 0) {
        return (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-700 font-semibold">Você ainda não enviou nenhuma solicitação</p>
                <p className="text-sm text-gray-500 mt-1 mb-4">Que tipo de template você gostaria de ver na plataforma?</p>
                {onGoToCreate && (
                    <button
                        onClick={onGoToCreate}
                        className="px-5 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold rounded-xl text-sm transition-colors"
                    >
                        Fazer primeira solicitação
                    </button>
                )}
            </div>
        );
    }

    const totalVotes = requests.reduce((sum, r) => sum + (r.votes_count || 0), 0);
    const wonCount = requests.filter(r => r.won_week_start).length;

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
                <SmallStat icon={FileText} label="Solicitações" value={requests.length} />
                <SmallStat icon={ThumbsUp} label="Votos recebidos" value={totalVotes} />
                <SmallStat icon={Trophy} label="Campeãs" value={wonCount} highlight={wonCount > 0} />
            </div>

            <div className="space-y-2">
                {requests.map(r => {
                    const status = STATUS_CONFIG[r.status] || STATUS_CONFIG.new;
                    return (
                        <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
                            <div className="flex items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                                            {status.label}
                                        </span>
                                        {r.won_week_start && (
                                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                                <Trophy className="w-3 h-3" /> Campeã
                                            </span>
                                        )}
                                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                            {BUSINESS_LABELS[r.business_type] || r.business_type}
                                        </span>
                                    </div>
                                    <p className="font-bold text-gray-900 truncate">{r.niche}</p>
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </span>
                                        {r.production_target_date && (
                                            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                                                <Sparkles className="w-3 h-3" />
                                                Sai em {new Date(r.production_target_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-50 text-violet-700 rounded-lg font-bold text-sm">
                                        <ThumbsUp className="w-3.5 h-3.5" />
                                        {r.votes_count || 0}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function SmallStat({ icon: Icon, label, value, highlight = false }: {
    icon: React.ElementType; label: string; value: number; highlight?: boolean;
}) {
    return (
        <div className={`rounded-xl p-3 border ${highlight ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-200'}`}>
            <Icon className={`w-4 h-4 mb-1 ${highlight ? 'text-amber-600' : 'text-gray-400'}`} />
            <p className={`text-xl font-bold ${highlight ? 'text-amber-700' : 'text-gray-900'}`}>{value}</p>
            <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">{label}</p>
        </div>
    );
}
