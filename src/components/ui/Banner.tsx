import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

type Tone = 'info' | 'success' | 'warning' | 'error';

interface BannerProps {
    tone?: Tone;
    title?: string;
    children?: React.ReactNode;
    action?: React.ReactNode;
    onDismiss?: () => void;
    icon?: React.ReactNode;
    className?: string;
}

const toneConfig: Record<Tone, { bg: string; border: string; text: string; iconColor: string; defaultIcon: React.ComponentType<{ className?: string }> }> = {
    info: {
        bg: 'bg-cream-elevated',
        border: 'border-borda-cafe',
        text: 'text-carvao-quente',
        iconColor: 'text-cafe-medio',
        defaultIcon: Info,
    },
    success: {
        bg: 'bg-[oklch(94%_0.025_145)]',
        border: 'border-verde-oliva/30',
        text: 'text-[oklch(28%_0.060_145)]',
        iconColor: 'text-verde-oliva',
        defaultIcon: CheckCircle2,
    },
    warning: {
        bg: 'bg-[oklch(94%_0.035_80)]',
        border: 'border-mostarda-amber/30',
        text: 'text-[oklch(28%_0.080_60)]',
        iconColor: 'text-mostarda-amber',
        defaultIcon: AlertTriangle,
    },
    error: {
        bg: 'bg-[oklch(94%_0.025_28)]',
        border: 'border-vermelho-tijolo/30',
        text: 'text-[oklch(28%_0.080_28)]',
        iconColor: 'text-vermelho-tijolo',
        defaultIcon: AlertCircle,
    },
};

export default function Banner({
    tone = 'info',
    title,
    children,
    action,
    onDismiss,
    icon,
    className = '',
}: BannerProps) {
    const cfg = toneConfig[tone];
    const IconComponent = cfg.defaultIcon;
    return (
        <div
            role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
            className={`flex items-start gap-3 ${cfg.bg} border ${cfg.border} ${cfg.text} rounded-[12px] px-4 py-3 ${className}`}
        >
            <span className={`shrink-0 ${cfg.iconColor} mt-0.5`}>
                {icon ?? <IconComponent className="w-5 h-5" />}
            </span>
            <div className="flex-1 min-w-0">
                {title && <p className="font-semibold text-sm">{title}</p>}
                {children && (
                    <div className={`text-sm leading-relaxed ${title ? 'mt-0.5' : ''}`}>
                        {children}
                    </div>
                )}
            </div>
            {action && <div className="shrink-0 ml-2">{action}</div>}
            {onDismiss && (
                <button
                    type="button"
                    onClick={onDismiss}
                    aria-label="Fechar"
                    className={`shrink-0 ml-1 -mr-1 -mt-1 p-1 rounded-md ${cfg.iconColor} hover:bg-black/5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra`}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    );
}
