import React from 'react';

export type StatusTone =
    | 'neutral'      // cinza — estado default
    | 'info'         // cream-elevated — informativo
    | 'pending'      // mostarda — esperando
    | 'success'      // verde-oliva — concluído/aprovado
    | 'active'       // coral-terra — em andamento
    | 'danger';      // vermelho-tijolo — erro/atenção

interface StatusBadgeProps {
    tone?: StatusTone;
    children: React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
}

const TONE_CLASSES: Record<StatusTone, string> = {
    neutral:  'bg-cream-elevated text-cafe-cinza-quente',
    info:     'bg-cream-elevated text-cafe-medio',
    pending:  'bg-[oklch(94%_0.035_80)] text-[oklch(40%_0.110_80)]',
    success:  'bg-[oklch(94%_0.020_145)] text-[oklch(40%_0.060_145)]',
    active:   'bg-coral-wash text-terracota-profundo',
    danger:   'bg-[oklch(94%_0.025_28)] text-vermelho-tijolo',
};

/**
 * Pill semântico padronizado pra status em admin.
 * 6 tons mapeados à paleta Café-da-Tarde.
 */
export default function StatusBadge({ tone = 'neutral', children, icon, className = '' }: StatusBadgeProps) {
    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
        >
            {icon}
            {children}
        </span>
    );
}
