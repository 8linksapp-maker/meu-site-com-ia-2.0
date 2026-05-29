import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
    page: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    label?: string;
    className?: string;
}

/**
 * Paginação padrão admin Café-da-Tarde.
 *
 * Client-side: pai mantém estado de `page`, fatia o array antes de renderizar.
 * Mostra range atual ("Mostrando 1–10 de 87") + botões prev/next + contador.
 * Retorna null se total ≤ pageSize (não há razão pra mostrar).
 *
 * Uso:
 * ```tsx
 * const [page, setPage] = useState(1);
 * const PAGE_SIZE = 20;
 * const paginated = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
 *
 * <List items={paginated} />
 * <Pagination page={page} pageSize={PAGE_SIZE} total={items.length} onPageChange={setPage} />
 * ```
 */
export default function Pagination({
    page, pageSize, total, onPageChange,
    label = 'itens',
    className = '',
}: PaginationProps) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (total <= pageSize) return null;

    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);

    const goPrev = () => onPageChange(Math.max(1, page - 1));
    const goNext = () => onPageChange(Math.min(totalPages, page + 1));

    return (
        <div className={`flex items-center justify-between gap-3 pt-3 mt-3 border-t border-borda-cafe ${className}`}>
            <p className="text-xs text-cafe-cinza-quente tabular-nums">
                Mostrando <strong className="text-cafe-medio">{from}–{to}</strong> de <strong className="text-cafe-medio">{total}</strong> {label}
            </p>
            <div className="inline-flex items-center gap-1">
                <button
                    type="button"
                    onClick={goPrev}
                    disabled={page <= 1}
                    aria-label="Página anterior"
                    className="w-8 h-8 inline-flex items-center justify-center rounded-md text-cafe-medio hover:text-coral-terra hover:bg-coral-wash disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="inline-flex items-center justify-center min-w-[80px] text-xs font-semibold text-carvao-quente tabular-nums">
                    {page} <span className="text-cafe-cinza-quente mx-1">/</span> {totalPages}
                </span>
                <button
                    type="button"
                    onClick={goNext}
                    disabled={page >= totalPages}
                    aria-label="Próxima página"
                    className="w-8 h-8 inline-flex items-center justify-center rounded-md text-cafe-medio hover:text-coral-terra hover:bg-coral-wash disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

