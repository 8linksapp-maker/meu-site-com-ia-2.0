import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Plus, Trash2, GripVertical, Save, ChevronDown, ChevronUp,
    Play, Image, BookOpen, Edit2, Check, X, AlertCircle, Video
} from 'lucide-react';

interface TutorialImage { src: string; caption: string; }

interface TutorialBlock {
    id: string;
    slug: string;
    title: string;
    video_url: string;
    video_poster: string;
    steps: string[];
    images: TutorialImage[];
    updated_at: string;
}

const EMPTY_BLOCK: Omit<TutorialBlock, 'id' | 'updated_at'> = {
    slug: '', title: '', video_url: '', video_poster: '', steps: [''], images: [],
};

// ── STEP ROW ──────────────────────────────────────────────────────────
function StepRow({
    value, index, total,
    onChange, onRemove, onMoveUp, onMoveDown,
}: {
    value: string; index: number; total: number;
    onChange: (v: string) => void;
    onRemove: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
}) {
    return (
        <div className="flex gap-2 items-start">
            <div className="flex flex-col gap-1 mt-2 shrink-0">
                <button type="button" onClick={onMoveUp} disabled={index === 0}
                    className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 transition">
                    <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <GripVertical className="w-3.5 h-3.5 text-gray-300" />
                <button type="button" onClick={onMoveDown} disabled={index === total - 1}
                    className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-20 transition">
                    <ChevronDown className="w-3.5 h-3.5" />
                </button>
            </div>
            <span className="w-5 h-5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] text-[10px] font-black flex items-center justify-center shrink-0 mt-2.5">
                {index + 1}
            </span>
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                rows={2}
                placeholder={`Passo ${index + 1}...`}
                className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] resize-none"
            />
            <button type="button" onClick={onRemove}
                className="mt-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

// ── IMAGE ROW ─────────────────────────────────────────────────────────
function ImageRow({
    value, index,
    onChange, onRemove,
}: {
    value: TutorialImage; index: number;
    onChange: (v: TutorialImage) => void;
    onRemove: () => void;
}) {
    return (
        <div className="flex gap-3 items-start p-3 bg-gray-50 rounded-xl border border-gray-100">
            {/* Preview thumbnail */}
            <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-200 shrink-0 border border-gray-200">
                {value.src ? (
                    <img src={value.src} alt="" className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-5 h-5 text-gray-300" />
                    </div>
                )}
            </div>

            <div className="flex-1 space-y-1.5 min-w-0">
                <input
                    type="url"
                    value={value.src}
                    onChange={e => onChange({ ...value, src: e.target.value })}
                    placeholder="URL da imagem (https://...)"
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed]"
                />
                <input
                    type="text"
                    value={value.caption}
                    onChange={e => onChange({ ...value, caption: e.target.value })}
                    placeholder="Legenda (ex: Clique em Settings)"
                    className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed]"
                />
            </div>

            <button type="button" onClick={onRemove}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

// ── EDIT PANEL ────────────────────────────────────────────────────────
function EditPanel({
    block, onSave, onCancel,
}: {
    block: Omit<TutorialBlock, 'id' | 'updated_at'> & { id?: string };
    onSave: (data: typeof block) => Promise<void>;
    onCancel: () => void;
}) {
    const [form, setForm] = useState(block);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const setField = (key: keyof typeof form, value: any) =>
        setForm(f => ({ ...f, [key]: value }));

    // Steps helpers
    const updateStep = (i: number, val: string) => {
        const s = [...form.steps]; s[i] = val; setField('steps', s);
    };
    const addStep = () => setField('steps', [...form.steps, '']);
    const removeStep = (i: number) => setField('steps', form.steps.filter((_, j) => j !== i));
    const moveStep = (i: number, dir: -1 | 1) => {
        const s = [...form.steps];
        [s[i], s[i + dir]] = [s[i + dir], s[i]];
        setField('steps', s);
    };

    // Images helpers
    const updateImage = (i: number, val: TutorialImage) => {
        const imgs = [...form.images]; imgs[i] = val; setField('images', imgs);
    };
    const addImage = () => setField('images', [...form.images, { src: '', caption: '' }]);
    const removeImage = (i: number) => setField('images', form.images.filter((_, j) => j !== i));

    const handleSave = async () => {
        if (!form.slug.trim() || !form.title.trim()) {
            setError('Slug e título são obrigatórios.'); return;
        }
        setSaving(true); setError('');
        try {
            await onSave(form);
        } catch (e: any) {
            setError(e.message);
            setSaving(false);
        }
    };

    const isNew = !block.id;

    return (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-black text-gray-900 text-sm">
                    {isNew ? 'Novo Tutorial Block' : `Editando: ${block.title}`}
                </h3>
                <button onClick={onCancel} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

                {/* Identificação */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Slug <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={form.slug}
                            onChange={e => setField('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                            readOnly={!isNew}
                            placeholder="ex: github-token"
                            className={`w-full px-3 py-2 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] ${!isNew ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-200'}`}
                        />
                        <p className="text-[10px] text-gray-400">Identificador único — não pode mudar após criado</p>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Título <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => setField('title', e.target.value)}
                            placeholder="ex: Como criar token do GitHub"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed]"
                        />
                    </div>
                </div>

                {/* Vídeo */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-[#7c3aed]" />
                        <h4 className="font-black text-gray-800 text-sm">Vídeo</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600">URL do Vídeo</label>
                            <input
                                type="url"
                                value={form.video_url}
                                onChange={e => setField('video_url', e.target.value)}
                                placeholder="https://youtube.com/embed/... ou URL direta do .mp4"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed]"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600">URL do Thumbnail (poster)</label>
                            <input
                                type="url"
                                value={form.video_poster}
                                onChange={e => setField('video_poster', e.target.value)}
                                placeholder="https://... (opcional, exibido antes do play)"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed]"
                            />
                        </div>
                        {form.video_url && (
                            <div className="rounded-xl overflow-hidden border border-gray-200 aspect-video">
                                {form.video_url.includes('youtube') || form.video_url.includes('youtu.be') ? (
                                    <iframe src={form.video_url} className="w-full h-full" allowFullScreen />
                                ) : (
                                    <video src={form.video_url} poster={form.video_poster} controls className="w-full h-full object-cover" />
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Passos */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-[#7c3aed]" />
                            <h4 className="font-black text-gray-800 text-sm">Passos em texto</h4>
                            <span className="px-2 py-0.5 bg-[#7c3aed]/10 text-[#7c3aed] text-[10px] font-black rounded-full">
                                {form.steps.filter(Boolean).length}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={addStep}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7c3aed] text-white rounded-lg text-xs font-bold hover:bg-[#6d28d9] transition"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Adicionar passo
                        </button>
                    </div>
                    <div className="space-y-2">
                        {form.steps.map((step, i) => (
                            <StepRow
                                key={i}
                                value={step}
                                index={i}
                                total={form.steps.length}
                                onChange={v => updateStep(i, v)}
                                onRemove={() => removeStep(i)}
                                onMoveUp={() => moveStep(i, -1)}
                                onMoveDown={() => moveStep(i, 1)}
                            />
                        ))}
                    </div>
                    <p className="text-[10px] text-gray-400">
                        Suporte a HTML básico: <code className="bg-gray-100 px-1 rounded">&lt;strong&gt;</code>, <code className="bg-gray-100 px-1 rounded">&lt;a href="..."&gt;</code>, <code className="bg-gray-100 px-1 rounded">&lt;code&gt;</code>
                    </p>
                </div>

                {/* Imagens */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Image className="w-4 h-4 text-[#7c3aed]" />
                            <h4 className="font-black text-gray-800 text-sm">Capturas de tela</h4>
                            <span className="px-2 py-0.5 bg-[#7c3aed]/10 text-[#7c3aed] text-[10px] font-black rounded-full">
                                {form.images.length}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={addImage}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7c3aed] text-white rounded-lg text-xs font-bold hover:bg-[#6d28d9] transition"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Adicionar imagem
                        </button>
                    </div>
                    <div className="space-y-2">
                        {form.images.length === 0 && (
                            <div className="py-8 text-center border-2 border-dashed border-gray-200 rounded-xl">
                                <Image className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-xs text-gray-400">Nenhuma imagem adicionada ainda</p>
                            </div>
                        )}
                        {form.images.map((img, i) => (
                            <ImageRow
                                key={i}
                                value={img}
                                index={i}
                                onChange={v => updateImage(i, v)}
                                onRemove={() => removeImage(i)}
                            />
                        ))}
                    </div>
                </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
                {error && (
                    <div className="flex items-center gap-2 text-red-600 text-xs">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}
                <div className="flex gap-2 ml-auto">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2 bg-[#7c3aed] text-white rounded-xl font-bold text-sm hover:bg-[#6d28d9] transition disabled:opacity-50"
                    >
                        {saving ? (
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── MAIN ──────────────────────────────────────────────────────────────
export default function TutorialsManager() {
    const [blocks, setBlocks] = useState<TutorialBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState<(Omit<TutorialBlock, 'updated_at'> & { id?: string }) | null>(null);
    const [saved, setSaved] = useState<string | null>(null);

    useEffect(() => { fetchBlocks(); }, []);

    const fetchBlocks = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('tutorial_blocks')
            .select('*')
            .order('updated_at', { ascending: false });
        if (data) setBlocks(data);
        setLoading(false);
    };

    const handleSave = async (form: Omit<TutorialBlock, 'updated_at'> & { id?: string }) => {
        const payload = {
            slug: form.slug,
            title: form.title,
            video_url: form.video_url || null,
            video_poster: form.video_poster || null,
            steps: form.steps.filter(Boolean),
            images: form.images.filter(img => img.src),
            updated_at: new Date().toISOString(),
        };

        let error;
        if (form.id) {
            ({ error } = await supabase.from('tutorial_blocks').update(payload).eq('id', form.id));
        } else {
            ({ error } = await supabase.from('tutorial_blocks').insert(payload));
        }

        if (error) throw error;

        setSaved(form.slug);
        setTimeout(() => setSaved(null), 3000);
        setEditing(null);
        fetchBlocks();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deletar este tutorial block?')) return;
        await supabase.from('tutorial_blocks').delete().eq('id', id);
        fetchBlocks();
    };

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black text-gray-900">Tutorial Blocks</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Gerencie o conteúdo educativo inline da plataforma — vídeo, passos e imagens.
                    </p>
                </div>
                <button
                    onClick={() => setEditing({ ...EMPTY_BLOCK })}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#7c3aed] text-white rounded-xl font-bold text-sm hover:bg-[#6d28d9] transition shadow-lg shadow-purple-500/20"
                >
                    <Plus className="w-4 h-4" />
                    Novo Block
                </button>
            </div>

            {saved && (
                <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700">
                    <Check className="w-4 h-4" />
                    Block <code className="font-mono font-bold">{saved}</code> salvo com sucesso!
                </div>
            )}

            {/* Edit Panel */}
            {editing && (
                <EditPanel
                    block={editing}
                    onSave={handleSave}
                    onCancel={() => setEditing(null)}
                />
            )}

            {/* List */}
            {loading ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />
                    ))}
                </div>
            ) : blocks.length === 0 ? (
                <div className="py-16 text-center bg-white rounded-2xl border border-gray-100">
                    <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="font-bold text-gray-400">Nenhum tutorial block criado ainda</p>
                    <p className="text-sm text-gray-400 mt-1">Clique em "Novo Block" para começar</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {blocks.map(block => (
                        <div
                            key={block.id}
                            className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 hover:border-[#7c3aed]/20 hover:shadow-md transition-all group"
                        >
                            {/* Status icons */}
                            <div className="flex gap-2 shrink-0">
                                <span title="Vídeo" className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${block.video_url ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-300'}`}>
                                    <Play className="w-3.5 h-3.5" />
                                </span>
                                <span title="Passos" className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${block.steps?.length > 0 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-300'}`}>
                                    <BookOpen className="w-3.5 h-3.5" />
                                </span>
                                <span title="Imagens" className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs ${block.images?.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-300'}`}>
                                    <Image className="w-3.5 h-3.5" />
                                </span>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-black text-gray-900 text-sm">{block.title}</p>
                                    <code className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded font-mono">
                                        {block.slug}
                                    </code>
                                </div>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {block.steps?.length || 0} passos
                                    {block.images?.length > 0 && ` · ${block.images.length} imagens`}
                                    {block.video_url && ' · vídeo'}
                                </p>
                            </div>

                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => setEditing(block)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7c3aed]/10 text-[#7c3aed] rounded-lg text-xs font-bold hover:bg-[#7c3aed]/20 transition"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(block.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
