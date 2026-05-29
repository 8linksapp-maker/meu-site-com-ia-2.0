import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Search, ChevronDown, ChevronUp, Loader2, HelpCircle, LifeBuoy, ArrowRight } from 'lucide-react';
import { Card } from './ui';

interface FAQArticle {
    id: string;
    category: string;
    question: string;
    answer: string;
    display_order: number;
    is_published: boolean;
}

// Renderiza markdown simples manualmente (sem dep de react-markdown — evita problema SSR).
// Suporta: **bold**, *italic*, `code`, [link](url), listas com - ou 1., parágrafos.
function renderMarkdown(text: string): React.ReactNode {
    const lines = text.split('\n');
    const blocks: React.ReactNode[] = [];
    let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
    let paragraphBuffer: string[] = [];

    function flushParagraph() {
        if (paragraphBuffer.length > 0) {
            blocks.push(
                <p key={`p-${blocks.length}`} className="text-sm text-cafe-medio leading-relaxed mb-3 last:mb-0">
                    {renderInline(paragraphBuffer.join(' '))}
                </p>
            );
            paragraphBuffer = [];
        }
    }
    function flushList() {
        if (currentList) {
            const Tag = currentList.type;
            blocks.push(
                <Tag key={`l-${blocks.length}`} className={`${Tag === 'ul' ? 'list-disc' : 'list-decimal'} pl-5 space-y-1.5 mb-3 text-sm text-cafe-medio`}>
                    {currentList.items.map((item, i) => (
                        <li key={i} className="leading-relaxed">{renderInline(item)}</li>
                    ))}
                </Tag>
            );
            currentList = null;
        }
    }

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();

        // Linha vazia separa parágrafos
        if (!line.trim()) {
            flushParagraph();
            flushList();
            continue;
        }

        // Lista não-ordenada (- item)
        const ulMatch = line.match(/^\s*-\s+(.+)$/);
        if (ulMatch) {
            flushParagraph();
            if (currentList?.type !== 'ul') {
                flushList();
                currentList = { type: 'ul', items: [] };
            }
            currentList.items.push(ulMatch[1]);
            continue;
        }

        // Lista ordenada (1. item)
        const olMatch = line.match(/^\s*\d+\.\s+(.+)$/);
        if (olMatch) {
            flushParagraph();
            if (currentList?.type !== 'ol') {
                flushList();
                currentList = { type: 'ol', items: [] };
            }
            currentList.items.push(olMatch[1]);
            continue;
        }

        // Linha normal — vai pro buffer do parágrafo
        flushList();
        paragraphBuffer.push(line);
    }
    flushParagraph();
    flushList();

    return blocks;
}

// Renderiza formatação inline: **bold**, *italic*, `code`, [link](url)
function renderInline(text: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    let key = 0;

    // Regex matches: **bold** | *italic* | `code` | [text](url)
    const regex = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
        }
        if (match[2] !== undefined) {
            // **bold**
            parts.push(<strong key={key++} className="font-semibold text-carvao-quente">{match[2]}</strong>);
        } else if (match[4] !== undefined) {
            // *italic*
            parts.push(<em key={key++} className="italic text-carvao-quente">{match[4]}</em>);
        } else if (match[6] !== undefined) {
            // `code`
            parts.push(<code key={key++} className="font-mono bg-cream-elevated text-coral-terra px-1.5 py-0.5 rounded text-xs">{match[6]}</code>);
        } else if (match[8] !== undefined) {
            // [text](url)
            parts.push(
                <a key={key++} href={match[9]} target="_blank" rel="noopener noreferrer" className="text-coral-terra hover:text-terracota-profundo underline font-semibold">
                    {match[8]}
                </a>
            );
        }
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
        parts.push(text.slice(lastIndex));
    }
    return parts.length > 0 ? parts : text;
}

export default function FAQPage() {
    const [articles, setArticles] = useState<FAQArticle[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('faq_articles')
                .select('*')
                .eq('is_published', true)
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
        return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
    }, [articles]);

    function normalize(s: string) {
        return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    }

    const filtered = useMemo(() => {
        let result = articles;
        if (categoryFilter !== 'all') {
            result = result.filter(a => a.category === categoryFilter);
        }
        if (search.trim()) {
            const q = normalize(search);
            result = result.filter(a =>
                normalize(a.question).includes(q) ||
                normalize(a.answer).includes(q) ||
                normalize(a.category).includes(q)
            );
        }
        return result;
    }, [articles, categoryFilter, search]);

    const grouped = useMemo(() => {
        const groups = new Map<string, FAQArticle[]>();
        for (const a of filtered) {
            if (!groups.has(a.category)) groups.set(a.category, []);
            groups.get(a.category)!.push(a);
        }
        return Array.from(groups.entries());
    }, [filtered]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-coral-terra" />
                <p className="text-cafe-medio text-sm">Carregando perguntas…</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto pb-8">
            <div className="text-center mb-8 pt-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-coral-wash text-coral-terra mb-4">
                    <HelpCircle className="w-7 h-7" />
                </div>
                <h1 className="font-display text-4xl md:text-5xl font-normal text-carvao-quente tracking-tight">
                    Ajuda
                </h1>
                <p className="text-base text-cafe-medio mt-2">
                    Respostas rápidas pras dúvidas mais comuns.
                </p>
            </div>

            <div className="relative mb-5">
                <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-cafe-cinza-quente pointer-events-none" />
                <input
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar (ex: trocar senha, conectar domínio…)"
                    className="w-full pl-12 pr-4 py-4 bg-cream-surface text-carvao-quente text-base font-normal rounded-[12px] border border-borda-cafe focus:border-coral-terra focus:outline-none transition-colors placeholder:text-cafe-cinza-quente min-h-[56px]"
                />
            </div>

            {categories.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 mb-6">
                    <CategoryChip
                        label="Todos"
                        count={articles.length}
                        active={categoryFilter === 'all'}
                        onClick={() => setCategoryFilter('all')}
                    />
                    {categories.map(c => (
                        <CategoryChip
                            key={c.name}
                            label={c.name}
                            count={c.count}
                            active={categoryFilter === c.name}
                            onClick={() => setCategoryFilter(c.name)}
                        />
                    ))}
                </div>
            )}

            {filtered.length === 0 ? (
                <Card padding="lg">
                    <div className="text-center py-6">
                        <Search className="w-10 h-10 text-cafe-cinza-quente mx-auto mb-3" />
                        <p className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                            Nada encontrado pra "{search}"
                        </p>
                        <p className="text-sm text-cafe-medio mt-1 max-w-md mx-auto">
                            Tenta outras palavras ou fala com o suporte.
                        </p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-6">
                    {grouped.map(([category, items]) => (
                        <div key={category}>
                            <h2 className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em] mb-2 px-1">
                                {category} <span className="text-cafe-cinza-quente tabular-nums">· {items.length}</span>
                            </h2>
                            <div className="space-y-2">
                                {items.map(article => (
                                    <FAQItem
                                        key={article.id}
                                        article={article}
                                        expanded={expandedId === article.id}
                                        onToggle={() => setExpandedId(prev => prev === article.id ? null : article.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Card padding="lg" className="mt-10 !border-coral-terra/30 !bg-coral-wash/40">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-coral-terra flex items-center justify-center shrink-0">
                        <LifeBuoy className="w-5 h-5 text-papel-craft" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                            Não achou o que procurava?
                        </p>
                        <p className="text-sm text-cafe-medio mt-1 leading-relaxed">
                            Fala com a equipe de suporte. Respondemos rápido — geralmente no mesmo dia.
                        </p>
                    </div>
                    <a
                        href="/suporte"
                        className="inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-5 py-2.5 rounded-[10px] font-semibold text-sm transition-colors active:scale-[0.98] shrink-0 min-h-[44px]"
                    >
                        Falar com suporte
                        <ArrowRight className="w-4 h-4" />
                    </a>
                </div>
            </Card>
        </div>
    );
}

function CategoryChip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors min-h-[36px] shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra ${
                active
                    ? 'bg-coral-terra text-papel-craft'
                    : 'bg-cream-elevated text-cafe-medio hover:bg-coral-wash hover:text-terracota-profundo border border-borda-cafe'
            }`}
        >
            {label}
            <span className={`tabular-nums px-1.5 py-0.5 rounded-full text-xs font-bold ${
                active ? 'bg-papel-craft/20 text-papel-craft' : 'bg-cream-surface text-cafe-cinza-quente'
            }`}>
                {count}
            </span>
        </button>
    );
}

function FAQItem({ article, expanded, onToggle }: { article: FAQArticle; expanded: boolean; onToggle: () => void }) {
    return (
        <div className={`bg-cream-surface border rounded-[12px] overflow-hidden transition-colors ${
            expanded ? 'border-coral-terra/30' : 'border-borda-cafe'
        }`}>
            <button
                type="button"
                onClick={onToggle}
                className="w-full px-5 py-4 flex items-center justify-between gap-3 text-left hover:bg-cream-elevated/50 transition-colors"
            >
                <p className="text-sm md:text-base font-semibold text-carvao-quente">
                    {article.question}
                </p>
                {expanded ? (
                    <ChevronUp className="w-4 h-4 text-coral-terra shrink-0" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-cafe-cinza-quente shrink-0" />
                )}
            </button>
            {expanded && (
                <div className="px-5 pb-5 pt-3 border-t border-borda-cafe">
                    {renderMarkdown(article.answer)}
                </div>
            )}
        </div>
    );
}
