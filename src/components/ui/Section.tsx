import React from 'react';

interface SectionProps {
    title: string;
    tagline?: string;
    action?: React.ReactNode;
    /** Hide the bottom border on the header. Default: false (border shown). */
    headless?: boolean;
    children: React.ReactNode;
    className?: string;
}

export default function Section({
    title,
    tagline,
    action,
    headless = false,
    children,
    className = '',
}: SectionProps) {
    return (
        <section className={`space-y-4 ${className}`}>
            <div
                className={`flex items-end justify-between gap-4 ${
                    headless ? '' : 'border-b border-borda-cafe pb-3'
                }`}
            >
                <div className="min-w-0">
                    <h2 className="font-display text-2xl md:text-[1.625rem] font-normal text-carvao-quente tracking-tight leading-tight">
                        {title}
                    </h2>
                    {tagline && (
                        <p className="text-sm text-cafe-medio mt-1">{tagline}</p>
                    )}
                </div>
                {action && <div className="shrink-0">{action}</div>}
            </div>
            {children}
        </section>
    );
}
