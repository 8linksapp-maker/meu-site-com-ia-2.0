import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface FormModalProps {
    open: boolean;
    title: string;
    description?: string;
    onClose: () => void;
    onSubmit?: (e: React.FormEvent) => void | Promise<void>;
    submitLabel?: string;
    submitDisabled?: boolean;
    submitting?: boolean;
    cancelLabel?: string;
    children: React.ReactNode;
    width?: 'sm' | 'md' | 'lg';
}

const WIDTH_CLASSES: Record<NonNullable<FormModalProps['width']>, string> = {
    sm: 'max-w-md',
    md: 'max-w-xl',
    lg: 'max-w-3xl',
};

/**
 * Modal de form padrão pra admin: header com título + close, body com children
 * (geralmente Fields), footer com Cancelar + Submit.
 * Escape fecha. Click fora fecha.
 */
export default function FormModal({
    open,
    title,
    description,
    onClose,
    onSubmit,
    submitLabel = 'Salvar',
    submitDisabled = false,
    submitting = false,
    cancelLabel = 'Cancelar',
    children,
    width = 'md',
}: FormModalProps) {
    useEffect(() => {
        if (!open) return;
        function handleEsc(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [open, onClose]);

    if (!open) return null;

    const Wrapper = onSubmit ? 'form' : 'div';

    return (
        <div
            className="fixed inset-0 bg-carvao-quente/40 z-[100] flex items-center justify-center p-4 overflow-y-auto"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="form-modal-title"
        >
            <Wrapper
                className={`bg-cream-surface w-full ${WIDTH_CLASSES[width]} rounded-[12px] shadow-[0_12px_32px_-12px_rgba(80,40,20,0.25)] border border-borda-cafe my-8`}
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                onSubmit={onSubmit as (e: React.FormEvent) => void}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-borda-cafe">
                    <div className="min-w-0">
                        <h3 id="form-modal-title" className="font-display text-xl font-normal text-carvao-quente tracking-tight">
                            {title}
                        </h3>
                        {description && (
                            <p className="text-sm text-cafe-medio mt-1">{description}</p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar"
                        className="shrink-0 w-9 h-9 flex items-center justify-center text-cafe-cinza-quente hover:text-coral-terra hover:bg-coral-wash rounded-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
                    {children}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-borda-cafe bg-cream-elevated/40">
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex items-center justify-center bg-transparent text-cafe-medio hover:text-coral-terra px-4 py-2.5 rounded-[10px] font-semibold text-sm transition-colors min-h-[40px]"
                    >
                        {cancelLabel}
                    </button>
                    {onSubmit && (
                        <button
                            type="submit"
                            disabled={submitDisabled || submitting}
                            className="inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-5 py-2.5 rounded-[10px] font-semibold text-sm transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed min-h-[40px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra"
                        >
                            {submitting ? 'Salvando…' : submitLabel}
                        </button>
                    )}
                </div>
            </Wrapper>
        </div>
    );
}
