import React from 'react';

export interface TabItem {
    id: string;
    label: string;
    /** Optional count badge to the right of label (e.g. "3 pendentes"). */
    badge?: number | string;
}

interface TabsProps {
    items: TabItem[];
    activeId: string;
    onChange: (id: string) => void;
    /** Use full-width tabs (each tab grows). Default: false (tabs sized to content). */
    fullWidth?: boolean;
    className?: string;
}

/**
 * Tabs editoriais — underline em vez de pill. Hairline border-bottom no container,
 * tab ativa tem underline coral-terra de 2px alinhado ao border.
 */
export default function Tabs({
    items,
    activeId,
    onChange,
    fullWidth = false,
    className = '',
}: TabsProps) {
    return (
        <div
            role="tablist"
            className={`flex border-b border-borda-cafe ${fullWidth ? 'w-full' : ''} ${className}`}
        >
            {items.map((item) => {
                const isActive = item.id === activeId;
                return (
                    <button
                        key={item.id}
                        role="tab"
                        aria-selected={isActive}
                        type="button"
                        onClick={() => onChange(item.id)}
                        className={`relative px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra ${
                            fullWidth ? 'flex-1' : ''
                        } ${
                            isActive
                                ? 'text-coral-terra'
                                : 'text-cafe-medio hover:text-terracota-profundo'
                        }`}
                    >
                        <span className="inline-flex items-center gap-2">
                            {item.label}
                            {item.badge !== undefined && item.badge !== '' && (
                                <span
                                    className={`inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full text-xs font-bold tabular-nums ${
                                        isActive
                                            ? 'bg-coral-wash text-terracota-profundo'
                                            : 'bg-cream-elevated text-cafe-cinza-quente'
                                    }`}
                                >
                                    {item.badge}
                                </span>
                            )}
                        </span>
                        {isActive && (
                            <span
                                aria-hidden="true"
                                className="absolute left-0 right-0 -bottom-px h-0.5 bg-coral-terra"
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
}
