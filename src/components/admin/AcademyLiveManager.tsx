import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trash2, Edit2, CheckCircle, X, Video, Save } from 'lucide-react';

interface LiveSettings {
    next_live_title: string;
    next_live_date: string;
    next_live_description: string;
    next_live_thumb: string;
    next_live_link: string;
}

interface Replay {
    id: string;
    title: string;
    description: string;
    video_url: string;
    display_order: number;
    module_id: string;
}

export default function AcademyLiveManager() {
    const [liveTitle, setLiveTitle] = useState('');
    const [liveDate, setLiveDate] = useState('');
    const [liveDescription, setLiveDescription] = useState('');
    const [liveThumb, setLiveThumb] = useState('');
    const [liveLink, setLiveLink] = useState('');
    const [uploadingThumb, setUploadingThumb] = useState(false);
    const [savingLive, setSavingLive] = useState(false);
    const [liveStatus, setLiveStatus] = useState('');

    const [replays, setReplays] = useState<Replay[]>([]);
    const [featuredModuleId, setFeaturedModuleId] = useState<string | null>(null);
    const [loadingReplays, setLoadingReplays] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentReplay, setCurrentReplay] = useState<Partial<Replay> | null>(null);
    const [replayTitle, setReplayTitle] = useState('');
    const [replayDescription, setReplayDescription] = useState('');
    const [replayVideoUrl, setReplayVideoUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [savingReplay, setSavingReplay] = useState(false);

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoadingReplays(true);
        const [{ data: ps }, { data: mods }] = await Promise.all([
            supabase.from('platform_settings').select('next_live_title, next_live_date, next_live_description, next_live_thumb, next_live_link').eq('id', 1).maybeSingle(),
            supabase.from('modules').select('id').eq('is_featured', true).limit(1),
        ]);

        if (ps) {
            setLiveTitle(ps.next_live_title || '');
            setLiveDate(ps.next_live_date ? new Date(ps.next_live_date).toISOString().slice(0, 16) : '');
            setLiveDescription(ps.next_live_description || '');
            setLiveThumb(ps.next_live_thumb || '');
            setLiveLink(ps.next_live_link || '');
        }

        if (mods?.[0]) {
            setFeaturedModuleId(mods[0].id);
            const { data: lsns } = await supabase
                .from('lessons')
                .select('id, title, description, video_url, display_order, module_id')
                .eq('module_id', mods[0].id)
                .order('display_order', { ascending: false });
            setReplays(lsns || []);
        }
        setLoadingReplays(false);
    };

    const handleThumbUpload = async (file: File) => {
        setUploadingThumb(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado');
            const formData = new FormData();
            formData.append('file', file);
            formData.append('prefix', 'thumb-live');
            const res = await fetch('/api/admin/upload-image', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setLiveThumb(data.url);
        } catch (err: any) {
            alert(`Erro no upload: ${err.message}`);
        } finally {
            setUploadingThumb(false);
        }
    };

    const handleSaveLive = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingLive(true);
        setLiveStatus('');
        try {
            const { error } = await supabase.from('platform_settings').upsert({
                id: 1,
                next_live_title: liveTitle.trim() || null,
                next_live_date: liveDate ? new Date(liveDate).toISOString() : null,
                next_live_description: liveDescription.trim() || null,
                next_live_thumb: liveThumb.trim() || null,
                next_live_link: liveLink.trim() || null,
            });
            if (error) throw error;
            setLiveStatus('Salvo!');
            setTimeout(() => setLiveStatus(''), 2000);
        } catch (err: any) {
            setLiveStatus(`Erro: ${err.message}`);
        } finally {
            setSavingLive(false);
        }
    };

    const handleVideoUpload = async (file: File) => {
        setUploading(true);
        setUploadProgress(0);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado');

            const authRes = await fetch('/api/admin/b2-auth', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            const authData = await authRes.json();
            if (!authRes.ok) throw new Error(authData.error || 'Falha na autenticação B2');
            const { uploadUrl, uploadAuthToken, publicUrlBase } = authData;

            const sha1 = await crypto.subtle.digest('SHA-1', await file.arrayBuffer())
                .then(h => Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join(''));

            const xhr = new XMLHttpRequest();
            await new Promise((resolve, reject) => {
                xhr.open('POST', uploadUrl, true);
                xhr.setRequestHeader('Authorization', uploadAuthToken);
                xhr.setRequestHeader('X-Bz-File-Name', encodeURIComponent(file.name));
                xhr.setRequestHeader('Content-Type', file.type || 'b2/x-auto');
                xhr.setRequestHeader('X-Bz-Content-Sha1', sha1);
                xhr.upload.onprogress = (e) => { if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100)); };
                xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve(JSON.parse(xhr.responseText)) : reject(new Error(xhr.statusText));
                xhr.onerror = () => reject(new Error('Erro de conexão'));
                xhr.send(file);
            }).then((data: any) => setReplayVideoUrl(`${publicUrlBase}/${data.fileName}`));
        } catch (err: any) {
            alert(`Erro no upload: ${err.message}`);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const openModal = (replay?: Replay) => {
        setCurrentReplay(replay || null);
        setReplayTitle(replay?.title || '');
        setReplayDescription(replay?.description || '');
        setReplayVideoUrl(replay?.video_url || '');
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentReplay(null);
        setReplayTitle('');
        setReplayDescription('');
        setReplayVideoUrl('');
    };

    const handleSaveReplay = async () => {
        if (!featuredModuleId) { alert('Módulo "Aulas ao Vivo" não encontrado. Rode o SQL de is_featured.'); return; }
        if (!replayTitle.trim()) { alert('Título obrigatório'); return; }
        setSavingReplay(true);
        try {
            const nextOrder = currentReplay?.id ? currentReplay.display_order : replays.length;
            const { error } = await supabase.from('lessons').upsert({
                id: currentReplay?.id || undefined,
                module_id: featuredModuleId,
                title: replayTitle.trim(),
                description: replayDescription.trim(),
                video_url: replayVideoUrl.trim(),
                display_order: nextOrder,
            });
            if (error) throw error;
            closeModal();
            fetchAll();
        } catch (err: any) {
            alert(`Erro ao salvar: ${err.message}`);
        } finally {
            setSavingReplay(false);
        }
    };

    const handleDeleteReplay = async (id: string) => {
        if (!confirm('Excluir este replay?')) return;
        await supabase.from('lessons').delete().eq('id', id);
        setReplays(prev => prev.filter(r => r.id !== id));
    };

    const fieldClass = 'block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed] transition';
    const labelClass = 'block text-sm font-semibold text-gray-700 mb-1.5';

    return (
        <div className="space-y-8 max-w-3xl">

            {/* ── PRÓXIMA AULA ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-base font-black text-gray-900 mb-5 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Próxima Aula Ao Vivo
                </h3>
                <form onSubmit={handleSaveLive} className="space-y-4">
                    <div>
                        <label className={labelClass}>Título</label>
                        <input type="text" value={liveTitle} onChange={e => setLiveTitle(e.target.value)}
                            placeholder="Ex: Encontro 15 — Como criar uma landing page"
                            className={fieldClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Data e Horário</label>
                            <input type="datetime-local" value={liveDate} onChange={e => setLiveDate(e.target.value)} className={fieldClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Link (Zoom / YouTube)</label>
                            <input type="url" value={liveLink} onChange={e => setLiveLink(e.target.value)}
                                placeholder="https://zoom.us/j/..." className={fieldClass} />
                        </div>
                    </div>
                    <div>
                        <label className={labelClass}>Descrição curta</label>
                        <textarea value={liveDescription} onChange={e => setLiveDescription(e.target.value)}
                            placeholder="O que será abordado nesta aula..." rows={2}
                            className={`${fieldClass} resize-none`} />
                    </div>
                    <div>
                        <label className={labelClass}>Thumbnail</label>
                        {liveThumb ? (
                            <div className="relative">
                                <img src={liveThumb} className="w-full h-40 object-cover rounded-xl border border-gray-100" />
                                <button type="button" onClick={() => setLiveThumb('')}
                                    className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-red-600 transition">
                                    Remover
                                </button>
                            </div>
                        ) : uploadingThumb ? (
                            <p className="text-sm text-[#7c3aed] animate-pulse py-2">Enviando...</p>
                        ) : (
                            <input type="file" accept="image/*"
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleThumbUpload(f); }}
                                className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#7c3aed]/10 file:text-[#7c3aed] hover:file:bg-[#7c3aed]/20 cursor-pointer" />
                        )}
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                        <button type="submit" disabled={savingLive}
                            className="flex items-center gap-2 px-5 py-2.5 bg-[#7c3aed] text-white text-sm font-bold rounded-xl hover:bg-[#6d28d9] transition disabled:opacity-50">
                            <Save className="w-4 h-4" />
                            {savingLive ? 'Salvando...' : 'Salvar'}
                        </button>
                        {liveStatus && (
                            <span className={`text-sm font-semibold ${liveStatus.startsWith('Erro') ? 'text-red-500' : 'text-emerald-600'}`}>
                                {liveStatus}
                            </span>
                        )}
                    </div>
                </form>
            </div>

            {/* ── REPLAYS ── */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base font-black text-gray-900">
                        Replays · {replays.length} {replays.length === 1 ? 'gravação' : 'gravações'}
                    </h3>
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-4 py-2 bg-[#7c3aed] text-white text-sm font-bold rounded-xl hover:bg-[#6d28d9] transition"
                    >
                        <Plus className="w-4 h-4" /> Adicionar Replay
                    </button>
                </div>

                {!featuredModuleId && !loadingReplays && (
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700">
                        Módulo "Aulas ao Vivo" não encontrado. Rode o SQL:<br />
                        <code className="font-mono text-xs mt-1 block">ALTER TABLE modules ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;<br />UPDATE modules SET is_featured = true WHERE title ILIKE '%ao vivo%';</code>
                    </div>
                )}

                {loadingReplays ? (
                    <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}
                    </div>
                ) : replays.length === 0 ? (
                    <div className="py-12 text-center">
                        <Video className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                        <p className="text-sm text-gray-400 font-medium">Nenhum replay ainda. Adicione o primeiro!</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {replays.map((replay, i) => (
                            <div key={replay.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#7c3aed]/20 hover:bg-gray-50/50 transition group">
                                <div className="w-8 h-8 rounded-lg bg-[#7c3aed]/10 flex items-center justify-center shrink-0">
                                    <span className="text-[#7c3aed] text-xs font-black">{replays.length - i}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-gray-900 truncate">{replay.title}</p>
                                    {replay.description && (
                                        <p className="text-xs text-gray-400 truncate">{replay.description}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                                    {replay.video_url && (
                                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">Vídeo ✓</span>
                                    )}
                                    <button onClick={() => openModal(replay)}
                                        className="p-1.5 text-gray-400 hover:text-[#7c3aed] hover:bg-[#7c3aed]/10 rounded-lg transition">
                                        <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleDeleteReplay(replay.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── MODAL REPLAY ── */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-black">{currentReplay ? 'Editar Replay' : 'Novo Replay'}</h3>
                            <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-xl transition">
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 px-6 py-4 space-y-4">
                            <div>
                                <label className={labelClass}>Título *</label>
                                <input type="text" value={replayTitle} onChange={e => setReplayTitle(e.target.value)}
                                    placeholder="Ex: Encontro 14 — Criando landing page" className={fieldClass} />
                            </div>
                            <div>
                                <label className={labelClass}>Descrição</label>
                                <textarea value={replayDescription} onChange={e => setReplayDescription(e.target.value)}
                                    placeholder="O que foi abordado nesta aula..." rows={2}
                                    className={`${fieldClass} resize-none`} />
                            </div>
                            <div>
                                <label className={labelClass}>Vídeo da gravação</label>
                                <input type="file" accept="video/*" disabled={uploading}
                                    onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); }}
                                    className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-[#7c3aed]/10 file:text-[#7c3aed] hover:file:bg-[#7c3aed]/20 cursor-pointer" />
                                {uploading && (
                                    <div className="mt-2">
                                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                                            <div className="bg-[#7c3aed] h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-1">Enviando... {uploadProgress}%</p>
                                    </div>
                                )}
                                {replayVideoUrl && !uploading && (
                                    <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                                        <span className="text-xs text-emerald-700 font-semibold truncate">{replayVideoUrl.split('/').pop()}</span>
                                        <button onClick={() => setReplayVideoUrl('')} className="ml-auto text-xs text-red-400 hover:text-red-600 font-bold">Remover</button>
                                    </div>
                                )}
                                {!replayVideoUrl && !uploading && (
                                    <div className="mt-2">
                                        <p className="text-xs text-gray-400 mb-1">ou cole a URL diretamente:</p>
                                        <input type="url" value={replayVideoUrl} onChange={e => setReplayVideoUrl(e.target.value)}
                                            placeholder="https://..." className={`${fieldClass} font-mono text-xs`} />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={closeModal} className="px-4 py-2 text-gray-600 font-medium text-sm hover:bg-gray-50 rounded-xl transition">
                                Cancelar
                            </button>
                            <button onClick={handleSaveReplay} disabled={savingReplay || uploading}
                                className="px-6 py-2 bg-[#7c3aed] text-white text-sm font-bold rounded-xl hover:bg-[#6d28d9] transition disabled:opacity-50">
                                {savingReplay ? 'Salvando...' : 'Salvar Replay'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
