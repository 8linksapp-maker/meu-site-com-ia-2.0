import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, FileStack, Upload, Lock, Unlock, ImageIcon } from 'lucide-react';
import { PageHeader, DataTable, FormModal, StatusBadge } from '../ui/admin';
import Pagination from '../ui/admin/Pagination';
import type { Column } from '../ui/admin';
import { Field, Input, Textarea } from '../ui';

interface Template {
    id: string;
    name: string;
    description: string;
    repo: string;
    preview_url?: string;
    image_url?: string;
    images?: string[];
    category_ids?: string[];
    is_locked?: boolean;
    release_date?: string;
}

interface CategoryLite {
    id: string;
    name: string;
}

export default function TemplatesManager() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [categories, setCategories] = useState<CategoryLite[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [page, setPage] = useState(1);
    const TEMPLATES_PAGE_SIZE = 20;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [repo, setRepo] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const [isLocked, setIsLocked] = useState(false);
    const [releaseDate, setReleaseDate] = useState('');

    const [existingImages, setExistingImages] = useState<string[]>([]);
    const [newImageFiles, setNewImageFiles] = useState<File[]>([]);

    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    useEffect(() => {
        fetchTemplates();
        fetchCategories();
    }, []);

    async function fetchCategories() {
        const { data } = await supabase.from('template_categories').select('id, name').order('name');
        if (data) setCategories(data as CategoryLite[]);
    }

    async function fetchTemplates() {
        setLoading(true);
        const { data } = await supabase.from('templates').select('*').order('created_at', { ascending: false });
        if (data) setTemplates(data as Template[]);
        setLoading(false);
    }

    async function handleSave(e: FormEvent) {
        e.preventDefault();
        setSaving(true);

        try {
            const uploadedUrls: string[] = [];
            for (const file of newImageFiles) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random()}.${fileExt}`;
                const filePath = `covers/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('templates')
                    .upload(filePath, file);

                if (uploadError) {
                    alert(`Erro upload ${file.name}: ${uploadError.message}`);
                    continue;
                }

                const { data } = supabase.storage.from('templates').getPublicUrl(filePath);
                uploadedUrls.push(data.publicUrl);
            }

            const finalImages = [...existingImages, ...uploadedUrls];
            const payload = {
                name,
                description,
                repo,
                preview_url: previewUrl,
                image_url: finalImages[0] || '',
                images: finalImages,
                category_ids: selectedCategories,
                is_locked: isLocked,
                release_date: releaseDate || null,
            };

            if (editId) {
                const { error } = await supabase.from('templates').update(payload).eq('id', editId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('templates').insert([payload]);
                if (error) throw error;
            }

            closeModal();
            fetchTemplates();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Erro ao salvar');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(template: Template) {
        if (!confirm(`Excluir template "${template.name}"?`)) return;
        const { error } = await supabase.from('templates').delete().eq('id', template.id);
        if (error) alert('Erro ao deletar: ' + error.message);
        else fetchTemplates();
    }

    function openModal(template?: Template) {
        setNewImageFiles([]);
        if (template) {
            setEditId(template.id);
            setName(template.name || '');
            setDescription(template.description || '');
            setRepo(template.repo || '');
            setPreviewUrl(template.preview_url || '');
            setIsLocked(template.is_locked || false);
            setReleaseDate(template.release_date ? new Date(template.release_date).toISOString().slice(0, 16) : '');
            const dbImages = template.images?.length
                ? template.images
                : (template.image_url ? [template.image_url] : []);
            setExistingImages(dbImages);
            setSelectedCategories(template.category_ids || []);
        } else {
            setEditId(null);
            setName('');
            setDescription('');
            setRepo('');
            setPreviewUrl('');
            setExistingImages([]);
            setSelectedCategories([]);
            setIsLocked(false);
            setReleaseDate('');
        }
        setIsModalOpen(true);
    }

    function closeModal() {
        setIsModalOpen(false);
    }

    const columns: Column<Template>[] = [
        {
            key: 'preview',
            header: '',
            width: 'w-20',
            cell: (t) => (
                <div className="w-14 h-10 bg-cream-elevated rounded-[6px] overflow-hidden border border-borda-cafe">
                    {t.image_url ? (
                        <img src={t.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-cafe-cinza-quente">
                            <ImageIcon className="w-4 h-4" />
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'name',
            header: 'Nome',
            cell: (t) => (
                <div className="min-w-0">
                    <p className="font-semibold text-carvao-quente truncate">{t.name}</p>
                    {t.description && (
                        <p className="text-xs text-cafe-cinza-quente truncate mt-0.5 max-w-xs">{t.description}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'repo',
            header: 'Repositório',
            cell: (t) => (
                <span className="font-mono text-xs text-cafe-medio">{t.repo}</span>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            cell: (t) => t.is_locked
                ? <StatusBadge tone="pending" icon={<Lock className="w-3 h-3" />}>Travado</StatusBadge>
                : <StatusBadge tone="success" icon={<Unlock className="w-3 h-3" />}>Disponível</StatusBadge>,
        },
        {
            key: 'categories',
            header: 'Categorias',
            cell: (t) => {
                const cats = (t.category_ids ?? []).map(id => categories.find(c => c.id === id)?.name).filter(Boolean);
                if (cats.length === 0) return <span className="text-xs text-cafe-cinza-quente italic">—</span>;
                return (
                    <div className="flex flex-wrap gap-1">
                        {cats.slice(0, 2).map((c, i) => (
                            <span key={i} className="text-xs font-semibold px-2 py-0.5 bg-cream-elevated text-cafe-medio rounded-full">
                                {c}
                            </span>
                        ))}
                        {cats.length > 2 && (
                            <span className="text-xs text-cafe-cinza-quente">+{cats.length - 2}</span>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'actions',
            header: '',
            align: 'right',
            cell: (t) => (
                <div className="inline-flex items-center gap-1 justify-end">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openModal(t); }}
                        aria-label="Editar template"
                        className="p-2 text-cafe-cinza-quente hover:text-coral-terra hover:bg-coral-wash rounded-md transition-colors"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(t); }}
                        aria-label="Excluir template"
                        className="p-2 text-cafe-cinza-quente hover:text-vermelho-tijolo hover:bg-[oklch(94%_0.025_28)] rounded-md transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Templates"
                tagline={`${templates.length} ${templates.length === 1 ? 'template' : 'templates'} cadastrados na vitrine.`}
                action={
                    <button
                        type="button"
                        onClick={() => openModal()}
                        className="inline-flex items-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-4 py-2.5 rounded-[10px] font-semibold text-sm transition-colors active:scale-[0.98] min-h-[40px]"
                    >
                        <Plus className="w-4 h-4" />
                        Novo template
                    </button>
                }
            />

            <DataTable
                columns={columns}
                rows={templates.slice((page - 1) * TEMPLATES_PAGE_SIZE, page * TEMPLATES_PAGE_SIZE)}
                rowKey={(t) => t.id}
                loading={loading}
                emptyState={
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-coral-wash flex items-center justify-center mx-auto mb-3">
                            <FileStack className="w-5 h-5 text-coral-terra" />
                        </div>
                        <p className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                            Nenhum template cadastrado.
                        </p>
                    </div>
                }
            />

            <Pagination
                page={page}
                pageSize={TEMPLATES_PAGE_SIZE}
                total={templates.length}
                onPageChange={setPage}
                label="templates"
            />

            <FormModal
                open={isModalOpen}
                title={editId ? 'Editar template' : 'Novo template'}
                onClose={closeModal}
                onSubmit={handleSave}
                submitting={saving}
                submitLabel={editId ? 'Atualizar' : 'Criar template'}
                width="lg"
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Nome do template" htmlFor="tpl-name">
                        <Input
                            id="tpl-name"
                            type="text"
                            required
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="Ex: Landing Page SaaS"
                        />
                    </Field>
                    <Field label="Repositório GitHub" htmlFor="tpl-repo">
                        <Input
                            id="tpl-repo"
                            type="text"
                            required
                            value={repo}
                            onChange={e => setRepo(e.target.value)}
                            placeholder="usuario/repo-template"
                            className="font-mono text-sm"
                        />
                    </Field>
                </div>

                <Field label="Link da prévia ao vivo" htmlFor="tpl-preview" optional>
                    <Input
                        id="tpl-preview"
                        type="url"
                        value={previewUrl}
                        onChange={e => setPreviewUrl(e.target.value)}
                        placeholder="https://exemplo.com"
                    />
                </Field>

                <Field label="Descrição" htmlFor="tpl-desc">
                    <Textarea
                        id="tpl-desc"
                        required
                        rows={3}
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Descrição do template pra audiência leiga."
                    />
                </Field>

                <Field label="Imagens da vitrine" htmlFor="tpl-images" helper="Primeira imagem vira capa principal.">
                    <div className="space-y-3">
                        {existingImages.length > 0 && (
                            <div className="flex flex-wrap gap-2 bg-cream-elevated border border-borda-cafe rounded-[8px] p-3">
                                {existingImages.map((url, idx) => (
                                    <div key={idx} className="relative group">
                                        <img src={url} alt={`img-${idx}`} className="h-16 w-24 object-cover rounded-[6px] border border-borda-cafe" />
                                        <button
                                            type="button"
                                            onClick={() => setExistingImages(existingImages.filter((_, i) => i !== idx))}
                                            aria-label="Remover imagem"
                                            className="absolute -top-2 -right-2 bg-vermelho-tijolo hover:bg-[oklch(40%_0.130_28)] text-papel-craft w-6 h-6 rounded-full flex items-center justify-center text-xs shadow opacity-0 group-hover:opacity-100 transition-opacity"
                                        >×</button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <label
                            id="tpl-images"
                            className="flex flex-col items-center justify-center gap-2 px-6 py-6 border border-dashed border-borda-cafe rounded-[8px] hover:bg-coral-wash/40 hover:border-coral-terra cursor-pointer transition-colors"
                        >
                            <Upload className="w-6 h-6 text-cafe-cinza-quente" />
                            <span className="text-sm font-semibold text-coral-terra">Selecionar imagens</span>
                            <span className="text-xs text-cafe-cinza-quente">Pode escolher várias</span>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                onChange={e => {
                                    if (e.target.files) {
                                        setNewImageFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                                    }
                                }}
                            />
                        </label>
                        {newImageFiles.length > 0 && (
                            <p className="text-xs text-coral-terra font-semibold tabular-nums">
                                + {newImageFiles.length} imagem{newImageFiles.length === 1 ? '' : 's'} na fila pra upload.
                            </p>
                        )}
                    </div>
                </Field>

                <Field label="Categorias" htmlFor="tpl-cats" helper="Selecione um ou mais nichos.">
                    {categories.length === 0 ? (
                        <p className="text-sm text-cafe-cinza-quente italic">
                            Nenhuma categoria cadastrada. Crie em "Categorias" no menu.
                        </p>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-44 overflow-y-auto bg-cream-elevated border border-borda-cafe rounded-[8px] p-3">
                            {categories.map(c => (
                                <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:text-coral-terra transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={selectedCategories.includes(c.id)}
                                        onChange={e => {
                                            if (e.target.checked) {
                                                setSelectedCategories([...selectedCategories, c.id]);
                                            } else {
                                                setSelectedCategories(selectedCategories.filter(id => id !== c.id));
                                            }
                                        }}
                                        className="w-4 h-4 accent-coral-terra"
                                    />
                                    <span className="truncate text-carvao-quente">{c.name}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </Field>

                {/* Travamento */}
                <div className="bg-cream-elevated border border-borda-cafe rounded-[10px] p-4 space-y-3">
                    <label className="flex items-start justify-between gap-3 cursor-pointer">
                        <div>
                            <p className="text-sm font-semibold text-carvao-quente">Travar (em desenvolvimento)</p>
                            <p className="text-xs text-cafe-medio mt-0.5">Template fica visível na vitrine mas botão "Publicar" desativa.</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={isLocked}
                            onChange={e => setIsLocked(e.target.checked)}
                            className="w-5 h-5 accent-coral-terra mt-1 shrink-0"
                        />
                    </label>
                    {isLocked && (
                        <Field label="Data de liberação" htmlFor="release-date" optional helper="Aparece como aviso na vitrine.">
                            <Input
                                id="release-date"
                                type="datetime-local"
                                value={releaseDate}
                                onChange={e => setReleaseDate(e.target.value)}
                            />
                        </Field>
                    )}
                </div>
            </FormModal>
        </div>
    );
}
