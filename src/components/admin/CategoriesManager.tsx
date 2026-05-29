import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Tags } from 'lucide-react';
import { PageHeader, DataTable, FormModal } from '../ui/admin';
import type { Column } from '../ui/admin';
import { Field, Input } from '../ui';

interface Category {
    id: string;
    name: string;
    slug?: string | null;
    description?: string | null;
    icon?: string | null;
    display_order?: number | null;
    created_at?: string;
}

export default function CategoriesManager() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [name, setName] = useState('');

    useEffect(() => {
        fetchCategories();
    }, []);

    async function fetchCategories() {
        setLoading(true);
        const { data } = await supabase
            .from('template_categories')
            .select('*')
            .order('display_order', { ascending: true });
        if (data) setCategories(data as Category[]);
        setLoading(false);
    }

    async function handleSave(e: FormEvent) {
        e.preventDefault();
        setSaving(true);
        try {
            if (editId) {
                const { error } = await supabase
                    .from('template_categories')
                    .update({ name })
                    .eq('id', editId);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('template_categories')
                    .insert([{ name }]);
                if (error) throw error;
            }
            closeModal();
            await fetchCategories();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Erro ao salvar.');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(category: Category) {
        if (!confirm(`Excluir categoria "${category.name}"? Templates vinculados perdem essa classificação.`)) return;
        const { error } = await supabase.from('template_categories').delete().eq('id', category.id);
        if (error) {
            alert('Erro ao deletar: ' + error.message);
        } else {
            fetchCategories();
        }
    }

    function openModal(category?: Category) {
        if (category) {
            setEditId(category.id);
            setName(category.name);
        } else {
            setEditId(null);
            setName('');
        }
        setIsModalOpen(true);
    }

    function closeModal() {
        setIsModalOpen(false);
        setEditId(null);
        setName('');
    }

    const columns: Column<Category>[] = [
        {
            key: 'name',
            header: 'Nome',
            cell: (row) => (
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-coral-wash flex items-center justify-center shrink-0">
                        <Tags className="w-3.5 h-3.5 text-coral-terra" />
                    </div>
                    <span className="font-semibold text-carvao-quente">{row.name}</span>
                </div>
            ),
        },
        {
            key: 'slug',
            header: 'Slug',
            cell: (row) => row.slug
                ? <span className="font-mono text-xs text-cafe-cinza-quente">{row.slug}</span>
                : <span className="text-cafe-cinza-quente italic text-xs">—</span>,
        },
        {
            key: 'actions',
            header: '',
            align: 'right',
            cell: (row) => (
                <div className="inline-flex items-center gap-1 justify-end">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openModal(row); }}
                        aria-label={`Editar ${row.name}`}
                        className="p-2 text-cafe-cinza-quente hover:text-coral-terra hover:bg-coral-wash rounded-md transition-colors"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(row); }}
                        aria-label={`Excluir ${row.name}`}
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
                title="Categorias"
                tagline="Organizar templates por nicho/objetivo."
                action={
                    <button
                        type="button"
                        onClick={() => openModal()}
                        className="inline-flex items-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-4 py-2.5 rounded-[10px] font-semibold text-sm transition-colors active:scale-[0.98] min-h-[40px]"
                    >
                        <Plus className="w-4 h-4" />
                        Nova categoria
                    </button>
                }
            />

            <DataTable
                columns={columns}
                rows={categories}
                rowKey={(row) => row.id}
                loading={loading}
                emptyState={
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-coral-wash flex items-center justify-center mx-auto mb-3">
                            <Tags className="w-5 h-5 text-coral-terra" />
                        </div>
                        <p className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                            Nenhuma categoria cadastrada.
                        </p>
                        <p className="text-sm text-cafe-medio mt-1">
                            Comece criando "Blogs", "Negócios Locais", "Landing Pages", "Portfolio".
                        </p>
                    </div>
                }
            />

            <FormModal
                open={isModalOpen}
                title={editId ? 'Editar categoria' : 'Nova categoria'}
                onClose={closeModal}
                onSubmit={handleSave}
                submitting={saving}
                submitLabel={editId ? 'Atualizar' : 'Criar categoria'}
                submitDisabled={!name.trim()}
            >
                <Field
                    label="Nome da categoria"
                    htmlFor="cat-name"
                    helper="Ex: Blogs, Negócios Locais, Landing Pages, Portfolio."
                >
                    <Input
                        id="cat-name"
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Nome curto e claro"
                    />
                </Field>
            </FormModal>
        </div>
    );
}
