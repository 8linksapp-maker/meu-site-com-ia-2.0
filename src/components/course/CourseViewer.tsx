import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Play, CheckCircle, ChevronRight, Lock, ArrowLeft, GraduationCap, ChevronDown, Trophy, FileText, MessageSquare, ExternalLink, Send, Loader2, BookOpen, Radio, Calendar } from 'lucide-react';

interface Lesson {
    id: string;
    module_id: string;
    title: string;
    description: string;
    video_url: string;
    display_order: number;
    highlights?: string[];
}

interface Module {
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    display_order: number;
    is_featured: boolean;
    lessons: Lesson[];
}

interface LessonResource {
    id: string;
    title: string;
    url: string;
}

interface LessonComment {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    profiles: { full_name: string | null; email: string | null; role: string | null } | null;
}

// Gradientes de fallback para quando não há thumbnail
const MODULE_GRADIENTS = [
    'from-violet-600 to-purple-800',
    'from-blue-600 to-indigo-800',
    'from-emerald-500 to-teal-700',
    'from-rose-500 to-pink-700',
    'from-amber-500 to-orange-700',
    'from-cyan-500 to-blue-700',
];

// ── LIVE MODULE CARD ──────────────────────────────────────────────────
function LiveModuleCard({ module, completedCount, onEnter }: { module: Module; completedCount: number; onEnter: () => void }) {
    const total = module.lessons.length;
    const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;

    return (
        <button
            type="button"
            onClick={onEnter}
            className="group w-full text-left relative overflow-hidden rounded-2xl bg-gray-950 border border-white/5 hover:border-red-500/30 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/10"
        >
            {/* Background glow */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-80 h-80 rounded-full opacity-20"
                    style={{ background: 'radial-gradient(circle, #ef4444 0%, transparent 70%)', transform: 'translate(-30%, -30%)' }} />
                <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-10"
                    style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', transform: 'translate(30%, 30%)' }} />
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row gap-6 p-6">
                {/* Left: live badge + title */}
                <div className="flex-1 flex flex-col justify-between gap-4">
                    <div>
                        {/* Live badge */}
                        <div className="flex items-center gap-2 mb-4">
                            <span className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 text-red-400 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                Ao Vivo
                            </span>
                            <span className="flex items-center gap-1.5 text-[11px] text-gray-500 font-semibold">
                                <Calendar className="w-3 h-3" />
                                Toda semana
                            </span>
                        </div>

                        <h3 className="text-2xl font-black text-white leading-tight mb-2 group-hover:text-red-300 transition-colors">
                            {module.title}
                        </h3>
                        <p className="text-gray-400 text-sm leading-relaxed max-w-md">
                            {module.description || 'Encontros semanais ao vivo com a turma. Tire dúvidas, veja cases reais e acelere seus resultados.'}
                        </p>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Radio className="w-4 h-4 text-red-400" />
                            <span>{total} {total === 1 ? 'gravação' : 'gravações'} disponíveis</span>
                        </div>
                        {progress > 0 && (
                            <div className="flex items-center gap-2">
                                <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${progress}%` }} />
                                </div>
                                <span className="text-[11px] text-gray-500 font-semibold">{completedCount}/{total} assistidas</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: CTA */}
                <div className="flex sm:flex-col items-center sm:items-end justify-end gap-3 shrink-0">
                    {module.thumbnail_url && (
                        <div className="hidden sm:block w-40 h-24 rounded-xl overflow-hidden border border-white/10">
                            <img src={module.thumbnail_url} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition" />
                        </div>
                    )}
                    <div className="flex items-center gap-2 bg-red-500 group-hover:bg-red-400 text-white px-5 py-2.5 rounded-xl font-black text-sm transition-all duration-200 shadow-lg shadow-red-500/25">
                        <Play className="w-4 h-4 fill-white" />
                        Ver gravações
                    </div>
                </div>
            </div>
        </button>
    );
}

// ── MODULE CARD ───────────────────────────────────────────────────────
function ModuleCard({
    module, index, completedCount, onEnter,
}: {
    module: Module; index: number; completedCount: number; onEnter: () => void;
}) {
    const total = module.lessons.length;
    const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    const isComplete = completedCount === total && total > 0;
    const gradient = MODULE_GRADIENTS[index % MODULE_GRADIENTS.length];

    return (
        <button
            type="button"
            onClick={onEnter}
            className="group text-left bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:border-[#7c3aed]/20 transition-all duration-300 hover:-translate-y-1 flex flex-col"
        >
            {/* Thumbnail */}
            <div className="relative aspect-video overflow-hidden">
                {module.thumbnail_url ? (
                    <img
                        src={module.thumbnail_url}
                        alt={module.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                        <span className="text-white/20 font-black text-7xl">{index + 1}</span>
                    </div>
                )}

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-300 shadow-2xl">
                        <Play className="w-6 h-6 text-white fill-white ml-1" />
                    </div>
                </div>

                {/* Module number badge */}
                <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-black rounded-lg border border-white/10 uppercase tracking-wider">
                        Módulo {index + 1}
                    </span>
                </div>

                {/* Complete badge */}
                {isComplete && (
                    <div className="absolute top-3 right-3">
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-lg shadow-lg">
                            <CheckCircle className="w-3 h-3" /> Concluído
                        </span>
                    </div>
                )}

                {/* Progress bar overlay at bottom */}
                {progress > 0 && !isComplete && (
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-black/30">
                        <div
                            className="h-full bg-[#7c3aed] transition-all duration-700"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="p-5 flex flex-col flex-1">
                <h3 className="font-black text-gray-900 text-sm leading-snug mb-1.5 group-hover:text-[#7c3aed] transition-colors">
                    {module.title}
                </h3>
                {module.description && (
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">
                        {module.description}
                    </p>
                )}
                <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                        <Play className="w-3 h-3" />
                        {total} {total === 1 ? 'aula' : 'aulas'}
                        {completedCount > 0 && !isComplete && (
                            <span className="text-[#7c3aed] font-bold">· {completedCount} feitas</span>
                        )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#7c3aed] group-hover:translate-x-0.5 transition-all" />
                </div>
            </div>
        </button>
    );
}

// ── PLAYER VIEW ───────────────────────────────────────────────────────
function PlayerView({
    module, allModules, completedLessons, initialLesson,
    onBack, onLessonComplete,
}: {
    module: Module;
    allModules: Module[];
    completedLessons: Set<string>;
    initialLesson: Lesson | null;
    onBack: () => void;
    onLessonComplete: (lessonId: string) => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const plyrRef = useRef<any>(null);
    const lastSavedTimeRef = useRef<number>(0);
    const noteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [currentLesson, setCurrentLesson] = useState<Lesson | null>(initialLesson || module.lessons[0] || null);
    const [openModules, setOpenModules] = useState<string[]>([module.id]);
    const [showNextBanner, setShowNextBanner] = useState(false);
    const [nextLesson, setNextLesson] = useState<{ lesson: Lesson; module: Module } | null>(null);

    // Tabs state
    const [activeTab, setActiveTab] = useState<'resources' | 'notes' | 'comments'>('resources');
    const [resources, setResources] = useState<LessonResource[]>([]);
    const [noteText, setNoteText] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [comments, setComments] = useState<LessonComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [postingComment, setPostingComment] = useState(false);

    // Find next lesson across all modules
    useEffect(() => {
        if (!currentLesson) return;
        setShowNextBanner(false);

        const allLessons = allModules.flatMap(m => m.lessons.map(l => ({ lesson: l, module: m })));
        const currentIdx = allLessons.findIndex(x => x.lesson.id === currentLesson.id);
        setNextLesson(currentIdx >= 0 && currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null);
    }, [currentLesson, allModules]);

    useEffect(() => {
        if (!currentLesson?.video_url || !videoRef.current) return;

        const setupListeners = (player: any) => {
            player.off('timeupdate'); player.off('pause'); player.off('ended'); player.off('ready'); player.off('canplay');

            player.on('timeupdate', () => {
                const t = player.currentTime;
                if (Math.abs(t - lastSavedTimeRef.current) > 10) {
                    saveProgress(currentLesson.id, t, player.duration);
                    lastSavedTimeRef.current = t;
                }
            });
            player.on('pause', () => { saveProgress(currentLesson.id, player.currentTime, player.duration); });
            player.on('ended', () => {
                saveProgress(currentLesson.id, player.duration, player.duration);
                setShowNextBanner(true);
            });
            player.on('ready', () => { loadProgress(currentLesson.id); });
            player.on('canplay', () => { if (lastSavedTimeRef.current === 0) loadProgress(currentLesson.id); });
        };

        const initPlyr = () => {
            if (!(window as any).Plyr || !videoRef.current) return;
            if (plyrRef.current) {
                plyrRef.current.source = { type: 'video', sources: [{ src: currentLesson.video_url }] };
                setupListeners(plyrRef.current);
                return;
            }
            plyrRef.current = new (window as any).Plyr(videoRef.current, {
                controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen'],
                settings: ['speed'],
                speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
            });
            setupListeners(plyrRef.current);
        };

        lastSavedTimeRef.current = 0;

        if ((window as any).Plyr) initPlyr();
        else {
            const s = document.createElement('script');
            s.src = 'https://cdn.plyr.io/3.7.8/plyr.polyfilled.js';
            s.async = true;
            s.onload = initPlyr;
            document.head.appendChild(s);
        }
    }, [currentLesson]);

    useEffect(() => () => {
        if (plyrRef.current) { plyrRef.current.destroy(); plyrRef.current = null; }
        if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
    }, []);

    // Fetch lesson extras when lesson changes
    useEffect(() => {
        if (!currentLesson) return;
        setResources([]);
        setNoteText('');
        setComments([]);
        fetchResources(currentLesson.id);
        fetchNote(currentLesson.id);
        fetchComments(currentLesson.id);
    }, [currentLesson?.id]);

    const loadProgress = async (lessonId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('user_lessons_progress').select('last_time_seconds').eq('user_id', user.id).eq('lesson_id', lessonId).maybeSingle();
        if (data && plyrRef.current) { plyrRef.current.currentTime = data.last_time_seconds; lastSavedTimeRef.current = data.last_time_seconds; }
    };

    const saveProgress = async (lessonId: string, currentTime: number, duration: number) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || duration === 0) return;
        const percent = Math.round((currentTime / duration) * 100);
        const isCompleted = percent > 90;
        await supabase.from('user_lessons_progress').upsert({
            user_id: user.id, lesson_id: lessonId, last_time_seconds: currentTime,
            percent_completed: percent, is_completed: isCompleted, updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,lesson_id' });
        if (isCompleted) onLessonComplete(lessonId);
    };

    const fetchResources = async (lessonId: string) => {
        const { data } = await supabase.from('lesson_resources').select('id, title, url').eq('lesson_id', lessonId).order('display_order');
        setResources(data || []);
    };

    const fetchNote = async (lessonId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('lesson_notes').select('content').eq('user_id', user.id).eq('lesson_id', lessonId).maybeSingle();
        setNoteText(data?.content || '');
    };

    const handleNoteChange = (text: string) => {
        setNoteText(text);
        if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
        noteTimerRef.current = setTimeout(() => saveNote(text), 1500);
    };

    const saveNote = async (text: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !currentLesson) return;
        setSavingNote(true);
        await supabase.from('lesson_notes').upsert(
            { user_id: user.id, lesson_id: currentLesson.id, content: text, updated_at: new Date().toISOString() },
            { onConflict: 'user_id,lesson_id' }
        );
        setSavingNote(false);
    };

    const fetchComments = async (lessonId: string) => {
        const { data } = await supabase
            .from('lesson_comments')
            .select('id, user_id, content, created_at, profiles(full_name, email, role)')
            .eq('lesson_id', lessonId)
            .order('created_at');
        setComments((data as LessonComment[]) || []);
    };

    const postComment = async () => {
        if (!newComment.trim() || !currentLesson) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setPostingComment(true);
        await supabase.from('lesson_comments').insert({ user_id: user.id, lesson_id: currentLesson.id, content: newComment.trim() });
        setNewComment('');
        await fetchComments(currentLesson.id);
        setPostingComment(false);
    };

    const goToLesson = (lesson: Lesson) => {
        setCurrentLesson(lesson);
        setShowNextBanner(false);
        lastSavedTimeRef.current = 0;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const moduleProgress = module.lessons.filter(l => completedLessons.has(l.id)).length;

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">

            {/* ── Player Area ── */}
            <div className="flex-1 min-w-0 space-y-4">

                {/* Back button */}
                <button type="button" onClick={onBack}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#7c3aed] font-semibold transition-colors group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Voltar aos módulos
                </button>

                {/* Video */}
                <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative" onContextMenu={e => e.preventDefault()}>
                    {currentLesson?.video_url ? (
                        <video ref={videoRef} src={currentLesson.video_url} className="w-full h-full" playsInline onContextMenu={e => e.preventDefault()} />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-900">
                            <Lock className="w-10 h-10 mb-3 text-gray-600" />
                            <p className="font-medium text-gray-400">Vídeo não disponível</p>
                        </div>
                    )}

                    {/* Auto-next banner */}
                    {showNextBanner && nextLesson && (
                        <div className="absolute bottom-14 left-0 right-0 flex justify-center px-4">
                            <div className="bg-gray-950/95 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-2xl max-w-sm w-full">
                                <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">A seguir</p>
                                    <p className="text-white text-sm font-bold truncate">{nextLesson.lesson.title}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => { setOpenModules(prev => prev.includes(nextLesson.module.id) ? prev : [...prev, nextLesson.module.id]); goToLesson(nextLesson.lesson); }}
                                    className="shrink-0 flex items-center gap-1.5 bg-[#7c3aed] text-white px-3 py-1.5 rounded-xl text-xs font-black hover:bg-[#6d28d9] transition"
                                >
                                    Próxima <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Lesson info + Tabs */}
                {currentLesson && (
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        {/* Title + description */}
                        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                            <h2 className="text-xl font-black text-gray-900 mb-1">{currentLesson.title}</h2>
                            {currentLesson.description && (
                                <p className="text-gray-500 text-sm leading-relaxed">{currentLesson.description}</p>
                            )}
                            {currentLesson.highlights && currentLesson.highlights.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    {currentLesson.highlights.map((h, i) => (
                                        <span key={i} className="bg-[#7c3aed]/8 text-[#7c3aed] text-[11px] font-semibold px-2.5 py-1 rounded-full border border-[#7c3aed]/15">
                                            {h}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Tab nav */}
                        <div className="flex border-b border-gray-100">
                            {([
                                { key: 'resources', label: 'Materiais', icon: BookOpen },
                                { key: 'notes', label: 'Minhas Notas', icon: FileText },
                                { key: 'comments', label: 'Perguntas', icon: MessageSquare },
                            ] as const).map(tab => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
                                        activeTab === tab.key
                                            ? 'border-[#7c3aed] text-[#7c3aed]'
                                            : 'border-transparent text-gray-400 hover:text-gray-600'
                                    }`}
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                    {tab.key === 'comments' && comments.length > 0 && (
                                        <span className="ml-1 bg-gray-100 text-gray-500 text-[9px] font-black px-1.5 py-0.5 rounded-full">{comments.length}</span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Tab content */}
                        <div className="p-5">
                            {/* Resources */}
                            {activeTab === 'resources' && (
                                <div>
                                    {resources.length === 0 ? (
                                        <div className="text-center py-8">
                                            <BookOpen className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                            <p className="text-sm text-gray-400">Nenhum material disponível para esta aula.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {resources.map(r => (
                                                <a
                                                    key={r.id}
                                                    href={r.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#7c3aed]/30 hover:bg-[#7c3aed]/5 transition group"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-[#7c3aed]/10 flex items-center justify-center shrink-0">
                                                        <ExternalLink className="w-3.5 h-3.5 text-[#7c3aed]" />
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-700 group-hover:text-[#7c3aed] transition flex-1 truncate">{r.title}</span>
                                                    <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#7c3aed] shrink-0 transition" />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Notes */}
                            {activeTab === 'notes' && (
                                <div>
                                    <div className="relative">
                                        <textarea
                                            value={noteText}
                                            onChange={(e) => handleNoteChange(e.target.value)}
                                            placeholder="Escreva suas anotações sobre esta aula... (salvo automaticamente)"
                                            rows={8}
                                            className="w-full px-4 py-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed]/50 transition placeholder-gray-300"
                                        />
                                        {savingNote && (
                                            <div className="absolute bottom-3 right-3 flex items-center gap-1 text-[10px] text-gray-400">
                                                <Loader2 className="w-3 h-3 animate-spin" /> Salvando...
                                            </div>
                                        )}
                                        {!savingNote && noteText && (
                                            <div className="absolute bottom-3 right-3 text-[10px] text-emerald-500 font-bold">
                                                ✓ Salvo
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Comments */}
                            {activeTab === 'comments' && (
                                <div className="space-y-4">
                                    {/* Post new comment */}
                                    <div className="flex gap-2">
                                        <textarea
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postComment(); }}
                                            placeholder="Faça sua pergunta ou deixe um comentário... (Ctrl+Enter para enviar)"
                                            rows={2}
                                            className="flex-1 px-4 py-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed]/50 transition placeholder-gray-300"
                                        />
                                        <button
                                            type="button"
                                            onClick={postComment}
                                            disabled={postingComment || !newComment.trim()}
                                            className="shrink-0 w-10 h-10 self-end bg-[#7c3aed] text-white rounded-xl flex items-center justify-center hover:bg-[#6d28d9] disabled:opacity-40 transition"
                                        >
                                            {postingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {/* Comment thread */}
                                    {comments.length === 0 ? (
                                        <div className="text-center py-6">
                                            <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                                            <p className="text-sm text-gray-400">Seja o primeiro a comentar nesta aula.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {comments.map(c => {
                                                const isAdmin = c.profiles?.role === 'admin';
                                                return (
                                                <div key={c.id} className={`flex gap-3 ${isAdmin ? 'flex-row-reverse' : ''}`}>
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black ${isAdmin ? 'bg-[#7c3aed] text-white' : 'bg-[#7c3aed]/10 text-[#7c3aed]'}`}>
                                                        {(c.profiles?.full_name || c.profiles?.email || 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className={`flex-1 rounded-xl px-4 py-3 ${isAdmin ? 'bg-[#7c3aed]/5 border border-[#7c3aed]/15' : 'bg-gray-50'}`}>
                                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                            <span className={`text-xs font-bold ${isAdmin ? 'text-[#7c3aed]' : 'text-gray-700'}`}>
                                                                {c.profiles?.full_name || c.profiles?.email || 'Aluno'}
                                                            </span>
                                                            {isAdmin && (
                                                                <span className="text-[9px] font-black bg-[#7c3aed] text-white px-1.5 py-0.5 rounded-full uppercase tracking-wide">Admin</span>
                                                            )}
                                                            <span className="text-[10px] text-gray-400">
                                                                {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm text-gray-600 leading-relaxed">{c.content}</p>
                                                    </div>
                                                </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ── Sidebar ── */}
            <div className="w-full lg:w-72 shrink-0">
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden lg:sticky lg:top-4">

                    {/* Module header */}
                    <div className="p-4 border-b border-gray-100">
                        <p className="text-[10px] font-black text-[#7c3aed] uppercase tracking-[0.15em] mb-1">Módulo atual</p>
                        <h3 className="font-black text-gray-900 text-sm leading-snug">{module.title}</h3>
                        <div className="mt-2.5 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#7c3aed] rounded-full transition-all duration-700"
                                    style={{ width: `${module.lessons.length > 0 ? (moduleProgress / module.lessons.length) * 100 : 0}%` }} />
                            </div>
                            <span className="text-[10px] font-bold text-gray-500 shrink-0">{moduleProgress}/{module.lessons.length}</span>
                        </div>
                    </div>

                    {/* All modules accordion */}
                    <div className="max-h-[60vh] overflow-y-auto">
                        {allModules.map((m) => (
                            <div key={m.id} className="border-b border-gray-50 last:border-0">
                                <button type="button"
                                    onClick={() => setOpenModules(prev => prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id])}
                                    className={`w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition text-left ${m.id === module.id ? 'bg-[#7c3aed]/5' : ''}`}
                                >
                                    <span className={`font-bold text-xs ${m.id === module.id ? 'text-[#7c3aed]' : 'text-gray-700'}`}>{m.title}</span>
                                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${openModules.includes(m.id) ? 'rotate-180' : ''}`} />
                                </button>

                                {openModules.includes(m.id) && (
                                    <div className="bg-gray-50/50">
                                        {m.lessons.map(lesson => (
                                            <button type="button" key={lesson.id}
                                                onClick={() => goToLesson(lesson)}
                                                className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white transition text-left border-l-2 ${currentLesson?.id === lesson.id ? 'border-[#7c3aed] bg-white' : 'border-transparent'}`}
                                            >
                                                <div className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${currentLesson?.id === lesson.id ? 'bg-[#7c3aed] text-white' : completedLessons.has(lesson.id) ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                                    {completedLessons.has(lesson.id)
                                                        ? <CheckCircle className="w-3 h-3" />
                                                        : <Play className="w-2.5 h-2.5 fill-current" />}
                                                </div>
                                                <span className={`text-xs font-medium truncate leading-snug ${currentLesson?.id === lesson.id ? 'text-[#7c3aed] font-bold' : 'text-gray-600'}`}>
                                                    {lesson.title}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── MAIN ─────────────────────────────────────────────────────────────
export default function CourseViewer() {
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
    const [activeModule, setActiveModule] = useState<Module | null>(null);
    const [resumeLesson, setResumeLesson] = useState<Lesson | null>(null);

    const isLiveParam = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('live') === '1';

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        const [{ data: modulesData }, { data: lessonsData }] = await Promise.all([
            supabase.from('modules').select('*').order('display_order', { ascending: true }),
            supabase.from('lessons').select('*').order('display_order', { ascending: true }),
        ]);

        if (modulesData) {
            const structured: Module[] = modulesData.map((m: any) => ({
                ...m,
                description: m.description || '',
                thumbnail_url: m.thumbnail_url || '',
                is_featured: m.is_featured || false,
                lessons: lessonsData?.filter((l: Lesson) => l.module_id === m.id) || [],
            }));
            setModules(structured);

            // Auto-open live module if ?live=1
            if (isLiveParam) {
                const liveModule = structured.find(m => m.is_featured);
                if (liveModule) setActiveModule(liveModule);
            }

            if (user) {
                const [{ data: allProgress }, { data: lastProgress }] = await Promise.all([
                    supabase.from('user_lessons_progress').select('lesson_id, is_completed').eq('user_id', user.id),
                    supabase.from('user_lessons_progress').select('lesson_id').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1),
                ]);

                if (allProgress) {
                    setCompletedLessons(new Set(allProgress.filter(p => p.is_completed).map(p => p.lesson_id)));
                }

                // Find resume lesson
                if (lastProgress?.[0]) {
                    const allLessons = structured.flatMap(m => m.lessons);
                    const found = allLessons.find(l => l.id === lastProgress[0].lesson_id);
                    if (found) setResumeLesson(found);
                }
            }
        }
        setLoading(false);
    };

    const handleLessonComplete = (lessonId: string) => {
        setCompletedLessons(prev => new Set(prev).add(lessonId));
    };

    const totalLessons = modules.reduce((acc, m) => acc + m.lessons.length, 0);
    const totalCompleted = completedLessons.size;
    const overallProgress = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

    if (loading) return (
        <div className="space-y-6">
            <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {[...Array(3)].map((_, i) => <div key={i} className="h-64 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
            </div>
        </div>
    );

    if (modules.length === 0) return (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
            <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="font-black text-gray-700 text-lg">Conteúdo em breve</h3>
            <p className="text-gray-400 text-sm mt-1">As aulas estão sendo preparadas.</p>
        </div>
    );

    // Player mode
    if (activeModule) {
        return (
            <PlayerView
                module={activeModule}
                allModules={modules}
                completedLessons={completedLessons}
                initialLesson={resumeLesson?.module_id === activeModule.id ? resumeLesson : null}
                onBack={() => { setActiveModule(null); setResumeLesson(null); }}
                onLessonComplete={handleLessonComplete}
            />
        );
    }

    // Browse mode — module cards
    return (
        <div className="space-y-8 pb-8">

            {/* Progress hero */}
            <div className="relative bg-gray-950 rounded-2xl overflow-hidden p-7">
                <div className="absolute top-[-40px] right-[-40px] w-64 h-64 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)' }} />
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div>
                        <p className="text-[10px] font-black text-[#7c3aed] uppercase tracking-[0.18em] mb-2">Seu progresso</p>
                        <div className="flex items-end gap-3 mb-3">
                            <span className="text-4xl font-black text-white">{overallProgress}%</span>
                            <span className="text-gray-500 text-sm pb-1">{totalCompleted}/{totalLessons} aulas concluídas</span>
                        </div>
                        <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-1000"
                                style={{ width: `${overallProgress}%`, background: 'linear-gradient(90deg, #7c3aed, #60a5fa)' }} />
                        </div>
                    </div>

                    {/* Resume CTA */}
                    {resumeLesson && (
                        <button type="button"
                            onClick={() => {
                                const mod = modules.find(m => m.id === resumeLesson.module_id);
                                if (mod) setActiveModule(mod);
                            }}
                            className="shrink-0 flex items-center gap-2.5 bg-white text-gray-900 px-5 py-3 rounded-2xl font-black text-sm hover:bg-gray-100 transition shadow-lg"
                        >
                            <Play className="w-4 h-4 fill-[#7c3aed] text-[#7c3aed]" />
                            <div className="text-left">
                                <p className="text-[9px] text-gray-400 uppercase tracking-widest font-bold leading-none mb-0.5">Continuar</p>
                                <p className="truncate max-w-[160px]">{resumeLesson.title}</p>
                            </div>
                        </button>
                    )}

                    {overallProgress === 100 && (
                        <div className="flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-2xl">
                            <Trophy className="w-5 h-5" />
                            <span className="font-black text-sm">Academy Completo!</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Academy — módulos regulares */}
            {(() => {
                const regular = modules.filter(m => !m.is_featured);
                return (
                    <div>
                        <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] mb-4 flex items-center gap-2">
                            <GraduationCap className="w-3.5 h-3.5" />
                            Academy · {regular.length} {regular.length === 1 ? 'módulo' : 'módulos'}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                            {regular.map((module, i) => (
                                <ModuleCard
                                    key={module.id}
                                    module={module}
                                    index={i}
                                    completedCount={module.lessons.filter(l => completedLessons.has(l.id)).length}
                                    onEnter={() => setActiveModule(module)}
                                />
                            ))}
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
