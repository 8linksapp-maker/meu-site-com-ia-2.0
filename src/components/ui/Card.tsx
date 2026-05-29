import React from 'react';

type Padding = 'sm' | 'md' | 'lg';
type Interactive = boolean;

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    padding?: Padding;
    interactive?: Interactive;
    as?: 'div' | 'a' | 'button';
    href?: string;
}

const paddingClasses: Record<Padding, string> = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-5 md:p-6',
};

export default function Card({
    padding = 'md',
    interactive = false,
    as = 'div',
    href,
    className = '',
    children,
    style,
    ...rest
}: CardProps) {
    const baseShadow = interactive ? '0 1px 2px 0 rgba(80, 40, 20, 0.04)' : 'none';
    const baseClass = `bg-cream-surface border border-borda-cafe rounded-[12px] ${paddingClasses[padding]} ${
        interactive ? 'transition-shadow duration-200 group cursor-pointer' : ''
    } ${className}`;

    const handleHover = interactive
        ? {
              onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                      '0 6px 16px -4px rgba(80, 40, 20, 0.10)';
              },
              onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = baseShadow;
              },
          }
        : {};

    const finalStyle = { boxShadow: baseShadow, ...style };

    if (as === 'a' && href) {
        return (
            <a
                href={href}
                className={baseClass}
                style={finalStyle}
                {...handleHover}
                {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
            >
                {children}
            </a>
        );
    }

    return (
        <div className={baseClass} style={finalStyle} {...handleHover} {...rest}>
            {children}
        </div>
    );
}
