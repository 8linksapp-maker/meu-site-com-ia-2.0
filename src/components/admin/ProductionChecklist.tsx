import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CheckCircle2, XCircle, Play, BookOpen, Image, ExternalLink, RefreshCw, Video, AlertTriangle } from 'lucide-react';

interface TutorialBlock {
    id: string;
    slug: string;
    title: string;
    video_url: string | null;
    steps: string[];
    images: { src: string; caption: string }[];
    updated_at: string;
}

// Todos os slugs usados no sistema (fonte da verdade)
const SYSTEM_SLUGS: { slug: string; location: string; description: string }[] = [
    { slug: 'github-token', location: 'TokenGate + Configurações', description: 'Como criar token do GitHub' },
    { slug: 'vercel-token', location: 'TokenGate + Configurações', description: 'Como criar token da Vercel' },
];

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
            ok ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-500'
        }`}>
            {ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {label}
        </span>
    );
}

function CompletionBar({ total, done }: { total: number; done: number }) {
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${pct === 100 ? 'bg-emerald-500' : 'bg-[#7c3aed]'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="text-xs font-bold text-gray-500 shrink-0 tabular-nums">{done}/{total}</span>
        </div>
    );
}

export default function ProductionChecklist() {
    const [blocks, setBlocks] = useState<TutorialBlock[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchBlocks(); }, []);

    const fetchBlocks = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('tutorial_blocks')
            .select('id, slug, title, video_url, steps, images, updated_at')
            .order('slug');
        if (data) setBlocks(data);
        setLoading(false);
    };

    // Enriquece slugs do sistema com dados do banco
    const systemItems = SYSTEM_SLUGS.map(s => ({
        ...s,
        block: blocks.find(b => b.slug === s.slug) || null,
    }));

    // Slugs extras no banco que não estão mapeados no sistema
    const extraBlocks = blocks.filter(b => !SYSTEM_SLUGS.find(s => s.slug === b.slug));

    // Stats gerais
    const allItems = [...systemItems.map(s => s.block), ...extraBlocks.map(b => b)].filter(Boolean) as TutorialBlock[];
    const withVideo = allItems.filter(b => !!b.video_url).length;
    const withSteps = allItems.filter(b => b.steps?.length > 0).length;
    const withImages = allItems.filter(b => b.images?.length > 0).length;
    const total = systemItems.length + extraBlocks.length;

    if (loading) return (
        <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </div>
    );

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black text-gray-900">Produção de Conteúdo</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        Tutoriais embutidos na plataforma — controle do que falta gravar.
                    </p>
                </div>
                <button
                    onClick={fetchBlocks}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                    <RefreshCw className="w-4 h-4" />
                    Atualizar
                </button>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Com vídeo', value: withVideo, total, icon: Play, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Com passos', value: withSteps, total, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Com imagens', value: withImages, total, icon: Image, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4">
                        <div className={`w-8 h-8 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                            <stat.icon className={`w-4 h-4 ${stat.color}`} />
                        </div>
                        <p className="text-xl font-black text-gray-900">{stat.value}<span className="text-gray-300 font-bold">/{stat.total}</span></p>
                        <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                        <div className="mt-2">
                            <CompletionBar total={stat.total} done={stat.value} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Checklist — Tutoriais do sistema */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
                    <Video className="w-4 h-4 text-[#7c3aed]" />
                    <h3 className="font-black text-gray-800 text-sm">Tutoriais do Sistema</h3>
                    <span className="ml-auto text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {systemItems.filter(s => s.block?.video_url).length}/{systemItems.length} com vídeo
                    </span>
                </div>

                <div className="divide-y divide-gray-50">
                    {systemItems.map(item => {
                        const b = item.block;
                        const hasVideo = !!b?.video_url;
                        const hasSteps = (b?.steps?.length ?? 0) > 0;
                        const hasImages = (b?.images?.length ?? 0) > 0;
                        const isComplete = hasVideo && hasSteps;

                        return (
                            <div
                                key={item.slug}
                                className={`px-5 py-4 flex items-start gap-4 ${!b ? 'bg-red-50/30' : ''}`}
                            >
                                {/* Status icon */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                    isComplete ? 'bg-emerald-100 text-emerald-600' :
                                    !b ? 'bg-red-100 text-red-500' :
                                    'bg-amber-100 text-amber-600'
                                }`}>
                                    {isComplete
                                        ? <CheckCircle2 className="w-4 h-4" />
                                        : !b
                                            ? <AlertTriangle className="w-4 h-4" />
                                            : <XCircle className="w-4 h-4" />
                                    }
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-black text-gray-900 text-sm">{item.description}</p>
                                        <code className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded font-mono">{item.slug}</code>
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-0.5">Aparece em: <span className="text-gray-600 font-semibold">{item.location}</span></p>

                                    {!b ? (
                                        <p className="text-xs text-red-500 font-bold mt-2">
                                            ⚠ Não existe no banco — rode o SQL de seed ou crie em /admin/tutoriais
                                        </p>
                                    ) : (
                                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                                            <StatusBadge ok={hasVideo} label="Vídeo" />
                                            <StatusBadge ok={hasSteps} label={`${b.steps?.length ?? 0} passos`} />
                                            <StatusBadge ok={hasImages} label={`${b.images?.length ?? 0} imagens`} />
                                        </div>
                                    )}
                                </div>

                                {b && (
                                    <a
                                        href="/admin/tutoriais"
                                        className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-[#7c3aed] hover:underline"
                                    >
                                        Editar <ExternalLink className="w-3 h-3" />
                                    </a>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Blocos extras (não mapeados) */}
            {extraBlocks.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-gray-400" />
                        <h3 className="font-black text-gray-800 text-sm">Outros Tutorial Blocks</h3>
                        <span className="ml-1 text-[10px] font-bold text-gray-400">(criados no admin mas não mapeados no código)</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {extraBlocks.map(b => (
                            <div key={b.id} className="px-5 py-4 flex items-center gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-gray-800 text-sm">{b.title}</p>
                                        <code className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded font-mono">{b.slug}</code>
                                    </div>
                                    <div className="flex gap-2 mt-1.5">
                                        <StatusBadge ok={!!b.video_url} label="Vídeo" />
                                        <StatusBadge ok={b.steps?.length > 0} label={`${b.steps?.length ?? 0} passos`} />
                                        <StatusBadge ok={b.images?.length > 0} label={`${b.images?.length ?? 0} imagens`} />
                                    </div>
                                </div>
                                <a href="/admin/tutoriais" className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-[#7c3aed] hover:underline">
                                    Editar <ExternalLink className="w-3 h-3" />
                                </a>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Legenda */}
            <div className="flex items-center gap-6 px-1">
                {[
                    { color: 'bg-emerald-100 text-emerald-600', label: 'Completo' },
                    { color: 'bg-amber-100 text-amber-600', label: 'Incompleto (falta vídeo ou passos)' },
                    { color: 'bg-red-100 text-red-500', label: 'Não existe no banco' },
                ].map(l => (
                    <div key={l.label} className="flex items-center gap-1.5">
                        <div className={`w-4 h-4 rounded-full ${l.color} flex items-center justify-center`}>
                            <CheckCircle2 className="w-2.5 h-2.5" />
                        </div>
                        <span className="text-[11px] text-gray-500">{l.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
