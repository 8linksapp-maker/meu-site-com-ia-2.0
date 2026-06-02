import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Section, Card, Banner, Input } from '../ui';
import {
    ArrowRight, ChevronLeft, ChevronRight, X, Search,
    Loader2, AlertCircle, Sparkles, ExternalLink
} from 'lucide-react';

interface Template {
    id: string;
    name: string;
    image_url: string | null;
    preview_url?: string | null;
    images?: string[] | null;
    description?: string | null;
    repo?: string;
    category_ids?: string[];
    created_at: string;
    display_order?: number;
}

interface Category {
    id: string;
    name: string;
    slug?: string;
    description?: string;
    display_order?: number;
}

type SortOption = 'recommended' | 'newest';

export default function SitesShowcase() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [hasTokens, setHasTokens] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState<SortOption>('recommended');

    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('github_token, vercel_token')
                    .eq('id', session.user.id);
                const profile = profiles?.[0];
                setHasTokens(!!(profile?.github_token && profile?.vercel_token));
            } else {
                setHasTokens(false);
            }

            const [{ data: catsData }, { data: templatesData }] = await Promise.all([
                supabase.from('template_categories').select('*').order('display_order', { ascending: true }),
                supabase.from('templates').select('*').order('created_at', { ascending: false }),
            ]);

            if (catsData) setCategories(catsData);
            if (templatesData) setTemplates(templatesData);
        } catch (err) {
            console.error('Erro carregando vitrine:', err);
        } finally {
            setLoading(false);
        }
    }

    // ── Filtragem + ordenação derivada ──
    const filteredTemplates = useMemo(() => {
        let result = templates;

        if (selectedCategory) {
            result = result.filter(t => t.category_ids?.includes(selectedCategory));
        }

        const searchLower = search.trim().toLowerCase();
        if (searchLower) {
            result = result.filter(t =>
                t.name?.toLowerCase().includes(searchLower) ||
                t.description?.toLowerCase().includes(searchLower)
            );
        }

        if (sortBy === 'newest') {
            result = [...result].sort((a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            );
        } else {
            // recommended: display_order asc (fallback created_at desc)
            result = [...result].sort((a, b) => {
                const aOrder = a.display_order ?? 9999;
                const bOrder = b.display_order ?? 9999;
                if (aOrder !== bOrder) return aOrder - bOrder;
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
        }

        return result;
    }, [templates, selectedCategory, search, sortBy]);

    // ── Contagem por categoria pra badges no filter chips ──
    const countByCategory = useMemo(() => {
        const map = new Map<string, number>();
        map.set('all', templates.length);
        categories.forEach(c => {
            map.set(c.id, templates.filter(t => t.category_ids?.includes(c.id)).length);
        });
        return map;
    }, [templates, categories]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-coral-terra" />
                <p className="text-cafe-medio text-sm">Carregando vitrine…</p>
            </div>
        );
    }

    if (templates.length === 0) {
        return (
            <Card padding="lg">
                <p className="text-cafe-medio text-sm italic">Nenhum template disponível no momento. Volte em breve.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div>
                <h1 className="font-display text-3xl md:text-[2rem] font-normal text-carvao-quente tracking-tight">
                    Vitrine de templates
                </h1>
                <p className="text-base text-cafe-medio mt-1.5 tabular-nums">
                    {templates.length} {templates.length === 1 ? 'template pronto' : 'templates prontos'} pra publicar.
                </p>
            </div>

            {/* Alerta sem tokens */}
            {hasTokens === false && (
                <Banner
                    tone="warning"
                    title="Você ainda não conectou suas contas"
                    action={
                        <a
                            href="/configuracoes?tab=integracao"
                            className="inline-flex items-center gap-1 text-sm font-semibold text-coral-terra hover:text-terracota-profundo transition-colors"
                        >
                            Conectar agora <ArrowRight className="w-3.5 h-3.5" />
                        </a>
                    }
                >
                    Você pode olhar os templates abaixo, mas pra publicar precisa conectar GitHub e Vercel primeiro. Leva 5 minutos.
                </Banner>
            )}

            {/* Filter chips horizontais */}
            <div className="flex flex-wrap gap-2">
                <FilterChip
                    label="Todos"
                    count={countByCategory.get('all') ?? 0}
                    active={selectedCategory === null}
                    onClick={() => setSelectedCategory(null)}
                />
                {categories.map(cat => {
                    const count = countByCategory.get(cat.id) ?? 0;
                    if (count === 0) return null;
                    return (
                        <FilterChip
                            key={cat.id}
                            label={cat.name}
                            count={count}
                            active={selectedCategory === cat.id}
                            onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                        />
                    );
                })}
            </div>

            {/* Toolbar: busca + sort */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                    <Input
                        type="search"
                        placeholder="Buscar por nome ou descrição…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        leftIcon={<Search className="w-4 h-4" />}
                    />
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <label htmlFor="sort" className="text-xs font-semibold text-cafe-cinza-quente uppercase tracking-wide shrink-0">
                        Ordenar
                    </label>
                    <select
                        id="sort"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as SortOption)}
                        className="bg-cream-surface text-carvao-quente text-sm font-semibold rounded-[12px] px-4 py-3 border border-borda-cafe focus:border-coral-terra focus:outline-none min-h-[44px]"
                    >
                        <option value="recommended">Recomendados</option>
                        <option value="newest">Mais novos</option>
                    </select>
                </div>
            </div>

            {/* Grid de templates */}
            {filteredTemplates.length === 0 ? (
                <Card padding="lg">
                    <div className="text-center py-6">
                        <p className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                            Nada encontrado.
                        </p>
                        <p className="text-sm text-cafe-medio mt-1">
                            Tente outro filtro ou limpe a busca.
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {filteredTemplates.map(template => {
                        const cardCategories = template.category_ids
                            ? categories.filter(c => template.category_ids!.includes(c.id))
                            : [];
                        return (
                            <button
                                key={template.id}
                                type="button"
                                onClick={() => {
                                    setSelectedTemplate(template);
                                    setCurrentImageIndex(0);
                                }}
                                className="group text-left bg-cream-surface border border-borda-cafe rounded-[12px] overflow-hidden transition-shadow duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra flex flex-col"
                                style={{ boxShadow: '0 1px 2px 0 rgba(80, 40, 20, 0.04)' }}
                                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 16px -4px rgba(80, 40, 20, 0.10)')}
                                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(80, 40, 20, 0.04)')}
                            >
                                <div className="aspect-video bg-cream-elevated relative overflow-hidden">
                                    {template.image_url ? (
                                        <img
                                            src={template.image_url}
                                            alt={`Preview ${template.name}`}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <Sparkles className="w-6 h-6 text-cafe-cinza-quente" />
                                        </div>
                                    )}
                                </div>
                                <div className="p-4 flex flex-col flex-1">
                                    <h3 className="font-display text-base font-normal text-carvao-quente tracking-tight group-hover:text-coral-terra transition-colors truncate">
                                        {template.name}
                                    </h3>
                                    {cardCategories.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-2">
                                            {cardCategories.slice(0, 2).map(c => (
                                                <span
                                                    key={c.id}
                                                    className="text-xs font-semibold text-cafe-cinza-quente bg-cream-elevated px-2 py-0.5 rounded-full"
                                                >
                                                    {c.name}
                                                </span>
                                            ))}
                                            {cardCategories.length > 2 && (
                                                <span className="text-xs font-semibold text-cafe-cinza-quente">
                                                    +{cardCategories.length - 2}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* CTA Comunidade — rodapé permanente */}
            <a
                href="/comunidade"
                className="block bg-cream-elevated border border-borda-cafe rounded-[12px] px-5 py-4 hover:bg-coral-wash transition-colors group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-coral-wash flex items-center justify-center shrink-0 group-hover:bg-cream-surface transition-colors">
                        <Sparkles className="w-5 h-5 text-coral-terra" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-display text-base font-normal text-carvao-quente tracking-tight group-hover:text-terracota-profundo transition-colors">
                            Não achou o que queria?
                        </p>
                        <p className="text-sm text-cafe-medio mt-0.5">
                            Sugira um template novo ou vote nas ideias da comunidade. Mais votado vira template ao vivo na sexta.
                        </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-cafe-cinza-quente group-hover:text-coral-terra group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
            </a>

            {/* Modal de detalhes */}
            {selectedTemplate && (
                <TemplateModal
                    template={selectedTemplate}
                    categories={categories}
                    allTemplates={templates}
                    hasTokens={hasTokens === true}
                    currentImageIndex={currentImageIndex}
                    setCurrentImageIndex={setCurrentImageIndex}
                    onClose={() => setSelectedTemplate(null)}
                    onSelectRelated={(t) => {
                        setSelectedTemplate(t);
                        setCurrentImageIndex(0);
                    }}
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────

function FilterChip({
    label, count, active, onClick,
}: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors min-h-[40px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra ${
                active
                    ? 'bg-coral-terra text-papel-craft'
                    : 'bg-cream-elevated text-cafe-medio hover:bg-coral-wash hover:text-terracota-profundo border border-borda-cafe'
            }`}
        >
            {label}
            <span className={`tabular-nums text-xs font-bold px-1.5 py-0.5 rounded-full ${
                active ? 'bg-papel-craft/20 text-papel-craft' : 'bg-cream-surface text-cafe-cinza-quente'
            }`}>
                {count}
            </span>
        </button>
    );
}

// ─────────────────────────────────────────────────────────────────────────────

function TemplateModal({
    template, categories, allTemplates, hasTokens,
    currentImageIndex, setCurrentImageIndex,
    onClose, onSelectRelated,
}: {
    template: Template;
    categories: Category[];
    allTemplates: Template[];
    hasTokens: boolean;
    currentImageIndex: number;
    setCurrentImageIndex: (i: number) => void;
    onClose: () => void;
    onSelectRelated: (t: Template) => void;
}) {
    const activeCategories = template.category_ids
        ? categories.filter(c => template.category_ids!.includes(c.id))
        : [];

    const carouselImages = template.images && template.images.length > 0
        ? template.images
        : template.image_url
            ? [template.image_url]
            : [];

    const related = allTemplates.filter(t =>
        t.id !== template.id &&
        t.category_ids?.some(c => template.category_ids?.includes(c))
    ).slice(0, 3);

    return (
        <div
            className="fixed inset-0 bg-carvao-quente/40 z-[100] flex items-center justify-center p-4 overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="bg-cream-surface w-full max-w-4xl rounded-[12px] shadow-[0_12px_32px_-12px_rgba(80,40,20,0.25)] border border-borda-cafe my-8 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Carousel */}
                <div className="aspect-video bg-cream-elevated relative">
                    {carouselImages[currentImageIndex] ? (
                        <img
                            src={carouselImages[currentImageIndex]}
                            alt={`${template.name} — imagem ${currentImageIndex + 1}`}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Sparkles className="w-8 h-8 text-cafe-cinza-quente" />
                        </div>
                    )}

                    {carouselImages.length > 1 && (
                        <>
                            <button
                                type="button"
                                onClick={() => setCurrentImageIndex((currentImageIndex - 1 + carouselImages.length) % carouselImages.length)}
                                aria-label="Imagem anterior"
                                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-cream-surface/90 hover:bg-cream-surface flex items-center justify-center transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 text-carvao-quente" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setCurrentImageIndex((currentImageIndex + 1) % carouselImages.length)}
                                aria-label="Próxima imagem"
                                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-cream-surface/90 hover:bg-cream-surface flex items-center justify-center transition-colors"
                            >
                                <ChevronRight className="w-5 h-5 text-carvao-quente" />
                            </button>

                            {/* Dots indicator */}
                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                                {carouselImages.map((_, i) => (
                                    <button
                                        key={i}
                                        type="button"
                                        onClick={() => setCurrentImageIndex(i)}
                                        aria-label={`Imagem ${i + 1}`}
                                        className={`w-2 h-2 rounded-full transition-colors ${
                                            i === currentImageIndex ? 'bg-coral-terra' : 'bg-cream-surface/60 hover:bg-cream-surface'
                                        }`}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar"
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-cream-surface/90 hover:bg-cream-surface flex items-center justify-center transition-colors"
                    >
                        <X className="w-4 h-4 text-carvao-quente" />
                    </button>
                </div>

                {/* Conteúdo */}
                <div className="p-6 md:p-8 space-y-5">
                    <div>
                        <h2 className="font-display text-2xl md:text-3xl font-normal text-carvao-quente tracking-tight">
                            {template.name}
                        </h2>
                        {activeCategories.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {activeCategories.map(c => (
                                    <span
                                        key={c.id}
                                        className="text-xs font-semibold text-cafe-cinza-quente bg-cream-elevated px-2.5 py-1 rounded-full"
                                    >
                                        {c.name}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {template.description && (
                        <p className="text-base text-cafe-medio leading-relaxed">
                            {template.description}
                        </p>
                    )}

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-borda-cafe">
                        {hasTokens ? (
                            <a
                                href={`/sites/${template.id}/deploy`}
                                className="flex-1 inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-6 py-3 rounded-[12px] font-semibold text-base transition-colors active:scale-[0.98] min-h-[44px]"
                            >
                                Publicar este template
                                <ArrowRight className="w-4 h-4" />
                            </a>
                        ) : (
                            <a
                                href="/configuracoes?tab=integracao"
                                className="flex-1 inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-6 py-3 rounded-[12px] font-semibold text-base transition-colors active:scale-[0.98] min-h-[44px]"
                            >
                                <AlertCircle className="w-4 h-4" />
                                Conectar contas pra publicar
                            </a>
                        )}
                        {template.preview_url && (
                            <a
                                href={template.preview_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 bg-cream-elevated hover:bg-coral-wash text-carvao-quente hover:text-terracota-profundo border border-borda-cafe px-5 py-3 rounded-[12px] font-semibold text-sm transition-colors active:scale-[0.98] min-h-[44px]"
                            >
                                <ExternalLink className="w-4 h-4" />
                                Ver prévia
                            </a>
                        )}
                    </div>

                    {/* Templates relacionados */}
                    {related.length > 0 && (
                        <div className="pt-5 border-t border-borda-cafe space-y-3">
                            <h3 className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em]">
                                Templates parecidos
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {related.map(t => (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => onSelectRelated(t)}
                                        className="text-left bg-cream-elevated border border-borda-cafe rounded-[10px] overflow-hidden hover:border-coral-terra transition-colors group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra"
                                    >
                                        <div className="aspect-video bg-cream-surface">
                                            {t.image_url && (
                                                <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" loading="lazy" />
                                            )}
                                        </div>
                                        <p className="p-3 text-sm font-semibold text-carvao-quente group-hover:text-coral-terra transition-colors truncate">
                                            {t.name}
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
