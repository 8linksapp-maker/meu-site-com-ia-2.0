import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    PlayCircle,
    Layout,
    Heart,
    MessageSquare,
    BookOpen,
    ArrowRight,
    Plus,
    Zap,
    ExternalLink,
    Sparkles,
    ShieldCheck,
    TrendingUp,
    Star,
    Clock
} from 'lucide-react';

export default function Overview() {
    const [userName, setUserName] = useState('');
    const [latestTemplates, setLatestTemplates] = useState<any[]>([]);
    const [nextLesson, setNextLesson] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [sitesCount, setSitesCount] = useState(0);
    const [totalProgress, setTotalProgress] = useState(0);
    const [currentLessonProgress, setCurrentLessonProgress] = useState(0);
    const [totalLessonsCount, setTotalLessonsCount] = useState(0);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário');

            const { data: templatesData } = await supabase
                .from('templates')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(3);
            if (templatesData) setLatestTemplates(templatesData);

            // 1. Buscar progresso real
            const { data: progressData } = await supabase
                .from('user_lessons_progress')
                .select('lesson_id, percent_completed, is_completed, updated_at')
                .eq('user_id', user.id)
                .order('updated_at', { ascending: false });

            // 2. Buscar o total real de aulas
            const { count: totalLessons } = await supabase
                .from('lessons')
                .select('*', { count: 'exact', head: true });

            setTotalLessonsCount(totalLessons || 0);

            if (progressData && progressData.length > 0) {
                // Última aula assistida
                const lastProgress = progressData[0];
                setCurrentLessonProgress(lastProgress.percent_completed);

                const { data: lastLessonData } = await supabase
                    .from('lessons')
                    .select('*, modules(title)')
                    .eq('id', lastProgress.lesson_id)
                    .single();

                if (lastLessonData) setNextLesson(lastLessonData);

                // Calcular progresso total (aulas completadas / total de aulas)
                const completedLessons = progressData.filter(p => p.is_completed).length;
                const progressPercent = totalLessons && totalLessons > 0
                    ? Math.min(100, Math.round((completedLessons / totalLessons) * 100))
                    : 0;
                setTotalProgress(progressPercent);
            } else {
                // ... rest of fallback remains same but we reuse it for simplicity
                const { data: firstLesson } = await supabase
                    .from('lessons')
                    .select('*, modules(title)')
                    .order('display_order', { ascending: true })
                    .limit(1)
                    .single();
                if (firstLesson) setNextLesson(firstLesson);
                setTotalProgress(0);
                setCurrentLessonProgress(0);
            }
            // ... templates and sites count stay same

            const token = (await supabase.auth.getSession()).data.session?.access_token;
            const res = await fetch('/api/admin/my-sites', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setSitesCount(data?.length || 0);
            }

        } catch (err) {
            console.error('Erro ao carregar dashboard:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7c3aed]"></div>
            </div>
        );
    }

    return (
        <div className="relative space-y-6 pb-8 overflow-hidden animate-in fade-in duration-700">
            {/* Decorativos sutis */}
            <div className="absolute top-[-50px] right-[-50px] w-96 h-96 bg-purple-100/20 rounded-full blur-[100px] -z-10"></div>

            {/* Header Compacto */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                        Olá, <span className="text-[#7c3aed]">{userName}</span>! 👋
                    </h1>
                    <p className="text-gray-500 font-medium text-sm">Bem-vindo de volta ao seu centro estratégico.</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-emerald-100 text-emerald-600 rounded-full font-bold text-xs shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Plataforma Ativa
                </div>
            </div>

            {/* Grid Principal Compacto */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                {/* 1. LMS Card Compacto (Span 8) */}
                <div className="lg:col-span-12 xl:col-span-8 flex flex-col gap-6">
                    <div className="bg-gradient-to-br from-gray-900 via-[#1a1a1a] to-black rounded-[24px] overflow-hidden shadow-xl border border-white/5 flex flex-col md:flex-row transition-all hover:shadow-purple-500/5">
                        <div className="md:w-[220px] bg-white/5 backdrop-blur-md p-6 flex flex-col justify-center items-center text-center border-b md:border-b-0 md:border-r border-white/10">
                            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-blue-500 text-white flex items-center justify-center shadow-lg mb-4 cursor-pointer hover:scale-105 transition-transform group">
                                <PlayCircle className="w-7 h-7 fill-white/20" />
                                <div className="absolute inset-0 bg-white/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>
                            <h3 className="font-bold text-gray-400 uppercase text-[9px] tracking-widest">Curso Completo</h3>
                            <div className="w-full h-1 bg-white/10 rounded-full mt-3 overflow-hidden max-w-[100px]">
                                <div className="h-full bg-[#7c3aed] shadow-[0_0_8px_rgba(124,58,237,0.6)]" style={{ width: `${totalProgress}%` }}></div>
                            </div>
                            <p className="text-white font-black text-xs mt-2 uppercase tracking-tighter">{totalProgress}% Curso</p>

                            {/* Novo: Progresso da Aula Atual */}
                            {currentLessonProgress > 0 && (
                                <div className="mt-4 pt-4 border-t border-white/5 w-full">
                                    <h4 className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-2 text-center">Nesta Aula</h4>
                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" style={{ width: `${currentLessonProgress}%` }}></div>
                                    </div>
                                    <p className="text-emerald-400 font-extrabold text-[10px] mt-1.5 uppercase tracking-tighter text-center">{currentLessonProgress}%</p>
                                </div>
                            )}
                        </div>

                        <div className="flex-1 p-6 md:p-8 flex flex-col justify-center">
                            {nextLesson ? (
                                <>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${totalProgress > 0 ? 'bg-[#7c3aed]/20 text-[#a78bfa]' : 'bg-amber-500/20 text-amber-500'}`}>
                                            {totalProgress > 0 ? 'CONTINUAR ASSISTINDO' : 'AULA EM DESTAQUE'}
                                        </span>
                                        <span className="text-white/20 text-xs">•</span>
                                        <span className="text-white/40 text-[9px] font-bold uppercase tracking-widest truncate">{nextLesson.modules?.title}</span>
                                    </div>
                                    <h3 className="text-xl font-black text-white tracking-tight mb-3 line-clamp-1">{nextLesson.title}</h3>
                                    <p className="text-gray-400 text-sm leading-relaxed mb-6 line-clamp-2 max-w-xl">{nextLesson.description}</p>
                                    <div className="flex items-center gap-4">
                                        <a href="/aulas" className="bg-white text-black px-6 py-2.5 rounded-xl font-black text-xs hover:bg-[#7c3aed] hover:text-white transition-all shadow-md active:scale-95">
                                            COMEÇAR AGORA
                                        </a>
                                        <div className="flex items-center gap-1.5 text-gray-500 font-bold text-[10px] uppercase tracking-tighter">
                                            <Clock className="w-3.5 h-3.5" />
                                            Curso de IA
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <p className="text-gray-500 text-sm">Inicie seu treinamento agora.</p>
                            )}
                        </div>
                    </div>

                    {/* 2. Novos Templates Compacto */}
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                                Novos Templates
                            </h3>
                            <a href="/sites" className="text-[11px] font-black text-[#7c3aed] hover:underline uppercase tracking-widest">Ver Tudo</a>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {latestTemplates.map((template, i) => (
                                <a
                                    key={i}
                                    href="/sites"
                                    className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition-all"
                                >
                                    <div className="aspect-video bg-gray-50 relative overflow-hidden">
                                        <img src={template.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                        <div className="absolute top-2 left-2">
                                            <span className="px-1.5 py-0.5 bg-gray-900/80 text-white text-[8px] font-black rounded border border-white/10 uppercase">AI Ready</span>
                                        </div>
                                    </div>
                                    <div className="p-3">
                                        <h4 className="font-bold text-gray-900 text-[11px] truncate uppercase tracking-tight">{template.name}</h4>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. Sidebar Compacta (Span 4) */}
                <div className="lg:col-span-12 xl:col-span-4 flex flex-col gap-6">

                    {/* Stats Card Compacto - NO TOPO */}
                    <div className="bg-gradient-to-br from-[#7c3aed] to-blue-600 rounded-[20px] p-5 text-white relative overflow-hidden group shadow-lg shadow-purple-500/10 transition-all hover:scale-[1.02]">
                        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '12px 12px' }}></div>

                        <div className="relative z-10 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <TrendingUp className="w-3.5 h-3.5 text-purple-200" />
                                    <h4 className="text-[8px] font-black text-purple-100 uppercase tracking-widest">IMPACTO</h4>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <p className="text-3xl font-black">{sitesCount}</p>
                                    <span className="text-sm font-bold text-purple-200">sites ativos</span>
                                </div>
                            </div>
                            <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-sm">
                                <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
                            </div>
                        </div>
                    </div>

                    {/* Cockpit Compacto */}
                    <div className="bg-white rounded-[24px] border border-gray-100 shadow-sm p-6 space-y-4">
                        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-2">
                            <Layout className="w-4 h-4 text-[#7c3aed]" />
                            Cockpit
                        </h3>

                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { href: '/sites', icon: Plus, label: 'Criar Novo Site', bg: 'bg-[#7c3aed]', color: 'text-white' },
                                { href: '/favoritos', icon: Heart, label: 'Templates Favoritos', bg: 'bg-rose-50', color: 'text-rose-500' },
                                { href: '/como-usar', icon: BookOpen, label: 'Ajuda & Docs', bg: 'bg-blue-50', color: 'text-blue-500' },
                                {
                                    onClick: () => window.dispatchEvent(new CustomEvent('open-group-wizard')),
                                    icon: MessageSquare,
                                    label: 'Grupo de Alunos',
                                    bg: 'bg-emerald-50',
                                    color: 'text-emerald-500'
                                }
                            ].map((item, i) => (
                                <button
                                    key={i}
                                    onClick={item.onClick || (() => window.location.href = item.href || '#')}
                                    className="w-full flex items-center gap-3 p-2.5 rounded-xl border border-transparent transition-all hover:bg-gray-50 hover:border-gray-100 group text-left"
                                >
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${item.bg} ${item.color} group-hover:scale-105 transition-transform shadow-sm`}>
                                        <item.icon className="w-4.5 h-4.5" />
                                    </div>
                                    <span className="font-bold text-[12px] text-gray-700 tracking-tight">{item.label}</span>
                                    <ArrowRight className="ml-auto w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                                </button>
                            ))}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
