import { supabase } from '../../lib/supabase';

/**
 * TutorialBlock — componente padrão para tutoriais na plataforma.
 *
 * Sempre apresenta 3 formas de conteúdo:
 *   1. Vídeo  — assistir o tutorial em vídeo
 *   2. Texto  — instruções passo a passo em texto
 *   3. Imagens — capturas de tela das etapas
 *
 * Uso:
 *   <TutorialBlock
 *     videoUrl="https://cdn.example.com/tutorial.mp4"
 *     videoPoster="https://cdn.example.com/thumb.jpg"
 *     steps={[<>Acesse <a>github.com</a>...</>, <>Clique em...</>]}
 *     images={[{ src: '/img/step1.png', caption: 'Clique em Settings' }]}
 *   />
 */

import { useState, useRef, useEffect } from 'react';
import { Play, BookOpen, Image, X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

// ── TYPES ────────────────────────────────────────────────────────────
export interface TutorialImage {
    src: string;
    caption?: string;
}

export interface TutorialBlockProps {
    /** URL do vídeo (mp4/webm direto ou YouTube embed URL) */
    videoUrl?: string;
    /** Thumbnail do vídeo antes de dar play */
    videoPoster?: string;
    /** Passos em texto — array de ReactNode, cada item = 1 passo */
    steps: React.ReactNode[];
    /** Capturas de tela das etapas */
    images?: TutorialImage[];
    /** Qual aba abrir por padrão. Default: 'video' se tiver vídeo, senão 'steps' */
    defaultTab?: 'video' | 'steps' | 'images';
}

type Tab = 'video' | 'steps' | 'images';

// ── LIGHTBOX ─────────────────────────────────────────────────────────
function Lightbox({
    images, index, onClose, onPrev, onNext,
}: {
    images: TutorialImage[]; index: number;
    onClose: () => void; onPrev: () => void; onNext: () => void;
}) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') onPrev();
            if (e.key === 'ArrowRight') onNext();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose, onPrev, onNext]);

    return (
        <div
            className="fixed inset-0 z-[999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={onClose}
        >
            <button
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
                onClick={onClose}
            >
                <X className="w-5 h-5" />
            </button>

            {images.length > 1 && (
                <>
                    <button
                        className="absolute left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all disabled:opacity-30"
                        onClick={e => { e.stopPropagation(); onPrev(); }}
                        disabled={index === 0}
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                        className="absolute right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all disabled:opacity-30"
                        onClick={e => { e.stopPropagation(); onNext(); }}
                        disabled={index === images.length - 1}
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </>
            )}

            <div
                className="max-w-4xl w-full space-y-3"
                onClick={e => e.stopPropagation()}
            >
                <img
                    src={images[index].src}
                    alt={images[index].caption || `Imagem ${index + 1}`}
                    className="w-full rounded-2xl shadow-2xl object-contain max-h-[75vh]"
                />
                {images[index].caption && (
                    <p className="text-center text-white/60 text-sm">{images[index].caption}</p>
                )}
                {images.length > 1 && (
                    <p className="text-center text-white/30 text-xs">
                        {index + 1} / {images.length}
                    </p>
                )}
            </div>
        </div>
    );
}

// ── VIDEO PLAYER ─────────────────────────────────────────────────────
function VideoPlayer({ url, poster }: { url: string; poster?: string }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);

    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be') || url.includes('youtube-nocookie.com');

    if (isYouTube) {
        return (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black">
                <iframe
                    src={url}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>
        );
    }

    return (
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black group">
            <video
                ref={videoRef}
                src={url}
                poster={poster}
                className="w-full h-full object-cover"
                controls={playing}
                muted={muted}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                playsInline
            />
            {!playing && (
                <div
                    className="absolute inset-0 flex items-center justify-center cursor-pointer bg-black/30 group-hover:bg-black/20 transition-all"
                    onClick={() => { videoRef.current?.play(); }}
                >
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl">
                        <Play className="w-7 h-7 text-white fill-white ml-1" />
                    </div>
                </div>
            )}
        </div>
    );
}

// ── VIDEO PLACEHOLDER (sem URL) ───────────────────────────────────────
function VideoPlaceholder() {
    return (
        <div className="w-full aspect-video rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                <Play className="w-6 h-6 text-gray-300" />
            </div>
            <div className="text-center">
                <p className="text-gray-400 text-sm font-bold">Vídeo em breve</p>
                <p className="text-gray-300 text-xs mt-0.5">Siga o passo a passo em texto por enquanto</p>
            </div>
        </div>
    );
}

// ── MAIN COMPONENT ───────────────────────────────────────────────────
export default function TutorialBlock({
    videoUrl,
    videoPoster,
    steps,
    images = [],
    defaultTab,
}: TutorialBlockProps) {
    const resolvedDefault: Tab = defaultTab ?? (videoUrl ? 'video' : 'steps');
    const [activeTab, setActiveTab] = useState<Tab>(resolvedDefault);
    const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

    const tabs: { id: Tab; label: string; icon: React.ReactNode; count?: number; disabled?: boolean }[] = [
        {
            id: 'video',
            label: 'Assistir',
            icon: <Play className="w-3.5 h-3.5" />,
        },
        {
            id: 'steps',
            label: 'Ler',
            icon: <BookOpen className="w-3.5 h-3.5" />,
            count: steps.length,
        },
        {
            id: 'images',
            label: 'Imagens',
            icon: <Image className="w-3.5 h-3.5" />,
            count: images.length,
            disabled: images.length === 0,
        },
    ];

    return (
        <>
            {lightboxIndex !== null && images.length > 0 && (
                <Lightbox
                    images={images}
                    index={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                    onPrev={() => setLightboxIndex(i => Math.max(0, (i ?? 0) - 1))}
                    onNext={() => setLightboxIndex(i => Math.min(images.length - 1, (i ?? 0) + 1))}
                />
            )}

            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">

                {/* Tab bar */}
                <div className="flex border-b border-gray-100">
                    {tabs.map(tab => (
                        <button
                            type="button"
                            key={tab.id}
                            onClick={() => !tab.disabled && setActiveTab(tab.id)}
                            disabled={tab.disabled}
                            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold transition-all border-b-2 -mb-px ${
                                activeTab === tab.id
                                    ? 'text-[#7c3aed] border-[#7c3aed]'
                                    : tab.disabled
                                        ? 'text-gray-300 border-transparent cursor-not-allowed'
                                        : 'text-gray-400 border-transparent hover:text-gray-600'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                            {tab.count !== undefined && !tab.disabled && (
                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
                                    activeTab === tab.id
                                        ? 'bg-[#7c3aed]/10 text-[#7c3aed]'
                                        : 'bg-gray-100 text-gray-400'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-4">

                    {/* VIDEO */}
                    {activeTab === 'video' && (
                        videoUrl
                            ? <VideoPlayer url={videoUrl} poster={videoPoster} />
                            : <VideoPlaceholder />
                    )}

                    {/* STEPS */}
                    {activeTab === 'steps' && (
                        <div className="space-y-3">
                            {steps.map((step, i) => (
                                <div key={i} className="flex gap-3 items-start">
                                    <span className="w-6 h-6 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5 border border-[#7c3aed]/20">
                                        {i + 1}
                                    </span>
                                    <p className="text-sm text-gray-600 leading-relaxed [&_strong]:text-gray-900 [&_strong]:font-bold [&_a]:text-[#7c3aed] [&_a]:font-bold [&_a:hover]:underline [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:bg-gray-100 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_code]:text-[#7c3aed]">
                                        {step}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* IMAGES */}
                    {activeTab === 'images' && images.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                            {images.map((img, i) => (
                                <button
                                    type="button"
                                    key={i}
                                    onClick={() => setLightboxIndex(i)}
                                    className="group relative rounded-xl overflow-hidden border border-gray-200 hover:border-[#7c3aed]/40 transition-all text-left"
                                >
                                    <img
                                        src={img.src}
                                        alt={img.caption || `Passo ${i + 1}`}
                                        className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <div className="w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center shadow">
                                            <Maximize2 className="w-4 h-4 text-gray-700" />
                                        </div>
                                    </div>
                                    {img.caption && (
                                        <div className="px-2 py-1.5 bg-gray-50 border-t border-gray-100">
                                            <p className="text-[10px] text-gray-500 truncate">{img.caption}</p>
                                        </div>
                                    )}
                                    <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-[#7c3aed] text-white text-[9px] font-black flex items-center justify-center">
                                        {i + 1}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                </div>
            </div>
        </>
    );
}

// ── REMOTE WRAPPER — busca conteúdo do Supabase por slug ─────────────
/**
 * Usa o slug para buscar o conteúdo do tutorial no Supabase.
 * Atualizar pelo admin em /admin/tutoriais reflete aqui automaticamente.
 *
 * Exemplo:
 *   <TutorialBlockBySlug slug="github-token" />
 */
export function TutorialBlockBySlug({ slug }: { slug: string }) {
    const [props, setProps] = useState<TutorialBlockProps | null>(null);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        supabase
            .from('tutorial_blocks')
            .select('*')
            .eq('slug', slug)
            .maybeSingle()
            .then(({ data }) => {
                if (!data) { setNotFound(true); return; }
                setProps({
                    videoUrl: data.video_url || undefined,
                    videoPoster: data.video_poster || undefined,
                    steps: (data.steps || []).map((s: string) => <span dangerouslySetInnerHTML={{ __html: s }} />),
                    images: data.images || [],
                });
            });
    }, [slug]);

    if (notFound) return null;

    if (!props) {
        return (
            <div className="rounded-2xl border border-white/8 bg-white/3 overflow-hidden animate-pulse">
                <div className="flex border-b border-white/8">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-10 w-24 bg-white/5 m-1 rounded-lg" />
                    ))}
                </div>
                <div className="h-40 m-4 bg-white/5 rounded-xl" />
            </div>
        );
    }

    return <TutorialBlock {...props} />;
}
