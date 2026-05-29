import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    ExternalLink, LayoutDashboard, ArrowRight,
    GraduationCap, ChevronRight, Play
} from 'lucide-react';

interface Site {
    id: string;
    github_repo: string;
    domain?: string;
    created_at: string;
    vercel_project_id?: string;
}

interface NextLesson {
    id: string;
    title: string;
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
    const [nextLesson, setNextLesson] = useState<NextLesson | null>(null);
    const [hasJoinedGroup, setHasJoinedGroup] = useState(true);

    useEffect(() => { fetchDashboardData(); }, []);

    // Reload status do grupo quando wizard fecha (modal dispara CustomEvent ao salvar)
    useEffect(() => {
        function reload() { fetchDashboardData(); }
        window.addEventListener('wizard-completed', reload);
        return () => window.removeEventListener('wizard-completed', reload);
    }, []);

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
                    supabase.from('lessons').select('id, title, display_order').order('display_order', { ascending: true }),
                    supabase.from('user_lessons_progress').select('lesson_id, is_completed').eq('user_id', user.id),
                    supabase.from('wizard_responses').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
                ]);

            const profileResult = results[0].status === 'fulfilled' ? results[0].value : null;
            const templatesResult = results[1].status === 'fulfilled' ? results[1].value : null;
            const favoritesResult = results[2].status === 'fulfilled' ? results[2].value : null;
            const lessonsResult = results[3].status === 'fulfilled' ? results[3].value : null;
            const progressResult = results[4].status === 'fulfilled' ? results[4].value : null;
            const wizardResult = results[5].status === 'fulfilled' ? results[5].value : null;
            setHasJoinedGroup((wizardResult?.count ?? 0) > 0);

            if (profileResult?.data?.[0]) {
                const p = profileResult.data[0];
                setHasTokens(!!(p.github_token && p.vercel_token));
            }
            if (templatesResult?.data) {
                setTemplatesCount(templatesResult.data.length);
                setLatestTemplates(templatesResult.data.slice(0, 6));
            }
            setFavoritesCount(favoritesResult?.count || 0);

            const allLessons = (lessonsResult?.data || []) as NextLesson[];
            const totalLessons = allLessons.length;
            setTotalLessonsCount(totalLessons);

            const completedIds = new Set(
                (progressResult?.data || [])
                    .filter(p => p.is_completed)
                    .map(p => p.lesson_id)
            );
            if (totalLessons > 0) {
                setTotalProgress(Math.round((completedIds.size / totalLessons) * 100));
            }

            // Próxima aula = primeira lesson em display_order que ainda não foi concluída
            const next = allLessons.find(l => !completedIds.has(l.id));
            setNextLesson(next ?? null);

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

    const recentSites = sites.slice(0, 3);

    const heroConfig = isNew ? {
        title: `Vamos começar, ${userName}?`,
        subtitle: 'Conecte suas contas pra publicar. São 2 conexões grátis, a gente te guia em 5 minutos.',
        cta: 'Conectar minhas contas',
        ctaHref: '/configuracoes?tab=integracao',
    } : hasNoSites ? {
        title: `Pronto pra publicar, ${userName}.`,
        subtitle: 'Escolha um template abaixo, dá um nome e publica. Leva menos de 2 minutos.',
        cta: 'Criar primeiro site',
        ctaHref: '/sites',
    } : {
        title: `Bom te ver, ${userName}.`,
        subtitle: `Você tem ${sitesCount} ${sitesCount === 1 ? 'site' : 'sites'} no ar. Hora do próximo?`,
        cta: 'Criar novo site',
        ctaHref: '/sites',
    };

    return (
        <div className="space-y-10 pb-8">

            {/* ── HERO compacto — 1 frase + 1 CTA (job #1: criar novo site) ────────── */}
            <div
                className="dashboard-section pt-2 md:pt-4"
                style={{ animationDelay: '0ms' }}
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
                    <div className="flex-1 min-w-0">
                        <h1 className="font-display text-2xl md:text-3xl font-normal text-carvao-quente tracking-tight leading-tight">
                            {heroConfig.title}
                        </h1>
                        <p className="text-cafe-medio text-sm md:text-base mt-1.5 leading-relaxed">
                            {heroConfig.subtitle}
                        </p>
                    </div>

                    <a
                        href={heroConfig.ctaHref}
                        className="inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-5 py-3 rounded-[12px] font-semibold text-sm transition-colors active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra min-h-[44px]"
                    >
                        {heroConfig.cta}
                        <ArrowRight className="w-4 h-4" />
                    </a>
                </div>
            </div>

            {/* STATS removidos — não serviam job real (decoração herdada). Removidos por JTBD audit. */}

            {/* ── CHECKLIST DE ONBOARDING ──────────────────────── */}
            {(!hasTokens || sitesCount === 0 || !hasJoinedGroup) && (() => {
                const steps = [
                    {
                        done: true,
                        label: 'Conta criada',
                        desc: 'Sua conta está ativa',
                        action: null as null | { kind: 'href'; value: string } | { kind: 'event'; value: string },
                    },
                    {
                        done: hasTokens,
                        label: 'Suas contas conectadas',
                        desc: hasTokens ? 'GitHub e Vercel prontos' : 'São 2 conexões grátis. A gente te guia em 5 minutos.',
                        action: { kind: 'href', value: '/configuracoes?tab=integracao' } as const,
                    },
                    {
                        done: sitesCount > 0,
                        label: 'Primeiro site publicado',
                        desc: sitesCount > 0
                            ? `Você já tem ${sitesCount} ${sitesCount === 1 ? 'site' : 'sites'}`
                            : 'Escolha um template abaixo e publica em 2 minutos',
                        action: { kind: 'href', value: '/sites' } as const,
                    },
                    {
                        done: hasJoinedGroup,
                        label: 'Entrar no grupo dos alunos',
                        desc: hasJoinedGroup
                            ? 'Você já está no grupo'
                            : 'Conecte com outros alunos no WhatsApp — dúvidas, lançamentos, networking.',
                        action: { kind: 'event', value: 'open-group-wizard' } as const,
                    },
                ];
                const doneCount = steps.filter(s => s.done).length;
                return (
                    <div className="dashboard-section bg-cream-surface border border-borda-cafe rounded-[12px] p-5" style={{ animationDelay: '100ms' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                                Primeiros passos
                            </h3>
                            <span className="text-xs font-semibold text-cafe-cinza-quente uppercase tracking-wider tabular-nums">
                                {doneCount}/{steps.length} prontos
                            </span>
                        </div>
                        <div className="space-y-2">
                            {steps.map((step, i) => (
                                <div
                                    key={i}
                                    role={!step.done && step.action ? 'button' : undefined}
                                    tabIndex={!step.done && step.action ? 0 : undefined}
                                    className={`flex items-center gap-3 p-3 rounded-[8px] transition-colors ${step.done ? 'bg-transparent' : 'hover:bg-coral-wash cursor-pointer'}`}
                                    onClick={() => {
                                        if (step.done || !step.action) return;
                                        if (step.action.kind === 'href') window.location.href = step.action.value;
                                        else window.dispatchEvent(new CustomEvent(step.action.value));
                                    }}
                                >
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border ${step.done ? 'border-verde-oliva bg-verde-oliva' : 'border-borda-cafe bg-cream-elevated'}`}>
                                        {step.done ? (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-papel-craft"><path d="M20 6 9 17l-5-5" /></svg>
                                        ) : (
                                            <span className="text-xs font-bold text-cafe-cinza-quente tabular-nums">{i + 1}</span>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold ${step.done ? 'text-cafe-medio' : 'text-carvao-quente'}`}>{step.label}</p>
                                        <p className="text-xs text-cafe-cinza-quente truncate mt-0.5">{step.desc}</p>
                                    </div>
                                    {!step.done && step.action && (
                                        <ArrowRight className="w-4 h-4 text-coral-terra shrink-0" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })()}

            {/* ── TEMPLATES — PROTAGONISTA (Job #1: criar novo site / expandir carteira) ──────── */}
            <div className="dashboard-section space-y-5" style={{ animationDelay: '140ms' }}>
                <div className="flex items-end justify-between gap-4 border-b border-borda-cafe pb-3">
                    <div className="min-w-0">
                        <h2 className="font-display text-2xl md:text-3xl font-normal text-carvao-quente tracking-tight">
                            Comece um novo site
                        </h2>
                        <p className="text-sm text-cafe-medio mt-1">Escolha um template, dá um nome, publica.</p>
                    </div>
                    <a href="/sites" className="text-sm font-semibold text-coral-terra hover:text-terracota-profundo transition-colors flex items-center gap-1 shrink-0">
                        Ver todos <ChevronRight className="w-4 h-4" />
                    </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {latestTemplates.map((template, i) => (
                        <a
                            key={i}
                            href="/sites"
                            className="group bg-cream-surface border border-borda-cafe rounded-[12px] overflow-hidden transition-shadow duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra"
                            style={{ boxShadow: '0 1px 2px 0 rgba(80, 40, 20, 0.04)' }}
                            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 16px -4px rgba(80, 40, 20, 0.10)')}
                            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(80, 40, 20, 0.04)')}
                        >
                            <div className="aspect-video bg-cream-elevated relative overflow-hidden">
                                <img
                                    src={template.image_url}
                                    alt={`Preview ${template.name}`}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div className="p-4 flex items-center justify-between gap-2">
                                <h3 className="font-display text-base font-normal text-carvao-quente tracking-tight truncate">{template.name}</h3>
                                <ArrowRight className="w-4 h-4 text-cafe-cinza-quente group-hover:text-coral-terra group-hover:translate-x-0.5 transition-all shrink-0" />
                            </div>
                        </a>
                    ))}
                </div>
            </div>

            {/* ── MEUS SITES — secundário (só se isActive) ──────── */}
            {isActive && (
                <div className="dashboard-section space-y-4" style={{ animationDelay: '200ms' }}>
                    <div className="flex items-end justify-between gap-4 border-b border-borda-cafe pb-3">
                        <h2 className="font-display text-2xl font-normal text-carvao-quente tracking-tight">
                            Meus sites
                        </h2>
                        <a href="/meus-sites" className="text-sm font-semibold text-coral-terra hover:text-terracota-profundo transition-colors flex items-center gap-1 shrink-0">
                            Ver todos <ChevronRight className="w-4 h-4" />
                        </a>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recentSites.map((site) => {
                            const name = site.github_repo?.split('/').pop() || site.github_repo;
                            const domain = site.domain || `${name}.vercel.app`;
                            return (
                                <div
                                    key={site.id}
                                    className="bg-cream-surface border border-borda-cafe rounded-[12px] overflow-hidden transition-shadow duration-200 group"
                                    style={{ boxShadow: '0 1px 2px 0 rgba(80, 40, 20, 0.04)' }}
                                    onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 16px -4px rgba(80, 40, 20, 0.10)')}
                                    onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(80, 40, 20, 0.04)')}
                                >
                                    <div className="h-28 bg-cream-elevated relative overflow-hidden">
                                        <img
                                            src={`https://api.microlink.io/?url=https://${domain}&screenshot=true&meta=false&embed=screenshot.url`}
                                            className="w-full h-full object-cover object-top"
                                            alt={`Captura de tela de ${name}`}
                                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                        />
                                        <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 px-2 py-0.5 bg-verde-oliva text-papel-craft text-xs font-semibold rounded-full uppercase tracking-wide">
                                            <span className="w-1.5 h-1.5 rounded-full bg-papel-craft" />
                                            Online
                                        </span>
                                    </div>
                                    <div className="p-4">
                                        <p className="font-display text-base font-normal text-carvao-quente tracking-tight truncate">{name}</p>
                                        <p className="font-mono text-xs text-cafe-cinza-quente truncate mt-0.5">{domain}</p>
                                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-borda-cafe">
                                            <a
                                                href={`https://${domain}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-cafe-medio hover:text-coral-terra transition-colors"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <ExternalLink className="w-3 h-3" /> Ver
                                            </a>
                                            <span className="text-borda-cafe">·</span>
                                            <a
                                                href={`https://${domain}/admin`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-coral-terra hover:text-terracota-profundo transition-colors"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <LayoutDashboard className="w-3 h-3" /> Editar
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* ── ACADEMY BANNER — peak-end pessoal (próxima aula real do user) ──────── */}
            <div
                className="dashboard-section bg-cream-surface border border-borda-cafe rounded-[12px] p-5 md:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-6"
                style={{ animationDelay: '260ms' }}
            >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-coral-wash flex items-center justify-center shrink-0">
                        <GraduationCap className="w-5 h-5 text-coral-terra" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-coral-terra uppercase tracking-[0.12em]">
                            {nextLesson && totalProgress > 0
                                ? 'Sua próxima aula'
                                : nextLesson
                                    ? 'Comece pela primeira aula'
                                    : totalProgress === 100
                                        ? 'Curso concluído'
                                        : 'Bônus incluído'}
                        </p>
                        <h3 className="font-display text-xl font-normal text-carvao-quente tracking-tight mt-0.5 truncate">
                            {nextLesson ? nextLesson.title : 'Academy'}
                        </h3>
                        {totalLessonsCount > 0 && (
                            <p className="text-xs text-cafe-medio mt-1 tabular-nums">
                                {totalProgress === 100
                                    ? `Você concluiu todas as ${totalLessonsCount} aulas. Parabéns.`
                                    : totalProgress > 0
                                        ? `${Math.round((totalProgress / 100) * totalLessonsCount)} de ${totalLessonsCount} aulas concluídas · ${totalProgress}%`
                                        : `${totalLessonsCount} aulas pra você dominar a plataforma`}
                            </p>
                        )}
                    </div>
                </div>

                {totalLessonsCount > 0 && totalProgress > 0 && totalProgress < 100 && (
                    <div className="hidden md:block w-48 shrink-0">
                        <div className="w-full h-1 bg-borda-cafe rounded-full overflow-hidden">
                            <div
                                className="h-full bg-coral-terra transition-all duration-700"
                                style={{ width: `${totalProgress}%` }}
                            />
                        </div>
                    </div>
                )}

                <a
                    href="/aulas"
                    className="inline-flex items-center justify-center gap-2 bg-cream-elevated hover:bg-coral-wash text-carvao-quente hover:text-terracota-profundo border border-borda-cafe px-5 py-2.5 rounded-[12px] font-semibold text-sm transition-colors active:scale-[0.98] shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra min-h-[44px]"
                >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {nextLesson && totalProgress > 0
                        ? 'Retomar aula'
                        : nextLesson
                            ? 'Começar curso'
                            : 'Revisar aulas'}
                </a>
            </div>
        </div>
    );
}
