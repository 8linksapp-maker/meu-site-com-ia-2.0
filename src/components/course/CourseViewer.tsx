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

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (currentLesson?.video_url && videoRef.current) {
            const initPlyr = () => {
                if ((window as any).Plyr && videoRef.current) {
                    // Evitar múltiplas instâncias no mesmo elemento
                    if (plyrRef.current) {
                        plyrRef.current.source = {
                            type: 'video',
                            sources: [{ src: currentLesson.video_url }]
                        };
                        plyrRef.current.play(); // Tentar iniciar automaticamente se quiser
                        return;
                    }

                    plyrRef.current = new (window as any).Plyr(videoRef.current, {
                        controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen'],
                        settings: ['speed'],
                        speed: { selected: 1, options: [0.5, 0.75, 1, 1.25, 1.5, 2] },
                        download: { enabled: false }
                    });
                }
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

        return () => {
            // Não destruir a cada troca, apenas no unmount total ou se necessário
            // Mas se o link mudar e quisermos recriar, poderíamos.
            // Aqui vamos manter para teste.
        };
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

            // Set first lesson as default if available
            if (structuredData.length > 0 && structuredData[0].lessons.length > 0) {
                setCurrentLesson(structuredData[0].lessons[0]);
                setOpenModules([structuredData[0].id]);
            }
        }
        setLoading(false);
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
                                                    : 'bg-gray-200 text-gray-500'
                                                    }`}>
                                                    <Play className="w-3 h-3 fill-current" />
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
