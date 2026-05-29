import React from 'react';

interface EmptyStateProps {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description?: string;
    action?: React.ReactNode;
    secondaryAction?: React.ReactNode;
    className?: string;
}

export default function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    secondaryAction,
    className = '',
}: EmptyStateProps) {
    return (
        <div
            className={`bg-cream-surface border border-borda-cafe rounded-[12px] p-8 md:p-10 ${className}`}
        >
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-14 h-14 rounded-full bg-coral-wash flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-coral-terra" />
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h3 className="font-display text-xl md:text-2xl font-normal text-carvao-quente tracking-tight mb-1">
                        {title}
                    </h3>
                    {description && (
                        <p className="text-base text-cafe-medio leading-relaxed max-w-md mx-auto md:mx-0">
                            {description}
                        </p>
                    )}
                </div>
                {(action || secondaryAction) && (
                    <div className="shrink-0 flex flex-col sm:flex-row gap-3 items-center">
                        {action}
                        {secondaryAction}
                    </div>
                )}
            </div>
        </div>
    );
}
