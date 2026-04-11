import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Edit2, Video, ChevronDown, ChevronUp, GripVertical, CheckCircle, Link as LinkIcon, X, ArrowLeft, BookOpen, Lock, Sparkles, FolderOpen, Search, UploadCloud, RefreshCw } from 'lucide-react';

interface Course {
    id: string;
    title: string;
    description: string;
    thumbnail_url: string;
    kiwify_product_ids: string[];
    release_at: string | null;
    created_at?: string;
    modules?: Module[];
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
    lessons?: Lesson[];
}

export default function CourseManager() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [loading, setLoading] = useState(true);

    const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
    const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);

    const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
    const [currentModule, setCurrentModule] = useState<Module | null>(null);
    const [currentLesson, setCurrentLesson] = useState<Partial<Lesson> | null>(null);

    // Course State
    const [courseTitle, setCourseTitle] = useState('');
    const [courseDescription, setCourseDescription] = useState('');
    const [courseThumbnail, setCourseThumbnail] = useState('');
    const [courseKiwifyIds, setCourseKiwifyIds] = useState('');
    const [courseReleaseAt, setCourseReleaseAt] = useState('');
    const [uploadingCourseThumb, setUploadingCourseThumb] = useState(false);

    // Module/Lesson State
    const [moduleTitle, setModuleTitle] = useState('');
    const [moduleDescription, setModuleDescription] = useState('');
    const [moduleThumbnail, setModuleThumbnail] = useState('');
    const [lessonTitle, setLessonTitle] = useState('');
    const [lessonDescription, setLessonDescription] = useState('');
    const [lessonVideoUrl, setLessonVideoUrl] = useState('');
    const [selectedModuleId, setSelectedModuleId] = useState('');

    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadingModuleThumb, setUploadingModuleThumb] = useState(false);

    // Resources State
    const [lessonResources, setLessonResources] = useState<{ id?: string; title: string; url: string }[]>([]);
    const [newResourceTitle, setNewResourceTitle] = useState('');
    const [newResourceUrl, setNewResourceUrl] = useState('');
    const [lessonHighlights, setLessonHighlights] = useState<string[]>([]);
    const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [aiError, setAiError] = useState('');

    const fetchData = async () => {
        setLoading(true);
        const { data: coursesData } = await supabase.from('courses').select('*').order('created_at', { ascending: true });
        const { data: modulesData } = await supabase.from('modules').select('*').order('display_order', { ascending: true });
        const { data: lessonsData } = await supabase.from('lessons').select('*').order('display_order', { ascending: true });

        if (coursesData) {
            const structuredData = coursesData.map((c: Course) => ({
                ...c,
                modules: modulesData?.filter((m: Module) => m.course_id === c.id).map((m: Module) => ({
                    ...m,
                    lessons: lessonsData?.filter((l: Lesson) => l.module_id === m.id) || []
                })).sort((a: any, b: any) => a.display_order - b.display_order) || []
            }));
            setCourses(structuredData);
            if (selectedCourse) {
                const refreshed = structuredData.find((sc: Course) => sc.id === selectedCourse.id);
                if (refreshed) setSelectedCourse(refreshed);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    // -------- HANDLERS PARA CURSOS --------
    const handleThumbUpload = async (file: File, type: 'course' | 'module') => {
        const setThumbState = type === 'course' ? setUploadingCourseThumb : setUploadingModuleThumb;
        const setThumbUrl = type === 'course' ? setCourseThumbnail : setModuleThumbnail;
        setThumbState(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado');
            const formData = new FormData();
            formData.append('file', file);
            formData.append('prefix', `${type}-thumb`);

            const res = await fetch('/api/admin/upload-image', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Falha no upload');
            setThumbUrl(data.url);
        } catch (err: any) {
            alert(`Erro no upload: ${err.message}`);
        } finally {
            setThumbState(false);
        }
    };

    const handleSaveCourse = async () => {
        if (!courseTitle) return alert("Título é obrigatório");
        const kIds = courseKiwifyIds.split(',').map(s => s.trim()).filter(s => s);

        const { error } = await supabase.from('courses').upsert({
            id: currentCourse?.id || undefined,
            title: courseTitle,
            description: courseDescription,
            thumbnail_url: courseThumbnail,
            kiwify_product_ids: kIds,
            release_at: courseReleaseAt || null
        });

        if (!error) {
            setIsCourseModalOpen(false);
            setCourseTitle('');
            setCourseDescription('');
            setCourseThumbnail('');
            setCourseKiwifyIds('');
            setCourseReleaseAt('');
            setCurrentCourse(null);
            fetchData();
        } else {
            console.error('Erro ao salvar curso', error);
        }
    };

    const handleDeleteCourse = async (id: string) => {
        if (confirm('Atenção: Deletar este Curso vai APAGAR todos os Módulos, Aulas e progresso dos Alunos atrelados. Deseja continuar?')) {
            await supabase.from('courses').delete().eq('id', id);
            fetchData();
        }
    };

    // -------- HANDLERS PARA MODULOS --------
    const handleSaveModule = async () => {
        if (!selectedCourse) return alert("Nenhum curso selecionado");
        const displayedModules = selectedCourse.modules || [];
        const nextOrder = currentModule ? currentModule.display_order : displayedModules.length;

        const { error } = await supabase
            .from('modules')
            .upsert({
                id: currentModule?.id || undefined,
                course_id: selectedCourse.id,
                title: moduleTitle,
                description: moduleDescription,
                thumbnail_url: moduleThumbnail,
                display_order: nextOrder
            });

        if (!error) {
            setIsModuleModalOpen(false);
            setModuleTitle('');
            setModuleDescription('');
            setModuleThumbnail('');
            setCurrentModule(null);
            fetchData();
        }
    };

    const handleDeleteModule = async (id: string) => {
        if (confirm('Tem certeza? Isso excluirá todas as aulas deste módulo.')) {
            await supabase.from('modules').delete().eq('id', id);
            fetchData();
        }
    };

    const moveModule = async (moduleId: string, direction: 'up' | 'down') => {
        if (!selectedCourse) return;
        const newModules = [...(selectedCourse.modules || [])];
        const index = newModules.findIndex(m => m.id === moduleId);
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === newModules.length - 1)) return;

        const otherIndex = direction === 'up' ? index - 1 : index + 1;
        [newModules[index], newModules[otherIndex]] = [newModules[otherIndex], newModules[index]];

        for (let i = 0; i < newModules.length; i++) {
            await supabase.from('modules').update({ display_order: i }).eq('id', newModules[i].id);
        }
        fetchData();
    };

    // -------- HANDLERS PARA AULAS --------
    const handleFileUpload = async (file: File) => {
        setUploading(true);
        setUploadProgress(0);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado');

            const authResponse = await fetch('/api/admin/b2-auth', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (!authResponse.ok) {
                const errData = await authResponse.json();
                throw new Error(errData.error || 'Falha na autenticação B2');
            }

            const { uploadUrl, uploadAuthToken, publicUrlBase } = await authResponse.json();
            const sha1 = await crypto.subtle.digest('SHA-1', await file.arrayBuffer())
                .then(hash => Array.from(new Uint8Array(hash))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join(''));

            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Authorization': uploadAuthToken,
                    'X-Bz-File-Name': encodeURIComponent(file.name),
                    'Content-Type': file.type || 'b2/x-auto',
                    'X-Bz-Content-Sha1': sha1
                },
                body: file
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`B2 falhou com status ${response.status}: ${errText}`);
            }

            const b2FileData = await response.json();
            const finalUrl = `${publicUrlBase}/${b2FileData.fileName}`;
            setLessonVideoUrl(finalUrl);

        } catch (err: any) {
            alert(`Erro no upload: ${err.message}`);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleSaveLesson = async () => {
        const module = selectedCourse?.modules?.find(m => m.id === selectedModuleId);
        const nextOrder = currentLesson?.id ? currentLesson.display_order : (module?.lessons?.length || 0);

        const payload: any = {
            module_id: selectedModuleId,
            title: lessonTitle,
            description: lessonDescription,
            video_url: lessonVideoUrl,
            display_order: nextOrder,
        };
        if (currentLesson?.id) payload.id = currentLesson.id;

        const { data: lessonData, error } = await supabase
            .from('lessons')
            .upsert(payload)
            .select('id')
            .single();

        if (error) {
            console.error('Supabase Error Payload:', error);
            alert(`Falha ao salvar a aula. Entre em contato ou cheque logs se persistir. Detalhe: ${error.message}`);
            return;
        }

        if (!error && lessonData) {
            const lessonId = lessonData.id;
            await supabase.from('lesson_resources').delete().eq('lesson_id', lessonId);
            if (lessonResources.length > 0) {
                await supabase.from('lesson_resources').insert(
                    lessonResources.map((r, i) => ({ lesson_id: lessonId, title: r.title, url: r.url, display_order: i }))
                );
            }
            setIsLessonModalOpen(false);
            setLessonTitle('');
            setLessonDescription('');
            setLessonVideoUrl('');
            setLessonResources([]);
            setNewResourceTitle('');
            setNewResourceUrl('');
            setLessonHighlights([]);
            setAiStatus('idle');
            setAiError('');
            setCurrentLesson(null);
            fetchData();
        }
    };

    const handleDeleteLesson = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta aula?')) {
            await supabase.from('lessons').delete().eq('id', id);
            fetchData();
        }
    };

    const moveLesson = async (lessonId: string, direction: 'up' | 'down') => {
        if (!selectedCourse) return;
        const lesson = selectedCourse.modules?.flatMap(m => m.lessons || []).find(l => l.id === lessonId);
        if (!lesson) return;

        const module = selectedCourse.modules?.find(m => m.id === lesson.module_id);
        if (!module || !module.lessons) return;

        const newLessons = [...module.lessons];
        const index = newLessons.findIndex(l => l.id === lessonId);
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === newLessons.length - 1)) return;

        const otherIndex = direction === 'up' ? index - 1 : index + 1;
        [newLessons[index], newLessons[otherIndex]] = [newLessons[otherIndex], newLessons[index]];

        for (let i = 0; i < newLessons.length; i++) {
            await supabase.from('lessons').update({ display_order: i }).eq('id', newLessons[i].id);
        }
        fetchData();
    };

    // -------- LIBRARY --------
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [libraryFiles, setLibraryFiles] = useState<any[]>([]);
    const [loadingLibrary, setLoadingLibrary] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const cleanFileName = (name: string) => {
        let clean = decodeURIComponent(name);
        clean = clean.replace(/^\d{13}-/g, '');
        clean = clean.replace(/\.(mp4|mov|avi|wmv|mkv)$/i, '');
        clean = clean.replace(/[-_]/g, ' ');
        return clean;
    };

    const normalizeText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, ' ').toLowerCase();

    const fetchLibrary = async () => {
        setLoadingLibrary(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const response = await fetch('/api/admin/b2-list', { headers: { 'Authorization': `Bearer ${session.access_token}` } });
            if (response.ok) {
                const data = await response.json();
                setLibraryFiles(data);
            }
        } catch (err) { }
        setLoadingLibrary(false);
    };

    if (loading) return <div className="text-center py-10">Carregando gerenciador...</div>;

    // ==========================================
    // RENDERIZAÇÃO: ROOT DE CURSOS
    // ==========================================
    if (!selectedCourse) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Gerenciador de Cursos</h3>
                        <p className="text-sm text-gray-500">Crie cursos e atrele-os aos produtos da Kiwify.</p>
                    </div>
                    <button
                        onClick={() => {
                            setCurrentCourse(null);
                            setCourseTitle('');
                            setCourseDescription('');
                            setCourseThumbnail('');
                            setCourseKiwifyIds('');
                            setCourseReleaseAt('');
                            setIsCourseModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-[#7c3aed] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#6d28d9] transition"
                    >
                        <Plus className="w-4 h-4" /> Novo Curso
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map(course => (
                        <div key={course.id} className="bg-white border flex flex-col border-gray-200 rounded-xl overflow-hidden shadow-sm group">
                            <div className="h-40 bg-gray-100 relative">
                                {course.thumbnail_url ? (
                                    <img src={course.thumbnail_url} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <BookOpen className="w-12 h-12" />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setCurrentCourse(course);
                                            setCourseTitle(course.title);
                                            setCourseDescription(course.description || '');
                                            setCourseThumbnail(course.thumbnail_url || '');
                                            setCourseKiwifyIds(course.kiwify_product_ids?.join(', ') || '');
                                            setCourseReleaseAt(course.release_at ? new Date(course.release_at).toISOString().slice(0, 16) : '');
                                            setIsCourseModalOpen(true);
                                        }}
                                        className="p-1.5 bg-white text-gray-600 rounded shadow hover:text-[#7c3aed]"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteCourse(course.id);
                                        }}
                                        className="p-1.5 bg-white text-red-500 rounded shadow hover:bg-red-50"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-5 flex-1 flex flex-col justify-between">
                                <div>
                                    <h4 className="font-bold text-gray-800 text-lg mb-1">{course.title}</h4>
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-3">{course.description || 'Sem descrição'}</p>
                                </div>
                                <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
                                    <div className="text-xs text-gray-500">
                                        <span className="font-semibold text-gray-700">{course.modules?.length || 0}</span> módulos
                                    </div>
                                    <button
                                        onClick={() => setSelectedCourse(course)}
                                        className="text-sm font-bold text-[#7c3aed] hover:text-[#6d28d9] flex items-center gap-1"
                                    >
                                        Abrir Conteúdo &rarr;
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {courses.length === 0 && (
                        <div className="col-span-full text-center py-20 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-500">
                            Nenhum Curso cadastrado. Adicione seu primeiro curso para mapear os módulos.
                        </div>
                    )}
                </div>

                {isCourseModalOpen && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                            <h3 className="text-xl font-bold mb-4">{currentCourse ? 'Editar Curso' : 'Novo Curso'}</h3>
                            <div className="space-y-4 mb-6">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Título *</label>
                                    <input type="text" value={courseTitle} onChange={e => setCourseTitle(e.target.value)} placeholder="Nome do Curso..." className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-[#7c3aed] outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição</label>
                                    <textarea value={courseDescription} onChange={e => setCourseDescription(e.target.value)} rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-[#7c3aed] outline-none resize-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">ID dos Produtos que Liberam (Kiwify)</label>
                                    <p className="text-[10px] text-gray-500 mb-2 leading-tight">Cole os UUIDs de assinaturas ou planos separados por VÍRGULA.<br />Quem comprar algum destes IDs receberá essa "Trava".</p>
                                    <textarea value={courseKiwifyIds} onChange={e => setCourseKiwifyIds(e.target.value)} placeholder="0b584cb0-0917-11f1-b405..., b54bcd50-..." rows={2} className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-xs focus:ring-[#7c3aed] outline-none resize-y" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1 text-purple-700 font-bold">Trava de Liberação (Data/Hora)</label>
                                    <p className="text-[10px] text-gray-500 mb-2">O curso ficará bloqueado para o aluno até esta data, mesmo que ele já tenha acesso.</p>
                                    <input
                                        type="datetime-local"
                                        value={courseReleaseAt}
                                        onChange={e => setCourseReleaseAt(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-[#7c3aed] outline-none"
                                    />
                                    {courseReleaseAt && (
                                        <button
                                            onClick={() => setCourseReleaseAt('')}
                                            className="text-[10px] text-red-500 mt-1 hover:underline"
                                        >
                                            Limpar Trava (Liberar Imediato)
                                        </button>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Capa do Curso</label>
                                    {courseThumbnail ? (
                                        <div className="relative">
                                            <img src={courseThumbnail} className="w-full h-36 object-cover rounded-xl border border-gray-200" />
                                            <button onClick={() => setCourseThumbnail('')} className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">Remover</button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {uploadingCourseThumb ? (
                                                <div className="w-full h-12 flex items-center justify-center bg-gray-100 rounded-lg animate-pulse">Carregando...</div>
                                            ) : (
                                                <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleThumbUpload(f, 'course'); }} />
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setIsCourseModalOpen(false)} className="px-4 py-2 text-gray-600 font-medium">Cancelar</button>
                                <button onClick={handleSaveCourse} className="bg-[#7c3aed] text-white px-6 py-2 rounded-lg font-bold">Salvar</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ==========================================
    // RENDERIZAÇÃO: MÓDULOS DESTE CURSO
    // ==========================================
    const displayedModules = selectedCourse.modules || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4">
                <button
                    onClick={() => setSelectedCourse(null)}
                    className="flex items-center gap-2 text-gray-500 hover:text-[#7c3aed] transition font-medium w-fit"
                >
                    <ArrowLeft className="w-4 h-4" /> Voltar para Cursos
                </button>
                <div className="flex justify-between items-end">
                    <div>
                        <h2 className="text-2xl font-black text-gray-900">{selectedCourse.title}</h2>
                        <p className="text-sm text-gray-500">Ordene e crie as Módulos deste curso visualmente.</p>
                    </div>
                    <button
                        onClick={() => {
                            setCurrentModule(null);
                            setModuleTitle('');
                            setModuleDescription('');
                            setModuleThumbnail('');
                            setIsModuleModalOpen(true);
                        }}
                        className="flex items-center gap-2 bg-[#7c3aed] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#6d28d9] transition"
                    >
                        <Plus className="w-4 h-4" /> Novo Módulo
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                {displayedModules.map((module, index) => (
                    <div key={module.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 bg-gray-50 flex items-center justify-between border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                    <button onClick={() => moveModule(module.id, 'up')} disabled={index === 0} className="p-0.5 text-gray-400 hover:text-[#7c3aed] disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                                    <button onClick={() => moveModule(module.id, 'down')} disabled={index === displayedModules.length - 1} className="p-0.5 text-gray-400 hover:text-[#7c3aed] disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                                </div>
                                <h4 className="font-bold text-gray-800">{module.title}</h4>
                                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{module.lessons?.length || 0} aulas</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setSelectedModuleId(module.id); setCurrentLesson(null); setLessonTitle(''); setLessonDescription(''); setLessonVideoUrl(''); setLessonResources([]); setLessonHighlights([]); setIsLessonModalOpen(true); }} className="p-2 text-[#7c3aed] hover:bg-[#7c3aed]/10 rounded-lg"><Plus className="w-4 h-4" /></button>
                                <button onClick={() => { setCurrentModule(module); setModuleTitle(module.title); setModuleDescription(module.description || ''); setModuleThumbnail(module.thumbnail_url || ''); setIsModuleModalOpen(true); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => handleDeleteModule(module.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {module.lessons?.map((lesson, lIndex) => (
                                <div key={lesson.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition group">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col">
                                            <button onClick={() => moveLesson(lesson.id, 'up')} disabled={lIndex === 0} className="p-0.5 text-gray-400 hover:text-[#7c3aed] disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                                            <button onClick={() => moveLesson(lesson.id, 'down')} disabled={lIndex === (module.lessons?.length || 0) - 1} className="p-0.5 text-gray-400 hover:text-[#7c3aed] disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                                        </div>
                                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-[#7c3aed]"><Video className="w-4 h-4" /></div>
                                        <div>
                                            <p className="font-medium text-gray-900">{lesson.title}</p>
                                            <p className="text-xs text-gray-500 truncate max-w-md">{lesson.video_url}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                                        <button onClick={async () => { setSelectedModuleId(module.id); setCurrentLesson(lesson); setLessonTitle(lesson.title); setLessonDescription(lesson.description); setLessonVideoUrl(lesson.video_url); setLessonHighlights(lesson.highlights || []); const { data } = await supabase.from('lesson_resources').select('*').eq('lesson_id', lesson.id); if (data) setLessonResources(data); setIsLessonModalOpen(true); }} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                                        <button onClick={() => handleDeleteLesson(lesson.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                            {(!module.lessons || module.lessons.length === 0) && <div className="p-4 text-center text-sm text-gray-400">Nenhuma aula neste módulo.</div>}
                        </div>
                    </div>
                ))}
                {displayedModules.length === 0 && <div className="text-center py-20 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-500">Nenhum módulo criado para este curso ainda.</div>}
            </div>

            {/* Modals para Módulo e Aula idênticos adaptados logicamente ... */}
            {isModuleModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold mb-4">{currentModule ? 'Editar Módulo' : 'Novo Módulo'}</h3>
                        <div className="space-y-4 mb-6">
                            <div><label>Título</label><input type="text" value={moduleTitle} onChange={e => setModuleTitle(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg" /></div>
                            <div><label>Descrição</label><textarea value={moduleDescription} onChange={e => setModuleDescription(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-lg h-20" /></div>
                            <div>
                                <label>Capa do Módulo</label>
                                {moduleThumbnail ? (
                                    <div className="relative"><img src={moduleThumbnail} className="w-full h-32 object-cover rounded-xl" /><button onClick={() => setModuleThumbnail('')} className="absolute top-2 right-2 bg-red-500 text-white p-1 text-xs rounded">Remover</button></div>
                                ) : (
                                    <input type="file" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleThumbUpload(f, 'module'); }} />
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3"><button onClick={() => setIsModuleModalOpen(false)}>Cancelar</button><button onClick={handleSaveModule} className="bg-[#7c3aed] text-white px-6 py-2 rounded-lg">Salvar</button></div>
                    </div>
                </div>
            )}

            {isLessonModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                            <h3 className="text-xl font-bold">{currentLesson ? 'Editar Aula' : 'Nova Aula'}</h3>
                        </div>
                        <div className="overflow-y-auto flex-1 px-6 py-4">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Título</label>
                                    <input
                                        type="text"
                                        value={lessonTitle}
                                        onChange={(e) => setLessonTitle(e.target.value)}
                                        placeholder="Título da aula"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-[#7c3aed] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição</label>
                                    <textarea
                                        value={lessonDescription}
                                        onChange={(e) => setLessonDescription(e.target.value)}
                                        placeholder="Descrição curta"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-[#7c3aed] outline-none h-24"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1 text-purple-700">Vídeo da Aula</label>
                                    <div className="space-y-4">
                                        <div className="flex flex-col sm:flex-row gap-2">
                                            <div className="flex-1">
                                                <input
                                                    type="file"
                                                    accept="video/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) handleFileUpload(file);
                                                    }}
                                                    disabled={uploading}
                                                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsLibraryOpen(true);
                                                    fetchLibrary();
                                                }}
                                                className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition"
                                            >
                                                <Video className="w-4 h-4" /> Escolher da Biblioteca
                                            </button>
                                        </div>

                                        {uploading && (
                                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                                <div className="bg-[#7c3aed] h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                                <p className="text-[10px] text-gray-500 mt-1">Carregando: {uploadProgress}%</p>
                                            </div>
                                        )}
                                        {lessonVideoUrl && !uploading && (
                                            <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700 flex items-center justify-between">
                                                <div className="flex items-center gap-2 truncate">
                                                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                                                    <span className="truncate">Vídeo: {lessonVideoUrl.split('/').pop()}</span>
                                                </div>
                                                <button
                                                    onClick={() => setLessonVideoUrl('')}
                                                    className="text-red-500 hover:text-red-700 font-bold ml-2"
                                                >Remover</button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                            </div>
                            {/* Resources */}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Materiais de Apoio</label>
                                <div className="space-y-2 mb-3">
                                    {lessonResources.map((r, i) => (
                                        <div key={i} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                            <LinkIcon className="w-4 h-4 text-gray-400 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-gray-800 truncate">{r.title}</p>
                                                <p className="text-[10px] text-gray-400 truncate">{r.url}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setLessonResources(prev => prev.filter((_, idx) => idx !== i))}
                                                className="shrink-0 p-1 hover:bg-red-50 hover:text-red-500 rounded text-gray-400 transition"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newResourceTitle}
                                        onChange={(e) => setNewResourceTitle(e.target.value)}
                                        placeholder="Nome do material"
                                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-[#7c3aed] outline-none"
                                    />
                                    <input
                                        type="url"
                                        value={newResourceUrl}
                                        onChange={(e) => setNewResourceUrl(e.target.value)}
                                        placeholder="URL"
                                        className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:ring-[#7c3aed] outline-none"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (!newResourceTitle.trim() || !newResourceUrl.trim()) return;
                                            setLessonResources(prev => [...prev, { title: newResourceTitle.trim(), url: newResourceUrl.trim() }]);
                                            setNewResourceTitle('');
                                            setNewResourceUrl('');
                                        }}
                                        className="shrink-0 px-3 py-2 bg-[#7c3aed]/10 text-[#7c3aed] rounded-lg text-sm font-bold hover:bg-[#7c3aed]/20 transition"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setIsLessonModalOpen(false)} className="px-4 py-2 text-gray-600 font-medium">Cancelar</button>
                            <button onClick={handleSaveLesson} className="bg-[#7c3aed] text-white px-6 py-2 rounded-lg font-bold">Salvar Aula</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Library Modal */}
            {isLibraryOpen && (
                <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Biblioteca de Vídeos</h3>
                                <p className="text-sm text-gray-500">Selecione um vídeo do seu catálogo no Backblaze.</p>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Buscar vídeo pelo nome..."
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-[#7c3aed] outline-none"
                                    />
                                    <Video className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                </div>
                                <button onClick={() => setIsLibraryOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition">
                                    <Plus className="w-6 h-6 rotate-45 text-gray-500" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingLibrary ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="w-10 h-10 border-4 border-[#7c3aed] border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-gray-500 font-medium">Acessando o Backblaze...</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {libraryFiles
                                        .filter(f => {
                                            const query = normalizeText(searchQuery);
                                            if (!query) return true;

                                            const queryWords = query.split(/\s+/).filter(w => w.length > 0);
                                            const cleanName = normalizeText(cleanFileName(f.name));

                                            // Somente busca no nome limpo para evitar ruído do timestamp (rawName)
                                            return queryWords.every(word =>
                                                cleanName.includes(word)
                                            );
                                        })
                                        .map((file) => (
                                            <div
                                                key={file.name}
                                                onClick={() => {
                                                    setLessonVideoUrl(file.url);
                                                    setIsLibraryOpen(false);
                                                    setSearchQuery('');
                                                }}
                                                className="group relative bg-white border border-gray-200 rounded-xl p-4 hover:border-[#7c3aed] hover:shadow-md transition cursor-pointer flex flex-col gap-3"
                                            >
                                                <div className="w-full aspect-video bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 group-hover:text-[#7c3aed] transition">
                                                    <Video className="w-10 h-10" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-800 line-clamp-1">{cleanFileName(file.name)}</span>
                                                    <span className="text-[10px] text-gray-500 uppercase tracking-widest">{file.type} • {(file.size / (1024 * 1024)).toFixed(1)}MB</span>
                                                    <span className="text-[8px] text-gray-400 truncate mt-1">{file.name}</span>
                                                </div>
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition">
                                                    <div className="bg-[#7c3aed] text-white p-1 rounded-full">
                                                        <Plus className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    {libraryFiles.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                                        <div className="col-span-full py-20 text-center text-gray-500">
                                            {searchQuery ? `Nenhum vídeo encontrado para "${searchQuery}"` : "Nenhum vídeo encontrado no seu bucket."}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
