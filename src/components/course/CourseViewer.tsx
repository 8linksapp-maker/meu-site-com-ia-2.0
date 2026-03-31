import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Play, CheckCircle, ChevronRight, Lock } from 'lucide-react';

interface Lesson {
    id: string;
    module_id: string;
    title: string;
    description: string;
    video_url: string;
    display_order: number;
}

interface Module {
    id: string;
    title: string;
    display_order: number;
    lessons: Lesson[];
}

export default function CourseViewer() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const plyrRef = useRef<any>(null);
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
    const [openModules, setOpenModules] = useState<string[]>([]);
    const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
    const lastSavedTimeRef = useRef<number>(0);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (currentLesson?.video_url && videoRef.current) {
            const setupListeners = (player: any) => {
                player.off('timeupdate');
                player.off('pause');
                player.off('ended');
                player.off('ready');

                player.on('timeupdate', () => {
                    const currentTime = player.currentTime;
                    if (Math.abs(currentTime - lastSavedTimeRef.current) > 10) {
                        saveProgress(currentLesson.id, currentTime, player.duration);
                        lastSavedTimeRef.current = currentTime;
                    }
                });

                player.on('pause', () => {
                    saveProgress(currentLesson.id, player.currentTime, player.duration);
                    lastSavedTimeRef.current = player.currentTime;
                });

                player.on('ended', () => {
                    saveProgress(currentLesson.id, player.duration, player.duration);
                });

                player.on('ready', () => {
                    loadLessonProgress(currentLesson.id);
                });

                // Garantir que o seek aconteça quando o vídeo puder tocar
                player.on('canplay', () => {
                    if (lastSavedTimeRef.current === 0) {
                        loadLessonProgress(currentLesson.id);
                    }
                });
            };

            const initPlyr = () => {
                if (!(window as any).Plyr || !videoRef.current) return;

                if (plyrRef.current) {
                    plyrRef.current.source = {
                        type: 'video',
                        sources: [{ src: currentLesson.video_url }]
                    };
                    setupListeners(plyrRef.current);
                    return;
                }

                plyrRef.current = new (window as any).Plyr(videoRef.current, {
                    controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen'],
                    settings: ['speed'],
                    speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
                    download: { enabled: false }
                });

                setupListeners(plyrRef.current);
            };

            if ((window as any).Plyr) {
                initPlyr();
            } else {
                const script = document.createElement('script');
                script.src = "https://cdn.plyr.io/3.7.8/plyr.polyfilled.js";
                script.async = true;
                script.onload = initPlyr;
                document.head.appendChild(script);
            }
        }
    }, [currentLesson]);

    // Cleanup final ao desmontar o componente
    useEffect(() => {
        return () => {
            if (plyrRef.current) {
                plyrRef.current.destroy();
                plyrRef.current = null;
            }
        };
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        const { data: modulesData } = await supabase
            .from('modules')
            .select('*')
            .order('display_order', { ascending: true });

        const { data: lessonsData } = await supabase
            .from('lessons')
            .select('*')
            .order('display_order', { ascending: true });

        if (modulesData) {
            const structuredData = modulesData.map((m: any) => ({
                ...m,
                lessons: lessonsData?.filter((l: Lesson) => l.module_id === m.id) || []
            }));
            setModules(structuredData);

            // Carregar última aula assistida ou a primeira
            let lessonToSet = null;
            if (user) {
                const { data: allProgress } = await supabase
                    .from('user_lessons_progress')
                    .select('lesson_id, is_completed')
                    .eq('user_id', user.id);

                if (allProgress) {
                    const completedIds = new Set(allProgress.filter(p => p.is_completed).map(p => p.lesson_id));
                    setCompletedLessons(completedIds);
                }

                const { data: progress } = await supabase
                    .from('user_lessons_progress')
                    .select('lesson_id')
                    .eq('user_id', user.id)
                    .order('updated_at', { ascending: false })
                    .limit(1)
                    .single();

                if (progress) {
                    lessonToSet = lessonsData?.find(l => l.id === progress.lesson_id) || null;
                }
            }

            if (!lessonToSet && structuredData.length > 0 && structuredData[0].lessons.length > 0) {
                lessonToSet = structuredData[0].lessons[0];
            }

            if (lessonToSet) {
                setCurrentLesson(lessonToSet);
                setOpenModules([lessonToSet.module_id]);
                // loadLessonProgress será chamado pelo evento 'ready' do player
            }
        }
        setLoading(false);
    };

    const loadLessonProgress = async (lessonId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('user_lessons_progress')
            .select('last_time_seconds')
            .eq('user_id', user.id)
            .eq('lesson_id', lessonId)
            .single();

        if (data && plyrRef.current) {
            console.log('[LMS] Retomando de:', data.last_time_seconds, 's');
            plyrRef.current.currentTime = data.last_time_seconds;
            lastSavedTimeRef.current = data.last_time_seconds;
        }
    };

    const saveProgress = async (lessonId: string, currentTime: number, duration: number) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || duration === 0) return;

        const percent = Math.round((currentTime / duration) * 100);
        const isCompleted = percent > 90;

        const { error } = await supabase.from('user_lessons_progress').upsert({
            user_id: user.id,
            lesson_id: lessonId,
            last_time_seconds: currentTime,
            percent_completed: percent,
            is_completed: isCompleted,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,lesson_id' });

        if (error) {
            console.error('[LMS] Erro ao salvar progresso:', error.message);
        } else {
            console.log('[LMS] Progresso salvo:', percent, '%');
            if (isCompleted) {
                setCompletedLessons(prev => new Set(prev).add(lessonId));
            }
        }
    };


    const toggleModule = (moduleId: string) => {
        setOpenModules(prev =>
            prev.includes(moduleId)
                ? prev.filter(id => id !== moduleId)
                : [...prev, moduleId]
        );
    };

    if (loading) return (
        <div className="flex items-center justify-center h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7c3aed]"></div>
        </div>
    );

    if (modules.length === 0) return (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhuma aula disponível</h3>
            <p className="text-gray-500">O conteúdo do curso ainda está sendo preparado.</p>
        </div>
    );

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-full">
            {/* Player Area */}
            <div className="flex-1 space-y-6">
                {currentLesson ? (
                    <div className="space-y-6">
                        <div className="aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative" onContextMenu={(e) => e.preventDefault()}>
                            {currentLesson.video_url ? (
                                <video
                                    ref={videoRef}
                                    src={currentLesson.video_url}
                                    className="w-full h-full"
                                    playsInline
                                    onContextMenu={(e) => e.preventDefault()}
                                ></video>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-gray-900">
                                    <Lock className="w-12 h-12 mb-4 text-gray-600" />
                                    <p className="font-medium">Vídeo não disponível ou em processamento.</p>
                                </div>
                            )}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentLesson.title}</h2>
                            <p className="text-gray-600 leading-relaxed">{currentLesson.description}</p>
                        </div>
                    </div>
                ) : (
                    <div className="aspect-video bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400">
                        Selecione uma aula para começar a assistir
                    </div>
                )}
            </div>

            {/* Sidebar List */}
            <div className="w-full lg:w-80 shrink-0">
                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden sticky top-8">
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                        <h3 className="font-bold text-gray-900">Conteúdo do Curso</h3>
                    </div>
                    <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
                        {modules.map((module) => (
                            <div key={module.id} className="border-b border-gray-50 last:border-0">
                                <button
                                    onClick={() => toggleModule(module.id)}
                                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition text-left"
                                >
                                    <span className="font-bold text-sm text-gray-800">{module.title}</span>
                                    < ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${openModules.includes(module.id) ? 'rotate-90' : ''}`} />
                                </button>

                                {openModules.includes(module.id) && (
                                    <div className="bg-gray-50/50 pb-2">
                                        {module.lessons.map((lesson) => (
                                            <button
                                                key={lesson.id}
                                                onClick={() => setCurrentLesson(lesson)}
                                                className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-white transition text-left border-l-4 ${currentLesson?.id === lesson.id
                                                    ? 'border-[#7c3aed] bg-white text-[#7c3aed]'
                                                    : 'border-transparent text-gray-600'
                                                    }`}
                                            >
                                                <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${currentLesson?.id === lesson.id
                                                    ? 'bg-[#7c3aed] text-white'
                                                    : completedLessons.has(lesson.id)
                                                        ? 'bg-emerald-500 text-white'
                                                        : 'bg-gray-200 text-gray-500'
                                                    }`}>
                                                    {completedLessons.has(lesson.id) ? (
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                    ) : (
                                                        <Play className="w-3 h-3 fill-current" />
                                                    )}
                                                </div>
                                                <span className={`text-xs font-medium truncate ${currentLesson?.id === lesson.id ? 'text-[#7c3aed]' : ''}`}>
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
