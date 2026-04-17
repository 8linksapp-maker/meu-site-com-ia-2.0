import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Play, CheckCircle, ChevronRight, Lock, ArrowLeft, GraduationCap, ChevronDown, Trophy, FileText, MessageSquare, ExternalLink, Send, Loader2, BookOpen, Radio, Calendar } from 'lucide-react';

interface Course {
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    release_at: string | null;
}

interface UserCourse {
    course_id: string;
    expires_at: string | null;
}

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
    course_id: string;
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

// Omitindo a maioria dos sub-components inalterados (LiveModuleCard, ModuleCard, PlayerView).
// Para preservar a exatidão, eles são mantidos com base no arquivo original, ajustando ref e props.

function ModuleCard({ module, index, completedCount, onEnter, }: { module: Module; index: number; completedCount: number; onEnter: () => void; }) {
    const total = module.lessons.length;
    const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0;
    const isComplete = completedCount === total && total > 0;
    const gradient = MODULE_GRADIENTS[index % MODULE_GRADIENTS.length];

    return (
        <button type="button" onClick={onEnter} className="group text-left bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-2xl hover:border-[#7c3aed]/20 transition-all duration-300 hover:-translate-y-1 flex flex-col">
            <div className="relative aspect-video overflow-hidden">
                {module.thumbnail_url ? (
                    <img src={module.thumbnail_url} alt={module.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}><span className="text-white/20 font-black text-7xl">{index + 1}</span></div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                    <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition shadow-2xl"><Play className="w-6 h-6 text-white fill-white ml-1" /></div>
                </div>
                <div className="absolute top-3 left-3"><span className="px-2.5 py-1 bg-black/50 backdrop-blur-sm text-white text-[10px] font-black rounded-lg border border-white/10 uppercase tracking-wider">Módulo {index + 1}</span></div>
                {isComplete && <div className="absolute top-3 right-3"><span className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500 text-white text-[10px] font-black rounded-lg shadow-lg"><CheckCircle className="w-3 h-3" /> Concluído</span></div>}
                {progress > 0 && !isComplete && <div className="absolute bottom-0 inset-x-0 h-1 bg-black/30"><div className="h-full bg-[#7c3aed] transition-all duration-700" style={{ width: `${progress}%` }} /></div>}
            </div>
            <div className="p-5 flex flex-col flex-1">
                <h3 className="font-black text-gray-900 text-sm leading-snug mb-1.5 group-hover:text-[#7c3aed] transition-colors">{module.title}</h3>
                {module.description && <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">{module.description}</p>}
                <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                        <Play className="w-3 h-3" /> {total} {total === 1 ? 'aula' : 'aulas'} {completedCount > 0 && !isComplete && <span className="text-[#7c3aed] font-bold">· {completedCount} feitas</span>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#7c3aed] group-hover:translate-x-0.5 transition-all" />
                </div>
            </div>
        </button>
    );
}

// ── PLAYER VIEW ───────────────────────────────────────────────────────
// IDÊNTICO AO CÓDIGO ORIGINAL, APENAS COPIADO POR COMPLETO AQUI.
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
    const progressLoadedRef = useRef<string | null>(null); // ID da lesson cujo progresso já foi carregado
    const noteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [currentLesson, setCurrentLesson] = useState<Lesson | null>(initialLesson || module.lessons[0] || null);
    const [openModules, setOpenModules] = useState<string[]>([module.id]);
    const [showNextBanner, setShowNextBanner] = useState(false);
    const [nextLesson, setNextLesson] = useState<{ lesson: Lesson; module: Module } | null>(null);

    const [activeTab, setActiveTab] = useState<'resources' | 'notes' | 'comments'>('resources');
    const [resources, setResources] = useState<LessonResource[]>([]);
    const [noteText, setNoteText] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [comments, setComments] = useState<LessonComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [postingComment, setPostingComment] = useState(false);

    useEffect(() => {
        if (!currentLesson) return;
        setShowNextBanner(false);
        const allLessons = allModules.flatMap(m => m.lessons.map(l => ({ lesson: l, module: m })));
        const currentIdx = allLessons.findIndex(x => x.lesson.id === currentLesson.id);
        setNextLesson(currentIdx >= 0 && currentIdx < allLessons.length - 1 ? allLessons[currentIdx + 1] : null);
    }, [currentLesson, allModules]);

    useEffect(() => {
        if (!currentLesson?.video_url || !videoRef.current) return;
        const lessonId = currentLesson.id;
        progressLoadedRef.current = null; // reset para nova lesson

        const setupListeners = (player: any) => {
            player.off('timeupdate'); player.off('pause'); player.off('ended'); player.off('canplay'); player.off('loadedmetadata');
            player.on('timeupdate', () => {
                const t = player.currentTime;
                const d = player.duration;
                if (d > 0 && Math.abs(t - lastSavedTimeRef.current) > 10) { saveProgress(lessonId, t, d); lastSavedTimeRef.current = t; }
            });
            player.on('pause', () => { if (player.duration > 0) saveProgress(lessonId, player.currentTime, player.duration); });
            player.on('ended', () => { saveProgress(lessonId, player.duration, player.duration); setShowNextBanner(true); });
            // Carrega progresso apenas 1x por lesson, após metadata (duration disponível)
            player.on('loadedmetadata', () => {
                if (progressLoadedRef.current !== lessonId && player.duration > 0) {
                    progressLoadedRef.current = lessonId;
                    loadProgress(lessonId);
                }
            });
            // Fallback: se loadedmetadata não disparar (streaming), tenta no canplay
            player.on('canplay', () => {
                if (progressLoadedRef.current !== lessonId && player.duration > 0) {
                    progressLoadedRef.current = lessonId;
                    loadProgress(lessonId);
                }
            });
        };

        const initPlyr = () => {
            if (!(window as any).Plyr || !videoRef.current) return;
            if (plyrRef.current) {
                plyrRef.current.source = { type: 'video', sources: [{ src: currentLesson.video_url }] };
                setupListeners(plyrRef.current);
                return;
            }
            plyrRef.current = new (window as any).Plyr(videoRef.current, { controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen'], settings: ['speed'], speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] } });
            setupListeners(plyrRef.current);
        };
        lastSavedTimeRef.current = 0;
        if ((window as any).Plyr) initPlyr();
        else { const s = document.createElement('script'); s.src = 'https://cdn.plyr.io/3.7.8/plyr.polyfilled.js'; s.async = true; s.onload = initPlyr; document.head.appendChild(s); }
    }, [currentLesson]);

    useEffect(() => () => {
        if (plyrRef.current) { plyrRef.current.destroy(); plyrRef.current = null; }
        if (noteTimerRef.current) clearTimeout(noteTimerRef.current);
    }, []);

    useEffect(() => {
        if (!currentLesson) return;
        setResources([]); setNoteText(''); setComments([]);
        fetchResources(currentLesson.id); fetchNote(currentLesson.id); fetchComments(currentLesson.id);
    }, [currentLesson?.id]);

    const loadProgress = async (lessonId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('user_lessons_progress').select('last_time_seconds').eq('user_id', user.id).eq('lesson_id', lessonId).maybeSingle();
        if (data && plyrRef.current) {
            const saved = data.last_time_seconds;
            const duration = plyrRef.current.duration;
            // Só restaura se duration é válido e posição salva não está no final (>95%)
            if (duration > 0 && saved < duration * 0.95) {
                plyrRef.current.currentTime = saved;
                lastSavedTimeRef.current = saved;
            } else {
                // Se já assistiu >95%, recomeça do início
                plyrRef.current.currentTime = 0;
                lastSavedTimeRef.current = 0;
            }
        }
    };

    const saveProgress = async (lessonId: string, currentTime: number, duration: number) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || duration === 0) return;
        const percent = Math.round((currentTime / duration) * 100);
        const isCompleted = percent > 90;

        // Nunca desmarca uma aula já concluída (evita perder progresso ao retomar)
        const alreadyCompleted = completedLessons.has(lessonId);
        const finalCompleted = alreadyCompleted || isCompleted;
        const finalPercent = alreadyCompleted ? Math.max(percent, 100) : percent;

        await supabase.from('user_lessons_progress').upsert({
            user_id: user.id, lesson_id: lessonId,
            last_time_seconds: currentTime,
            percent_completed: finalPercent,
            is_completed: finalCompleted,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,lesson_id' });
        if (finalCompleted) onLessonComplete(lessonId);
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
        const { error } = await supabase.from('lesson_notes').upsert({ user_id: user.id, lesson_id: currentLesson.id, content: text, updated_at: new Date().toISOString() }, { onConflict: 'user_id,lesson_id' });
        setSavingNote(false);
        if (error) console.error('Erro ao salvar nota:', error.message);
    };
    const fetchComments = async (lessonId: string) => {
        const { data } = await supabase.from('lesson_comments').select('id, user_id, content, created_at, profiles(full_name, email, role)').eq('lesson_id', lessonId).order('created_at');
        setComments((data as LessonComment[]) || []);
    };
    const postComment = async () => {
        if (!newComment.trim() || !currentLesson) return;
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setPostingComment(true);
        const { error } = await supabase.from('lesson_comments').insert({ user_id: user.id, lesson_id: currentLesson.id, content: newComment.trim() });
        if (error) {
            console.error('Erro ao postar comentário:', error.message);
            setPostingComment(false);
            return;
        }
        setNewComment('');
        await fetchComments(currentLesson.id);
        setPostingComment(false);
    };

    const goToLesson = (lesson: Lesson) => {
        setCurrentLesson(lesson); setShowNextBanner(false); lastSavedTimeRef.current = 0; window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const moduleProgress = module.lessons.filter(l => completedLessons.has(l.id)).length;

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className="flex-1 min-w-0 space-y-4">
                <button type="button" onClick={onBack} className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#7c3aed] font-semibold transition-colors group">
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Voltar aos módulos
                </button>
                <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative" onContextMenu={e => e.preventDefault()}>
                    {currentLesson?.video_url ? (
                        <video ref={videoRef} src={currentLesson.video_url} className="w-full h-full" playsInline onContextMenu={e => e.preventDefault()} />
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-900"><Lock className="w-10 h-10 mb-3 text-gray-600" /><p className="font-medium text-gray-400">Vídeo não disponível</p></div>
                    )}
                    {showNextBanner && nextLesson && (
                        <div className="absolute bottom-14 left-0 right-0 flex justify-center px-4">
                            <div className="bg-gray-950/95 backdrop-blur-sm border border-white/10 rounded-2xl p-4 flex items-center gap-4 shadow-2xl max-w-sm w-full"><CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" /><div className="flex-1 min-w-0"><p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">A seguir</p><p className="text-white text-sm font-bold truncate">{nextLesson.lesson.title}</p></div><button type="button" onClick={() => { setOpenModules(prev => prev.includes(nextLesson.module.id) ? prev : [...prev, nextLesson.module.id]); goToLesson(nextLesson.lesson); }} className="shrink-0 flex items-center gap-1.5 bg-[#7c3aed] text-white px-3 py-1.5 rounded-xl text-xs font-black hover:bg-[#6d28d9] transition">Próxima <ChevronRight className="w-3.5 h-3.5" /></button></div>
                        </div>
                    )}
                </div>
                {currentLesson && (
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                        <div className="px-5 pt-5 pb-4 border-b border-gray-100">
                            <h2 className="text-xl font-black text-gray-900 mb-1">{currentLesson.title}</h2>
                            {currentLesson.description && <p className="text-gray-500 text-sm leading-relaxed">{currentLesson.description}</p>}
                            {currentLesson.highlights && currentLesson.highlights.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {currentLesson.highlights.map((h, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded-lg border border-purple-100">
                                            <span className="text-purple-400">•</span> {h}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex border-b border-gray-100">
                            {([{ key: 'resources', label: 'Materiais', icon: BookOpen }, { key: 'notes', label: 'Minhas Notas', icon: FileText }, { key: 'comments', label: 'Perguntas', icon: MessageSquare }] as const).map(tab => (
                                <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${activeTab === tab.key ? 'border-[#7c3aed] text-[#7c3aed]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                                    <tab.icon className="w-3.5 h-3.5" />{tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="p-5">
                            {activeTab === 'resources' && (
                                <div>{resources.length === 0 ? <p className="text-sm text-gray-400">Nenhum material.</p> : resources.map(r => <a key={r.id} href={r.url} target="_blank" className="flex items-center gap-2 p-2 border my-1 bg-gray-50 text-sm">{r.title}</a>)}</div>
                            )}
                            {activeTab === 'notes' && (
                                <textarea value={noteText} onChange={e => handleNoteChange(e.target.value)} placeholder="Escreva..." rows={8} className="w-full p-3 border rounded text-sm outline-none" />
                            )}
                            {activeTab === 'comments' && (
                                <div className="space-y-4">
                                    <div className="flex gap-2"><textarea value={newComment} onChange={e => setNewComment(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) postComment(); }} placeholder="Pergunta (Ctrl+Enter)..." className="flex-1 border p-2 text-sm rounded" /><button onClick={postComment} disabled={!newComment} className="bg-purple-600 text-white px-3"><Send className="w-4 h-4" /></button></div>
                                    {comments.map(c => <div key={c.id} className="p-3 border rounded"><p className="text-xs text-gray-500 mb-1">{c.profiles?.full_name}</p><p className="text-sm">{c.content}</p></div>)}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="w-full lg:w-72 shrink-0">
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden lg:sticky lg:top-4">
                    <div className="p-4 border-b border-gray-100">
                        <p className="text-[10px] font-black text-[#7c3aed] uppercase tracking-[0.15em] mb-1">Módulo atual</p>
                        <h3 className="font-black text-gray-900 text-sm leading-snug">{module.title}</h3>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                        {allModules.map(m => (
                            <div key={m.id} className="border-b border-gray-50">
                                <button type="button" onClick={() => setOpenModules(p => p.includes(m.id) ? p.filter(id => id !== m.id) : [...p, m.id])} className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold">
                                    {m.title} <ChevronDown className={`w-3.5 h-3.5 ${openModules.includes(m.id) ? 'rotate-180' : ''}`} />
                                </button>
                                {openModules.includes(m.id) && <div className="bg-gray-50/50">{m.lessons.map(lesson => (
                                    <button key={lesson.id} onClick={() => goToLesson(lesson)} className={`w-full px-4 py-2.5 flex items-center gap-3 hover:bg-white text-left ${currentLesson?.id === lesson.id ? 'border-[#7c3aed] bg-white' : ''}`}>
                                        <div className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center ${completedLessons.has(lesson.id) ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                        <span className="text-xs truncate">{lesson.title}</span>
                                    </button>
                                ))}</div>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── MAIN APPLICATION HIERARCHY ────────────────────────────────────────

export default function CourseViewer() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [userCourses, setUserCourses] = useState<UserCourse[]>([]);
    const [modules, setModules] = useState<Module[]>([]);

    // States
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [activeModule, setActiveModule] = useState<Module | null>(null);
    const [resumeLesson, setResumeLesson] = useState<Lesson | null>(null);
    const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());

    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        // Download everything for seamless navigation
        const [
            { data: coursesData },
            { data: modulesData },
            { data: lessonsData }
        ] = await Promise.all([
            supabase.from('courses').select('*').order('created_at', { ascending: true }),
            supabase.from('modules').select('*').order('display_order', { ascending: true }),
            supabase.from('lessons').select('*').order('display_order', { ascending: true }),
        ]);

        if (coursesData) {
            setCourses(coursesData);
        }

        if (modulesData) {
            const structured: Module[] = modulesData.map((m: any) => ({
                ...m,
                lessons: lessonsData?.filter((l: Lesson) => l.module_id === m.id) || [],
            }));
            setModules(structured);
        }

        if (user) {
            const [
                { data: userCoursesData },
                { data: allProgress },
                { data: lastProgress }
            ] = await Promise.all([
                supabase.from('user_courses').select('course_id, expires_at').eq('user_id', user.id),
                supabase.from('user_lessons_progress').select('lesson_id, is_completed').eq('user_id', user.id),
                supabase.from('user_lessons_progress').select('lesson_id').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(1),
            ]);

            if (userCoursesData) {
                setUserCourses(userCoursesData);
            }

            if (allProgress) {
                setCompletedLessons(new Set(allProgress.filter(p => p.is_completed).map(p => p.lesson_id)));
            }

            if (lastProgress?.[0] && modulesData) {
                // Find where the user was globally to possibly highlight inside their course later
                const allLessons = (lessonsData as Lesson[]) || [];
                const found = allLessons.find(l => l.id === lastProgress[0].lesson_id);
                if (found) setResumeLesson(found);
            }
        }

        setLoading(false);
    };

    const handleLessonComplete = (lessonId: string) => {
        setCompletedLessons(prev => new Set(prev).add(lessonId));
    };

    if (loading) return (
        <div className="space-y-6">
            <div className="h-28 bg-gray-100 rounded-2xl animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {[...Array(3)].map((_, i) => <div key={i} className="h-64 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
            </div>
        </div>
    );

    // MODE 3: LESSON PLAYER
    if (activeModule && selectedCourse) {
        return (
            <PlayerView
                module={activeModule}
                allModules={modules.filter(m => m.course_id === selectedCourse.id)}
                completedLessons={completedLessons}
                initialLesson={resumeLesson?.module_id === activeModule.id ? resumeLesson : null}
                onBack={() => { setActiveModule(null); setResumeLesson(null); }}
                onLessonComplete={handleLessonComplete}
            />
        );
    }

    // MODE 2: SPECIFIC COURSE BROWSE (Modules list)
    if (selectedCourse) {
        const courseModules = modules.filter(m => m.course_id === selectedCourse.id);
        const totalLessons = courseModules.reduce((acc, m) => acc + m.lessons.length, 0);
        const totalCompleted = Array.from(completedLessons).filter(lId => courseModules.some(m => m.lessons.some(l => l.id === lId))).length;
        const overallProgress = totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

        return (
            <div className="space-y-6 pb-8">
                <button
                    onClick={() => setSelectedCourse(null)}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#7c3aed] font-semibold transition-colors mt-2 mb-4 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                    Voltar para Cursos
                </button>

                {/* Progress hero for this course */}
                <div className="relative bg-gray-950 rounded-2xl overflow-hidden p-7 shadow-xl">
                    <div className="absolute top-[-40px] right-[-40px] w-64 h-64 rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)' }} />
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                        <div className="flex-1">
                            <h2 className="text-2xl font-black text-white mb-2">{selectedCourse.title}</h2>
                            <div className="flex items-end gap-3 mb-3 mt-4">
                                <span className="text-4xl font-black text-white">{overallProgress}%</span>
                                <span className="text-gray-500 text-sm pb-1">{totalCompleted}/{totalLessons} aulas concluídas</span>
                            </div>
                            <div className="w-64 h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${overallProgress}%`, background: 'linear-gradient(90deg, #7c3aed, #60a5fa)' }} />
                            </div>
                        </div>
                    </div>
                </div>

                {courseModules.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                        <GraduationCap className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">Este curso ainda não possui módulos.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {courseModules.map((module, i) => {
                            const completedCount = module.lessons.filter(l => completedLessons.has(l.id)).length;
                            return (
                                <ModuleCard
                                    key={module.id}
                                    index={i}
                                    module={module}
                                    completedCount={completedCount}
                                    onEnter={() => setActiveModule(module)}
                                />
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    // MODE 1: ROOT COURSES GALLERY
    return (
        <div className="space-y-8 pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
                {courses.map(course => {
                    const access = userCourses.find(uc => uc.course_id === course.id);
                    const isDateLocked = course.release_at && new Date(course.release_at) > new Date();
                    const isLocked = !access || isDateLocked;

                    return (
                        <div
                            key={course.id}
                            onClick={() => !isLocked && setSelectedCourse(course)}
                            className={`relative bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col group ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer hover:border-[#7c3aed] hover:shadow-xl hover:-translate-y-1 transition-all duration-300'}`}
                        >
                            <div className="h-48 bg-gray-100 relative overflow-hidden">
                                {course.thumbnail_url ? (
                                    <img src={course.thumbnail_url} className={`w-full h-full object-cover transition-transform duration-700 ${isLocked ? 'grayscale opacity-60' : 'group-hover:scale-105'}`} />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-800">
                                        <BookOpen className="w-16 h-16 text-white/30" />
                                    </div>
                                )}

                                {isLocked && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center flex-col p-4 text-center">
                                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-full shadow-2xl border border-white/20 mb-3">
                                            <Lock className="w-8 h-8 text-white" />
                                        </div>
                                        {isDateLocked && (
                                            <div className="text-white">
                                                <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Liberação em</p>
                                                <p className="text-sm font-bold bg-[#7c3aed] px-3 py-1 rounded-lg shadow-lg">
                                                    {new Date(course.release_at!).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="p-6 flex-1 flex flex-col justify-between">
                                <div>
                                    <h4 className="font-extrabold text-gray-900 text-lg mb-2 line-clamp-2 leading-tight">
                                        {course.title}
                                    </h4>
                                    <p className="text-sm text-gray-500 line-clamp-3 mb-4">
                                        {course.description || "Nenhuma descrição fornecida."}
                                    </p>
                                </div>

                                <div className="mt-auto">
                                    {isLocked ? (
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2 text-red-500 bg-red-50 px-4 py-2 rounded-xl text-sm font-bold justify-center">
                                                <Lock className="w-4 h-4" /> {isDateLocked ? 'Lançamento em Breve' : 'Acesso Restrito'}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-white bg-[#7c3aed] group-hover:bg-[#6d28d9] px-4 py-3 rounded-xl text-sm font-bold justify-center transition-colors">
                                            <Play className="w-4 h-4 fill-white" /> Acessar Curso
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {courses.length === 0 && (
                    <div className="col-span-full py-20 text-center text-gray-500">
                        <p>Nenhum curso disponível na vitrine ainda.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
