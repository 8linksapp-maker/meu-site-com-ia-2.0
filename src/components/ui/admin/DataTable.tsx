import React from 'react';
import { Loader2 } from 'lucide-react';

export interface Column<T> {
    key: string;
    header: React.ReactNode;
    /** Função que extrai/renderiza a célula a partir do row. */
    cell: (row: T, index: number) => React.ReactNode;
    /** Largura opcional via Tailwind (ex: "w-32") ou inline style. */
    width?: string;
    /** Alinhamento da coluna. */
    align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
    columns: Column<T>[];
    rows: T[];
    /** Função que extrai key única do row. Usa index como fallback. */
    rowKey?: (row: T, index: number) => string;
    loading?: boolean;
    emptyState?: React.ReactNode;
    /** Click na linha (opcional). */
    onRowClick?: (row: T) => void;
    className?: string;
}

/**
 * Tabela editorial padronizada pra admin.
 * Header carbon, dividers hairline borda-café, hover coral-wash (se onRowClick).
 * Sem zebra striping (decisão CdT: divider hairline em vez de fundo alternado).
 */
export default function DataTable<T>({
    columns,
    rows,
    rowKey,
    loading = false,
    emptyState,
    onRowClick,
    className = '',
}: DataTableProps<T>) {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3 bg-cream-surface border border-borda-cafe rounded-[12px]">
                <Loader2 className="w-6 h-6 animate-spin text-coral-terra" />
                <p className="text-cafe-medio text-sm">Carregando…</p>
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <div className="bg-cream-surface border border-borda-cafe rounded-[12px] p-8 md:p-10">
                {emptyState ?? (
                    <p className="text-cafe-cinza-quente text-sm italic text-center">
                        Nenhum item encontrado.
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className={`bg-cream-surface border border-borda-cafe rounded-[12px] overflow-hidden ${className}`}>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-cream-elevated">
                        <tr>
                            {columns.map(col => (
                                <th
                                    key={col.key}
                                    className={`px-4 py-3 text-xs font-bold text-cafe-cinza-quente uppercase tracking-wide ${
                                        col.align === 'right' ? 'text-right' :
                                        col.align === 'center' ? 'text-center' : 'text-left'
                                    } ${col.width ?? ''}`}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => {
                            const key = rowKey ? rowKey(row, idx) : String(idx);
                            const clickable = !!onRowClick;
                            return (
                                <tr
                                    key={key}
                                    className={`${idx > 0 ? 'border-t border-borda-cafe' : ''} ${
                                        clickable ? 'hover:bg-coral-wash/40 cursor-pointer transition-colors' : ''
                                    }`}
                                    onClick={clickable ? () => onRowClick!(row) : undefined}
                                >
                                    {columns.map(col => (
                                        <td
                                            key={col.key}
                                            className={`px-4 py-3 text-carvao-quente ${
                                                col.align === 'right' ? 'text-right' :
                                                col.align === 'center' ? 'text-center' : 'text-left'
                                            }`}
                                        >
                                            {col.cell(row, idx)}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
