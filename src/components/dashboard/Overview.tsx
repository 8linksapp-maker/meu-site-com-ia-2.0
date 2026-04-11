import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Plus, Globe, Heart, ExternalLink, Sparkles, LayoutDashboard,
    ArrowRight, BookOpen, GraduationCap, Rocket, Zap, ChevronRight,
    Settings, Play, TrendingUp
} from 'lucide-react';
import OnboardingGuide from '../ui/OnboardingGuide';

interface Site {
    id: string;
    github_repo: string;
    domain?: string;
    created_at: string;
    vercel_project_id?: string;
}

export default function Overview() {
    const [userName, setUserName] = useState('');
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);

    const [hasTokens, setHasTokens] = useState(false);
    const [sites, setSites] = useState<Site[]>([]);
    const [sitesCount, setSitesCount] = useState(0);
    const [templatesCount, setTemplatesCount] = useState(0);
    const [favoritesCount, setFavoritesCount] = useState(0);
    const [latestTemplates, setLatestTemplates] = useState<any[]>([]);
    const [totalProgress, setTotalProgress] = useState(0);
    const [totalLessonsCount, setTotalLessonsCount] = useState(0);

    useEffect(() => { fetchDashboardData(); }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário');

            const results = await Promise.allSettled([
                    supabase.from('profiles').select('github_token, vercel_token').eq('id', user.id).limit(1),
                    supabase.from('templates').select('*').order('created_at', { ascending: false }),
                    supabase.from('user_favorites').select('template_id', { count: 'exact', head: true }).eq('user_id', user.id),
                    supabase.from('lessons').select('*', { count: 'exact', head: true }),
                    supabase.from('user_lessons_progress').select('lesson_id, is_completed').eq('user_id', user.id),
                ]);

            const profileResult = results[0].status === 'fulfilled' ? results[0].value : null;
            const templatesResult = results[1].status === 'fulfilled' ? results[1].value : null;
            const favoritesResult = results[2].status === 'fulfilled' ? results[2].value : null;
            const lessonsResult = results[3].status === 'fulfilled' ? results[3].value : null;
            const progressResult = results[4].status === 'fulfilled' ? results[4].value : null;

            if (profileResult?.data?.[0]) {
                const p = profileResult.data[0];
                setHasTokens(!!(p.github_token && p.vercel_token));
            }
            if (templatesResult?.data) {
                setTemplatesCount(templatesResult.data.length);
                setLatestTemplates(templatesResult.data.slice(0, 3));
            }
            setFavoritesCount(favoritesResult?.count || 0);

            const totalLessons = lessonsResult?.count || 0;
            setTotalLessonsCount(totalLessons);
            if (progressResult?.data?.length && totalLessons > 0) {
                const completed = progressResult.data.filter(p => p.is_completed).length;
                setTotalProgress(Math.round((completed / totalLessons) * 100));
            }

            const token = (await supabase.auth.getSession()).data.session?.access_token;
            const res = await fetch('/api/admin/my-sites', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const data = await res.json();
                setSites(data || []);
                setSitesCount(data?.length || 0);
            }
        } catch (err) {
            console.error('Erro ao carregar dashboard:', err);
            setLoadError(true);
        } finally {
            setLoading(false);
        }
    };

    // ── ERRO AO CARREGAR ──────────────────────────────────────────
    if (loadError && !loading) {
        return (
            <div className="flex flex-col items-center justify-center p-16 text-center bg-white rounded-2xl border border-gray-200">
                <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">Não foi possível carregar o dashboard</h3>
                <p className="text-sm text-gray-500 mb-4">Verifique sua conexão e tente novamente.</p>
                <button onClick={() => { setLoadError(false); fetchDashboardData(); }} className="px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-800 transition">
                    Tentar novamente
                </button>
            </div>
        );
    }

    // ── SKELETON LOADER ──────────────────────────────────────────
    if (loading) {
        return (
            <div className="space-y-6 pb-8">
                {/* Hero skeleton */}
                <div className="h-44 bg-gray-900 rounded-[24px] animate-pulse opacity-60" />
                {/* Stats skeleton */}
                <div className="grid grid-cols-3 gap-4">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />
                    ))}
                </div>
                {/* Content skeleton */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2 space-y-4">
                        <div className="h-6 w-32 bg-gray-200 rounded-lg animate-pulse" />
                        <div className="grid grid-cols-3 gap-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="h-44 bg-white rounded-2xl border border-gray-100 animate-pulse" />
                            ))}
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="h-48 bg-white rounded-[20px] border border-gray-100 animate-pulse" />
                        <div className="h-36 bg-gray-900 rounded-[20px] animate-pulse opacity-40" />
                    </div>
                </div>
            </div>
        );
    }

    const isNew = !hasTokens;
    const hasNoSites = hasTokens && sitesCount === 0;
    const isActive = sitesCount > 0;

    const heroConfig = isNew ? {
        badge: '⚡ Configuração Rápida',
        eyebrow: 'BEM-VINDO À PLATAFORMA',
        title: `Falta pouco, ${userName}!`,
        subtitle: 'Configure sua conta em 2 minutos e publique seu primeiro site com IA — sem código.',
        cta: 'Configurar Minha Conta',
        ctaHref: '/configuracoes?tab=integracao',
        ctaSecondary: 'Como funciona?',
        ctaSecondaryHref: '/como-usar',
    } : hasNoSites ? {
        badge: '🚀 Tudo Certo',
        eyebrow: 'CONTA CONFIGURADA',
        title: `Pronto para decolar, ${userName}!`,
        subtitle: 'Escolha um template e publique seu primeiro site agora — leva menos de 2 minutos.',
        cta: 'Criar Meu Primeiro Site',
        ctaHref: '/sites',
        ctaSecondary: null,
        ctaSecondaryHref: null,
    } : {
        badge: `🌐 ${sitesCount} ${sitesCount === 1 ? 'site no ar' : 'sites no ar'}`,
        eyebrow: 'SEU PAINEL',
        title: `Bem-vindo de volta, ${userName}!`,
        subtitle: 'Gerencie seus sites, explore novos templates e acompanhe seu crescimento.',
        cta: 'Criar Novo Site',
        ctaHref: '/sites',
        ctaSecondary: 'Ver Meus Sites',
        ctaSecondaryHref: '/meus-sites',
    };

    const recentSites = sites.slice(0, 3);

    return (
        <div className="space-y-6 pb-8">

            {/* ── HERO ─────────────────────────────────────────── */}
            <div
                className="dashboard-section relative bg-gray-950 rounded-[24px] overflow-hidden"
                style={{ animationDelay: '0ms', minHeight: '176px' }}
            >
                {/* Aurora orbs */}
                <div
                    className="absolute top-[-40px] right-[-40px] w-72 h-72 rounded-full pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle, rgba(124,58,237,0.35) 0%, transparent 70%)',
                        animation: 'auroraFloat 9s ease-in-out infinite',
                    }}
                />
                <div
                    className="absolute bottom-[-60px] left-[10%] w-60 h-60 rounded-full pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle, rgba(59,130,246,0.2) 0%, transparent 70%)',
                        animation: 'auroraFloat 13s ease-in-out infinite reverse',
                    }}
                />
                <div
                    className="absolute top-[20%] left-[40%] w-40 h-40 rounded-full pointer-events-none"
                    style={{
                        background: 'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)',
                        animation: 'auroraFloat 7s ease-in-out infinite 2s',
                    }}
                />
                {/* Dot grid */}
                <div
                    className="absolute inset-0 opacity-[0.035] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)', backgroundSize: '22px 22px' }}
                />

                <div className="relative z-10 p-7 md:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                        <p className="text-[9px] font-black text-[#7c3aed] uppercase tracking-[0.2em] mb-2 opacity-80">
                            {heroConfig.eyebrow}
                        </p>
                        <h1 className="text-2xl md:text-[1.85rem] font-black text-white tracking-tight leading-tight mb-2">
                            {heroConfig.title}
                        </h1>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-md">
                            {heroConfig.subtitle}
                        </p>
                        <div className="mt-4 inline-flex items-center gap-2 text-emerald-400 text-[11px] font-bold">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                            </span>
                            Plataforma Ativa
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
                        {/* Primary CTA — shimmer */}
                        <a
                            href={heroConfig.ctaHref}
                            className="relative overflow-hidden flex items-center justify-center gap-2 bg-white text-gray-900 px-7 py-3 rounded-2xl font-black text-sm transition-all active:scale-95 whitespace-nowrap shadow-lg shadow-white/10 hover:shadow-white/20"
                            style={{ animation: 'pulseGlow 3s ease-in-out infinite' } as React.CSSProperties}
                        >
                            <span
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    background: 'linear-gradient(105deg, transparent 40%, rgba(124,58,237,0.15) 50%, transparent 60%)',
                                    animation: 'shimmerSlide 3s ease-in-out infinite',
                                }}
                            />
                            <Rocket className="w-4 h-4 relative z-10" />
                            <span className="relative z-10">{heroConfig.cta}</span>
                        </a>

                        {heroConfig.ctaSecondary && heroConfig.ctaSecondaryHref && (
                            <a
                                href={heroConfig.ctaSecondaryHref}
                                className="flex items-center justify-center gap-2 bg-white/8 hover:bg-white/14 text-white px-7 py-3 rounded-2xl font-bold text-sm transition-all border border-white/10 hover:border-white/20 active:scale-95 whitespace-nowrap backdrop-blur-sm"
                            >
                                {heroConfig.ctaSecondary}
                                <ArrowRight className="w-4 h-4" />
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* ── STATS ────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { icon: Globe, label: 'Sites Publicados', value: sitesCount, accent: '#7c3aed', bg: '#f5f3ff', href: '/meus-sites', delay: '60ms' },
                    { icon: Sparkles, label: 'Templates Disponíveis', value: templatesCount, accent: '#2563eb', bg: '#eff6ff', href: '/sites', delay: '120ms' },
                    { icon: Heart, label: 'Favoritos', value: favoritesCount, accent: '#e11d48', bg: '#fff1f2', href: '/favoritos', delay: '180ms' },
                ].map((stat, i) => (
                    <a
                        key={i}
                        href={stat.href}
                        className="stat-card bg-white rounded-2xl border border-gray-100 p-4 md:p-5 hover:shadow-lg transition-all group cursor-pointer"
                        style={{ animationDelay: stat.delay, borderColor: 'rgb(243,244,246)' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = stat.accent + '33')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgb(243,244,246)')}
                    >
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm"
                            style={{ background: stat.bg, color: stat.accent }}
                        >
                            <stat.icon className="w-4 h-4" />
                        </div>
                        <p className="text-2xl font-black text-gray-950 tabular-nums">{stat.value}</p>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5 leading-snug">{stat.label}</p>
                    </a>
                ))}
            </div>

            {/* ── CHECKLIST DE ONBOARDING ──────────────────────── */}
            {(!hasTokens || sitesCount === 0) && (
                <div className="dashboard-section bg-white rounded-2xl border border-gray-100 p-5" style={{ animationDelay: '100ms' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                            <Zap className="w-4 h-4 text-amber-500" />
                            Primeiros Passos
                        </h3>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                            {[true, hasTokens, sitesCount > 0].filter(Boolean).length}/3 concluídos
                        </span>
                    </div>
                    <div className="space-y-2">
                        {[
                            { done: true, label: 'Conta criada', desc: 'Sua conta está ativa', href: null },
                            { done: hasTokens, label: 'Tokens configurados', desc: hasTokens ? 'GitHub e Vercel conectados' : 'Conecte GitHub e Vercel para criar sites', href: '/configuracoes?tab=integracao' },
                            { done: sitesCount > 0, label: 'Primeiro site publicado', desc: sitesCount > 0 ? `Você já tem ${sitesCount} site(s)` : 'Escolha um template e publique em 2 minutos', href: '/sites' },
                        ].map((step, i) => (
                            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${step.done ? 'bg-green-50/50' : 'bg-gray-50 hover:bg-gray-100 cursor-pointer'}`}
                                onClick={() => { if (!step.done && step.href) window.location.href = step.href; }}
                            >
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${step.done ? 'bg-green-100' : 'bg-gray-200'}`}>
                                    {step.done ? (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                    ) : (
                                        <span className="text-[10px] font-black text-gray-400">{i + 1}</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-bold ${step.done ? 'text-green-700' : 'text-gray-800'}`}>{step.label}</p>
                                    <p className="text-[11px] text-gray-400 truncate">{step.desc}</p>
                                </div>
                                {!step.done && step.href && (
                                    <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── GRID PRINCIPAL ───────────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* ── Coluna esquerda (2/3) ── */}
                <div className="xl:col-span-2 space-y-6">

                    {/* MEUS SITES */}
                    <div className="dashboard-section space-y-3" style={{ animationDelay: '140ms' }}>
                        <div className="flex items-center justify-between">
                            <h3 className="text-[15px] font-black text-gray-900 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-[#7c3aed]" />
                                Meus Sites
                            </h3>
                            {isActive && (
                                <a href="/meus-sites" className="text-[10px] font-black text-[#7c3aed] hover:underline uppercase tracking-widest flex items-center gap-0.5">
                                    Ver todos <ChevronRight className="w-3 h-3" />
                                </a>
                            )}
                        </div>

                        {isActive ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {recentSites.map((site) => {
                                    const name = site.github_repo?.split('/').pop() || site.github_repo;
                                    const domain = site.domain || `${name}.vercel.app`;
                                    return (
                                        <div
                                            key={site.id}
                                            className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-[#7c3aed]/20 transition-all duration-300 group"
                                        >
                                            <div className="h-28 bg-slate-50 relative overflow-hidden">
                                                <img
                                                    src={`https://api.microlink.io/?url=https://${domain}&screenshot=true&meta=false&embed=screenshot.url`}
                                                    className="w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-700"
                                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/20" />
                                                <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-emerald-500 text-white text-[9px] font-black rounded-full shadow-sm">
                                                    NO AR
                                                </span>
                                            </div>
                                            <div className="p-3.5">
                                                <p className="font-bold text-gray-900 text-xs truncate">{name}</p>
                                                <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5">{domain}</p>
                                                <div className="flex gap-1.5 mt-3">
                                                    <a
                                                        href={`https://${domain}`}
                                                        target="_blank"
                                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-gray-50 text-gray-600 rounded-lg text-[10px] font-bold hover:bg-gray-100 transition"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        <ExternalLink className="w-3 h-3" /> Ver Site
                                                    </a>
                                                    <a
                                                        href={`https://${domain}/admin`}
                                                        target="_blank"
                                                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-[#7c3aed]/8 text-[#7c3aed] rounded-lg text-[10px] font-bold hover:bg-[#7c3aed]/15 transition"
                                                        onClick={e => e.stopPropagation()}
                                                    >
                                                        <LayoutDashboard className="w-3 h-3" /> CMS
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* + Criar Novo */}
                                <a
                                    href="/sites"
                                    className="bg-white rounded-2xl border-2 border-dashed border-gray-200 hover:border-[#7c3aed]/50 hover:bg-[#7c3aed]/[0.02] transition-all flex flex-col items-center justify-center gap-2.5 p-6 group min-h-[185px]"
                                >
                                    <div className="w-11 h-11 rounded-2xl bg-gray-100 group-hover:bg-[#7c3aed] flex items-center justify-center transition-all duration-300 group-hover:shadow-lg group-hover:shadow-purple-500/25">
                                        <Plus className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs font-bold text-gray-500 group-hover:text-[#7c3aed] transition-colors">Criar Novo Site</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">Pronto em 2 min</p>
                                    </div>
                                </a>
                            </div>
                        ) : (
                            /* Empty state — nenhum site */
                            <div className="relative bg-white rounded-[20px] border border-gray-100 overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-br from-[#7c3aed]/[0.03] to-blue-500/[0.03]" />
                                <div className="relative p-8 flex flex-col md:flex-row items-center gap-6">
                                    <div
                                        className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl shrink-0"
                                        style={{ background: 'linear-gradient(135deg, #7c3aed, #3b82f6)', animation: 'pulseGlow 3s ease-in-out infinite' } as React.CSSProperties}
                                    >
                                        <Rocket className="w-8 h-8 text-white" />
                                    </div>
                                    <div className="flex-1 text-center md:text-left">
                                        <h3 className="text-lg font-black text-gray-900 mb-1">Crie seu primeiro site agora</h3>
                                        <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
                                            Escolha um template, dê um nome e publique em menos de 2 minutos. Sem código, sem servidor.
                                        </p>
                                    </div>
                                    <a
                                        href="/sites"
                                        className="shrink-0 flex items-center gap-2 bg-[#7c3aed] text-white px-7 py-3 rounded-2xl font-black text-sm hover:bg-[#6d28d9] transition-all shadow-lg shadow-purple-500/25 active:scale-95"
                                    >
                                        Escolher Template
                                        <ArrowRight className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* TEMPLATES PARA DEPLOY */}
                    <div className="dashboard-section space-y-3" style={{ animationDelay: '220ms' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-[15px] font-black text-gray-900 flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500" />
                                    Prontos para Deploy
                                </h3>
                                <p className="text-[11px] text-gray-400 mt-0.5">Escolha, nomeie e publique — sem escrever uma linha de código.</p>
                            </div>
                            <a href="/sites" className="text-[10px] font-black text-[#7c3aed] hover:underline uppercase tracking-widest flex items-center gap-0.5 shrink-0">
                                Ver tudo <ChevronRight className="w-3 h-3" />
                            </a>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {latestTemplates.map((template, i) => (
                                <a
                                    key={i}
                                    href="/sites"
                                    className="group bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:border-[#7c3aed]/25 transition-all duration-300"
                                >
                                    <div className="aspect-video bg-gray-50 relative overflow-hidden">
                                        <img
                                            src={template.image_url}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        {/* Slide-up overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-400 ease-out flex flex-col justify-end p-3">
                                            <span className="inline-flex items-center gap-1.5 bg-white text-gray-900 px-3 py-1.5 rounded-xl font-black text-[11px] w-fit shadow-lg">
                                                <Zap className="w-3 h-3 text-[#7c3aed]" />
                                                Fazer Deploy
                                            </span>
                                        </div>
                                        <div className="absolute top-2 left-2 z-10">
                                            <span className="px-1.5 py-0.5 bg-gray-950/75 text-white text-[8px] font-black rounded-md border border-white/10 uppercase tracking-wider backdrop-blur-sm">
                                                AI Ready
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-3.5 flex items-center justify-between">
                                        <h4 className="font-bold text-gray-900 text-[11px] truncate uppercase tracking-tight">{template.name}</h4>
                                        <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#7c3aed] transition-colors shrink-0 group-hover:translate-x-0.5 duration-200" />
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Coluna direita (1/3) ── */}
                <div className="space-y-4">

                    {/* Ações Rápidas */}
                    <div className="dashboard-section bg-white rounded-[20px] border border-gray-100 p-5" style={{ animationDelay: '160ms' }}>
                        <h3 className="text-[13px] font-black text-gray-900 mb-3 uppercase tracking-wide">Ações Rápidas</h3>
                        <div className="space-y-1">
                            {[
                                {
                                    href: '/sites', icon: Plus,
                                    label: 'Criar Novo Site',
                                    sublabel: hasTokens ? 'Pronto para deploy' : 'Configure tokens antes ⚠️',
                                    accent: '#7c3aed', bg: '#7c3aed', iconColor: 'white',
                                },
                                {
                                    href: '/meus-sites', icon: Globe,
                                    label: 'Meus Sites',
                                    sublabel: `${sitesCount} ${sitesCount !== 1 ? 'sites' : 'site'} publicado${sitesCount !== 1 ? 's' : ''}`,
                                    accent: '#2563eb', bg: '#eff6ff', iconColor: '#2563eb',
                                },
                                {
                                    href: '/configuracoes?tab=integracao', icon: Settings,
                                    label: 'Configurações',
                                    sublabel: hasTokens ? 'Tokens configurados ✓' : 'Tokens pendentes',
                                    accent: '#374151', bg: '#f3f4f6', iconColor: '#374151',
                                },
                                {
                                    href: '/como-usar', icon: BookOpen,
                                    label: 'Como Usar',
                                    sublabel: 'GitHub, Vercel, tokens',
                                    accent: '#059669', bg: '#ecfdf5', iconColor: '#059669',
                                },
                            ].map((item, i) => (
                                <a
                                    key={i}
                                    href={item.href}
                                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-50 transition-all group"
                                >
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform shadow-sm"
                                        style={{ background: item.bg, color: item.iconColor }}
                                    >
                                        <item.icon className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-gray-800 text-[12px]">{item.label}</p>
                                        <p className="text-[10px] text-gray-400 truncate">{item.sublabel}</p>
                                    </div>
                                    <ArrowRight className="w-3.5 h-3.5 text-gray-300 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Academy — Bônus */}
                    <div
                        className="dashboard-section relative bg-gray-950 rounded-[20px] p-5 overflow-hidden"
                        style={{ animationDelay: '260ms' }}
                    >
                        <div
                            className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
                            style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)', animation: 'auroraFloat 8s ease-in-out infinite' }}
                        />
                        <div
                            className="absolute inset-0 opacity-[0.04] pointer-events-none"
                            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '14px 14px' }}
                        />

                        <div className="relative z-10">
                            <div className="flex items-center gap-2.5 mb-3.5">
                                <div className="w-8 h-8 rounded-xl bg-[#7c3aed]/25 flex items-center justify-center">
                                    <GraduationCap className="w-4 h-4 text-[#a78bfa]" />
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-[#7c3aed] uppercase tracking-[0.15em]">Bônus Incluído</p>
                                    <p className="text-white font-black text-sm leading-none">Academy</p>
                                </div>
                            </div>

                            {totalLessonsCount > 0 && (
                                <div className="mb-3.5">
                                    <div className="flex justify-between text-[10px] font-bold mb-1.5">
                                        <span className="text-gray-500">Progresso</span>
                                        <span className="text-[#a78bfa]">{totalProgress}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-1000"
                                            style={{ width: `${totalProgress}%`, background: 'linear-gradient(90deg, #7c3aed, #60a5fa)' }}
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-600 mt-1.5">
                                        {Math.round((totalProgress / 100) * totalLessonsCount)}/{totalLessonsCount} aulas concluídas
                                    </p>
                                </div>
                            )}

                            <a
                                href="/aulas"
                                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl font-bold text-xs text-white transition-all border border-white/10 hover:border-white/20"
                                style={{ background: 'rgba(255,255,255,0.07)' }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                            >
                                <Play className="w-3.5 h-3.5 fill-white" />
                                Acessar Academy
                            </a>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
