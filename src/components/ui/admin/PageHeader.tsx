import React from 'react';

interface PageHeaderProps {
    title: string;
    tagline?: string;
    action?: React.ReactNode;
    icon?: React.ReactNode;
    className?: string;
}

/**
 * Cabeçalho padrão de páginas admin.
 * h1 Fraunces + tagline opcional + action slot pra botão "Novo X" tipo.
 */
export default function PageHeader({ title, tagline, action, icon, className = '' }: PageHeaderProps) {
    return (
        <div className={`flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 pb-4 border-b border-borda-cafe ${className}`}>
            <div className="min-w-0 flex items-start gap-3">
                {icon && (
                    <div className="w-10 h-10 rounded-full bg-coral-wash flex items-center justify-center shrink-0 text-coral-terra">
                        {icon}
                    </div>
                )}
                <div className="min-w-0">
                    <h1 className="font-display text-2xl md:text-[1.625rem] font-normal text-carvao-quente tracking-tight leading-tight">
                        {title}
                    </h1>
                    {tagline && (
                        <p className="text-sm text-cafe-medio mt-1">{tagline}</p>
                    )}
                </div>
            </div>
            {action && <div className="shrink-0">{action}</div>}
        </div>
    );
}
