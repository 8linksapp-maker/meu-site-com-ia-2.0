import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    invalid?: boolean;
    leftIcon?: React.ReactNode;
    rightAddon?: React.ReactNode;
}

const baseInput =
    'w-full bg-cream-surface text-carvao-quente placeholder:text-cafe-cinza-quente text-base font-normal rounded-[12px] px-4 py-3 border transition-colors focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed';

export function Input({
    invalid = false,
    leftIcon,
    rightAddon,
    className = '',
    ...rest
}: InputProps) {
    const borderClass = invalid
        ? 'border-vermelho-tijolo focus:border-vermelho-tijolo'
        : 'border-borda-cafe focus:border-coral-terra';

    if (!leftIcon && !rightAddon) {
        return <input className={`${baseInput} ${borderClass} ${className}`} {...rest} />;
    }

    return (
        <div
            className={`relative flex items-center bg-cream-surface rounded-[12px] border transition-colors focus-within:border-coral-terra ${
                invalid ? 'border-vermelho-tijolo focus-within:border-vermelho-tijolo' : 'border-borda-cafe'
            } ${className}`}
        >
            {leftIcon && (
                <span className="pl-3 text-cafe-cinza-quente flex-shrink-0 flex items-center">
                    {leftIcon}
                </span>
            )}
            <input
                className={`flex-1 bg-transparent text-carvao-quente placeholder:text-cafe-cinza-quente text-base font-normal py-3 px-3 border-0 focus:outline-none focus:ring-0 ${
                    leftIcon ? 'pl-2' : ''
                } ${rightAddon ? 'pr-2' : ''} disabled:opacity-60 disabled:cursor-not-allowed`}
                {...rest}
            />
            {rightAddon && (
                <span className="pr-2 text-cafe-cinza-quente flex-shrink-0 flex items-center">
                    {rightAddon}
                </span>
            )}
        </div>
    );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    invalid?: boolean;
}

export function Textarea({ invalid = false, className = '', rows = 4, ...rest }: TextareaProps) {
    const borderClass = invalid
        ? 'border-vermelho-tijolo focus:border-vermelho-tijolo'
        : 'border-borda-cafe focus:border-coral-terra';
    return (
        <textarea
            rows={rows}
            className={`${baseInput} ${borderClass} resize-vertical leading-relaxed ${className}`}
            {...rest}
        />
    );
}
