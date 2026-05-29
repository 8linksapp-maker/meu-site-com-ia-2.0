import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Globe, Users, FileStack, Tags, Trophy, RefreshCw,
    UserPlus, Rocket, Sparkles, Loader2
} from 'lucide-react';
import { PageHeader } from '../ui/admin';
import { Card } from '../ui';

interface TemplateRow {
    id: string;
    name: string;
    repo?: string;
    image_url?: string | null;
    clones?: number;
}

interface ActivityItem {
    type: 'user' | 'deploy';
    title: string;
    desc: string;
    date: Date;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalTemplates: 0,
        totalUsers: 0,
        totalDeploys: 0,
        totalCategories: 0,
    });
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [topTemplates, setTopTemplates] = useState<TemplateRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        try {
            const [
                { count: templatesCount },
                { count: usersCount },
                { count: sitesCount },
                { count: catCount },
                { data: recentUsers },
                { data: recentSites },
                { data: allTemplates },
                { data: allDeploys }
            ] = await Promise.all([
                supabase.from('templates').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('*', { count: 'exact', head: true }),
                supabase.from('user_sites').select('*', { count: 'exact', head: true }),
                supabase.from('template_categories').select('*', { count: 'exact', head: true }),
                supabase.from('profiles').select('id, full_name, email, created_at').order('created_at', { ascending: false }).limit(5),
                supabase.from('user_sites').select('id, github_repo, created_at').order('created_at', { ascending: false }).limit(5),
                supabase.from('templates').select('*'),
                supabase.from('user_sites').select('template_id')
            ]);

            setStats({
                totalTemplates: templatesCount || 0,
                totalUsers: usersCount || 0,
                totalDeploys: sitesCount || 0,
                totalCategories: catCount || 0,
            });

            if (allTemplates && allDeploys) {
                const countMap = new Map<string, number>();
                allDeploys.forEach((d: { template_id?: string }) => {
                    if (d.template_id) {
                        countMap.set(d.template_id, (countMap.get(d.template_id) || 0) + 1);
                    }
                });

                const realRanking = [...(allTemplates as TemplateRow[])].map(t => ({
                    ...t,
                    clones: countMap.get(t.id) || 0
                })).sort((a, b) => (b.clones ?? 0) - (a.clones ?? 0));

                setTopTemplates(realRanking.slice(0, 5));
            }

            const acts: ActivityItem[] = [];
            if (recentUsers) {
                (recentUsers as Array<{ full_name: string | null; email: string | null; created_at: string }>).forEach(u => acts.push({
                    type: 'user',
                    title: 'Novo aluno',
                    desc: `${u.full_name || u.email || 'Alguém'} acabou de se cadastrar na plataforma.`,
                    date: new Date(u.created_at)
                }));
            }
            if (recentSites) {
                (recentSites as Array<{ github_repo: string; created_at: string }>).forEach(s => acts.push({
                    type: 'deploy',
                    title: 'Novo site publicado',
                    desc: `Site "${s.github_repo}" foi publicado agora.`,
                    date: new Date(s.created_at)
                }));
            }

            acts.sort((a, b) => b.date.getTime() - a.date.getTime());
            setActivities(acts.slice(0, 8));
        } catch (e) {
            console.error('Erro carregando admin dashboard:', e);
        }
        setLoading(false);
        setRefreshing(false);
    };

    const timeAgo = (date: Date) => {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}min`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h`;
        return `${Math.floor(hours / 24)}d`;
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-coral-terra" />
                <p className="text-cafe-medio text-sm">Carregando métricas…</p>
            </div>
        );
    }

    const STAT_ITEMS = [
        { icon: Rocket,     label: 'Sites publicados', value: stats.totalDeploys },
        { icon: Users,      label: 'Alunos ativos',     value: stats.totalUsers },
        { icon: FileStack,  label: 'Templates',         value: stats.totalTemplates },
        { icon: Tags,       label: 'Categorias',        value: stats.totalCategories },
    ];

    return (
        <div className="space-y-6 pb-8">
            <PageHeader
                title="Visão geral"
                tagline="Métricas em tempo real da plataforma."
                action={
                    <button
                        type="button"
                        onClick={() => loadDashboardData(true)}
                        disabled={refreshing}
                        title="Atualizar dados"
                        aria-label="Atualizar dados"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-cream-elevated hover:bg-coral-wash text-cafe-medio hover:text-terracota-profundo border border-borda-cafe rounded-[10px] font-semibold text-sm transition-colors active:scale-[0.98] min-h-[40px] disabled:opacity-60"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        Atualizar
                    </button>
                }
            />

            {/* Stats em linha editorial (igual padrão dashboard novo) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-borda-cafe border-y border-borda-cafe py-6">
                {STAT_ITEMS.map((stat, i) => (
                    <div key={i} className="flex flex-col items-start px-4 md:px-6">
                        <div className="flex items-center gap-2 mb-2 text-cafe-cinza-quente">
                            <stat.icon className="w-3.5 h-3.5" />
                            <span className="text-xs font-semibold uppercase tracking-wide">{stat.label}</span>
                        </div>
                        <p className="font-display text-3xl md:text-4xl font-normal text-carvao-quente tabular-nums tracking-tight leading-none">
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Grid 2/3 + 1/3 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Top Templates */}
                <div className="lg:col-span-2">
                    <Card padding="md" className="!p-0 overflow-hidden">
                        <div className="px-5 py-4 border-b border-borda-cafe flex items-center justify-between">
                            <div>
                                <h2 className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                                    Templates mais publicados
                                </h2>
                                <p className="text-xs text-cafe-medio mt-0.5">
                                    Ranking de uso (top 5)
                                </p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-coral-wash flex items-center justify-center">
                                <Trophy className="w-4 h-4 text-coral-terra" />
                            </div>
                        </div>

                        {topTemplates.length > 0 ? (
                            <ol>
                                {topTemplates.map((t, idx) => (
                                    <li key={t.id} className={idx > 0 ? 'border-t border-borda-cafe' : ''}>
                                        <div className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-coral-wash/30 transition-colors">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`flex-shrink-0 w-7 text-center font-display text-base tabular-nums ${
                                                    idx === 0 ? 'text-mostarda-amber font-semibold' :
                                                    idx === 1 ? 'text-cafe-medio font-semibold' :
                                                    idx === 2 ? 'text-coral-terra font-semibold' :
                                                    'text-cafe-cinza-quente'
                                                }`}>
                                                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                                                </div>
                                                {t.image_url ? (
                                                    <div className="w-14 h-10 bg-cream-elevated rounded-[6px] overflow-hidden border border-borda-cafe shrink-0">
                                                        <img src={t.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                                                    </div>
                                                ) : (
                                                    <div className="w-14 h-10 bg-cream-elevated rounded-[6px] flex items-center justify-center text-cafe-cinza-quente shrink-0">
                                                        <Sparkles className="w-4 h-4" />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-sm text-carvao-quente truncate">{t.name}</p>
                                                    {t.repo && (
                                                        <p className="font-mono text-xs text-cafe-cinza-quente truncate mt-0.5">{t.repo}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-cafe-medio bg-cream-elevated px-2.5 py-1 rounded-full tabular-nums shrink-0">
                                                <Rocket className="w-3 h-3" />
                                                {t.clones} {t.clones === 1 ? 'publicação' : 'publicações'}
                                            </span>
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        ) : (
                            <div className="p-8 text-center text-cafe-cinza-quente text-sm italic">
                                Nenhum template publicado ainda.
                            </div>
                        )}
                    </Card>
                </div>

                {/* Feed atividades */}
                <Card padding="md" className="!p-0 overflow-hidden flex flex-col h-full max-h-[520px]">
                    <div className="px-5 py-4 border-b border-borda-cafe flex items-center justify-between">
                        <div>
                            <h2 className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                                Atividades recentes
                            </h2>
                            <p className="text-xs text-cafe-medio mt-0.5">
                                Últimas ações na plataforma
                            </p>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {activities.length > 0 ? (
                            <ul>
                                {activities.map((act, i) => (
                                    <li key={i} className={`px-5 py-3.5 ${i > 0 ? 'border-t border-borda-cafe' : ''}`}>
                                        <div className="flex items-start gap-3">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                                act.type === 'user' ? 'bg-coral-wash text-coral-terra' : 'bg-[oklch(94%_0.020_145)] text-[oklch(40%_0.060_145)]'
                                            }`}>
                                                {act.type === 'user' ? <UserPlus className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <p className="text-sm font-semibold text-carvao-quente truncate">{act.title}</p>
                                                    <span className="text-xs text-cafe-cinza-quente tabular-nums shrink-0">
                                                        {timeAgo(act.date)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-cafe-medio leading-relaxed mt-0.5">{act.desc}</p>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="p-8 text-center text-cafe-cinza-quente text-sm italic">
                                Silêncio por aqui. Nenhuma atividade recente.
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
}
