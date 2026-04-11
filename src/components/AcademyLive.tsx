import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Radio, Calendar, ExternalLink, Play, Clock, Lock, X } from 'lucide-react';

interface LiveSettings {
    next_live_title: string | null;
    next_live_date: string | null;
    next_live_description: string | null;
    next_live_thumb: string | null;
    next_live_link: string | null;
}

interface Lesson {
    id: string;
    title: string;
    description: string;
    video_url: string;
    display_order: number;
}

interface Countdown {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
}

function CountdownBlock({ value, label }: { value: number; label: string }) {
    return (
        <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-[#7c3aed]/10 border border-[#7c3aed]/20 rounded-xl flex items-center justify-center">
                <span className="text-xl font-black text-[#7c3aed] tabular-nums">
                    {String(value).padStart(2, '0')}
                </span>
            </div>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">{label}</span>
        </div>
    );
}

function ReplayModal({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const plyrRef = useRef<any>(null);

    useEffect(() => {
        const initPlyr = () => {
            if (!(window as any).Plyr || !videoRef.current) return;
            plyrRef.current = new (window as any).Plyr(videoRef.current, {
                controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen'],
                settings: ['speed'],
                speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
            });
        };
        if ((window as any).Plyr) initPlyr();
        else {
            const s = document.createElement('script');
            s.src = 'https://cdn.plyr.io/3.7.8/plyr.polyfilled.js';
            s.async = true;
            s.onload = initPlyr;
            document.head.appendChild(s);
        }
        return () => { if (plyrRef.current) { plyrRef.current.destroy(); plyrRef.current = null; } };
    }, []);

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}>
            <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white font-black text-lg truncate pr-4">{lesson.title}</h3>
                    <button onClick={onClose} className="shrink-0 w-9 h-9 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl" onContextMenu={e => e.preventDefault()}>
                    {lesson.video_url ? (
                        <video ref={videoRef} src={lesson.video_url} className="w-full h-full" playsInline onContextMenu={e => e.preventDefault()} />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Lock className="w-8 h-8 text-gray-600" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function AcademyLive() {
    const [settings, setSettings] = useState<LiveSettings | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [countdown, setCountdown] = useState<Countdown>({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false });
    const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

    useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        if (!settings?.next_live_date) return;
        const tick = () => {
            const diff = new Date(settings.next_live_date!).getTime() - Date.now();
            if (diff <= 0) {
                setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true });
                return;
            }
            setCountdown({
                days: Math.floor(diff / 86400000),
                hours: Math.floor((diff % 86400000) / 3600000),
                minutes: Math.floor((diff % 3600000) / 60000),
                seconds: Math.floor((diff % 60000) / 1000),
                isPast: false,
            });
        };
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [settings?.next_live_date]);

    const fetchData = async () => {
        const [{ data: ps }, { data: mods }] = await Promise.all([
            supabase.from('platform_settings').select('next_live_title, next_live_date, next_live_description, next_live_thumb, next_live_link').eq('id', 1).maybeSingle(),
            supabase.from('modules').select('id').eq('is_featured', true).limit(1),
        ]);
        if (ps) setSettings(ps);
        if (mods?.[0]) {
            const { data: lsns } = await supabase
                .from('lessons')
                .select('id, title, description, video_url, display_order')
                .eq('module_id', mods[0].id)
                .order('display_order', { ascending: false });
            setLessons(lsns || []);
        }
        setLoading(false);
    };

    const formatDate = (iso: string) =>
        new Date(iso).toLocaleDateString('pt-BR', {
            weekday: 'long', day: '2-digit', month: 'long',
            hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
        });

    if (loading) return (
        <div className="space-y-6">
            <div className="h-56 bg-white rounded-2xl border border-gray-100 animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {[...Array(3)].map((_, i) => <div key={i} className="h-48 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
            </div>
        </div>
    );

    const hasNextLive = settings?.next_live_date || settings?.next_live_title;

    return (
        <div className="space-y-10 pb-10">

            {/* ── PRÓXIMA AULA ── */}
            <div>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-red-400" />
                    Próxima Aula
                </p>

                {!hasNextLive ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-10 text-center">
                        <Radio className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                        <p className="font-bold text-gray-500">Nenhuma aula agendada no momento.</p>
                        <p className="text-sm text-gray-400 mt-1">A próxima data será publicada em breve.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                        {/* Coluna esquerda — info */}
                        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col gap-5">
                            <div className="space-y-3">
                                <span className="inline-flex items-center gap-1.5 bg-red-50 border border-red-100 text-red-500 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                    Ao vivo · Toda semana
                                </span>

                                <h2 className="text-xl font-black text-gray-900 leading-tight">
                                    {settings?.next_live_title || 'Próxima Aula ao Vivo'}
                                </h2>

                                {settings?.next_live_date && (
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Calendar className="w-4 h-4 text-[#7c3aed] shrink-0" />
                                        <span className="capitalize">{formatDate(settings.next_live_date)}</span>
                                    </div>
                                )}

                                {settings?.next_live_description && (
                                    <p className="text-sm text-gray-500 leading-relaxed">{settings.next_live_description}</p>
                                )}
                            </div>

                            {/* Countdown */}
                            {settings?.next_live_date && !countdown.isPast && (
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Começa em</p>
                                    <div className="flex items-end gap-2.5">
                                        <CountdownBlock value={countdown.days} label="dias" />
                                        <span className="text-[#7c3aed]/40 text-lg font-black mb-3">:</span>
                                        <CountdownBlock value={countdown.hours} label="horas" />
                                        <span className="text-[#7c3aed]/40 text-lg font-black mb-3">:</span>
                                        <CountdownBlock value={countdown.minutes} label="min" />
                                        <span className="text-[#7c3aed]/40 text-lg font-black mb-3">:</span>
                                        <CountdownBlock value={countdown.seconds} label="seg" />
                                    </div>
                                </div>
                            )}

                            {countdown.isPast && (
                                <div className="inline-flex items-center gap-2 bg-red-50 border border-red-100 text-red-500 px-4 py-2 rounded-xl text-sm font-black w-fit">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                    Acontecendo agora!
                                </div>
                            )}

                            {settings?.next_live_link && (
                                <a
                                    href={settings.next_live_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-black px-6 py-3 rounded-xl transition text-sm shadow-sm shadow-[#7c3aed]/20 mt-auto"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Entrar na Aula
                                </a>
                            )}
                        </div>

                        {/* Coluna direita — thumbnail */}
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden relative aspect-video lg:aspect-auto min-h-[220px]">
                            {settings?.next_live_thumb ? (
                                <img
                                    src={settings.next_live_thumb}
                                    alt={settings.next_live_title || ''}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gray-50">
                                    <div className="w-12 h-12 rounded-full bg-[#7c3aed]/10 flex items-center justify-center">
                                        <Radio className="w-5 h-5 text-[#7c3aed]" />
                                    </div>
                                    <p className="text-sm text-gray-400 font-semibold">Thumbnail em breve</p>
                                </div>
                            )}

                            {countdown.isPast && settings?.next_live_link && (
                                <a
                                    href={settings.next_live_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/30 transition group"
                                >
                                    <div className="w-14 h-14 rounded-full bg-[#7c3aed] flex items-center justify-center shadow-2xl group-hover:scale-105 transition">
                                        <Play className="w-6 h-6 fill-white text-white ml-0.5" />
                                    </div>
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── REPLAYS ── */}
            <div>
                <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    Replays · {lessons.length} {lessons.length === 1 ? 'gravação' : 'gravações'}
                </p>

                {lessons.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                        <Play className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                        <p className="font-bold text-gray-500">Nenhum replay disponível ainda.</p>
                        <p className="text-sm text-gray-400 mt-1">As gravações aparecem aqui após cada aula.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                        {lessons.map((lesson, i) => (
                            <button
                                key={lesson.id}
                                type="button"
                                onClick={() => lesson.video_url && setActiveLesson(lesson)}
                                className={`group text-left bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300 flex flex-col ${lesson.video_url ? 'hover:shadow-xl hover:border-[#7c3aed]/20 hover:-translate-y-0.5 cursor-pointer' : 'opacity-60 cursor-default'}`}
                            >
                                <div className="relative aspect-video overflow-hidden bg-gray-100">
                                    <div className="w-full h-full flex items-center justify-center"
                                        style={{ background: `linear-gradient(135deg, #ede9fe, #ddd6fe)` }}>
                                        <span className="text-[#7c3aed]/20 font-black text-6xl">{lessons.length - i}</span>
                                    </div>

                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 bg-black/10">
                                        <div className="w-12 h-12 rounded-full bg-[#7c3aed] flex items-center justify-center shadow-lg group-hover:scale-105 transition">
                                            <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                                        </div>
                                    </div>

                                    <div className="absolute top-3 left-3">
                                        <span className="px-2 py-0.5 bg-black/40 backdrop-blur-sm text-white text-[9px] font-black rounded-md uppercase tracking-wider">
                                            Replay #{lessons.length - i}
                                        </span>
                                    </div>

                                    {!lesson.video_url && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                                            <span className="text-xs text-gray-400 font-semibold">Em breve</span>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 flex flex-col flex-1">
                                    <h3 className="font-black text-gray-900 text-sm leading-snug mb-1 group-hover:text-[#7c3aed] transition-colors">
                                        {lesson.title}
                                    </h3>
                                    {lesson.description && (
                                        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">{lesson.description}</p>
                                    )}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {activeLesson && (
                <ReplayModal lesson={activeLesson} onClose={() => setActiveLesson(null)} />
            )}
        </div>
    );
}
