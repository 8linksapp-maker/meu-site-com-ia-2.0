import React from 'react';

interface FieldProps {
    label: string;
    htmlFor?: string;
    helper?: string;
    error?: string;
    optional?: boolean;
    children: React.ReactNode;
    className?: string;
}

export default function Field({
    label,
    htmlFor,
    helper,
    error,
    optional = false,
    children,
    className = '',
}: FieldProps) {
    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            <label
                htmlFor={htmlFor}
                className="text-sm font-semibold text-carvao-quente flex items-center gap-2"
            >
                {label}
                {optional && (
                    <span className="text-xs font-normal text-cafe-cinza-quente">
                        (opcional)
                    </span>
                )}
            </label>
            {children}
            {error ? (
                <p className="text-xs font-medium text-vermelho-tijolo mt-0.5">{error}</p>
            ) : helper ? (
                <p className="text-xs text-cafe-cinza-quente mt-0.5 leading-relaxed">{helper}</p>
            ) : null}
        </div>
    );
}
