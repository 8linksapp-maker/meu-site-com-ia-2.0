import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Card } from '../ui';
import {
    Play, Radio, ArrowRight, Loader2,
    Check, Lock, CircleDot, Star, Clock, CalendarPlus,
} from 'lucide-react';
import LessonThumb from './LessonThumb';

interface Trail {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    icon: string | null;
    target_audience: string | null;
    display_order: number;
    is_featured: boolean;
    estimated_hours: number | null;
    thumbnail_url: string | null;
    release_at: string | null;
    kiwify_product_ids: string[] | null;
}

interface Lesson {
    id: string;
    title: string;
    thumbnail_url?: string | null;
}

interface TrailLessonJoin {
    trail_id: string;
    lesson_id: string;
    chapter: string | null;
    display_order: number;
}

interface LessonWithStatus extends Lesson {
    trail_id: string;
    chapter: string | null;
    display_order: number;
    is_completed: boolean;
    is_next: boolean;
}

interface LiveSettings {
    next_live_title: string | null;
    next_live_date: string | null;
    next_live_description: string | null;
    next_live_thumb: string | null;
    next_live_link: string | null;
}

const LIVE_DURATION_ASSUMED_MS = 2 * 60 * 60 * 1000;

// Próxima sexta 19h BRT (UTC-3 → 22h UTC). Fallback quando admin não preencheu next_live_date.
function getNextFridayLive(): Date {
    const now = new Date();
    const dow = now.getUTCDay(); // 0 dom, 5 sex
    const daysToFriday = (5 - dow + 7) % 7;
    const friday = new Date(now);
    friday.setUTCDate(now.getUTCDate() + daysToFriday);
    friday.setUTCHours(22, 0, 0, 0); // 22h UTC = 19h BRT
    // Se hoje é sex mas já passou das 21h BRT (live já rolou), pula pra próxima
    if (friday.getTime() < now.getTime()) {
        friday.setUTCDate(friday.getUTCDate() + 7);
    }
    return friday;
}

function buildICS(opts: { uid: string; title: string; description: string; startDate: Date; endDate: Date; url?: string | null }): string {
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const escape = (s: string) => (s ?? '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    return [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MSIA//Academy//PT-BR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
        'BEGIN:VEVENT',
        `UID:${opts.uid}`,
        `DTSTAMP:${fmt(new Date())}`,
        `DTSTART:${fmt(opts.startDate)}`,
        `DTEND:${fmt(opts.endDate)}`,
        `SUMMARY:${escape(opts.title)}`,
        `DESCRIPTION:${escape(opts.description)}`,
        ...(opts.url ? [`URL:${opts.url}`] : []),
        'END:VEVENT', 'END:VCALENDAR',
    ].join('\r\n');
}

function downloadICS(filename: string, content: string) {
    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function useCountdown(target: Date | null) {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!target) return;
        const i = setInterval(() => setNow(Date.now()), 60_000);
        return () => clearInterval(i);
    }, [target]);
    if (!target) return { days: 0, hours: 0, minutes: 0, totalMs: 0 };
    const diff = Math.max(0, target.getTime() - now);
    return {
        days: Math.floor(diff / 86_400_000),
        hours: Math.floor((diff % 86_400_000) / 3_600_000),
        minutes: Math.floor((diff % 3_600_000) / 60_000),
        totalMs: diff,
    };
}

const AUDIENCE_LABEL: Record<string, string> = {
    iniciantes: 'Iniciantes',
    freelancers: 'Freelancers',
    afiliados: 'Afiliados',
    pmes: 'PMEs locais',
    todos: 'Todos',
};

function formatReleaseAt(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) +
        ' às ' +
        d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function AcademyHome() {
    const [loading, setLoading] = useState(true);
    const [trails, setTrails] = useState<Trail[]>([]);
    const [lessonsByTrail, setLessonsByTrail] = useState<Record<string, LessonWithStatus[]>>({});
    const [live, setLive] = useState<LiveSettings | null>(null);
    const [totalCompleted, setTotalCompleted] = useState(0);
    const [totalLessons, setTotalLessons] = useState(0);
    const [nextLesson, setNextLesson] = useState<{ trailSlug: string; lessonId: string; lessonTitle: string; trailTitle: string } | null>(null);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return;
            }

            const [trailsResult, trailLessonsResult, progressResult, lessonsResult, liveResult] = await Promise.allSettled([
                supabase.from('trails').select('*').order('display_order'),
                supabase.from('trail_lessons').select('trail_id, lesson_id, chapter, display_order'),
                supabase.from('user_lessons_progress').select('lesson_id, is_completed').eq('user_id', user.id),
                supabase.from('lessons').select('id, title, thumbnail_url'),
                supabase.from('platform_settings').select('next_live_title, next_live_date, next_live_description, next_live_thumb, next_live_link').eq('id', 1).maybeSingle(),
            ]);

            const trailsData: Trail[] = trailsResult.status === 'fulfilled' ? (trailsResult.value.data ?? []) : [];
            const trailLessonsData: TrailLessonJoin[] = trailLessonsResult.status === 'fulfilled' ? (trailLessonsResult.value.data ?? []) : [];
            const progressData: Array<{ lesson_id: string; is_completed: boolean }> = progressResult.status === 'fulfilled' ? (progressResult.value.data ?? []) : [];
            const lessonsData: Lesson[] = lessonsResult.status === 'fulfilled' ? (lessonsResult.value.data ?? []) : [];
            const liveData = liveResult.status === 'fulfilled' ? liveResult.value.data : null;

            const completedIds = new Set(progressData.filter(p => p.is_completed).map(p => p.lesson_id));
            const lessonMap = new Map(lessonsData.map(l => [l.id, l]));

            // Agrupa lessons por trilha e calcula "is_next" (primeira não-concluída de cada trilha)
            const grouped: Record<string, LessonWithStatus[]> = {};
            let firstNextLesson: typeof nextLesson = null;

            for (const trail of trailsData) {
                const tlForTrail = trailLessonsData
                    .filter(tl => tl.trail_id === trail.id)
                    .sort((a, b) => a.display_order - b.display_order);

                const lessons: LessonWithStatus[] = [];
                let nextMarked = false;

                for (const tl of tlForTrail) {
                    const lesson = lessonMap.get(tl.lesson_id);
                    if (!lesson) continue;
                    const isCompleted = completedIds.has(tl.lesson_id);
                    const isNext = !nextMarked && !isCompleted;
                    if (isNext) {
                        nextMarked = true;
                        if (!firstNextLesson) {
                            firstNextLesson = {
                                trailSlug: trail.slug,
                                lessonId: tl.lesson_id,
                                lessonTitle: lesson.title,
                                trailTitle: trail.title,
                            };
                        }
                    }
                    lessons.push({
                        ...lesson,
                        trail_id: trail.id,
                        chapter: tl.chapter,
                        display_order: tl.display_order,
                        is_completed: isCompleted,
                        is_next: isNext,
                    });
                }

                grouped[trail.id] = lessons;
            }

            setTrails(trailsData);
            setLessonsByTrail(grouped);
            setLive(liveData as LiveSettings | null);
            setNextLesson(firstNextLesson);

            const allLessonIds = new Set(trailLessonsData.map(tl => tl.lesson_id));
            setTotalLessons(allLessonIds.size);
            const completedAll = Array.from(allLessonIds).filter(id => completedIds.has(id)).length;
            setTotalCompleted(completedAll);
        } catch (err) {
            console.error('Erro carregando Academy:', err);
        } finally {
            setLoading(false);
        }
    }

    const overallProgress = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-coral-terra" />
                <p className="text-cafe-medio text-sm">Carregando Academy…</p>
            </div>
        );
    }

    if (trails.length === 0) {
        return (
            <div className="space-y-6 pb-8">
                <div>
                    <h1 className="font-display text-3xl md:text-[2rem] font-normal text-carvao-quente tracking-tight">Academy</h1>
                    <p className="text-base text-cafe-medio mt-1.5">Trilhas de aprendizado pra você dominar a plataforma.</p>
                </div>
                <Card padding="lg">
                    <p className="text-cafe-medio text-sm italic">Nenhuma trilha disponível ainda. Volte em breve.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="pb-8">
            {/* Header */}
            <div className="mb-6">
                <h1 className="font-display text-3xl md:text-[2rem] font-normal text-carvao-quente tracking-tight">
                    Academy
                </h1>
                <p className="text-base text-cafe-medio mt-1.5 tabular-nums">
                    {totalLessons > 0
                        ? `${totalCompleted} de ${totalLessons} aulas concluídas · ${overallProgress}%`
                        : 'Trilhas de aprendizado pra você dominar a plataforma.'}
                </p>
            </div>

            {/* Continuar de onde parou */}
            {nextLesson && (
                <Card padding="lg" className="mb-8 !border-coral-terra/30">
                    <div className="flex flex-col md:flex-row md:items-center gap-5">
                        <div className="w-14 h-14 rounded-full bg-coral-wash flex items-center justify-center shrink-0">
                            <Play className="w-6 h-6 text-coral-terra" fill="currentColor" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-coral-terra uppercase tracking-[0.12em]">
                                {totalCompleted > 0 ? 'Continuar de onde parou' : 'Comece sua jornada'}
                            </p>
                            <p className="font-mono text-xs text-cafe-cinza-quente mt-1 uppercase tracking-wide truncate">
                                {nextLesson.trailTitle}
                            </p>
                            <h2 className="font-display text-xl md:text-2xl font-normal text-carvao-quente tracking-tight mt-1 truncate">
                                {nextLesson.lessonTitle}
                            </h2>
                        </div>
                        <a
                            href={`/aulas/${nextLesson.trailSlug}/${nextLesson.lessonId}`}
                            className="inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-6 py-3 rounded-[12px] font-semibold text-base transition-colors active:scale-[0.98] whitespace-nowrap shrink-0 min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra"
                        >
                            {totalCompleted > 0 ? 'Continuar' : 'Começar'}
                            <ArrowRight className="w-4 h-4" />
                        </a>
                    </div>
                </Card>
            )}

            {/* Aulas ao vivo — section permanente antes das trilhas */}
            <LiveSection live={live} />

            {/* Chips de trilhas (sticky em todos os tamanhos) */}
            <div className="sticky top-0 -mx-4 lg:-mx-8 px-4 lg:px-8 py-3 bg-papel-craft/95 backdrop-blur-sm border-b border-borda-cafe z-20 mb-8">
                <div className="flex items-center gap-2 overflow-x-auto">
                    {trails.map(trail => (
                        <a
                            key={trail.id}
                            href={`#${trail.slug}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cream-elevated text-cafe-medio hover:bg-coral-wash hover:text-terracota-profundo text-xs font-semibold whitespace-nowrap transition-colors border border-borda-cafe shrink-0"
                        >
                            {trail.is_featured && <Star className="w-3 h-3 text-mostarda-amber fill-mostarda-amber" />}
                            {trail.title}
                        </a>
                    ))}
                    <span className="text-borda-cafe shrink-0">·</span>
                    <a
                        href="#aulas-ao-vivo"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-coral-wash text-coral-terra hover:bg-coral-terra hover:text-papel-craft text-xs font-semibold whitespace-nowrap transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra"
                    >
                        <Radio className="w-3 h-3" />
                        Aulas ao vivo
                    </a>
                </div>
            </div>

            <div className="space-y-10">
                {trails.map(trail => (
                    <TrailSection
                        key={trail.id}
                        trail={trail}
                        lessons={lessonsByTrail[trail.id] || []}
                    />
                ))}
            </div>

        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// LIVE SECTION
// ─────────────────────────────────────────────────────────────────────────

function LiveSection({ live }: { live: LiveSettings | null }) {
    const scheduledDate = live?.next_live_date ? new Date(live.next_live_date) : null;

    const isLiveNow = !!scheduledDate
        && Date.now() >= scheduledDate.getTime()
        && Date.now() < scheduledDate.getTime() + LIVE_DURATION_ASSUMED_MS;

    // Quando usar fallback (próxima sexta calculada): sem data agendada OU data agendada já passou
    const useFallback = !scheduledDate || (scheduledDate.getTime() + LIVE_DURATION_ASSUMED_MS < Date.now());
    const targetDate = useFallback ? getNextFridayLive() : scheduledDate;

    const title = useFallback
        ? 'Lançamento de template novo + Q&A'
        : (live?.next_live_title || 'Aula ao vivo');

    const description = useFallback
        ? 'Toda sexta às 19h o template campeão da semana vira ao vivo no YouTube. Aproveita pra perguntar dúvidas e ver Bruno fazendo na prática.'
        : (live?.next_live_description || '');

    const countdown = useCountdown(isLiveNow ? null : targetDate);

    function addToCalendar() {
        if (!targetDate) return;
        const end = new Date(targetDate.getTime() + LIVE_DURATION_ASSUMED_MS);
        const ics = buildICS({
            uid: `msia-live-${targetDate.toISOString()}@meusitecomia.com.br`,
            title: `MSIA · ${title}`,
            description: description || 'Aula ao vivo da Academy MSIA',
            startDate: targetDate,
            endDate: end,
            url: live?.next_live_link || 'https://meusitecomia.com.br/aulas-ao-vivo',
        });
        downloadICS(`msia-aula-ao-vivo.ics`, ics);
    }

    return (
        <section id="aulas-ao-vivo" className="mb-10 scroll-mt-6">
            {/* Header section */}
            <div className="border-b border-borda-cafe pb-3 mb-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <Radio className="w-4 h-4 text-coral-terra shrink-0" />
                            <h2 className="font-display text-2xl md:text-[1.75rem] font-normal text-carvao-quente tracking-tight">
                                Aulas ao vivo
                            </h2>
                        </div>
                        <p className="text-sm text-cafe-medio mt-1 leading-relaxed">
                            Sexta às 19h BRT · Lançamento do template campeão da semana + Q&A com Bruno
                        </p>
                    </div>
                    <a
                        href="/aulas-ao-vivo"
                        className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-coral-terra hover:text-terracota-profundo transition-colors shrink-0 mt-1"
                    >
                        Ver agenda completa
                        <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                </div>
            </div>

            {/* Card principal — 3 estados */}
            {isLiveNow && live ? (
                <a
                    href={live.next_live_link ?? '/aulas-ao-vivo'}
                    target={live.next_live_link ? '_blank' : undefined}
                    rel={live.next_live_link ? 'noopener noreferrer' : undefined}
                    className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra rounded-[12px]"
                >
                    <div className="flex items-center gap-4 bg-[oklch(94%_0.025_145)] border border-verde-oliva/40 text-[oklch(28%_0.060_145)] rounded-[12px] px-5 py-5 hover:bg-[oklch(92%_0.030_145)] transition-colors">
                        <span className="relative flex h-3 w-3 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-verde-oliva opacity-75" />
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-verde-oliva" />
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-xs uppercase tracking-[0.12em]">Ao vivo agora</p>
                            <p className="font-display text-xl md:text-2xl font-normal tracking-tight truncate mt-1">
                                {live.next_live_title}
                            </p>
                            {live.next_live_description && (
                                <p className="text-sm mt-1 leading-relaxed opacity-80 line-clamp-2">{live.next_live_description}</p>
                            )}
                        </div>
                        <span className="inline-flex items-center gap-2 bg-verde-oliva text-papel-craft px-5 py-2.5 rounded-[10px] font-semibold text-sm shrink-0">
                            Assistir
                            <ArrowRight className="w-4 h-4" />
                        </span>
                    </div>
                </a>
            ) : targetDate ? (
                <Card padding="lg" className="!border-coral-terra/30 !bg-coral-wash/40">
                    <div className="flex flex-col gap-5">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-coral-terra uppercase tracking-[0.12em]">
                                    Próxima live
                                </p>
                                <h3 className="font-display text-xl md:text-2xl font-normal text-carvao-quente tracking-tight mt-1 leading-tight">
                                    {title}
                                </h3>
                                {description && (
                                    <p className="text-sm text-cafe-medio mt-2 leading-relaxed max-w-prose">
                                        {description}
                                    </p>
                                )}
                                <p className="text-sm text-cafe-medio mt-2 inline-flex items-center gap-1.5 tabular-nums">
                                    <Clock className="w-3.5 h-3.5" />
                                    {targetDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                                    {' às '}
                                    {targetDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    {' BRT'}
                                </p>
                            </div>
                        </div>

                        {/* Countdown */}
                        <div className="grid grid-cols-3 gap-3 max-w-sm">
                            <CountdownBlock value={countdown.days} label="dias" />
                            <CountdownBlock value={countdown.hours} label="horas" />
                            <CountdownBlock value={countdown.minutes} label="min" />
                        </div>

                        {/* CTAs */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                type="button"
                                onClick={addToCalendar}
                                className="inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-5 py-2.5 rounded-[10px] font-semibold text-sm transition-colors active:scale-[0.98] min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra"
                            >
                                <CalendarPlus className="w-4 h-4" />
                                Adicionar à agenda
                            </button>
                            <a
                                href="/aulas-ao-vivo"
                                className="inline-flex items-center justify-center gap-2 bg-cream-elevated hover:bg-cream-surface text-carvao-quente border border-borda-cafe px-5 py-2.5 rounded-[10px] font-semibold text-sm transition-colors active:scale-[0.98] min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra"
                            >
                                Ver detalhes
                                <ArrowRight className="w-4 h-4" />
                            </a>
                        </div>
                    </div>
                </Card>
            ) : null}
        </section>
    );
}

function CountdownBlock({ value, label }: { value: number; label: string }) {
    return (
        <div className="flex flex-col items-center">
            <div className="w-full bg-cream-surface border border-borda-cafe rounded-[10px] px-3 py-3 text-center">
                <span className="font-display text-2xl md:text-3xl font-normal text-carvao-quente tabular-nums tracking-tight leading-none">
                    {String(value).padStart(2, '0')}
                </span>
            </div>
            <span className="text-xs font-semibold text-cafe-cinza-quente uppercase tracking-wide mt-1.5">{label}</span>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────

function TrailSection({ trail, lessons }: { trail: Trail; lessons: LessonWithStatus[] }) {
    const completed = lessons.filter(l => l.is_completed).length;
    const total = lessons.length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isComplete = total > 0 && completed === total;

    const isReleaseLocked = !!trail.release_at && new Date(trail.release_at).getTime() > Date.now();

    // Agrupar lessons por chapter
    const groups = useMemo(() => {
        const map = new Map<string, LessonWithStatus[]>();
        for (const l of lessons) {
            const key = l.chapter?.trim() || '__no_chapter__';
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(l);
        }
        return Array.from(map.entries());
    }, [lessons]);

    return (
        <section id={trail.slug} className="scroll-mt-6">
            {/* Header */}
            <div className="border-b border-borda-cafe pb-3 mb-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            {trail.is_featured && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-mostarda-amber text-carvao-quente text-xs font-semibold rounded-full uppercase tracking-wide">
                                    <Star className="w-3 h-3 fill-current" /> Destaque
                                </span>
                            )}
                            {isComplete && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-verde-oliva text-papel-craft text-xs font-semibold rounded-full uppercase tracking-wide">
                                    <Check className="w-3 h-3" strokeWidth={3} /> Concluída
                                </span>
                            )}
                        </div>
                        <h2 className="font-display text-2xl md:text-[1.75rem] font-normal text-carvao-quente tracking-tight mt-1.5">
                            {trail.title}
                        </h2>
                        {trail.description && (
                            <p className="text-sm text-cafe-medio mt-1 leading-relaxed">{trail.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="text-xs text-cafe-cinza-quente tabular-nums">
                                {total} {total === 1 ? 'aula' : 'aulas'}
                            </span>
                            {trail.estimated_hours && (
                                <span className="text-xs text-cafe-cinza-quente inline-flex items-center gap-1 tabular-nums">
                                    <Clock className="w-3 h-3" /> ~{trail.estimated_hours}h
                                </span>
                            )}
                            {trail.target_audience && (
                                <span className="text-xs text-cafe-cinza-quente">
                                    · {AUDIENCE_LABEL[trail.target_audience] || trail.target_audience}
                                </span>
                            )}
                            {completed > 0 && !isComplete && (
                                <span className="text-xs text-coral-terra font-semibold tabular-nums">
                                    {progress}%
                                </span>
                            )}
                        </div>
                        {completed > 0 && !isComplete && total > 0 && (
                            <div className="mt-2 h-0.5 bg-borda-cafe rounded-full overflow-hidden max-w-sm">
                                <div className="h-full bg-coral-terra transition-all" style={{ width: `${progress}%` }} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Banner trilha trancada */}
            {isReleaseLocked && (
                <div className="flex items-center gap-3 bg-[oklch(96%_0.025_80)] border border-mostarda-amber/40 rounded-[10px] px-4 py-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-mostarda-amber flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-carvao-quente" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[oklch(40%_0.110_80)] uppercase tracking-[0.12em]">
                            Em breve
                        </p>
                        <p className="text-sm text-carvao-quente mt-0.5">
                            Esta trilha libera em <strong className="tabular-nums">{formatReleaseAt(trail.release_at!)}</strong>.
                        </p>
                    </div>
                </div>
            )}

            {/* Lessons */}
            {total === 0 ? (
                <p className="text-sm text-cafe-medio italic py-4">Nenhuma aula nesta trilha ainda.</p>
            ) : (
                <div className="space-y-5">
                    {groups.map(([chapterKey, chapterLessons]) => {
                        const isChapter = chapterKey !== '__no_chapter__';
                        return (
                            <div key={chapterKey}>
                                {isChapter && (
                                    <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em] mb-2">
                                        {chapterKey}
                                    </p>
                                )}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {chapterLessons.map(lesson => (
                                        <LessonCard
                                            key={lesson.id}
                                            trailSlug={trail.slug}
                                            lesson={lesson}
                                            position={lessons.findIndex(l => l.id === lesson.id) + 1}
                                            locked={isReleaseLocked}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

function LessonCard({
    trailSlug, lesson, position, locked,
}: {
    trailSlug: string;
    lesson: LessonWithStatus;
    position: number;
    locked: boolean;
}) {
    const showLock = locked;
    const target = `/aulas/${trailSlug}/${lesson.id}`;

    const Wrapper: React.ElementType = showLock ? 'div' : 'a';
    const wrapperProps = showLock ? {} : { href: target };

    return (
        <Wrapper
            {...wrapperProps}
            className={`group relative block bg-cream-surface border rounded-[10px] overflow-hidden transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra ${
                showLock
                    ? 'border-borda-cafe opacity-60 cursor-not-allowed'
                    : lesson.is_next
                        ? 'border-coral-terra/40'
                        : lesson.is_completed
                            ? 'border-verde-oliva/30'
                            : 'border-borda-cafe hover:border-coral-terra/30'
            }`}
            style={!showLock ? {
                boxShadow: lesson.is_next
                    ? '0 4px 12px -3px rgba(80, 40, 20, 0.08)'
                    : '0 1px 2px 0 rgba(80, 40, 20, 0.04)',
            } : undefined}
        >
            {/* Thumbnail / play surface */}
            <div className="relative aspect-video flex items-center justify-center bg-cream-elevated overflow-hidden">
                {lesson.thumbnail_url ? (
                    <img
                        src={lesson.thumbnail_url}
                        alt=""
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity ${
                            lesson.is_completed ? 'opacity-60' : showLock ? 'opacity-30' : 'opacity-100'
                        }`}
                    />
                ) : (
                    <LessonThumb
                        seed={lesson.id}
                        className={`transition-opacity ${
                            lesson.is_completed ? 'opacity-50' : showLock ? 'opacity-25' : 'opacity-100'
                        }`}
                    />
                )}

                {/* Overlay icon — sempre acima da imagem */}
                <div className="relative z-10 bg-cream-surface/85 rounded-full p-1">
                    {showLock ? (
                        <Lock className="w-6 h-6 text-cafe-cinza-quente" />
                    ) : lesson.is_completed ? (
                        <div className="w-10 h-10 rounded-full bg-verde-oliva flex items-center justify-center">
                            <Check className="w-5 h-5 text-papel-craft" strokeWidth={3} />
                        </div>
                    ) : lesson.is_next ? (
                        <div className="w-10 h-10 rounded-full bg-coral-terra flex items-center justify-center shadow-[0_2px_8px_rgba(80,40,20,0.15)] group-hover:scale-105 transition-transform">
                            <Play className="w-4 h-4 text-papel-craft" fill="currentColor" />
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-cream-surface border border-borda-cafe flex items-center justify-center group-hover:border-coral-terra/40 transition-colors">
                            <Play className="w-3.5 h-3.5 text-cafe-cinza-quente group-hover:text-coral-terra transition-colors" />
                        </div>
                    )}
                </div>
            </div>

            {/* Status pill no canto */}
            {!showLock && lesson.is_next && (
                <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 bg-coral-terra text-papel-craft text-[10px] font-semibold rounded-full uppercase tracking-wide">
                    <CircleDot className="w-2 h-2" /> Próxima
                </span>
            )}

            {/* Conteúdo */}
            <div className="p-3">
                <p className="text-[10px] font-bold text-cafe-cinza-quente uppercase tracking-wide tabular-nums">
                    Aula {position}
                </p>
                <p className={`text-sm font-semibold mt-0.5 leading-snug line-clamp-2 transition-colors ${
                    lesson.is_completed
                        ? 'text-cafe-medio'
                        : 'text-carvao-quente group-hover:text-coral-terra'
                }`}>
                    {lesson.title}
                </p>
            </div>
        </Wrapper>
    );
}
