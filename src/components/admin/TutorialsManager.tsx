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
                    className="p-0.5 text-cafe-cinza-quente hover:text-cafe-medio disabled:opacity-20 transition">
                    <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <GripVertical className="w-3.5 h-3.5 text-borda-cafe" />
                <button type="button" onClick={onMoveDown} disabled={index === total - 1}
                    className="p-0.5 text-cafe-cinza-quente hover:text-cafe-medio disabled:opacity-20 transition">
                    <ChevronDown className="w-3.5 h-3.5" />
                </button>
            </div>
            <span className="w-5 h-5 rounded-full bg-coral-wash text-coral-terra text-[10px] font-semibold flex items-center justify-center shrink-0 mt-2.5">
                {index + 1}
            </span>
            <textarea
                value={value}
                onChange={e => onChange(e.target.value)}
                rows={2}
                placeholder={`Passo ${index + 1}...`}
                className="flex-1 px-3 py-2 bg-cream-surface border border-borda-cafe rounded-[8px] text-sm focus:outline-none focus:ring-2 focus:ring-coral-terra/20 focus:border-coral-terra resize-none"
            />
            <button type="button" onClick={onRemove}
                className="mt-2 p-1.5 text-cafe-cinza-quente hover:text-vermelho-tijolo hover:bg-[oklch(94%_0.025_28)] rounded-[8px] transition shrink-0">
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
        <div className="flex gap-3 items-start p-3 bg-cream-elevated rounded-[10px] border border-borda-cafe">
            {/* Preview thumbnail */}
            <div className="w-20 h-14 rounded-[8px] overflow-hidden bg-gray-200 shrink-0 border border-borda-cafe">
                {value.src ? (
                    <img src={value.src} alt="" className="w-full h-full object-cover" onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-5 h-5 text-borda-cafe" />
                    </div>
                )}
            </div>

            <div className="flex-1 space-y-1.5 min-w-0">
                <input
                    type="url"
                    value={value.src}
                    onChange={e => onChange({ ...value, src: e.target.value })}
                    placeholder="URL da imagem (https://...)"
                    className="w-full px-3 py-1.5 bg-cream-surface border border-borda-cafe rounded-[8px] text-xs font-mono focus:outline-none focus:ring-2 focus:ring-coral-terra/20 focus:border-coral-terra"
                />
                <input
                    type="text"
                    value={value.caption}
                    onChange={e => onChange({ ...value, caption: e.target.value })}
                    placeholder="Legenda (ex: Clique em Settings)"
                    className="w-full px-3 py-1.5 bg-cream-surface border border-borda-cafe rounded-[8px] text-xs focus:outline-none focus:ring-2 focus:ring-coral-terra/20 focus:border-coral-terra"
                />
            </div>

            <button type="button" onClick={onRemove}
                className="p-1.5 text-cafe-cinza-quente hover:text-vermelho-tijolo hover:bg-[oklch(94%_0.025_28)] rounded-[8px] transition shrink-0">
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

    // Atualiza form quando troca de block (clica em outro pra editar)
    useEffect(() => { setForm(block); setSaving(false); setError(''); }, [block.id, block.slug]);

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
            setSaving(false);
        } catch (e: any) {
            setError(e.message || 'Erro ao salvar. Verifique as permissões.');
            setSaving(false);
        }
    };

    const isNew = !block.id;

    return (
        <div className="bg-cream-surface rounded-[12px] border border-borda-cafe shadow-xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-borda-cafe bg-cream-elevated">
                <h3 className="font-semibold text-carvao-quente text-sm">
                    {isNew ? 'Novo Tutorial Block' : `Editando: ${block.title}`}
                </h3>
                <button onClick={onCancel} className="p-2 text-cafe-cinza-quente hover:text-cafe-medio hover:bg-gray-200 rounded-[8px] transition">
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">

                {/* Identificação */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-cafe-medio uppercase tracking-wide">Slug <span className="text-vermelho-tijolo">*</span></label>
                        <input
                            type="text"
                            value={form.slug}
                            onChange={e => setField('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                            readOnly={!isNew}
                            placeholder="ex: github-token"
                            className={`w-full px-3 py-2 border rounded-[8px] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-coral-terra/20 focus:border-coral-terra ${!isNew ? 'bg-cream-elevated text-cafe-cinza-quente cursor-not-allowed' : 'bg-cream-surface border-borda-cafe'}`}
                        />
                        <p className="text-[10px] text-cafe-cinza-quente">Identificador único — não pode mudar após criado</p>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-cafe-medio uppercase tracking-wide">Título <span className="text-vermelho-tijolo">*</span></label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={e => setField('title', e.target.value)}
                            placeholder="ex: Como criar token do GitHub"
                            className="w-full px-3 py-2 border border-borda-cafe rounded-[8px] text-sm bg-cream-surface focus:outline-none focus:ring-2 focus:ring-coral-terra/20 focus:border-coral-terra"
                        />
                    </div>
                </div>

                {/* Vídeo */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-coral-terra" />
                        <h4 className="font-semibold text-carvao-quente text-sm">Vídeo</h4>
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-cafe-medio">URL do Vídeo</label>
                            <input
                                type="url"
                                value={form.video_url}
                                onChange={e => setField('video_url', e.target.value)}
                                placeholder="https://youtube.com/embed/... ou URL direta do .mp4"
                                className="w-full px-3 py-2 border border-borda-cafe rounded-[8px] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-coral-terra/20 focus:border-coral-terra"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-cafe-medio">URL do Thumbnail (poster)</label>
                            <input
                                type="url"
                                value={form.video_poster}
                                onChange={e => setField('video_poster', e.target.value)}
                                placeholder="https://... (opcional, exibido antes do play)"
                                className="w-full px-3 py-2 border border-borda-cafe rounded-[8px] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-coral-terra/20 focus:border-coral-terra"
                            />
                        </div>
                        {form.video_url && (
                            <div className="rounded-[10px] overflow-hidden border border-borda-cafe aspect-video">
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
                            <BookOpen className="w-4 h-4 text-coral-terra" />
                            <h4 className="font-semibold text-carvao-quente text-sm">Passos em texto</h4>
                            <span className="px-2 py-0.5 bg-coral-wash text-coral-terra text-[10px] font-semibold rounded-full">
                                {form.steps.filter(Boolean).length}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={addStep}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-coral-terra text-papel-craft rounded-[8px] text-xs font-bold hover:bg-terracota-profundo transition"
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
                    <p className="text-[10px] text-cafe-cinza-quente">
                        Suporte a HTML básico: <code className="bg-cream-elevated px-1 rounded">&lt;strong&gt;</code>, <code className="bg-cream-elevated px-1 rounded">&lt;a href="..."&gt;</code>, <code className="bg-cream-elevated px-1 rounded">&lt;code&gt;</code>
                    </p>
                </div>

                {/* Imagens */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Image className="w-4 h-4 text-coral-terra" />
                            <h4 className="font-semibold text-carvao-quente text-sm">Capturas de tela</h4>
                            <span className="px-2 py-0.5 bg-coral-wash text-coral-terra text-[10px] font-semibold rounded-full">
                                {form.images.length}
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={addImage}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-coral-terra text-papel-craft rounded-[8px] text-xs font-bold hover:bg-terracota-profundo transition"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Adicionar imagem
                        </button>
                    </div>
                    <div className="space-y-2">
                        {form.images.length === 0 && (
                            <div className="py-8 text-center border-2 border-dashed border-borda-cafe rounded-[10px]">
                                <Image className="w-8 h-8 text-borda-cafe mx-auto mb-2" />
                                <p className="text-xs text-cafe-cinza-quente">Nenhuma imagem adicionada ainda</p>
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
            <div className="flex items-center justify-between px-6 py-4 border-t border-borda-cafe bg-cream-elevated">
                {error && (
                    <div className="flex items-center gap-2 text-red-600 text-xs">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                    </div>
                )}
                <div className="flex gap-2 ml-auto">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-bold text-cafe-medio hover:bg-gray-200 rounded-[10px] transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2 bg-coral-terra text-papel-craft rounded-[10px] font-bold text-sm hover:bg-terracota-profundo transition disabled:opacity-50"
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
    const [tab, setTab] = useState<'tutorials' | 'coverage'>('tutorials');

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

        if (error) {
            console.error('Erro ao salvar tutorial:', error);
            throw new Error(error.message || 'Erro ao salvar no banco de dados');
        }

        setSaved(form.slug);
        setTimeout(() => setSaved(null), 3000);
        setEditing(null);
        await fetchBlocks();
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deletar este tutorial block?')) return;
        await supabase.from('tutorial_blocks').delete().eq('id', id);
        fetchBlocks();
    };

    return (
        <div className="space-y-6">

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-borda-cafe">
                {([
                    { id: 'tutorials', label: 'Blocos de tutorial' },
                    { id: 'coverage', label: 'Cobertura' },
                ] as const).map(t => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                            tab === t.id
                                ? 'border-coral-terra text-coral-terra'
                                : 'border-transparent text-cafe-medio hover:text-coral-terra'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {tab === 'coverage' && <CoverageTab blocks={blocks} loading={loading} onRefresh={fetchBlocks} />}

            {tab === 'tutorials' && <>

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-carvao-quente">Tutorial Blocks</h2>
                    <p className="text-sm text-cafe-cinza-quente mt-0.5">
                        Gerencie o conteúdo educativo inline da plataforma — vídeo, passos e imagens.
                    </p>
                </div>
                <button
                    onClick={() => setEditing({ ...EMPTY_BLOCK })}
                    className="flex items-center gap-2 px-4 py-2.5 bg-coral-terra text-papel-craft rounded-[10px] font-bold text-sm hover:bg-terracota-profundo transition shadow-lg shadow-[0_4px_12px_-3px_rgba(80,40,20,0.10)]"
                >
                    <Plus className="w-4 h-4" />
                    Novo Block
                </button>
            </div>

            {saved && (
                <div className="flex items-center gap-2 p-3 bg-[oklch(94%_0.020_145)] border border-verde-oliva/40 rounded-[10px] text-sm text-[oklch(40%_0.060_145)]">
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
                        <div key={i} className="h-20 bg-cream-surface rounded-[12px] border border-borda-cafe animate-pulse" />
                    ))}
                </div>
            ) : blocks.length === 0 ? (
                <div className="py-16 text-center bg-cream-surface rounded-[12px] border border-borda-cafe">
                    <BookOpen className="w-10 h-10 text-borda-cafe mx-auto mb-3" />
                    <p className="font-bold text-cafe-cinza-quente">Nenhum tutorial block criado ainda</p>
                    <p className="text-sm text-cafe-cinza-quente mt-1">Clique em "Novo Block" para começar</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {blocks.map(block => (
                        <div
                            key={block.id}
                            className="flex items-center gap-4 p-4 bg-cream-surface rounded-[12px] border border-borda-cafe hover:border-coral-terra/20 hover:shadow-md transition-all group"
                        >
                            {/* Status icons */}
                            <div className="flex gap-2 shrink-0">
                                <span title="Vídeo" className={`w-7 h-7 rounded-[8px] flex items-center justify-center text-xs ${block.video_url ? 'bg-emerald-100 text-emerald-600' : 'bg-cream-elevated text-borda-cafe'}`}>
                                    <Play className="w-3.5 h-3.5" />
                                </span>
                                <span title="Passos" className={`w-7 h-7 rounded-[8px] flex items-center justify-center text-xs ${block.steps?.length > 0 ? 'bg-blue-100 text-blue-600' : 'bg-cream-elevated text-borda-cafe'}`}>
                                    <BookOpen className="w-3.5 h-3.5" />
                                </span>
                                <span title="Imagens" className={`w-7 h-7 rounded-[8px] flex items-center justify-center text-xs ${block.images?.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-cream-elevated text-borda-cafe'}`}>
                                    <Image className="w-3.5 h-3.5" />
                                </span>
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-carvao-quente text-sm">{block.title}</p>
                                    <code className="px-1.5 py-0.5 bg-cream-elevated text-cafe-cinza-quente text-[10px] rounded font-mono">
                                        {block.slug}
                                    </code>
                                </div>
                                <p className="text-xs text-cafe-cinza-quente mt-0.5">
                                    {block.steps?.length || 0} passos
                                    {block.images?.length > 0 && ` · ${block.images.length} imagens`}
                                    {block.video_url && ' · vídeo'}
                                </p>
                            </div>

                            <div className="flex gap-2 shrink-0">
                                <button
                                    onClick={() => setEditing(block)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-coral-wash text-coral-terra rounded-[8px] text-xs font-bold hover:bg-coral-terra/20 transition"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(block.id)}
                                    className="p-1.5 text-cafe-cinza-quente hover:text-vermelho-tijolo hover:bg-[oklch(94%_0.025_28)] rounded-[8px] transition"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            </>}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// COVERAGE TAB — absorvido de ProductionChecklist.tsx (deletado)
// ─────────────────────────────────────────────────────────────────────────

// Slugs do sistema (fonte da verdade). Adicione aqui sempre que um novo
// TutorialBlock for usado em algum lugar da plataforma.
const SYSTEM_SLUGS: { slug: string; location: string; description: string }[] = [
    { slug: 'github-token', location: 'TokenGate + Configurações', description: 'Como criar token do GitHub' },
    { slug: 'vercel-token', location: 'TokenGate + Configurações', description: 'Como criar token da Vercel' },
];

function CoverageTab({
    blocks, loading, onRefresh,
}: {
    blocks: TutorialBlock[];
    loading: boolean;
    onRefresh: () => void;
}) {
    const systemItems = SYSTEM_SLUGS.map(s => ({
        ...s,
        block: blocks.find(b => b.slug === s.slug) || null,
    }));
    const extraBlocks = blocks.filter(b => !SYSTEM_SLUGS.find(s => s.slug === b.slug));
    const allItems = [...systemItems.map(s => s.block), ...extraBlocks].filter(Boolean) as TutorialBlock[];
    const withVideo = allItems.filter(b => !!b.video_url).length;
    const withSteps = allItems.filter(b => b.steps?.length > 0).length;
    const withImages = allItems.filter(b => b.images?.length > 0).length;
    const total = systemItems.length + extraBlocks.length;

    if (loading) {
        return (
            <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-20 bg-cream-surface border border-borda-cafe rounded-[12px] animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-display text-xl font-normal text-carvao-quente tracking-tight">
                        Cobertura de tutoriais
                    </h3>
                    <p className="text-sm text-cafe-medio mt-0.5">
                        Status de cada bloco esperado pelo código — o que falta gravar ou completar.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onRefresh}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-cafe-medio hover:text-coral-terra hover:bg-coral-wash rounded-[8px] transition-colors min-h-[36px]"
                >
                    <Video className="w-4 h-4" />
                    Atualizar
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Com vídeo', value: withVideo, total },
                    { label: 'Com passos', value: withSteps, total },
                    { label: 'Com imagens', value: withImages, total },
                ].map(stat => {
                    const pct = total === 0 ? 0 : Math.round((stat.value / total) * 100);
                    return (
                        <div key={stat.label} className="bg-cream-surface border border-borda-cafe rounded-[12px] p-4">
                            <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-wide">{stat.label}</p>
                            <p className="font-display text-2xl font-normal text-carvao-quente tabular-nums tracking-tight mt-1">
                                {stat.value}
                                <span className="text-cafe-cinza-quente text-base">/{stat.total}</span>
                            </p>
                            <div className="mt-3 h-1 bg-borda-cafe rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all ${pct === 100 ? 'bg-verde-oliva' : 'bg-coral-terra'}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Slugs do sistema */}
            <div className="bg-cream-surface border border-borda-cafe rounded-[12px] overflow-hidden">
                <div className="px-5 py-3 border-b border-borda-cafe bg-cream-elevated/50">
                    <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em]">
                        Esperado pelo código
                    </p>
                </div>
                <div className="divide-y divide-borda-cafe">
                    {systemItems.map(item => {
                        const b = item.block;
                        const hasVideo = !!b?.video_url;
                        const hasSteps = (b?.steps?.length ?? 0) > 0;
                        const isComplete = hasVideo && hasSteps;
                        const status = !b ? 'missing' : isComplete ? 'complete' : 'partial';

                        return (
                            <div key={item.slug} className="px-5 py-4 flex items-start gap-3">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                                    status === 'complete' ? 'bg-verde-oliva text-papel-craft'
                                    : status === 'missing' ? 'bg-[oklch(94%_0.025_28)] text-vermelho-tijolo'
                                    : 'bg-mostarda-amber text-carvao-quente'
                                }`}>
                                    {status === 'complete'
                                        ? <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                        : <AlertCircle className="w-3.5 h-3.5" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold text-carvao-quente text-sm">{item.description}</p>
                                        <code className="font-mono bg-cream-elevated text-cafe-cinza-quente text-xs px-1.5 py-0.5 rounded">
                                            {item.slug}
                                        </code>
                                    </div>
                                    <p className="text-xs text-cafe-cinza-quente mt-0.5">
                                        Aparece em: <strong className="text-cafe-medio">{item.location}</strong>
                                    </p>
                                    {!b ? (
                                        <p className="text-xs text-vermelho-tijolo font-semibold mt-2">
                                            Não existe no banco — crie na aba Blocos.
                                        </p>
                                    ) : (
                                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                hasVideo ? 'bg-[oklch(94%_0.020_145)] text-[oklch(40%_0.060_145)]' : 'bg-cream-elevated text-cafe-cinza-quente'
                                            }`}>
                                                {hasVideo ? 'Vídeo ✓' : 'Sem vídeo'}
                                            </span>
                                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                hasSteps ? 'bg-[oklch(94%_0.020_145)] text-[oklch(40%_0.060_145)]' : 'bg-cream-elevated text-cafe-cinza-quente'
                                            }`}>
                                                {b.steps?.length ?? 0} {b.steps?.length === 1 ? 'passo' : 'passos'}
                                            </span>
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 bg-cream-elevated text-cafe-medio rounded-full">
                                                {b.images?.length ?? 0} {b.images?.length === 1 ? 'imagem' : 'imagens'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Blocos extras (criados no admin mas não esperados pelo código) */}
            {extraBlocks.length > 0 && (
                <div className="bg-cream-surface border border-borda-cafe rounded-[12px] overflow-hidden">
                    <div className="px-5 py-3 border-b border-borda-cafe bg-cream-elevated/50">
                        <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em]">
                            Outros blocos no banco (não mapeados pelo código)
                        </p>
                    </div>
                    <div className="divide-y divide-borda-cafe">
                        {extraBlocks.map(b => (
                            <div key={b.id} className="px-5 py-3 flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold text-carvao-quente text-sm">{b.title}</p>
                                        <code className="font-mono bg-cream-elevated text-cafe-cinza-quente text-xs px-1.5 py-0.5 rounded">{b.slug}</code>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {b.video_url && (
                                        <span className="text-xs font-semibold text-[oklch(40%_0.060_145)]">Vídeo ✓</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
