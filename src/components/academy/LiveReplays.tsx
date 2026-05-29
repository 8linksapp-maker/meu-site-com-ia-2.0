import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Play, Lock, X, Loader2, ArrowLeft, Radio, Search, Calendar } from 'lucide-react';
import { Card } from '../ui';

interface Replay {
    id: string;
    title: string;
    description: string | null;
    video_url: string | null;
    display_order: number;
}

// Convenção: replays vivem na trilha com slug `aulas-ao-vivo`.
// Se a trilha não existir, mostra empty state instruindo admin a criar.
const REPLAYS_TRAIL_SLUG = 'aulas-ao-vivo';

export default function LiveReplays() {
    const [replays, setReplays] = useState<Replay[]>([]);
    const [loading, setLoading] = useState(true);
    const [trailMissing, setTrailMissing] = useState(false);
    const [search, setSearch] = useState('');
    const [activeReplay, setActiveReplay] = useState<Replay | null>(null);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            // 1. Acha a trilha de replays
            const { data: trail } = await supabase
                .from('trails')
                .select('id')
                .eq('slug', REPLAYS_TRAIL_SLUG)
                .maybeSingle();

            if (!trail) {
                setTrailMissing(true);
                setReplays([]);
                return;
            }

            // 2. Pega trail_lessons + lessons relacionadas (mais recente primeiro)
            const { data: tls } = await supabase
                .from('trail_lessons')
                .select('lesson_id, display_order')
                .eq('trail_id', trail.id)
                .order('display_order', { ascending: false });

            const ids = (tls ?? []).map(tl => tl.lesson_id);
            if (ids.length === 0) {
                setReplays([]);
                return;
            }

            const { data: lessons } = await supabase
                .from('lessons')
                .select('id, title, description, video_url')
                .in('id', ids);

            const orderMap = new Map((tls ?? []).map(tl => [tl.lesson_id, tl.display_order]));
            const ordered: Replay[] = (lessons ?? [])
                .map(l => ({ ...l, display_order: orderMap.get(l.id) ?? 0 }))
                .sort((a, b) => b.display_order - a.display_order);

            setReplays(ordered);
        } catch (err) {
            console.error('Erro carregando replays:', err);
        } finally {
            setLoading(false);
        }
    }

    function normalize(t: string) {
        return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    }

    const filtered = search.trim()
        ? replays.filter(r => normalize(r.title + ' ' + (r.description || '')).includes(normalize(search)))
        : replays;

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="h-16 bg-cream-surface border border-borda-cafe rounded-[12px] animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-56 bg-cream-surface border border-borda-cafe rounded-[12px] animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-10">
            {/* Voltar */}
            <a
                href="/aulas"
                className="inline-flex items-center gap-2 text-cafe-medio hover:text-coral-terra font-semibold text-sm transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Voltar pra Academy
            </a>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-borda-cafe pb-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-coral-terra" />
                        <h1 className="font-display text-3xl md:text-[2rem] font-normal text-carvao-quente tracking-tight">
                            Replays das aulas ao vivo
                        </h1>
                    </div>
                    <p className="text-base text-cafe-medio mt-1.5 tabular-nums">
                        {replays.length > 0
                            ? `${replays.length} ${replays.length === 1 ? 'gravação disponível' : 'gravações disponíveis'} · sexta às 19h BRT`
                            : 'Gravações das aulas ao vivo da Academy.'}
                    </p>
                </div>
            </div>

            {/* Search bar */}
            {replays.length > 3 && (
                <div className="flex items-center gap-2 max-w-md">
                    <Search className="w-4 h-4 text-cafe-cinza-quente shrink-0" />
                    <input
                        type="search"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar replay por título ou descrição…"
                        className="flex-1 bg-cream-elevated text-carvao-quente text-sm rounded-[10px] px-3 py-2 border border-borda-cafe focus:border-coral-terra focus:outline-none min-h-[40px]"
                    />
                </div>
            )}

            {/* Estados vazios */}
            {trailMissing ? (
                <Card padding="lg" className="!border-mostarda-amber/40 !bg-[oklch(97%_0.025_80)]">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-mostarda-amber flex items-center justify-center shrink-0">
                            <Calendar className="w-5 h-5 text-carvao-quente" />
                        </div>
                        <div className="flex-1">
                            <p className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                                Sem trilha de replays configurada
                            </p>
                            <p className="text-sm text-cafe-medio mt-1 leading-relaxed">
                                Cria no admin uma trilha com slug{' '}
                                <code className="font-mono bg-cream-surface px-1.5 py-0.5 rounded text-xs text-carvao-quente">aulas-ao-vivo</code>
                                {' '}— as gravações cadastradas nessa trilha aparecem aqui automaticamente.
                            </p>
                            <a
                                href="/admin/aulas"
                                className="inline-flex items-center gap-2 mt-3 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-4 py-2 rounded-[10px] font-semibold text-xs transition-colors min-h-[36px]"
                            >
                                Abrir admin de trilhas
                            </a>
                        </div>
                    </div>
                </Card>
            ) : replays.length === 0 ? (
                <Card padding="lg">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-cream-elevated flex items-center justify-center shrink-0">
                            <Play className="w-5 h-5 text-cafe-cinza-quente" />
                        </div>
                        <div>
                            <p className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                                Nenhuma gravação ainda
                            </p>
                            <p className="text-sm text-cafe-medio mt-1">
                                As gravações das aulas ao vivo aparecem aqui após cada sexta. A próxima já tá agendada na home da Academy.
                            </p>
                        </div>
                    </div>
                </Card>
            ) : filtered.length === 0 ? (
                <Card padding="lg">
                    <p className="text-sm text-cafe-medio italic text-center">
                        Nenhum replay encontrado pra essa busca.
                    </p>
                </Card>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map((replay, i) => (
                        <ReplayCard
                            key={replay.id}
                            replay={replay}
                            position={filtered.length - i}
                            onPlay={() => replay.video_url && setActiveReplay(replay)}
                        />
                    ))}
                </div>
            )}

            {activeReplay && (
                <ReplayModal replay={activeReplay} onClose={() => setActiveReplay(null)} />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────

function ReplayCard({
    replay, position, onPlay,
}: {
    replay: Replay;
    position: number;
    onPlay: () => void;
}) {
    const hasVideo = !!replay.video_url;
    return (
        <button
            type="button"
            onClick={onPlay}
            disabled={!hasVideo}
            className={`group text-left bg-cream-surface border border-borda-cafe rounded-[12px] overflow-hidden transition-shadow duration-200 flex flex-col focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra ${
                hasVideo ? 'cursor-pointer' : 'opacity-60 cursor-default'
            }`}
            style={{ boxShadow: hasVideo ? '0 1px 2px 0 rgba(80, 40, 20, 0.04)' : 'none' }}
            onMouseEnter={(e) => {
                if (hasVideo) e.currentTarget.style.boxShadow = '0 6px 16px -4px rgba(80, 40, 20, 0.10)';
            }}
            onMouseLeave={(e) => {
                if (hasVideo) e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(80, 40, 20, 0.04)';
            }}
        >
            <div className="relative aspect-video overflow-hidden bg-cream-elevated">
                <div className="w-full h-full flex items-center justify-center">
                    <span className="font-display text-cafe-cinza-quente font-normal text-5xl tabular-nums opacity-50">
                        #{position}
                    </span>
                </div>

                {hasVideo && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-carvao-quente/20">
                        <div className="w-14 h-14 rounded-full bg-coral-terra flex items-center justify-center shadow-[0_6px_16px_-4px_rgba(80,40,20,0.20)]">
                            <Play className="w-5 h-5 fill-papel-craft text-papel-craft ml-0.5" />
                        </div>
                    </div>
                )}

                <span className="absolute top-3 left-3 px-2 py-0.5 bg-carvao-quente/80 text-papel-craft text-xs font-semibold rounded-md uppercase tracking-wide">
                    Replay #{position}
                </span>

                {!hasVideo && (
                    <div className="absolute inset-0 flex items-center justify-center bg-cream-surface/70">
                        <span className="text-xs text-cafe-cinza-quente font-semibold">Em breve</span>
                    </div>
                )}
            </div>

            <div className="p-4 flex flex-col flex-1">
                <h3 className="font-display text-base font-normal text-carvao-quente tracking-tight leading-snug mb-1 group-hover:text-coral-terra transition-colors">
                    {replay.title}
                </h3>
                {replay.description && (
                    <p className="text-sm text-cafe-medio line-clamp-2 leading-relaxed">{replay.description}</p>
                )}
            </div>
        </button>
    );
}

function ReplayModal({ replay, onClose }: { replay: Replay; onClose: () => void }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [videoState, setVideoState] = useState<'loading' | 'ready' | 'error'>('loading');
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        function handleEsc(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 bg-carvao-quente/50 z-[200] flex items-center justify-center p-4"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="replay-title"
        >
            <div className="w-full max-w-4xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                    <h3 id="replay-title" className="font-display text-papel-craft text-lg font-normal tracking-tight truncate pr-4">
                        {replay.title}
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar replay"
                        className="shrink-0 w-11 h-11 flex items-center justify-center rounded-[10px] bg-papel-craft/15 hover:bg-papel-craft/25 text-papel-craft transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div
                    className="aspect-video bg-carvao-quente rounded-[12px] overflow-hidden shadow-[0_12px_32px_-12px_rgba(80,40,20,0.30)] relative"
                    onContextMenu={e => e.preventDefault()}
                >
                    {replay.video_url ? (
                        <video
                            ref={videoRef}
                            key={replay.id + ':' + retryCount}
                            src={replay.video_url}
                            className="w-full h-full"
                            controls
                            autoPlay
                            playsInline
                            preload="metadata"
                            onContextMenu={e => e.preventDefault()}
                            onLoadedMetadata={() => setVideoState('ready')}
                            onError={() => setVideoState('error')}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <Lock className="w-8 h-8 text-papel-craft/40" />
                        </div>
                    )}
                    {replay.video_url && videoState === 'loading' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-carvao-quente/50 pointer-events-none z-10">
                            <Loader2 className="w-8 h-8 text-papel-craft animate-spin mb-2" />
                            <p className="text-papel-craft/80 text-sm">Preparando…</p>
                        </div>
                    )}
                    {replay.video_url && videoState === 'error' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-carvao-quente/80 z-10">
                            <p className="text-papel-craft text-sm mb-3">Não conseguimos carregar o vídeo.</p>
                            <button
                                type="button"
                                onClick={() => { setVideoState('loading'); setRetryCount(c => c + 1); }}
                                className="px-4 py-2 bg-coral-terra text-papel-craft rounded-[10px] text-sm font-semibold hover:bg-terracota-profundo transition"
                            >
                                Tentar de novo
                            </button>
                        </div>
                    )}
                </div>
                {replay.description && (
                    <p className="text-sm text-papel-craft/80 mt-3 leading-relaxed max-w-3xl">
                        {replay.description}
                    </p>
                )}
            </div>
        </div>
    );
}
