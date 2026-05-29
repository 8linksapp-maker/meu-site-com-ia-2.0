import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Tabs, Banner, Card, Field, Textarea } from '../ui';
import type { TabItem } from '../ui';
import {
    ArrowLeft, ArrowRight, Check, Play, Loader2,
    ExternalLink, Send, FileText, MessageSquare, BookOpen,
    Maximize2, Minimize2, X, Clock
} from 'lucide-react';

interface Trail {
    id: string;
    slug: string;
    title: string;
}

interface Lesson {
    id: string;
    title: string;
    description: string | null;
    video_url: string | null;
    highlights: string[] | null;
}

interface NavLesson {
    lessonId: string;
    title: string;
    chapter: string | null;
    displayOrder: number;
    isComplete: boolean;
}

interface Resource {
    id: string;
    title: string;
    url: string;
}

interface Comment {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    profiles: { full_name: string | null; email: string | null; role: string | null } | null;
}

interface LessonPageProps {
    trailSlug: string;
    lessonId: string;
}

type TabId = 'sobre' | 'recursos' | 'perguntas';

// ── Helpers ───────────────────────────────────────────────────────────
function getInitials(name?: string | null, email?: string | null): string {
    if (name?.trim()) {
        const parts = name.trim().split(/\s+/);
        return parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0].slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return '?';
}

interface ParsedHighlight {
    seconds: number | null;
    text: string;
    timestampLabel: string | null;
}

function parseHighlight(raw: string): ParsedHighlight {
    // Aceita "MM:SS — Texto", "MM:SS - Texto", "MM:SS: Texto", "H:MM:SS — Texto"
    const match = raw.match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})\s*(?:[—\-–:]\s*)(.+)$/);
    if (match) {
        const hours = match[1] ? parseInt(match[1], 10) : 0;
        const minutes = parseInt(match[2], 10);
        const seconds = parseInt(match[3], 10);
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        const text = match[4].trim();
        const timestampLabel = match[1]
            ? `${match[1]}:${match[2].padStart(2, '0')}:${match[3]}`
            : `${match[2]}:${match[3]}`;
        return { seconds: totalSeconds, text, timestampLabel };
    }
    return { seconds: null, text: raw, timestampLabel: null };
}

function formatRelativeDate(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
}

const PROGRESS_SAVE_INTERVAL_MS = 10000; // salva progresso a cada 10s
const AUTO_COMPLETE_THRESHOLD = 0.9;     // 90% do vídeo = concluído
const NEXT_AUTOPLAY_COUNTDOWN = 5;       // segundos pra próxima aula

export default function LessonPage({ trailSlug, lessonId }: LessonPageProps) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [trail, setTrail] = useState<Trail | null>(null);
    const [lesson, setLesson] = useState<Lesson | null>(null);
    const [navLessons, setNavLessons] = useState<NavLesson[]>([]);

    const [resources, setResources] = useState<Resource[]>([]);
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [postingComment, setPostingComment] = useState(false);

    const [activeTab, setActiveTab] = useState<TabId>('sobre');
    const [isComplete, setIsComplete] = useState(false);
    const [marking, setMarking] = useState(false);

    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Novas features
    const [focusMode, setFocusMode] = useState(false);
    const [showNextOverlay, setShowNextOverlay] = useState(false);
    const [autoplayCountdown, setAutoplayCountdown] = useState(NEXT_AUTOPLAY_COUNTDOWN);
    const [resumeSeconds, setResumeSeconds] = useState<number | null>(null);

    const videoRef = useRef<HTMLVideoElement | null>(null);
    const saveProgressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const autoplayTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastSavedPercent = useRef(0);

    useEffect(() => {
        loadAll();
        setActiveTab('sobre');
        setShowNextOverlay(false);
        setResumeSeconds(null);
        lastSavedPercent.current = 0;
        return () => {
            if (saveProgressTimer.current) clearTimeout(saveProgressTimer.current);
            if (autoplayTimer.current) clearInterval(autoplayTimer.current);
        };
    }, [trailSlug, lessonId]);

    async function loadAll() {
        setLoading(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError('Sessão expirada. Faça login novamente.');
                setLoading(false);
                return;
            }
            setCurrentUserId(user.id);

            // 1. Trail by slug
            const { data: trailData, error: trailErr } = await supabase
                .from('trails')
                .select('id, slug, title')
                .eq('slug', trailSlug)
                .maybeSingle();
            if (trailErr) throw trailErr;
            if (!trailData) {
                setError('Trilha não encontrada.');
                setLoading(false);
                return;
            }
            setTrail(trailData);

            // 2. Dados paralelos
            const [
                trailLessonsResult,
                progressResult,
                currentLessonResult,
                currentProgressResult,
                resourcesResult,
                commentsResult,
            ] = await Promise.allSettled([
                supabase
                    .from('trail_lessons')
                    .select('lesson_id, chapter, display_order, lessons(id, title)')
                    .eq('trail_id', trailData.id)
                    .order('display_order', { ascending: true }),
                supabase
                    .from('user_lessons_progress')
                    .select('lesson_id, is_completed')
                    .eq('user_id', user.id),
                supabase
                    .from('lessons')
                    .select('id, title, description, video_url, highlights')
                    .eq('id', lessonId)
                    .maybeSingle(),
                supabase
                    .from('user_lessons_progress')
                    .select('last_time_seconds, percent_completed, is_completed')
                    .eq('user_id', user.id)
                    .eq('lesson_id', lessonId)
                    .maybeSingle(),
                supabase
                    .from('lesson_resources')
                    .select('id, title, url')
                    .eq('lesson_id', lessonId)
                    .order('display_order', { ascending: true }),
                supabase
                    .from('lesson_comments')
                    .select('id, user_id, content, created_at, profiles(full_name, email, role)')
                    .eq('lesson_id', lessonId)
                    .order('created_at', { ascending: true }),
            ]);

            const tlRaw = trailLessonsResult.status === 'fulfilled' ? (trailLessonsResult.value.data ?? []) : [];
            const progressData: Array<{ lesson_id: string; is_completed: boolean }> =
                progressResult.status === 'fulfilled' ? (progressResult.value.data ?? []) : [];
            const currentLessonData = currentLessonResult.status === 'fulfilled' ? currentLessonResult.value.data : null;
            const currentProgress = currentProgressResult.status === 'fulfilled' ? currentProgressResult.value.data : null;
            const resourcesData: Resource[] = resourcesResult.status === 'fulfilled' ? (resourcesResult.value.data ?? []) : [];
            const commentsData = commentsResult.status === 'fulfilled' ? (commentsResult.value.data ?? []) : [];

            if (!currentLessonData) {
                setError('Aula não encontrada.');
                setLoading(false);
                return;
            }
            setLesson(currentLessonData as Lesson);

            const completedIds = new Set(progressData.filter(p => p.is_completed).map(p => p.lesson_id));
            setIsComplete(completedIds.has(lessonId));

            // Resume: só usa last_time se aula NÃO completa + last_time > 5s
            if (currentProgress?.last_time_seconds && currentProgress.last_time_seconds > 5 && !currentProgress.is_completed) {
                setResumeSeconds(currentProgress.last_time_seconds);
            }

            const navItems: NavLesson[] = tlRaw
                .filter((tl: { lessons: unknown }) => tl.lessons !== null)
                .map((tl: {
                    lesson_id: string;
                    chapter: string | null;
                    display_order: number;
                    lessons: { id: string; title: string } | Array<{ id: string; title: string }>;
                }) => {
                    const l = Array.isArray(tl.lessons) ? tl.lessons[0] : tl.lessons;
                    return {
                        lessonId: tl.lesson_id,
                        title: l?.title ?? 'Aula sem título',
                        chapter: tl.chapter,
                        displayOrder: tl.display_order,
                        isComplete: completedIds.has(tl.lesson_id),
                    };
                });
            setNavLessons(navItems);

            setResources(resourcesData);
            setComments(commentsData as unknown as Comment[]);
        } catch (err: unknown) {
            console.error('Erro carregando aula:', err);
            setError(err instanceof Error ? err.message : 'Erro ao carregar.');
        } finally {
            setLoading(false);
        }
    }

    // ── Aplica resume position quando video monta e dado tá pronto ──
    function handleVideoLoadedMetadata() {
        if (videoRef.current && resumeSeconds !== null && resumeSeconds > 5) {
            videoRef.current.currentTime = resumeSeconds;
            setResumeSeconds(null); // só usa 1x por mount
        }
    }

    // ── Save progress throttled ──
    function saveProgress(currentTime: number, percent: number, completedFlag: boolean) {
        if (!currentUserId) return;
        void supabase.from('user_lessons_progress').upsert(
            {
                user_id: currentUserId,
                lesson_id: lessonId,
                last_time_seconds: Math.floor(currentTime),
                percent_completed: percent,
                is_completed: completedFlag,
                updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,lesson_id' }
        );
    }

    function handleTimeUpdate(e: React.SyntheticEvent<HTMLVideoElement>) {
        const v = e.currentTarget;
        if (!v.duration || isNaN(v.duration) || v.duration < 1) return;

        const ratio = v.currentTime / v.duration;
        const percent = Math.floor(ratio * 100);

        // Auto-mark complete @ 90%
        if (!isComplete && ratio >= AUTO_COMPLETE_THRESHOLD) {
            setIsComplete(true);
            setNavLessons(navLessons.map(nl =>
                nl.lessonId === lessonId ? { ...nl, isComplete: true } : nl
            ));
            saveProgress(v.currentTime, percent, true);
            lastSavedPercent.current = percent;
            return;
        }

        // Throttle: salva a cada 10s
        if (saveProgressTimer.current) return;
        saveProgressTimer.current = setTimeout(() => {
            // Salva só se mudou pelo menos 1% desde último save
            if (Math.abs(percent - lastSavedPercent.current) >= 1) {
                saveProgress(v.currentTime, percent, isComplete);
                lastSavedPercent.current = percent;
            }
            saveProgressTimer.current = null;
        }, PROGRESS_SAVE_INTERVAL_MS);
    }

    // ── Próxima aula auto-play ──
    function handleVideoEnded() {
        if (!nextLesson || !trail) return;

        // Garante que está marcada como concluída
        if (!isComplete && currentUserId) {
            setIsComplete(true);
            setNavLessons(navLessons.map(nl =>
                nl.lessonId === lessonId ? { ...nl, isComplete: true } : nl
            ));
            const v = videoRef.current;
            saveProgress(v?.duration ?? 0, 100, true);
        }

        setShowNextOverlay(true);
        setAutoplayCountdown(NEXT_AUTOPLAY_COUNTDOWN);
        if (autoplayTimer.current) clearInterval(autoplayTimer.current);
        autoplayTimer.current = setInterval(() => {
            setAutoplayCountdown(c => {
                if (c <= 1) {
                    if (autoplayTimer.current) clearInterval(autoplayTimer.current);
                    window.location.href = `/aulas/${trail.slug}/${nextLesson.lessonId}`;
                    return 0;
                }
                return c - 1;
            });
        }, 1000);
    }

    function cancelAutoplay() {
        if (autoplayTimer.current) clearInterval(autoplayTimer.current);
        setShowNextOverlay(false);
    }

    // ── Mark complete manual ──
    async function handleToggleComplete() {
        if (!currentUserId) return;
        setMarking(true);
        const nextValue = !isComplete;
        try {
            const v = videoRef.current;
            const currentTime = v?.currentTime ?? 0;
            const duration = v?.duration ?? 0;
            const percent = nextValue ? 100 : (duration > 0 ? Math.floor((currentTime / duration) * 100) : 0);
            const { error: upsertErr } = await supabase.from('user_lessons_progress').upsert(
                {
                    user_id: currentUserId,
                    lesson_id: lessonId,
                    last_time_seconds: Math.floor(currentTime),
                    percent_completed: percent,
                    is_completed: nextValue,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id,lesson_id' }
            );
            if (upsertErr) throw upsertErr;
            setIsComplete(nextValue);
            setNavLessons(navLessons.map(nl =>
                nl.lessonId === lessonId ? { ...nl, isComplete: nextValue } : nl
            ));
        } catch (err) {
            console.error('Erro marcando concluída:', err);
        } finally {
            setMarking(false);
        }
    }

    async function handleAddComment(e: React.FormEvent) {
        e.preventDefault();
        if (!currentUserId || !newComment.trim()) return;
        setPostingComment(true);
        try {
            const { error: insertErr } = await supabase.from('lesson_comments').insert({
                user_id: currentUserId,
                lesson_id: lessonId,
                content: newComment.trim(),
            });
            if (insertErr) throw insertErr;
            setNewComment('');
            const { data: refreshed } = await supabase
                .from('lesson_comments')
                .select('id, user_id, content, created_at, profiles(full_name, email, role)')
                .eq('lesson_id', lessonId)
                .order('created_at', { ascending: true });
            setComments((refreshed ?? []) as unknown as Comment[]);
        } catch (err) {
            console.error('Erro postando pergunta:', err);
        } finally {
            setPostingComment(false);
        }
    }

    // ── Highlight click → seek video ──
    function seekTo(seconds: number) {
        if (videoRef.current) {
            videoRef.current.currentTime = seconds;
            videoRef.current.play().catch(() => { /* user gesture exigido, ignora */ });
            // Scroll suave pro player se modo foco off
            videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-coral-terra" />
                <p className="text-cafe-medio text-sm">Carregando aula…</p>
            </div>
        );
    }

    if (error || !trail || !lesson) {
        return (
            <div className="max-w-2xl mx-auto pt-8 space-y-4">
                <Banner tone="error" title="Aula não disponível">
                    {error ?? 'Essa aula não existe ou foi removida.'}
                </Banner>
                <a
                    href={trail ? `/aulas/${trail.slug}` : '/aulas'}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-coral-terra hover:text-terracota-profundo transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Voltar
                </a>
            </div>
        );
    }

    const currentIndex = navLessons.findIndex(nl => nl.lessonId === lessonId);
    const prevLesson = currentIndex > 0 ? navLessons[currentIndex - 1] : null;
    const nextLesson = currentIndex >= 0 && currentIndex < navLessons.length - 1 ? navLessons[currentIndex + 1] : null;

    const tabs: TabItem[] = [
        { id: 'sobre', label: 'Sobre' },
        { id: 'recursos', label: 'Recursos', badge: resources.length || undefined },
        { id: 'perguntas', label: 'Perguntas', badge: comments.length || undefined },
    ];

    // Parse highlights
    const parsedHighlights = (lesson.highlights ?? []).map(parseHighlight);
    const hasTimestampedHighlights = parsedHighlights.some(h => h.seconds !== null);

    return (
        <div className="space-y-6 pb-8">
            {/* Breadcrumb + Modo foco toggle */}
            <div className="flex items-center justify-between gap-4">
                <a
                    href={`/aulas/${trail.slug}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-cafe-medio hover:text-coral-terra transition-colors group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Voltar para {trail.title}
                </a>
                <button
                    type="button"
                    onClick={() => setFocusMode(f => !f)}
                    aria-label={focusMode ? 'Sair do modo foco' : 'Entrar no modo foco'}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-cafe-medio hover:text-coral-terra transition-colors px-3 py-2 rounded-[10px] hover:bg-coral-wash min-h-[40px]"
                >
                    {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    <span className="hidden sm:inline">{focusMode ? 'Sair do foco' : 'Modo foco'}</span>
                </button>
            </div>

            <div className={`grid grid-cols-1 gap-6 ${focusMode ? '' : 'lg:grid-cols-3'}`}>

                {/* ── COLUNA PRINCIPAL ─────────────────────────────── */}
                <div className={focusMode ? 'mx-auto w-full max-w-4xl space-y-5' : 'lg:col-span-2 space-y-5'}>

                    {/* Video player + overlay próxima aula */}
                    <div className="bg-carvao-quente rounded-[12px] overflow-hidden aspect-video relative">
                        {lesson.video_url ? (
                            <video
                                ref={videoRef}
                                src={lesson.video_url}
                                controls
                                playsInline
                                preload="metadata"
                                className="w-full h-full"
                                onLoadedMetadata={handleVideoLoadedMetadata}
                                onTimeUpdate={handleTimeUpdate}
                                onEnded={handleVideoEnded}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-papel-craft/40">
                                <p className="text-sm">Vídeo indisponível</p>
                            </div>
                        )}

                        {/* Overlay próxima aula auto-play */}
                        {showNextOverlay && nextLesson && (
                            <div className="absolute inset-0 bg-carvao-quente/85 flex items-center justify-center p-4 z-10">
                                <div className="bg-cream-surface border border-borda-cafe rounded-[12px] p-5 md:p-6 max-w-md w-full shadow-[0_12px_32px_-12px_rgba(80,40,20,0.30)]">
                                    <p className="text-xs font-bold text-coral-terra uppercase tracking-[0.12em]">
                                        Próxima aula
                                    </p>
                                    <h3 className="font-display text-xl font-normal text-carvao-quente tracking-tight mt-1 mb-3 line-clamp-2">
                                        {nextLesson.title}
                                    </h3>
                                    <div className="flex items-center gap-3 text-sm text-cafe-medio mb-4 tabular-nums">
                                        <Clock className="w-3.5 h-3.5 text-coral-terra" />
                                        Começa em {autoplayCountdown}s
                                    </div>
                                    <div className="h-1 bg-borda-cafe rounded-full overflow-hidden mb-4">
                                        <div
                                            className="h-full bg-coral-terra transition-all duration-1000 ease-linear"
                                            style={{ width: `${((NEXT_AUTOPLAY_COUNTDOWN - autoplayCountdown) / NEXT_AUTOPLAY_COUNTDOWN) * 100}%` }}
                                        />
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2">
                                        <a
                                            href={`/aulas/${trail.slug}/${nextLesson.lessonId}`}
                                            className="flex-1 inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-4 py-2.5 rounded-[10px] font-semibold text-sm transition-colors active:scale-[0.98] min-h-[44px]"
                                        >
                                            Próxima agora
                                            <ArrowRight className="w-4 h-4" />
                                        </a>
                                        <button
                                            type="button"
                                            onClick={cancelAutoplay}
                                            className="flex-1 inline-flex items-center justify-center gap-2 bg-cream-elevated hover:bg-coral-wash text-carvao-quente hover:text-terracota-profundo border border-borda-cafe px-4 py-2.5 rounded-[10px] font-semibold text-sm transition-colors active:scale-[0.98] min-h-[44px]"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Title + Mark complete */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="min-w-0">
                            <h1 className="font-display text-2xl md:text-[1.75rem] font-normal text-carvao-quente tracking-tight leading-tight">
                                {lesson.title}
                            </h1>
                            {isComplete && (
                                <p className="inline-flex items-center gap-1 text-xs font-semibold text-verde-oliva mt-1.5 uppercase tracking-wide">
                                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                    Concluída
                                </p>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={handleToggleComplete}
                            disabled={marking}
                            className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[12px] font-semibold text-sm transition-colors active:scale-[0.98] whitespace-nowrap shrink-0 min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra disabled:opacity-60 disabled:cursor-not-allowed ${
                                isComplete
                                    ? 'bg-cream-elevated text-carvao-quente border border-borda-cafe hover:bg-coral-wash hover:text-terracota-profundo'
                                    : 'bg-coral-terra hover:bg-terracota-profundo text-papel-craft'
                            }`}
                        >
                            {marking ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Check className="w-4 h-4" strokeWidth={isComplete ? 2 : 3} />
                            )}
                            {isComplete ? 'Desmarcar' : 'Marcar como concluída'}
                        </button>
                    </div>

                    {/* Highlights clicáveis (se tem timestamps) — fora das tabs */}
                    {hasTimestampedHighlights && (
                        <div className="space-y-3 bg-cream-surface border border-borda-cafe rounded-[12px] p-4 md:p-5">
                            <h2 className="text-xs font-bold text-coral-terra uppercase tracking-[0.12em] inline-flex items-center gap-2">
                                <BookOpen className="w-3.5 h-3.5" />
                                Marcadores do vídeo
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                {parsedHighlights.map((h, i) => (
                                    h.seconds !== null ? (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => seekTo(h.seconds!)}
                                            className="inline-flex items-center gap-2 bg-cream-elevated hover:bg-coral-wash text-carvao-quente hover:text-terracota-profundo border border-borda-cafe px-3 py-1.5 rounded-full text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra group"
                                        >
                                            <span className="font-mono text-coral-terra group-hover:text-terracota-profundo tabular-nums">
                                                {h.timestampLabel}
                                            </span>
                                            <span>{h.text}</span>
                                        </button>
                                    ) : (
                                        <span key={i} className="inline-flex items-center gap-2 bg-cream-elevated text-cafe-medio border border-borda-cafe px-3 py-1.5 rounded-full text-xs">
                                            {h.text}
                                        </span>
                                    )
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Tabs */}
                    <Tabs items={tabs} activeId={activeTab} onChange={(id) => setActiveTab(id as TabId)} />

                    {/* Tab Sobre */}
                    {activeTab === 'sobre' && (
                        <div className="space-y-5">
                            {lesson.description ? (
                                <div className="text-cafe-medio leading-relaxed whitespace-pre-wrap">
                                    {lesson.description}
                                </div>
                            ) : (
                                <p className="text-cafe-cinza-quente text-sm italic">Sem descrição pra essa aula.</p>
                            )}

                            {/* Highlights sem timestamp (lista bullet) — só aparece se NÃO já mostrou os chips acima */}
                            {!hasTimestampedHighlights && parsedHighlights.length > 0 && (
                                <div className="space-y-3 pt-3 border-t border-borda-cafe">
                                    <h2 className="text-xs font-bold text-coral-terra uppercase tracking-[0.12em] inline-flex items-center gap-2">
                                        <BookOpen className="w-3.5 h-3.5" />
                                        Pontos-chave
                                    </h2>
                                    <ul className="space-y-2">
                                        {parsedHighlights.map((h, i) => (
                                            <li key={i} className="flex gap-3 items-start text-sm text-carvao-quente leading-relaxed">
                                                <span className="w-1.5 h-1.5 rounded-full bg-coral-terra mt-2 shrink-0" />
                                                <span>{h.text}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab Recursos */}
                    {activeTab === 'recursos' && (
                        <div>
                            {resources.length === 0 ? (
                                <Card padding="md">
                                    <p className="text-cafe-cinza-quente text-sm italic flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Nenhum recurso adicional pra essa aula.
                                    </p>
                                </Card>
                            ) : (
                                <div className="space-y-2">
                                    {resources.map(res => (
                                        <a
                                            key={res.id}
                                            href={res.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-3 bg-cream-surface border border-borda-cafe rounded-[12px] px-4 py-3 hover:bg-coral-wash transition-colors group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra"
                                        >
                                            <div className="w-9 h-9 rounded-full bg-coral-wash flex items-center justify-center shrink-0">
                                                <FileText className="w-4 h-4 text-coral-terra" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-semibold text-carvao-quente group-hover:text-terracota-profundo transition-colors truncate">
                                                    {res.title}
                                                </p>
                                                <p className="text-xs text-cafe-cinza-quente truncate font-mono">
                                                    {res.url}
                                                </p>
                                            </div>
                                            <ExternalLink className="w-4 h-4 text-cafe-cinza-quente group-hover:text-coral-terra transition-colors shrink-0" />
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab Perguntas */}
                    {activeTab === 'perguntas' && (
                        <div className="space-y-5">
                            <form onSubmit={handleAddComment} className="space-y-3">
                                <Field label="Sua pergunta" htmlFor="new-question">
                                    <Textarea
                                        id="new-question"
                                        value={newComment}
                                        onChange={e => setNewComment(e.target.value)}
                                        placeholder="O que ficou dúvida? Pode perguntar — outros alunos veem."
                                        rows={3}
                                    />
                                </Field>
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={postingComment || !newComment.trim()}
                                        className="inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-4 py-2.5 rounded-[12px] font-semibold text-sm transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
                                    >
                                        {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        Enviar pergunta
                                    </button>
                                </div>
                            </form>

                            <div className="space-y-3 pt-3 border-t border-borda-cafe">
                                {comments.length === 0 ? (
                                    <p className="text-cafe-cinza-quente text-sm italic flex items-center gap-2 py-4">
                                        <MessageSquare className="w-4 h-4" />
                                        Ninguém perguntou ainda. Seja o primeiro.
                                    </p>
                                ) : (
                                    comments.map(c => {
                                        const authorName = c.profiles?.full_name
                                            ?? c.profiles?.email?.split('@')[0]
                                            ?? 'Aluno';
                                        const isAdmin = c.profiles?.role === 'admin';
                                        const initials = getInitials(c.profiles?.full_name, c.profiles?.email);
                                        const dateStr = formatRelativeDate(c.created_at);

                                        return (
                                            <div
                                                key={c.id}
                                                className={`flex gap-3 rounded-[12px] p-4 transition-colors ${
                                                    isAdmin
                                                        ? 'bg-coral-wash border border-coral-terra/30'
                                                        : 'bg-cream-surface border border-borda-cafe'
                                                }`}
                                            >
                                                {/* Avatar chip */}
                                                <div
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm tracking-wide ${
                                                        isAdmin
                                                            ? 'bg-coral-terra text-papel-craft'
                                                            : 'bg-cream-elevated text-cafe-medio border border-borda-cafe'
                                                    }`}
                                                    aria-hidden="true"
                                                >
                                                    {initials}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                        <span className="text-sm font-semibold text-carvao-quente">
                                                            {authorName}
                                                        </span>
                                                        {isAdmin && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-coral-terra text-papel-craft text-xs font-semibold rounded-full uppercase tracking-wide">
                                                                <Check className="w-2.5 h-2.5" strokeWidth={3} />
                                                                Equipe
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-cafe-cinza-quente ml-auto tabular-nums">
                                                            {dateStr}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-carvao-quente leading-relaxed whitespace-pre-wrap">
                                                        {c.content}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    )}

                    {/* Navegação prev/next abaixo */}
                    <div className="flex items-center justify-between pt-5 border-t border-borda-cafe gap-3">
                        {prevLesson ? (
                            <a
                                href={`/aulas/${trail.slug}/${prevLesson.lessonId}`}
                                className="inline-flex items-center gap-2 text-sm font-semibold text-cafe-medio hover:text-coral-terra transition-colors group min-w-0"
                            >
                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform shrink-0" />
                                <span className="truncate">Anterior: {prevLesson.title}</span>
                            </a>
                        ) : <span />}
                        {nextLesson ? (
                            <a
                                href={`/aulas/${trail.slug}/${nextLesson.lessonId}`}
                                className="inline-flex items-center gap-2 text-sm font-semibold text-coral-terra hover:text-terracota-profundo transition-colors group min-w-0 text-right"
                            >
                                <span className="truncate">Próxima: {nextLesson.title}</span>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform shrink-0" />
                            </a>
                        ) : <span />}
                    </div>
                </div>

                {/* ── SIDEBAR (escondido em modo foco) ──────────────── */}
                {!focusMode && (
                    <aside className="space-y-5 lg:sticky lg:top-6 lg:self-start">

                        {/* Próxima aula */}
                        {nextLesson && (
                            <a
                                href={`/aulas/${trail.slug}/${nextLesson.lessonId}`}
                                className="block bg-cream-surface border border-borda-cafe rounded-[12px] p-4 hover:bg-coral-wash transition-colors group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra"
                            >
                                <p className="text-xs font-bold text-coral-terra uppercase tracking-[0.12em]">
                                    Próxima aula
                                </p>
                                <p className="font-display text-base font-normal text-carvao-quente tracking-tight mt-1 group-hover:text-terracota-profundo transition-colors line-clamp-2">
                                    {nextLesson.title}
                                </p>
                                <span className="inline-flex items-center gap-1 text-sm font-semibold text-coral-terra mt-2 group-hover:text-terracota-profundo transition-colors">
                                    Continuar <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                                </span>
                            </a>
                        )}

                        {/* Lista de aulas da trilha */}
                        <div className="bg-cream-surface border border-borda-cafe rounded-[12px] overflow-hidden">
                            <div className="px-4 py-3 border-b border-borda-cafe">
                                <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em]">
                                    Aulas da trilha
                                </p>
                            </div>
                            <ol className="max-h-[480px] overflow-y-auto">
                                {navLessons.map((nl, idx) => {
                                    const isCurrent = nl.lessonId === lessonId;
                                    return (
                                        <li key={nl.lessonId}>
                                            <a
                                                href={`/aulas/${trail.slug}/${nl.lessonId}`}
                                                className={`flex items-start gap-3 px-4 py-3 text-sm transition-colors group ${
                                                    idx > 0 ? 'border-t border-borda-cafe' : ''
                                                } ${
                                                    isCurrent
                                                        ? 'bg-coral-wash text-coral-terra font-semibold'
                                                        : 'hover:bg-cream-elevated text-cafe-medio hover:text-terracota-profundo'
                                                }`}
                                            >
                                                <div className="shrink-0 mt-0.5">
                                                    {nl.isComplete ? (
                                                        <div className="w-5 h-5 rounded-full bg-verde-oliva flex items-center justify-center">
                                                            <Check className="w-3 h-3 text-papel-craft" strokeWidth={3} />
                                                        </div>
                                                    ) : isCurrent ? (
                                                        <div className="w-5 h-5 rounded-full bg-coral-terra flex items-center justify-center">
                                                            <Play className="w-2.5 h-2.5 text-papel-craft" fill="currentColor" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full border border-borda-cafe flex items-center justify-center text-xs font-bold text-cafe-cinza-quente tabular-nums">
                                                            {idx + 1}
                                                        </div>
                                                    )}
                                                </div>
                                                <span className="flex-1 min-w-0 line-clamp-2 leading-snug">
                                                    {nl.title}
                                                </span>
                                            </a>
                                        </li>
                                    );
                                })}
                            </ol>
                        </div>
                    </aside>
                )}
            </div>
        </div>
    );
}
