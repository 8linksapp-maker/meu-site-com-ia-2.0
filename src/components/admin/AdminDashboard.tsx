import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalTemplates: 0,
        totalUsers: 0,
        totalDeploys: 0,
        totalCategories: 0
    });

    const [activities, setActivities] = useState<any[]>([]);
    const [topTemplates, setTopTemplates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Stats in parallel
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

            // Real ranking for Top Templates mathematically calculating occurrences
            if (allTemplates && allDeploys) {
                const countMap = new Map();
                allDeploys.forEach((d: any) => {
                    if (d.template_id) {
                        countMap.set(d.template_id, (countMap.get(d.template_id) || 0) + 1);
                    }
                });

                const realRanking = [...allTemplates].map(t => ({
                    ...t,
                    clones: countMap.get(t.id) || 0
                })).sort((a, b) => b.clones - a.clones);

                // Filtrar caso os clones sejam 0, a menos que haja poucos templates
                const top5 = realRanking.slice(0, 5);
                setTopTemplates(top5);
            }

            // Merge activities
            const acts: any[] = [];
            if (recentUsers) {
                recentUsers.forEach(u => acts.push({
                    type: 'user',
                    title: 'Novo usuário',
                    desc: `${u.full_name || u.email || 'Alguém'} acabou de se cadastrar na plataforma.`,
                    date: new Date(u.created_at)
                }));
            }
            if (recentSites) {
                recentSites.forEach(s => acts.push({
                    type: 'deploy',
                    title: 'Novo deploy gerado',
                    desc: `Um site foi criado com o nome "${s.github_repo}".`,
                    date: new Date(s.created_at)
                }));
            }

            acts.sort((a, b) => b.date.getTime() - a.date.getTime());
            setActivities(acts.slice(0, 7));

        } catch (e) {
            console.error(e);
        }
        setLoading(false);
    };

    if (loading) return <div className="text-gray-500 p-8 flex justify-center text-sm animate-pulse">Carregando métricas da plataforma...</div>;

    const timeAgo = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        if (seconds < 60) return `${seconds}s atrás`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m atrás`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h atrás`;
        return `${Math.floor(hours / 24)}d atrás`;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Visão Geral</h2>
                    <p className="text-sm text-gray-500 mt-1">Métricas em tempo real do seu marketplace.</p>
                </div>
                <button onClick={loadDashboardData} className="p-2.5 bg-[#7c3aed]/5 text-[#7c3aed] hover:bg-[#7c3aed]/10 rounded-full transition" title="Atualizar Dados">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                </button>
            </div>

            {/* CARDS DE ESTATÍSTICA */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#7c3aed]/5 rounded-full transition-transform group-hover:scale-110"></div>
                    <span className="text-sm font-semibold text-gray-500 mb-1 z-10">Total de Deploys</span>
                    <span className="text-4xl font-extrabold text-[#7c3aed] z-10">{stats.totalDeploys}</span>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/5 rounded-full transition-transform group-hover:scale-110"></div>
                    <span className="text-sm font-semibold text-gray-500 mb-1 z-10">Usuários Ativos</span>
                    <span className="text-4xl font-extrabold text-blue-600 z-10">{stats.totalUsers}</span>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/5 rounded-full transition-transform group-hover:scale-110"></div>
                    <span className="text-sm font-semibold text-gray-500 mb-1 z-10">Templates na Vitrine</span>
                    <span className="text-4xl font-extrabold text-emerald-600 z-10">{stats.totalTemplates}</span>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/5 rounded-full transition-transform group-hover:scale-110"></div>
                    <span className="text-sm font-semibold text-gray-500 mb-1 z-10">Categorias</span>
                    <span className="text-4xl font-extrabold text-amber-600 z-10">{stats.totalCategories}</span>
                </div>
            </div>

            {/* DUAS COLUNAS EM BAIXO */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* TOP TEMPLATES */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Templates Mais Populares</h3>
                            <p className="text-xs text-gray-500 mt-1">Ranking de conversão no marketplace (Top 5)</p>
                        </div>
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                        </div>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {topTemplates.length > 0 ? topTemplates.map((t, idx) => (
                            <div key={t.id} className="p-5 hover:bg-gray-50/50 transition flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`flex-shrink-0 w-8 text-center font-black text-lg ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-amber-600' : 'text-gray-200'}`}>
                                        #{idx + 1}
                                    </div>
                                    {t.image_url ? (
                                        <div className="w-16 h-12 bg-gray-100 rounded-lg overflow-hidden relative shadow-[0_2px_10px_-4px_rgba(0,0,0,0.2)] border border-gray-200">
                                            <img src={t.image_url} alt="" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-12 bg-[#7c3aed]/5 rounded-lg flex justify-center items-center text-[#7c3aed]/50 font-bold text-[10px] border border-[#7c3aed]/10">IMG</div>
                                    )}
                                    <div>
                                        <h4 className="font-bold text-sm text-gray-900">{t.name}</h4>
                                        <p className="text-[11px] text-gray-500 font-mono mt-0.5 opacity-70">{t.repo}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md shadow-sm">
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                        {t.clones} deploys
                                    </span>
                                </div>
                            </div>
                        )) : (
                            <div className="p-8 text-center text-gray-500 text-sm">Nenhum template cadastrado ainda.</div>
                        )}
                    </div>
                </div>

                {/* FEED DE ATIVIDADES */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full max-h-[500px]">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/30">
                        <h3 className="text-lg font-bold text-gray-900">Feed de Atividades</h3>
                        <p className="text-xs text-gray-500 mt-1">Ações recentes na plataforma</p>
                    </div>
                    <div className="p-5 flex-1 overflow-y-auto">
                        {activities.length > 0 ? (
                            <div className="relative border-l-2 border-gray-100 ml-3 space-y-6 pb-4">
                                {activities.map((act, i) => (
                                    <div key={i} className="relative pl-6">
                                        {/* Dot */}
                                        <span className={`absolute -left-[11px] top-1 w-5 h-5 rounded-full border-4 border-white ${act.type === 'user' ? 'bg-blue-400' : 'bg-[#7c3aed]'} shadow-sm`}></span>

                                        <div className="w-full text-left">
                                            <div className="flex justify-between items-start mb-0.5">
                                                <h4 className="font-bold text-xs text-gray-800">{act.title}</h4>
                                                <span className="text-[10px] font-semibold text-gray-400 whitespace-nowrap ml-2 bg-gray-50 px-1.5 py-0.5 rounded">{timeAgo(act.date)}</span>
                                            </div>
                                            <p className="text-[11px] text-gray-600 leading-relaxed pr-2">{act.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center text-gray-400 text-xs py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200 mt-4">Silêncio por aqui... nenhuma atividade ainda.</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
