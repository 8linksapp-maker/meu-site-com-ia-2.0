/**
 * LessonThumb — capa procedural sem texto pra cards de aula.
 *
 * Recebe a seed (lesson.id geralmente), deriva paleta + shape geométrico,
 * renderiza um SVG decorativo inline. Sem upload, sem banco, sem texto.
 * Bruno rejeitou thumbs com título dentro (duplicava o h3 do card).
 */

const PALETTES = [
    { bg: '#FAF7F0', shape: '#9C4A2C', accent: '#E0C7B5' }, // coral-terra
    { bg: '#FAF7F0', shape: '#C89A3D', accent: '#EADBA8' }, // mostarda
    { bg: '#FAF7F0', shape: '#6B7A45', accent: '#C8D1A8' }, // verde-oliva
    { bg: '#FAF7F0', shape: '#7C3C24', accent: '#E0C7B5' }, // terracota
    { bg: '#FAF7F0', shape: '#5A4940', accent: '#D9CFC4' }, // cafe-medio
] as const;

function hashSeed(seed: string): number {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) {
        h = (h ^ seed.charCodeAt(i)) * 16777619;
    }
    return Math.abs(h);
}

function ShapeVariant({ variant, color, accent }: { variant: number; color: string; accent: string }) {
    switch (variant % 5) {
        case 0:
            // Arco grande no canto direito + dot grid
            return (
                <>
                    <circle cx="280" cy="80" r="180" fill={color} fillOpacity="0.18" />
                    <circle cx="280" cy="80" r="120" fill={color} fillOpacity="0.10" />
                    <g opacity="0.35">
                        {Array.from({ length: 4 }).map((_, r) =>
                            Array.from({ length: 6 }).map((__, c) => (
                                <circle
                                    key={`d-${r}-${c}`}
                                    cx={28 + c * 22}
                                    cy={160 + r * 18}
                                    r="1.6"
                                    fill={color}
                                />
                            )),
                        )}
                    </g>
                </>
            );
        case 1:
            // Onda diagonal + triângulo
            return (
                <>
                    <path
                        d="M 0 160 Q 160 100 320 160 L 320 220 L 0 220 Z"
                        fill={color}
                        fillOpacity="0.22"
                    />
                    <polygon
                        points="240,40 290,40 265,90"
                        fill={accent}
                        fillOpacity="0.85"
                    />
                </>
            );
        case 2:
            // Trio de círculos sobrepostos
            return (
                <>
                    <circle cx="80" cy="110" r="70" fill={color} fillOpacity="0.20" />
                    <circle cx="170" cy="110" r="70" fill={color} fillOpacity="0.20" />
                    <circle cx="125" cy="60" r="40" fill={accent} fillOpacity="0.6" />
                </>
            );
        case 3:
            // Barra horizontal + retângulo girado
            return (
                <>
                    <rect x="0" y="100" width="320" height="20" fill={color} fillOpacity="0.25" />
                    <rect
                        x="220"
                        y="40"
                        width="80"
                        height="80"
                        fill={color}
                        fillOpacity="0.16"
                        transform="rotate(18, 260, 80)"
                    />
                    <rect
                        x="40"
                        y="140"
                        width="50"
                        height="50"
                        fill={accent}
                        fillOpacity="0.7"
                        transform="rotate(-12, 65, 165)"
                    />
                </>
            );
        case 4:
        default:
            // Half-circle gigante embaixo + linhas paralelas
            return (
                <>
                    <circle cx="160" cy="280" r="180" fill={color} fillOpacity="0.18" />
                    <g stroke={color} strokeOpacity="0.30" strokeWidth="2">
                        <line x1="20" y1="40" x2="120" y2="40" />
                        <line x1="20" y1="56" x2="90" y2="56" />
                        <line x1="20" y1="72" x2="140" y2="72" />
                    </g>
                </>
            );
    }
}

export default function LessonThumb({ seed, className = '' }: { seed: string; className?: string }) {
    const h = hashSeed(seed);
    const palette = PALETTES[h % PALETTES.length];
    const variant = Math.floor(h / PALETTES.length);

    return (
        <svg
            viewBox="0 0 320 180"
            xmlns="http://www.w3.org/2000/svg"
            className={`absolute inset-0 w-full h-full ${className}`}
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
        >
            <rect width="320" height="180" fill={palette.bg} />
            <ShapeVariant variant={variant} color={palette.shape} accent={palette.accent} />
        </svg>
    );
}
