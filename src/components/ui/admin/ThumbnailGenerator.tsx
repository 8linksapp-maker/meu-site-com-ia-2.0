import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { Sparkles, Loader2, Trash2 } from 'lucide-react';
import Field from '../Field';
import { Input } from '../Input';

export type ThumbnailBadgeType = 'TRILHA' | 'AULA' | 'REPLAY';

interface ThumbnailGeneratorProps {
    badge: ThumbnailBadgeType;
    initialTitle?: string;
    initialSubtitle?: string;
    initialContext?: string;
    initialUrl?: string | null;
    uploadPrefix: string;
    onGenerated: (url: string) => void;
    onRemove?: () => void;
}

/**
 * Gerador de thumbnail Café-da-Tarde — preview ao vivo + export PNG 1280×720.
 *
 * Bruno preenche 3 campos (título / subtitle / contexto), vê preview instantâneo,
 * gera PNG via html-to-image e faz upload via /api/admin/upload-image.
 *
 * Template geométrico: papel-craft solid + blob coral 18% à direita,
 * Fraunces título + Karla subtitle, vibe editorial Café-da-Tarde.
 */
export default function ThumbnailGenerator({
    badge,
    initialTitle = '',
    initialSubtitle = '',
    initialContext = '',
    initialUrl = null,
    uploadPrefix,
    onGenerated,
    onRemove,
}: ThumbnailGeneratorProps) {
    const [title, setTitle] = useState(initialTitle);
    const [subtitle, setSubtitle] = useState(initialSubtitle);
    const [context, setContext] = useState(initialContext);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');
    const [scale, setScale] = useState(0.3);

    const previewWrapperRef = useRef<HTMLDivElement>(null);
    const previewRef = useRef<HTMLDivElement>(null);

    // Sincroniza com mudanças do parent
    useEffect(() => { setTitle(initialTitle); }, [initialTitle]);

    // Calcula scale conforme largura do wrapper
    useEffect(() => {
        if (typeof window === 'undefined') return;
        function update() {
            if (!previewWrapperRef.current) return;
            const w = previewWrapperRef.current.offsetWidth;
            setScale(w / 1280);
        }
        update();
        if (typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', update);
            return () => window.removeEventListener('resize', update);
        }
        const ro = new ResizeObserver(update);
        if (previewWrapperRef.current) ro.observe(previewWrapperRef.current);
        return () => ro.disconnect();
    }, []);

    async function handleGenerate() {
        if (!previewRef.current) return;
        if (!title.trim()) {
            setError('Coloque um título antes de gerar.');
            return;
        }
        setGenerating(true);
        setError('');
        try {
            // Dynamic import — evita carregar html-to-image em SSR
            const { toPng } = await import('html-to-image');
            await document.fonts.ready;
            const dataUrl = await toPng(previewRef.current, {
                pixelRatio: 1,
                width: 1280,
                height: 720,
                cacheBust: true,
                style: { transform: 'none' },
            });

            const blob = await (await fetch(dataUrl)).blob();
            const file = new File([blob], `${uploadPrefix}-${Date.now()}.png`, { type: 'image/png' });

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado');
            const formData = new FormData();
            formData.append('file', file);
            formData.append('prefix', uploadPrefix);

            const res = await fetch('/api/admin/upload-image', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Falha no upload');

            onGenerated(data.url);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Erro ao gerar.');
        } finally {
            setGenerating(false);
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-coral-terra" />
                <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em]">
                    Gerar thumbnail
                </p>
            </div>

            {/* Thumb já gerada */}
            {initialUrl && (
                <div className="relative">
                    <img
                        src={initialUrl}
                        alt="Thumbnail atual"
                        className="w-full aspect-video object-cover rounded-[10px] border border-borda-cafe"
                    />
                    {onRemove && (
                        <button
                            type="button"
                            onClick={onRemove}
                            className="absolute top-2 right-2 inline-flex items-center gap-1 bg-cream-surface/95 text-vermelho-tijolo hover:bg-[oklch(94%_0.025_28)] px-2.5 py-1 rounded-md text-xs font-semibold"
                        >
                            <Trash2 className="w-3 h-3" /> Remover
                        </button>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Inputs */}
                <div className="space-y-3">
                    <Field label="Headline" htmlFor="thumb-title" helper="Título principal — 2-4 palavras funciona melhor.">
                        <Input
                            id="thumb-title"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="Primeiro site"
                            maxLength={40}
                        />
                    </Field>

                    <Field label="Subheadline" htmlFor="thumb-subtitle" optional helper="Frase de complemento curta.">
                        <Input
                            id="thumb-subtitle"
                            value={subtitle}
                            onChange={e => setSubtitle(e.target.value)}
                            placeholder="no ar em 2 minutos"
                            maxLength={50}
                        />
                    </Field>

                    <Field label="Contexto" htmlFor="thumb-context" optional helper="Aparece no badge top-left junto do tipo.">
                        <Input
                            id="thumb-context"
                            value={context}
                            onChange={e => setContext(e.target.value)}
                            placeholder="Iniciantes · 8 aulas"
                            maxLength={40}
                        />
                    </Field>

                    {error && (
                        <p className="text-xs text-vermelho-tijolo">{error}</p>
                    )}

                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={generating || !title.trim()}
                        className="w-full inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-4 py-2.5 rounded-[10px] font-semibold text-sm transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
                    >
                        {generating ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Gerando…</>
                        ) : initialUrl ? (
                            <><Sparkles className="w-4 h-4" /> Gerar nova versão</>
                        ) : (
                            <><Sparkles className="w-4 h-4" /> Gerar e usar essa</>
                        )}
                    </button>
                </div>

                {/* Preview */}
                <div className="space-y-2">
                    <p className="text-xs font-semibold text-cafe-cinza-quente">Preview · 1280×720</p>
                    <div
                        ref={previewWrapperRef}
                        className="aspect-video w-full bg-cream-elevated border border-borda-cafe rounded-[10px] overflow-hidden relative"
                    >
                        <div
                            ref={previewRef}
                            style={{
                                width: '1280px',
                                height: '720px',
                                transform: `scale(${scale})`,
                                transformOrigin: 'top left',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                            }}
                        >
                            <ThumbnailTemplate
                                badge={badge}
                                title={title || 'Seu título aqui'}
                                subtitle={subtitle}
                                context={context}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// TEMPLATE (renderiza em 1280×720 sempre)
// ─────────────────────────────────────────────────────────────────────────

function ThumbnailTemplate({
    badge, title, subtitle, context,
}: {
    badge: ThumbnailBadgeType;
    title: string;
    subtitle: string;
    context: string;
}) {
    // Hex pra rasterização previsível (OKLCH pode variar entre browsers no html-to-image)
    const PAPEL_CRAFT = '#FAF7F0';
    const CARVAO_QUENTE = '#262220';
    const CORAL_TERRA = '#9C4A2C';
    const CAFE_MEDIO = '#5A4940';
    const CAFE_CINZA_QUENTE = '#8A7A6F';

    const badgeLabel = context.trim() ? `${badge} · ${context}` : badge;
    const titleSize = title.length > 24 ? '88px' : title.length > 14 ? '108px' : '128px';

    return (
        <div
            style={{
                width: '1280px',
                height: '720px',
                position: 'relative',
                background: PAPEL_CRAFT,
                fontFamily: '"Karla", system-ui, sans-serif',
                overflow: 'hidden',
                padding: '72px 80px',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
            }}
        >
            {/* Blob coral + dot grid (decoração SVG) */}
            <svg
                width="1280"
                height="720"
                viewBox="0 0 1280 720"
                xmlns="http://www.w3.org/2000/svg"
                style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
            >
                <defs>
                    <linearGradient id="blobGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={CORAL_TERRA} stopOpacity="0.22" />
                        <stop offset="100%" stopColor={CORAL_TERRA} stopOpacity="0.10" />
                    </linearGradient>
                </defs>
                <path
                    d="M 1280 0 L 1280 720 L 820 720 C 760 700 700 660 690 580 C 680 480 760 420 800 340 C 850 240 840 140 920 80 C 980 30 1080 30 1140 0 Z"
                    fill="url(#blobGrad)"
                />
                {/* Dot grid topo-direita do título */}
                <g opacity="0.25">
                    {Array.from({ length: 5 }).map((_, row) =>
                        Array.from({ length: 6 }).map((__, col) => (
                            <circle
                                key={`dot-${row}-${col}`}
                                cx={80 + col * 28}
                                cy={596 + row * 22}
                                r="2"
                                fill={CORAL_TERRA}
                            />
                        ))
                    )}
                </g>
            </svg>

            {/* Badge topo */}
            <div style={{ position: 'relative', zIndex: 1 }}>
                <div
                    style={{
                        fontSize: '24px',
                        fontWeight: 700,
                        letterSpacing: '0.16em',
                        color: CORAL_TERRA,
                        textTransform: 'uppercase',
                    }}
                >
                    {badgeLabel}
                </div>
            </div>

            {/* Título + subtitle */}
            <div style={{ position: 'relative', zIndex: 1, maxWidth: '720px' }}>
                <h1
                    style={{
                        fontFamily: '"Fraunces", Georgia, serif',
                        fontWeight: 400,
                        fontSize: titleSize,
                        lineHeight: 1.02,
                        letterSpacing: '-0.02em',
                        color: CARVAO_QUENTE,
                        margin: 0,
                        marginBottom: subtitle ? '24px' : '0',
                    }}
                >
                    {title}
                </h1>

                {subtitle && (
                    <>
                        <div
                            style={{
                                width: '64px',
                                height: '3px',
                                background: CORAL_TERRA,
                                marginBottom: '20px',
                            }}
                        />
                        <p
                            style={{
                                fontSize: '32px',
                                color: CAFE_MEDIO,
                                margin: 0,
                                lineHeight: 1.35,
                                maxWidth: '620px',
                            }}
                        >
                            {subtitle}
                        </p>
                    </>
                )}
            </div>

            {/* Footer */}
            <div
                style={{
                    position: 'relative',
                    zIndex: 1,
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '12px',
                    fontSize: '22px',
                    fontWeight: 600,
                    color: CAFE_CINZA_QUENTE,
                    letterSpacing: '0.04em',
                }}
            >
                <span
                    style={{
                        color: CORAL_TERRA,
                        fontFamily: '"Fraunces", Georgia, serif',
                        fontSize: '28px',
                        fontWeight: 400,
                    }}
                >
                    msia
                </span>
                <span>·</span>
                <span>meusitecomia.com.br</span>
            </div>
        </div>
    );
}
