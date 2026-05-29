import React from 'react';

type Variant = 'primary' | 'secondary' | 'link' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
    fullWidth?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
    primary:
        'bg-coral-terra text-papel-craft hover:bg-terracota-profundo focus-visible:outline-coral-terra',
    secondary:
        'bg-cream-elevated text-carvao-quente border border-borda-cafe hover:bg-coral-wash hover:text-terracota-profundo focus-visible:outline-coral-terra',
    link:
        'text-coral-terra hover:text-terracota-profundo focus-visible:outline-coral-terra bg-transparent',
    destructive:
        'bg-vermelho-tijolo text-papel-craft hover:bg-[oklch(40%_0.130_28)] focus-visible:outline-vermelho-tijolo',
};

const sizeClasses: Record<Size, string> = {
    sm: 'px-3 py-2 text-sm min-h-[36px]',
    md: 'px-5 py-2.5 text-sm min-h-[44px]',
    lg: 'px-6 py-3 text-base min-h-[48px]',
};

export default function Button({
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    leftIcon,
    rightIcon,
    className = '',
    children,
    ...rest
}: ButtonProps) {
    const isLink = variant === 'link';
    const baseLayout = isLink
        ? 'inline-flex items-center gap-1.5'
        : 'inline-flex items-center justify-center gap-2 rounded-[12px] font-semibold transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100';

    return (
        <button
            className={`${baseLayout} ${variantClasses[variant]} ${!isLink ? sizeClasses[size] : 'font-semibold text-sm'} ${fullWidth ? 'w-full' : ''} ${className}`}
            {...rest}
        >
            {leftIcon}
            {children}
            {rightIcon}
        </button>
    );
}
