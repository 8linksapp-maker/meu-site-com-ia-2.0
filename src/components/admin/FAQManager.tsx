import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Plus, Pencil, Trash2, ChevronUp, ChevronDown, Search,
    HelpCircle, Eye, EyeOff, Loader2,
} from 'lucide-react';
import PageHeader from '../ui/admin/PageHeader';
import StatusBadge from '../ui/admin/StatusBadge';
import FormModal from '../ui/admin/FormModal';
import Pagination from '../ui/admin/Pagination';
import { Card, Banner, Field, Input, Textarea, EmptyState } from '../ui';

interface FAQArticle {
    id: string;
    category: string;
    question: string;
    answer: string;
    display_order: number;
    is_published: boolean;
    created_at?: string;
    updated_at?: string;
}

const EMPTY_ARTICLE: Omit<FAQArticle, 'id'> = {
    category: 'Geral',
    question: '',
    answer: '',
    display_order: 0,
    is_published: true,
};

export default function FAQManager() {
    const [articles, setArticles] = useState<FAQArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [editing, setEditing] = useState<(Omit<FAQArticle, 'id'> & { id?: string }) | null>(null);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 15;

    useEffect(() => { setPage(1); }, [search, categoryFilter]);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('faq_articles')
                .select('*')
                .order('category')
                .order('display_order');
            if (data) setArticles(data as FAQArticle[]);
        } finally {
            setLoading(false);
        }
    }

    const categories = useMemo(() => {
        const counts = new Map<string, number>();
        for (const a of articles) counts.set(a.category, (counts.get(a.category) || 0) + 1);
        return Array.from(counts.entries());
    }, [articles]);

    const filtered = useMemo(() => {
        let result = articles;
        if (categoryFilter !== 'all') result = result.filter(a => a.category === categoryFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(a =>
                a.question.toLowerCase().includes(q) ||
                a.answer.toLowerCase().includes(q) ||
                a.category.toLowerCase().includes(q)
            );
        }
        return result;
    }, [articles, search, categoryFilter]);

    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    async function handleDelete(id: string) {
        if (!confirm('Apagar essa pergunta?')) return;
        await supabase.from('faq_articles').delete().eq('id', id);
        load();
    }

    async function handleTogglePublish(article: FAQArticle) {
        await supabase.from('faq_articles').update({ is_published: !article.is_published }).eq('id', article.id);
        load();
    }

    async function handleMove(article: FAQArticle, dir: 'up' | 'down') {
        const sameCategory = articles.filter(a => a.category === article.category).sort((a, b) => a.display_order - b.display_order);
        const idx = sameCategory.findIndex(a => a.id === article.id);
        const other = dir === 'up' ? idx - 1 : idx + 1;
        if (other < 0 || other >= sameCategory.length) return;
        const a = sameCategory[idx];
        const b = sameCategory[other];
        await Promise.all([
            supabase.from('faq_articles').update({ display_order: b.display_order }).eq('id', a.id),
            supabase.from('faq_articles').update({ display_order: a.display_order }).eq('id', b.id),
        ]);
        load();
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-coral-terra" />
                <p className="text-cafe-medio text-sm">Carregando…</p>
            </div>
        );
    }

    const publishedCount = articles.filter(a => a.is_published).length;

    return (
        <div className="space-y-6 pb-8">
            <PageHeader
                icon={<HelpCircle className="w-5 h-5" />}
                title="Perguntas frequentes"
                tagline={`${articles.length} ${articles.length === 1 ? 'pergunta cadastrada' : 'perguntas cadastradas'} · ${publishedCount} publicada${publishedCount !== 1 ? 's' : ''}`}
                action={
                    <button
                        type="button"
                        onClick={() => setEditing({ ...EMPTY_ARTICLE })}
                        className="inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-5 py-2.5 rounded-[10px] font-semibold text-sm transition-colors active:scale-[0.98] min-h-[44px]"
                    >
                        <Plus className="w-4 h-4" />
                        Nova pergunta
                    </button>
                }
            />

            <div className="flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cafe-cinza-quente pointer-events-none" />
                    <input
                        type="search"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por pergunta, resposta ou categoria…"
                        className="w-full pl-9 pr-4 py-2 bg-cream-elevated text-carvao-quente text-sm font-normal rounded-[10px] border border-borda-cafe focus:border-coral-terra focus:outline-none transition-colors min-h-[40px]"
                    />
                </div>
                <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="bg-cream-surface text-carvao-quente text-sm font-semibold rounded-[10px] px-3 py-2 border border-borda-cafe focus:border-coral-terra focus:outline-none min-h-[40px]"
                >
                    <option value="all">Todas categorias</option>
                    {categories.map(([cat, count]) => (
                        <option key={cat} value={cat}>{cat} ({count})</option>
                    ))}
                </select>
            </div>

            {filtered.length === 0 ? (
                <EmptyState
                    icon={HelpCircle}
                    title="Nenhuma pergunta encontrada"
                    description={search || categoryFilter !== 'all' ? 'Tenta outro filtro.' : 'Cadastre a primeira pergunta clicando em "Nova pergunta".'}
                />
            ) : (
                <div className="space-y-2.5">
                    {paginated.map(article => {
                        const sameCategory = filtered.filter(a => a.category === article.category);
                        const idxInCategory = sameCategory.findIndex(a => a.id === article.id);
                        return (
                            <Card key={article.id} padding="md">
                                <div className="flex items-start gap-3">
                                    <div className="flex flex-col gap-0.5 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleMove(article, 'up')}
                                            disabled={idxInCategory === 0}
                                            aria-label="Mover pra cima"
                                            className="w-6 h-6 flex items-center justify-center text-cafe-cinza-quente hover:text-coral-terra disabled:opacity-30"
                                        >
                                            <ChevronUp className="w-3 h-3" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMove(article, 'down')}
                                            disabled={idxInCategory === sameCategory.length - 1}
                                            aria-label="Mover pra baixo"
                                            className="w-6 h-6 flex items-center justify-center text-cafe-cinza-quente hover:text-coral-terra disabled:opacity-30"
                                        >
                                            <ChevronDown className="w-3 h-3" />
                                        </button>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-1">
                                            <StatusBadge tone="info">{article.category}</StatusBadge>
                                            {article.is_published ? (
                                                <StatusBadge tone="success">Publicada</StatusBadge>
                                            ) : (
                                                <StatusBadge tone="neutral">Rascunho</StatusBadge>
                                            )}
                                        </div>
                                        <p className="font-semibold text-carvao-quente text-sm leading-snug">
                                            {article.question}
                                        </p>
                                        <p className="text-xs text-cafe-cinza-quente mt-1 line-clamp-2 leading-relaxed">
                                            {article.answer.replace(/[#*_`>-]/g, '').slice(0, 200)}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() => handleTogglePublish(article)}
                                            aria-label={article.is_published ? 'Despublicar' : 'Publicar'}
                                            title={article.is_published ? 'Despublicar' : 'Publicar'}
                                            className="w-9 h-9 flex items-center justify-center text-cafe-medio hover:text-coral-terra hover:bg-coral-wash rounded-md transition-colors"
                                        >
                                            {article.is_published ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setEditing(article)}
                                            aria-label="Editar"
                                            className="w-9 h-9 flex items-center justify-center text-cafe-medio hover:text-coral-terra hover:bg-coral-wash rounded-md transition-colors"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(article.id)}
                                            aria-label="Apagar"
                                            className="w-9 h-9 flex items-center justify-center text-cafe-cinza-quente hover:text-vermelho-tijolo hover:bg-[oklch(94%_0.025_28)] rounded-md transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                    <Pagination
                        page={page}
                        pageSize={PAGE_SIZE}
                        total={filtered.length}
                        onPageChange={setPage}
                        label="perguntas"
                    />
                </div>
            )}

            {editing && (
                <FAQFormModal
                    article={editing}
                    existingCategories={categories.map(([c]) => c)}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); load(); }}
                />
            )}
        </div>
    );
}

function FAQFormModal({
    article, existingCategories, onClose, onSaved,
}: {
    article: Omit<FAQArticle, 'id'> & { id?: string };
    existingCategories: string[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const [category, setCategory] = useState(article.category);
    const [question, setQuestion] = useState(article.question);
    const [answer, setAnswer] = useState(article.answer);
    const [displayOrder, setDisplayOrder] = useState(article.display_order);
    const [isPublished, setIsPublished] = useState(article.is_published);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!question.trim()) {
            setError('Pergunta é obrigatória.');
            return;
        }
        if (!answer.trim()) {
            setError('Resposta é obrigatória.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const payload = {
                ...(article.id ? { id: article.id } : {}),
                category: category.trim() || 'Geral',
                question: question.trim(),
                answer: answer.trim(),
                display_order: displayOrder,
                is_published: isPublished,
            };
            const { error: e } = await supabase.from('faq_articles').upsert(payload);
            if (e) throw e;
            onSaved();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Erro ao salvar.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <FormModal
            open
            title={article.id ? 'Editar pergunta' : 'Nova pergunta'}
            onClose={onClose}
            onSubmit={handleSubmit}
            submitting={saving}
            width="lg"
        >
            {error && <Banner tone="error">{error}</Banner>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Categoria" htmlFor="faq-category" helper="Pode reusar ou criar nova.">
                    <Input
                        id="faq-category"
                        value={category}
                        onChange={e => setCategory(e.target.value)}
                        placeholder="Conta, Domínio, Afiliados…"
                        list="faq-categories"
                    />
                    <datalist id="faq-categories">
                        {existingCategories.map(c => <option key={c} value={c} />)}
                    </datalist>
                </Field>
                <Field label="Ordem na categoria" htmlFor="faq-order">
                    <Input
                        id="faq-order"
                        type="number"
                        min={0}
                        value={displayOrder}
                        onChange={e => setDisplayOrder(parseInt(e.target.value) || 0)}
                    />
                </Field>
                <div className="flex items-end pb-1.5">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isPublished}
                            onChange={e => setIsPublished(e.target.checked)}
                            className="w-4 h-4 accent-coral-terra"
                        />
                        <span className="text-sm text-carvao-quente font-semibold">Publicada</span>
                    </label>
                </div>
            </div>

            <Field label="Pergunta" htmlFor="faq-question">
                <Input
                    id="faq-question"
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                    placeholder="Como eu faço pra…"
                />
            </Field>

            <Field
                label="Resposta (suporta markdown básico)"
                htmlFor="faq-answer"
                helper="**negrito**, *itálico*, `código`, [link](url), listas com - ou 1., pule linha pra novo parágrafo."
            >
                <Textarea
                    id="faq-answer"
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    rows={10}
                    placeholder="Resposta clara e didática…"
                    className="font-mono text-sm"
                />
            </Field>
        </FormModal>
    );
}
