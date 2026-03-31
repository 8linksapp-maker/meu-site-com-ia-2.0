import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Edit2, Video, ChevronDown, ChevronUp, GripVertical, CheckCircle } from 'lucide-react';

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
    lessons?: Lesson[];
}

export default function CourseManager() {
    const [modules, setModules] = useState<Module[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
    const [currentModule, setCurrentModule] = useState<Module | null>(null);
    const [currentLesson, setCurrentLesson] = useState<Partial<Lesson> | null>(null);

    // New Module/Lesson state
    const [moduleTitle, setModuleTitle] = useState('');
    const [lessonTitle, setLessonTitle] = useState('');
    const [lessonDescription, setLessonDescription] = useState('');
    const [lessonVideoUrl, setLessonVideoUrl] = useState('');
    const [selectedModuleId, setSelectedModuleId] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const handleFileUpload = async (file: File) => {
        setUploading(true);
        setUploadProgress(0);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado');

            // 1. Obter credenciais de upload da nossa API
            const authResponse = await fetch('/api/admin/b2-auth', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (!authResponse.ok) {
                const errData = await authResponse.json();
                throw new Error(errData.error || 'Falha na autenticação B2');
            }

            const { uploadUrl, uploadAuthToken, publicUrlBase } = await authResponse.json();

            // 2. Preparar arquivo e hash SHA1 (B2 exige SHA1 do arquivo)
            const sha1 = await crypto.subtle.digest('SHA-1', await file.arrayBuffer())
                .then(hash => Array.from(new Uint8Array(hash))
                    .map(b => b.toString(16).padStart(2, '0'))
                    .join(''));

            // 3. Upload direto para o B2
            const xhr = new XMLHttpRequest();
            const promise = new Promise((resolve, reject) => {
                xhr.open('POST', uploadUrl, true);
                xhr.setRequestHeader('Authorization', uploadAuthToken);
                xhr.setRequestHeader('X-Bz-File-Name', encodeURIComponent(file.name));
                xhr.setRequestHeader('Content-Type', file.type || 'b2/x-auto');
                xhr.setRequestHeader('X-Bz-Content-Sha1', sha1);

                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percent = Math.round((e.loaded / e.total) * 100);
                        setUploadProgress(percent);
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } else {
                        reject(new Error(`Upload falhou: ${xhr.statusText}`));
                    }
                };

                xhr.onerror = () => reject(new Error('Erro de conexão no upload'));
                xhr.send(file);
            });

            const b2FileData: any = await promise;

            // 4. Construir URL Final
            const finalUrl = `${publicUrlBase}/${b2FileData.fileName}`;
            setLessonVideoUrl(finalUrl);

        } catch (err: any) {
            alert(`Erro no upload: ${err.message}`);
            console.error(err);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    // Video Library state
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [libraryFiles, setLibraryFiles] = useState<any[]>([]);
    const [loadingLibrary, setLoadingLibrary] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const cleanFileName = (name: string) => {
        // 1. Decodificar (se estiver com %20 etc)
        let clean = decodeURIComponent(name);
        // 2. Remover timestamps iniciais (13 dígitos seguidos de hífen)
        clean = clean.replace(/^\d{13}-/g, '');
        // 3. Remover extensões comuns
        clean = clean.replace(/\.(mp4|mov|avi|wmv|mkv)$/i, '');
        // 4. Trocar hífens e underlines por espaços
        clean = clean.replace(/[-_]/g, ' ');
        return clean;
    };

    const normalizeText = (text: string) => {
        return text
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove acentos
            .replace(/[^a-z0-9]/gi, ' ')     // Troca símbolos/pontuação por espaços
            .toLowerCase();
    };

    const fetchLibrary = async () => {
        setLoadingLibrary(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const response = await fetch('/api/admin/b2-list', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setLibraryFiles(data);
            }
        } catch (err) {
            console.error('Erro ao carregar biblioteca:', err);
        } finally {
            setLoadingLibrary(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: modulesData, error: modulesError } = await supabase
            .from('modules')
            .select('*')
            .order('display_order', { ascending: true });

        const { data: lessonsData, error: lessonsError } = await supabase
            .from('lessons')
            .select('*')
            .order('display_order', { ascending: true });

        if (modulesData) {
            const structuredData = modulesData.map((m: Module) => ({
                ...m,
                lessons: lessonsData?.filter((l: Lesson) => l.module_id === m.id) || []
            }));
            setModules(structuredData);
        }
        setLoading(false);
    };

    const handleSaveModule = async () => {
        const nextOrder = currentModule ? currentModule.display_order : modules.length;
        const { error } = await supabase
            .from('modules')
            .upsert({
                id: currentModule?.id || undefined,
                title: moduleTitle,
                display_order: nextOrder
            });

        if (!error) {
            setIsModuleModalOpen(false);
            setModuleTitle('');
            setCurrentModule(null);
            fetchData();
        }
    };

    const handleSaveLesson = async () => {
        const module = modules.find(m => m.id === selectedModuleId);
        const nextOrder = currentLesson?.id ? currentLesson.display_order : (module?.lessons?.length || 0);

        const { error } = await supabase
            .from('lessons')
            .upsert({
                id: currentLesson?.id || undefined,
                module_id: selectedModuleId,
                title: lessonTitle,
                description: lessonDescription,
                video_url: lessonVideoUrl,
                display_order: nextOrder
            });

        if (!error) {
            setIsLessonModalOpen(false);
            setLessonTitle('');
            setLessonDescription('');
            setLessonVideoUrl('');
            setCurrentLesson(null);
            fetchData();
        }
    };

    const handleDeleteModule = async (id: string) => {
        if (confirm('Tem certeza? Isso excluirá todas as aulas deste módulo.')) {
            await supabase.from('modules').delete().eq('id', id);
            fetchData();
        }
    };

    const handleDeleteLesson = async (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta aula?')) {
            await supabase.from('lessons').delete().eq('id', id);
            fetchData();
        }
    };

    const moveModule = async (moduleId: string, direction: 'up' | 'down') => {
        const newModules = [...modules];
        const index = newModules.findIndex(m => m.id === moduleId);
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === newModules.length - 1)) return;

        const otherIndex = direction === 'up' ? index - 1 : index + 1;
        [newModules[index], newModules[otherIndex]] = [newModules[otherIndex], newModules[index]];

        // Reindexação total para garantir consistência
        for (let i = 0; i < newModules.length; i++) {
            await supabase.from('modules').update({ display_order: i }).eq('id', newModules[i].id);
        }

        fetchData();
    };

    const moveLesson = async (lessonId: string, direction: 'up' | 'down') => {
        const lesson = modules.flatMap(m => m.lessons || []).find(l => l.id === lessonId);
        if (!lesson) return;

        const module = modules.find(m => m.id === lesson.module_id);
        if (!module || !module.lessons) return;

        const newLessons = [...module.lessons];
        const index = newLessons.findIndex(l => l.id === lessonId);
        if ((direction === 'up' && index === 0) || (direction === 'down' && index === newLessons.length - 1)) return;

        const otherIndex = direction === 'up' ? index - 1 : index + 1;
        [newLessons[index], newLessons[otherIndex]] = [newLessons[otherIndex], newLessons[index]];

        // Reindexação total para garantir consistência
        for (let i = 0; i < newLessons.length; i++) {
            await supabase.from('lessons').update({ display_order: i }).eq('id', newLessons[i].id);
        }

        fetchData();
    };

    if (loading) return <div className="text-center py-10">Carregando curso...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Módulos e Aulas</h3>
                <button
                    onClick={() => {
                        setCurrentModule(null);
                        setModuleTitle('');
                        setIsModuleModalOpen(true);
                    }}
                    className="flex items-center gap-2 bg-[#7c3aed] text-white px-4 py-2 rounded-lg font-medium hover:bg-[#6d28d9] transition"
                >
                    <Plus className="w-4 h-4" /> Novo Módulo
                </button>
            </div>

            <div className="space-y-4">
                {modules.map((module, index) => (
                    <div key={module.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="p-4 bg-gray-50 flex items-center justify-between border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col">
                                    <button
                                        onClick={() => moveModule(module.id, 'up')}
                                        disabled={index === 0}
                                        className="p-0.5 text-gray-400 hover:text-[#7c3aed] disabled:opacity-30"
                                    >
                                        <ChevronUp className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => moveModule(module.id, 'down')}
                                        disabled={index === modules.length - 1}
                                        className="p-0.5 text-gray-400 hover:text-[#7c3aed] disabled:opacity-30"
                                    >
                                        <ChevronDown className="w-3 h-3" />
                                    </button>
                                </div>
                                <h4 className="font-bold text-gray-800">{module.title}</h4>
                                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">
                                    {module.lessons?.length || 0} aulas
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setSelectedModuleId(module.id);
                                        setCurrentLesson(null);
                                        setLessonTitle('');
                                        setLessonDescription('');
                                        setLessonVideoUrl('');
                                        setIsLessonModalOpen(true);
                                    }}
                                    className="p-2 text-[#7c3aed] hover:bg-[#7c3aed]/10 rounded-lg transition"
                                    title="Nova Aula"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setCurrentModule(module);
                                        setModuleTitle(module.title);
                                        setIsModuleModalOpen(true);
                                    }}
                                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleDeleteModule(module.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        <div className="divide-y divide-gray-100">
                            {module.lessons?.map((lesson, lIndex) => (
                                <div key={lesson.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition group">
                                    <div className="flex items-center gap-3">
                                        <div className="flex flex-col">
                                            <button
                                                onClick={() => moveLesson(lesson.id, 'up')}
                                                disabled={lIndex === 0}
                                                className="p-0.5 text-gray-400 hover:text-[#7c3aed] disabled:opacity-30"
                                            >
                                                <ChevronUp className="w-3 h-3" />
                                            </button>
                                            <button
                                                onClick={() => moveLesson(lesson.id, 'down')}
                                                disabled={lIndex === (module.lessons?.length || 0) - 1}
                                                className="p-0.5 text-gray-400 hover:text-[#7c3aed] disabled:opacity-30"
                                            >
                                                <ChevronDown className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-[#7c3aed]">
                                            <Video className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{lesson.title}</p>
                                            <p className="text-xs text-gray-500 truncate max-w-md">{lesson.video_url}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                                        <button
                                            onClick={() => {
                                                setSelectedModuleId(module.id);
                                                setCurrentLesson(lesson);
                                                setLessonTitle(lesson.title);
                                                setLessonDescription(lesson.description);
                                                setLessonVideoUrl(lesson.video_url);
                                                setIsLessonModalOpen(true);
                                            }}
                                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteLesson(lesson.id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {(!module.lessons || module.lessons.length === 0) && (
                                <div className="p-4 text-center text-sm text-gray-400">Nenhuma aula neste módulo.</div>
                            )}
                        </div>
                    </div>
                ))}

                {modules.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-500">
                        Nenhum módulo criado ainda. Comece criando o seu primeiro módulo!
                    </div>
                )}
            </div>

            {/* Modals are simplified for this implementation */}
            {isModuleModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-xl font-bold mb-4">{currentModule ? 'Editar Módulo' : 'Novo Módulo'}</h3>
                        <input
                            type="text"
                            value={moduleTitle}
                            onChange={(e) => setModuleTitle(e.target.value)}
                            placeholder="Título do módulo"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg mb-6 focus:ring-[#7c3aed] outline-none"
                        />
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setIsModuleModalOpen(false)} className="px-4 py-2 text-gray-600 font-medium">Cancelar</button>
                            <button onClick={handleSaveModule} className="bg-[#7c3aed] text-white px-6 py-2 rounded-lg font-bold">Salvar</button>
                        </div>
                    </div>
                </div>
            )}

            {isLessonModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl">
                        <h3 className="text-xl font-bold mb-4">{currentLesson ? 'Editar Aula' : 'Nova Aula'}</h3>
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
                        <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100">
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
