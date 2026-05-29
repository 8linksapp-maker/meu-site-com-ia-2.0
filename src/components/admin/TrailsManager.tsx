import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Plus, Pencil, Trash2, ArrowLeft, ChevronUp, ChevronDown,
    Video, Loader2, Sparkles, GraduationCap, Lock, Clock,
    FolderOpen, Search, UploadCloud, Link as LinkIcon, X,
    AlertCircle, BookOpen, Star, RefreshCw,
} from 'lucide-react';
import PageHeader from '../ui/admin/PageHeader';
import StatusBadge from '../ui/admin/StatusBadge';
import FormModal from '../ui/admin/FormModal';
import ThumbnailGenerator from '../ui/admin/ThumbnailGenerator';
import Pagination from '../ui/admin/Pagination';
import { Card, Banner, Field, Input, Textarea, EmptyState } from '../ui';

// ── Types ────────────────────────────────────────────────────────────────
interface Trail {
    id: string;
    slug: string;
    title: string;
    description: string | null;
    icon: string | null;
    target_audience: string | null;
    display_order: number;
    is_featured: boolean;
    estimated_hours: number | null;
    thumbnail_url: string | null;
    kiwify_product_ids: string[];
    release_at: string | null;
    created_at?: string;
}

interface Lesson {
    id: string;
    title: string;
    description: string | null;
    video_url: string | null;
    highlights: string[] | null;
    thumbnail_url: string | null;
}

interface TrailLessonRow {
    trail_id: string;
    lesson_id: string;
    chapter: string | null;
    display_order: number;
}

interface LessonResource {
    id?: string;
    lesson_id?: string;
    title: string;
    url: string;
    display_order?: number;
}

interface JoinedLesson extends Lesson {
    chapter: string | null;
    display_order: number;
    resources?: LessonResource[];
}

// ── Constants ────────────────────────────────────────────────────────────
const TARGET_AUDIENCES = [
    { value: 'iniciantes', label: 'Iniciantes' },
    { value: 'freelancers', label: 'Freelancers' },
    { value: 'afiliados', label: 'Afiliados' },
    { value: 'pmes', label: 'PMEs locais' },
    { value: 'todos', label: 'Todos os perfis' },
];

const AUDIENCE_LABEL: Record<string, string> = Object.fromEntries(
    TARGET_AUDIENCES.map(t => [t.value, t.label])
);

// ── Helpers ──────────────────────────────────────────────────────────────
function slugify(title: string): string {
    return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

function formatReleaseAt(iso: string | null): string {
    if (!iso) return '';
    const date = new Date(iso);
    return date.toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── Root component ───────────────────────────────────────────────────────
export default function TrailsManager() {
    const [trails, setTrails] = useState<Trail[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [selectedTrailId, setSelectedTrailId] = useState<string | null>(null);
    const [trailLessons, setTrailLessons] = useState<JoinedLesson[]>([]);
    const [trailLessonsLoading, setTrailLessonsLoading] = useState(false);

    const [trailModal, setTrailModal] = useState<{ open: boolean; editing: Trail | null }>({ open: false, editing: null });
    const [lessonModal, setLessonModal] = useState<{ open: boolean; editing: JoinedLesson | null }>({ open: false, editing: null });
    const [libraryOpen, setLibraryOpen] = useState(false);

    useEffect(() => { loadTrails(); }, []);
    useEffect(() => {
        if (selectedTrailId) loadTrailLessons(selectedTrailId);
        else setTrailLessons([]);
    }, [selectedTrailId]);

    async function loadTrails() {
        setLoading(true);
        setError('');
        try {
            const { data, error: e } = await supabase
                .from('trails')
                .select('*')
                .order('display_order', { ascending: true })
                .order('created_at', { ascending: true });
            if (e) throw e;
            setTrails(data || []);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Erro ao carregar trilhas');
        } finally {
            setLoading(false);
        }
    }

    async function loadTrailLessons(trailId: string) {
        setTrailLessonsLoading(true);
        try {
            const { data: joinData } = await supabase
                .from('trail_lessons')
                .select('lesson_id, chapter, display_order')
                .eq('trail_id', trailId)
                .order('display_order', { ascending: true });

            const lessonIds = (joinData || []).map(j => j.lesson_id);
            if (lessonIds.length === 0) {
                setTrailLessons([]);
                return;
            }

            const { data: lessonsData } = await supabase
                .from('lessons')
                .select('id, title, description, video_url, highlights, thumbnail_url')
                .in('id', lessonIds);

            const { data: resourcesData } = await supabase
                .from('lesson_resources')
                .select('id, lesson_id, title, url, display_order')
                .in('lesson_id', lessonIds)
                .order('display_order', { ascending: true });

            const joined: JoinedLesson[] = (joinData || []).map(j => {
                const lesson = (lessonsData || []).find(l => l.id === j.lesson_id);
                if (!lesson) return null;
                return {
                    ...lesson,
                    chapter: j.chapter,
                    display_order: j.display_order,
                    resources: (resourcesData || []).filter(r => r.lesson_id === lesson.id),
                };
            }).filter(Boolean) as JoinedLesson[];

            setTrailLessons(joined);
        } finally {
            setTrailLessonsLoading(false);
        }
    }

    async function handleDeleteTrail(trail: Trail) {
        const ok = confirm(`Deletar trilha "${trail.title}"? Isso remove os vínculos com aulas (mas não deleta as aulas).`);
        if (!ok) return;
        const { error } = await supabase.from('trails').delete().eq('id', trail.id);
        if (error) {
            alert('Erro ao deletar: ' + error.message);
            return;
        }
        if (selectedTrailId === trail.id) setSelectedTrailId(null);
        loadTrails();
    }

    async function moveTrail(trailId: string, dir: 'up' | 'down') {
        const idx = trails.findIndex(t => t.id === trailId);
        if (idx === -1) return;
        if (dir === 'up' && idx === 0) return;
        if (dir === 'down' && idx === trails.length - 1) return;
        const other = dir === 'up' ? idx - 1 : idx + 1;
        const reordered = [...trails];
        [reordered[idx], reordered[other]] = [reordered[other], reordered[idx]];
        setTrails(reordered);
        for (let i = 0; i < reordered.length; i++) {
            await supabase.from('trails').update({ display_order: i }).eq('id', reordered[i].id);
        }
    }

    async function moveLesson(lessonId: string, dir: 'up' | 'down') {
        if (!selectedTrailId) return;
        const idx = trailLessons.findIndex(l => l.id === lessonId);
        if (idx === -1) return;
        if (dir === 'up' && idx === 0) return;
        if (dir === 'down' && idx === trailLessons.length - 1) return;
        const other = dir === 'up' ? idx - 1 : idx + 1;
        const reordered = [...trailLessons];
        [reordered[idx], reordered[other]] = [reordered[other], reordered[idx]];
        setTrailLessons(reordered);
        for (let i = 0; i < reordered.length; i++) {
            await supabase
                .from('trail_lessons')
                .update({ display_order: i })
                .eq('trail_id', selectedTrailId)
                .eq('lesson_id', reordered[i].id);
        }
    }

    async function handleRemoveLessonFromTrail(lessonId: string) {
        if (!selectedTrailId) return;
        const ok = confirm('Remover esta aula da trilha? A aula em si continua existindo e pode ser adicionada de novo depois.');
        if (!ok) return;
        await supabase
            .from('trail_lessons')
            .delete()
            .eq('trail_id', selectedTrailId)
            .eq('lesson_id', lessonId);
        loadTrailLessons(selectedTrailId);
    }

    async function handleDeleteLessonPermanently(lessonId: string) {
        const ok = confirm('DELETAR ESTA AULA PERMANENTEMENTE? Isso remove ela de todas as trilhas e apaga o histórico de progresso dos alunos. Não dá pra desfazer.');
        if (!ok) return;
        await supabase.from('lessons').delete().eq('id', lessonId);
        if (selectedTrailId) loadTrailLessons(selectedTrailId);
    }

    const selectedTrail = trails.find(t => t.id === selectedTrailId) ?? null;

    // ── Render ────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-coral-terra" />
                <p className="text-cafe-medio text-sm">Carregando trilhas…</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            {error && <Banner tone="error" icon={<AlertCircle className="w-5 h-5" />}>{error}</Banner>}

            {!selectedTrail ? (
                <TrailsListView
                    trails={trails}
                    onSelect={setSelectedTrailId}
                    onCreate={() => setTrailModal({ open: true, editing: null })}
                    onEdit={(t) => setTrailModal({ open: true, editing: t })}
                    onDelete={handleDeleteTrail}
                    onMove={moveTrail}
                />
            ) : (
                <TrailEditorView
                    trail={selectedTrail}
                    lessons={trailLessons}
                    loading={trailLessonsLoading}
                    onBack={() => setSelectedTrailId(null)}
                    onEditTrail={() => setTrailModal({ open: true, editing: selectedTrail })}
                    onCreateLesson={() => setLessonModal({ open: true, editing: null })}
                    onEditLesson={(l) => setLessonModal({ open: true, editing: l })}
                    onMoveLesson={moveLesson}
                    onRemoveLessonFromTrail={handleRemoveLessonFromTrail}
                    onDeleteLessonPermanently={handleDeleteLessonPermanently}
                />
            )}

            {trailModal.open && (
                <TrailFormModal
                    trail={trailModal.editing}
                    existingSlugs={trails.map(t => t.slug)}
                    onClose={() => setTrailModal({ open: false, editing: null })}
                    onSaved={() => {
                        setTrailModal({ open: false, editing: null });
                        loadTrails();
                    }}
                />
            )}

            {lessonModal.open && selectedTrail && (
                <LessonFormModal
                    trail={selectedTrail}
                    lesson={lessonModal.editing}
                    lessonsCount={trailLessons.length}
                    onOpenLibrary={() => setLibraryOpen(true)}
                    onClose={() => setLessonModal({ open: false, editing: null })}
                    onSaved={() => {
                        setLessonModal({ open: false, editing: null });
                        loadTrailLessons(selectedTrail.id);
                    }}
                />
            )}

            {libraryOpen && (
                <VideoLibraryModal
                    onClose={() => setLibraryOpen(false)}
                    onPick={(url) => {
                        setLibraryOpen(false);
                        window.dispatchEvent(new CustomEvent('trails:pick-video', { detail: url }));
                    }}
                />
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// SUB-VIEWS
// ─────────────────────────────────────────────────────────────────────────

function TrailsListView({
    trails, onSelect, onCreate, onEdit, onDelete, onMove,
}: {
    trails: Trail[];
    onSelect: (id: string) => void;
    onCreate: () => void;
    onEdit: (t: Trail) => void;
    onDelete: (t: Trail) => void;
    onMove: (id: string, dir: 'up' | 'down') => void;
}) {
    return (
        <>
            <PageHeader
                icon={<GraduationCap className="w-5 h-5" />}
                title="Trilhas da Academy"
                tagline={`${trails.length} ${trails.length === 1 ? 'trilha' : 'trilhas'} cadastradas. Reordene e edite por aqui — o aluno vê na ordem mostrada.`}
                action={
                    <button
                        type="button"
                        onClick={onCreate}
                        className="inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-5 py-2.5 rounded-[10px] font-semibold text-sm transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra min-h-[44px]"
                    >
                        <Plus className="w-4 h-4" />
                        Nova trilha
                    </button>
                }
            />

            {trails.length === 0 ? (
                <EmptyState
                    icon={GraduationCap}
                    title="Nenhuma trilha cadastrada ainda"
                    description="Trilhas organizam as aulas pro aluno. Comece criando a primeira."
                    action={
                        <button
                            type="button"
                            onClick={onCreate}
                            className="inline-flex items-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-5 py-2.5 rounded-[10px] font-semibold text-sm transition-colors min-h-[44px]"
                        >
                            <Plus className="w-4 h-4" /> Criar primeira trilha
                        </button>
                    }
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {trails.map((trail, i) => {
                        const isGated = trail.kiwify_product_ids?.length > 0;
                        const isLocked = trail.release_at && new Date(trail.release_at) > new Date();
                        return (
                            <Card key={trail.id} padding="sm" className="!p-0 overflow-hidden flex flex-col">
                                <div className="h-32 bg-cream-elevated relative overflow-hidden border-b border-borda-cafe">
                                    {trail.thumbnail_url ? (
                                        <img src={trail.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-cafe-cinza-quente">
                                            <BookOpen className="w-10 h-10" />
                                        </div>
                                    )}
                                    {trail.is_featured && (
                                        <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 bg-mostarda-amber text-carvao-quente text-xs font-semibold rounded-full uppercase tracking-wide">
                                            <Star className="w-3 h-3 fill-current" /> Destaque
                                        </span>
                                    )}
                                    <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                                        <button
                                            type="button"
                                            onClick={() => onMove(trail.id, 'up')}
                                            disabled={i === 0}
                                            aria-label="Mover trilha pra cima"
                                            className="w-7 h-7 flex items-center justify-center bg-cream-surface/95 text-cafe-medio hover:text-coral-terra rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <ChevronUp className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onMove(trail.id, 'down')}
                                            disabled={i === trails.length - 1}
                                            aria-label="Mover trilha pra baixo"
                                            className="w-7 h-7 flex items-center justify-center bg-cream-surface/95 text-cafe-medio hover:text-coral-terra rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <ChevronDown className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 flex-1 flex flex-col">
                                    <div className="flex items-start gap-2 mb-1">
                                        <h3 className="font-display text-lg font-normal text-carvao-quente tracking-tight truncate flex-1">
                                            {trail.title}
                                        </h3>
                                    </div>
                                    <p className="font-mono text-xs text-cafe-cinza-quente truncate">/{trail.slug}</p>

                                    {trail.description && (
                                        <p className="text-sm text-cafe-medio mt-2 line-clamp-2 leading-relaxed">
                                            {trail.description}
                                        </p>
                                    )}

                                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                                        {trail.target_audience && (
                                            <StatusBadge tone="info">{AUDIENCE_LABEL[trail.target_audience] || trail.target_audience}</StatusBadge>
                                        )}
                                        {trail.estimated_hours && (
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-cafe-medio">
                                                <Clock className="w-3 h-3" /> {trail.estimated_hours}h
                                            </span>
                                        )}
                                        {isGated && (
                                            <StatusBadge tone="pending" icon={<Lock className="w-3 h-3" />}>Kiwify</StatusBadge>
                                        )}
                                        {isLocked && (
                                            <StatusBadge tone="active" icon={<Clock className="w-3 h-3" />}>
                                                Libera {formatReleaseAt(trail.release_at)}
                                            </StatusBadge>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-borda-cafe">
                                        <button
                                            type="button"
                                            onClick={() => onSelect(trail.id)}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-3 py-2 rounded-[8px] font-semibold text-xs transition-colors active:scale-[0.98] min-h-[36px]"
                                        >
                                            Abrir aulas
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onEdit(trail)}
                                            aria-label="Editar trilha"
                                            className="w-9 h-9 flex items-center justify-center text-cafe-medio hover:text-coral-terra hover:bg-coral-wash rounded-[8px] transition-colors"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onDelete(trail)}
                                            aria-label="Deletar trilha"
                                            className="w-9 h-9 flex items-center justify-center text-cafe-cinza-quente hover:text-vermelho-tijolo hover:bg-[oklch(94%_0.025_28)] rounded-[8px] transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </>
    );
}

function TrailEditorView({
    trail, lessons, loading, onBack, onEditTrail,
    onCreateLesson, onEditLesson, onMoveLesson,
    onRemoveLessonFromTrail, onDeleteLessonPermanently,
}: {
    trail: Trail;
    lessons: JoinedLesson[];
    loading: boolean;
    onBack: () => void;
    onEditTrail: () => void;
    onCreateLesson: () => void;
    onEditLesson: (l: JoinedLesson) => void;
    onMoveLesson: (id: string, dir: 'up' | 'down') => void;
    onRemoveLessonFromTrail: (id: string) => void;
    onDeleteLessonPermanently: (id: string) => void;
}) {
    // Agrupar lessons por chapter
    const groups = lessons.reduce<Record<string, JoinedLesson[]>>((acc, l) => {
        const key = l.chapter?.trim() || '__no_chapter__';
        if (!acc[key]) acc[key] = [];
        acc[key].push(l);
        return acc;
    }, {});

    const chapterKeys = Object.keys(groups);
    const orderedKeys = chapterKeys.includes('__no_chapter__')
        ? ['__no_chapter__', ...chapterKeys.filter(k => k !== '__no_chapter__')]
        : chapterKeys;

    return (
        <>
            <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-2 text-cafe-medio hover:text-coral-terra font-semibold text-sm transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Voltar pras trilhas
            </button>

            <PageHeader
                icon={<GraduationCap className="w-5 h-5" />}
                title={trail.title}
                tagline={trail.description || `Slug: /${trail.slug}`}
                action={
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onEditTrail}
                            className="inline-flex items-center justify-center gap-2 bg-cream-elevated hover:bg-coral-wash text-carvao-quente hover:text-terracota-profundo border border-borda-cafe px-4 py-2.5 rounded-[10px] font-semibold text-sm transition-colors min-h-[44px]"
                        >
                            <Pencil className="w-3.5 h-3.5" />
                            Editar trilha
                        </button>
                        <button
                            type="button"
                            onClick={onCreateLesson}
                            className="inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-5 py-2.5 rounded-[10px] font-semibold text-sm transition-colors active:scale-[0.98] min-h-[44px]"
                        >
                            <Plus className="w-4 h-4" />
                            Nova aula
                        </button>
                    </div>
                }
            />

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-6 h-6 animate-spin text-coral-terra" />
                    <p className="text-cafe-medio text-sm">Carregando aulas…</p>
                </div>
            ) : lessons.length === 0 ? (
                <EmptyState
                    icon={Video}
                    title="Nenhuma aula nesta trilha ainda"
                    description="Adicione a primeira aula — pode ser vídeo novo (upload) ou um já existente da biblioteca."
                    action={
                        <button
                            type="button"
                            onClick={onCreateLesson}
                            className="inline-flex items-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-5 py-2.5 rounded-[10px] font-semibold text-sm transition-colors min-h-[44px]"
                        >
                            <Plus className="w-4 h-4" /> Adicionar primeira aula
                        </button>
                    }
                />
            ) : (
                <div className="space-y-5">
                    {orderedKeys.map(chapterKey => {
                        const chapterLessons = groups[chapterKey];
                        const isChapter = chapterKey !== '__no_chapter__';
                        return (
                            <div key={chapterKey} className="space-y-2.5">
                                {isChapter && (
                                    <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em] px-1">
                                        {chapterKey}
                                    </p>
                                )}
                                {chapterLessons.map(lesson => {
                                    const globalIdx = lessons.findIndex(l => l.id === lesson.id);
                                    const isFirst = globalIdx === 0;
                                    const isLast = globalIdx === lessons.length - 1;
                                    return (
                                        <Card key={lesson.id} padding="md">
                                            <div className="flex items-start gap-3">
                                                <div className="flex flex-col gap-1 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => onMoveLesson(lesson.id, 'up')}
                                                        disabled={isFirst}
                                                        aria-label="Subir aula"
                                                        className="w-7 h-7 flex items-center justify-center text-cafe-cinza-quente hover:text-coral-terra hover:bg-coral-wash rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <ChevronUp className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onMoveLesson(lesson.id, 'down')}
                                                        disabled={isLast}
                                                        aria-label="Descer aula"
                                                        className="w-7 h-7 flex items-center justify-center text-cafe-cinza-quente hover:text-coral-terra hover:bg-coral-wash rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                                    >
                                                        <ChevronDown className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start gap-2">
                                                        <span className="font-display text-sm font-normal text-cafe-cinza-quente tabular-nums shrink-0 mt-0.5">
                                                            #{globalIdx + 1}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-carvao-quente truncate">{lesson.title}</p>
                                                            {lesson.description && (
                                                                <p className="text-sm text-cafe-medio mt-0.5 line-clamp-2 leading-relaxed">
                                                                    {lesson.description}
                                                                </p>
                                                            )}
                                                            <div className="flex items-center flex-wrap gap-2 mt-2">
                                                                {lesson.video_url ? (
                                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-cafe-medio">
                                                                        <Video className="w-3 h-3" /> Com vídeo
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-cafe-cinza-quente">
                                                                        <Video className="w-3 h-3" /> Sem vídeo
                                                                    </span>
                                                                )}
                                                                {lesson.highlights && lesson.highlights.length > 0 && (
                                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-cafe-medio">
                                                                        <Sparkles className="w-3 h-3" /> {lesson.highlights.length} highlights
                                                                    </span>
                                                                )}
                                                                {lesson.resources && lesson.resources.length > 0 && (
                                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-cafe-medio">
                                                                        <LinkIcon className="w-3 h-3" /> {lesson.resources.length} {lesson.resources.length === 1 ? 'recurso' : 'recursos'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => onEditLesson(lesson)}
                                                        aria-label="Editar aula"
                                                        className="w-9 h-9 flex items-center justify-center text-cafe-medio hover:text-coral-terra hover:bg-coral-wash rounded-md transition-colors"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onRemoveLessonFromTrail(lesson.id)}
                                                        aria-label="Remover da trilha"
                                                        title="Remover desta trilha (não deleta a aula)"
                                                        className="w-9 h-9 flex items-center justify-center text-cafe-cinza-quente hover:text-coral-terra hover:bg-coral-wash rounded-md transition-colors"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => onDeleteLessonPermanently(lesson.id)}
                                                        aria-label="Deletar aula permanentemente"
                                                        title="Deletar permanentemente"
                                                        className="w-9 h-9 flex items-center justify-center text-cafe-cinza-quente hover:text-vermelho-tijolo hover:bg-[oklch(94%_0.025_28)] rounded-md transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// TRAIL FORM MODAL
// ─────────────────────────────────────────────────────────────────────────

function TrailFormModal({
    trail, existingSlugs, onClose, onSaved,
}: {
    trail: Trail | null;
    existingSlugs: string[];
    onClose: () => void;
    onSaved: () => void;
}) {
    const [title, setTitle] = useState(trail?.title ?? '');
    const [slug, setSlug] = useState(trail?.slug ?? '');
    const [slugTouched, setSlugTouched] = useState(!!trail?.slug);
    const [description, setDescription] = useState(trail?.description ?? '');
    const [icon, setIcon] = useState(trail?.icon ?? 'graduation-cap');
    const [audience, setAudience] = useState(trail?.target_audience ?? 'todos');
    const [estimatedHours, setEstimatedHours] = useState(trail?.estimated_hours?.toString() ?? '');
    const [isFeatured, setIsFeatured] = useState(trail?.is_featured ?? false);
    const [thumbnailUrl, setThumbnailUrl] = useState(trail?.thumbnail_url ?? '');
    const [uploadingThumb, setUploadingThumb] = useState(false);
    const [kiwifyIdsText, setKiwifyIdsText] = useState((trail?.kiwify_product_ids ?? []).join(', '));
    const [releaseAt, setReleaseAt] = useState(
        trail?.release_at ? new Date(trail.release_at).toISOString().slice(0, 16) : ''
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (slugTouched) return;
        setSlug(slugify(title));
    }, [title, slugTouched]);

    async function handleThumbUpload(file: File) {
        setUploadingThumb(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado');
            const formData = new FormData();
            formData.append('file', file);
            formData.append('prefix', 'trail-thumb');
            const res = await fetch('/api/admin/upload-image', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
                body: formData,
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Falha no upload');
            setThumbnailUrl(data.url);
        } catch (e: unknown) {
            alert('Erro: ' + (e instanceof Error ? e.message : 'upload falhou'));
        } finally {
            setUploadingThumb(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) {
            setError('Título é obrigatório.');
            return;
        }
        if (!slug.trim()) {
            setError('Slug é obrigatório.');
            return;
        }
        const slugClash = existingSlugs.some(s => s === slug && (!trail || s !== trail.slug));
        if (slugClash) {
            setError('Esse slug já existe. Escolha outro.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const kIds = kiwifyIdsText.split(',').map(s => s.trim()).filter(Boolean);
            const payload = {
                ...(trail?.id ? { id: trail.id } : {}),
                title: title.trim(),
                slug: slug.trim(),
                description: description.trim() || null,
                icon: icon.trim() || null,
                target_audience: audience || null,
                estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
                is_featured: isFeatured,
                thumbnail_url: thumbnailUrl || null,
                kiwify_product_ids: kIds,
                release_at: releaseAt ? new Date(releaseAt).toISOString() : null,
            };
            const { error: e } = await supabase.from('trails').upsert(payload);
            if (e) throw e;
            onSaved();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Erro ao salvar.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <FormModal
            open
            title={trail ? 'Editar trilha' : 'Nova trilha'}
            description="Trilha = uma sequência didática de aulas que o aluno acessa em ordem."
            onClose={onClose}
            onSubmit={handleSubmit}
            submitting={saving}
            width="lg"
        >
            {error && <Banner tone="error">{error}</Banner>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Título" htmlFor="trail-title">
                    <Input
                        id="trail-title"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        placeholder="Ex: Primeiros passos na MSIA"
                        required
                    />
                </Field>
                <Field label="Slug" htmlFor="trail-slug" helper="URL final: /aulas/<slug>. Auto-gerado do título.">
                    <Input
                        id="trail-slug"
                        value={slug}
                        onChange={e => { setSlug(slugify(e.target.value)); setSlugTouched(true); }}
                        placeholder="primeiros-passos"
                        required
                    />
                </Field>
            </div>

            <Field label="Descrição curta" htmlFor="trail-description" optional>
                <Textarea
                    id="trail-description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="O aluno vai aprender a... (1-2 frases)"
                    rows={2}
                />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Público-alvo" htmlFor="trail-audience">
                    <select
                        id="trail-audience"
                        value={audience}
                        onChange={e => setAudience(e.target.value)}
                        className="w-full bg-cream-elevated text-carvao-quente text-sm rounded-[10px] px-3 py-2.5 border border-borda-cafe focus:border-coral-terra focus:outline-none min-h-[42px]"
                    >
                        {TARGET_AUDIENCES.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </Field>
                <Field label="Horas estimadas" htmlFor="trail-hours" optional>
                    <Input
                        id="trail-hours"
                        type="number"
                        step="0.5"
                        min="0"
                        value={estimatedHours}
                        onChange={e => setEstimatedHours(e.target.value)}
                        placeholder="4.5"
                    />
                </Field>
                <Field label="Ícone (Lucide ou emoji)" htmlFor="trail-icon" optional>
                    <Input
                        id="trail-icon"
                        value={icon}
                        onChange={e => setIcon(e.target.value)}
                        placeholder="graduation-cap"
                    />
                </Field>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={e => setIsFeatured(e.target.checked)}
                    className="w-4 h-4 accent-coral-terra"
                />
                <span className="text-sm text-carvao-quente font-semibold">Trilha em destaque</span>
                <span className="text-xs text-cafe-cinza-quente">— aparece com badge dourado no Academy</span>
            </label>

            {/* Thumbnail — gerador automático + fallback upload */}
            <div className="pt-4 border-t border-borda-cafe">
                <ThumbnailGenerator
                    badge="TRILHA"
                    initialTitle={title}
                    initialContext={TARGET_AUDIENCES.find(t => t.value === audience)?.label || ''}
                    initialUrl={thumbnailUrl}
                    uploadPrefix="trail-thumb"
                    onGenerated={url => setThumbnailUrl(url)}
                    onRemove={() => setThumbnailUrl('')}
                />

                <details className="mt-3">
                    <summary className="text-xs font-semibold text-cafe-cinza-quente hover:text-coral-terra cursor-pointer select-none">
                        Prefere fazer upload manual de uma imagem?
                    </summary>
                    <div className="mt-2">
                        {uploadingThumb ? (
                            <div className="flex items-center justify-center gap-2 h-20 bg-cream-elevated border border-dashed border-borda-cafe rounded-[10px]">
                                <Loader2 className="w-4 h-4 animate-spin text-coral-terra" />
                                <span className="text-sm text-cafe-medio">Enviando…</span>
                            </div>
                        ) : (
                            <label className="flex flex-col items-center justify-center gap-1 h-20 bg-cream-elevated hover:bg-coral-wash border border-dashed border-borda-cafe hover:border-coral-terra/40 rounded-[10px] cursor-pointer transition-colors">
                                <UploadCloud className="w-4 h-4 text-cafe-cinza-quente" />
                                <span className="text-xs font-semibold text-cafe-medio">Selecionar arquivo (1280×720 ideal)</span>
                                <input
                                    id="trail-thumb-manual"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) handleThumbUpload(f); }}
                                />
                            </label>
                        )}
                    </div>
                </details>
            </div>

            {/* Gating */}
            <div className="pt-4 border-t border-borda-cafe space-y-4">
                <div>
                    <p className="font-display text-base font-normal text-carvao-quente tracking-tight">Acesso</p>
                    <p className="text-xs text-cafe-medio mt-0.5">Por padrão a trilha é pública. Use os campos abaixo pra limitar quem vê.</p>
                </div>

                <Field
                    label="IDs de produtos Kiwify"
                    htmlFor="trail-kiwify"
                    optional
                    helper="Cole UUIDs separados por vírgula. Só alunos que compraram esses produtos veem a trilha."
                >
                    <Textarea
                        id="trail-kiwify"
                        value={kiwifyIdsText}
                        onChange={e => setKiwifyIdsText(e.target.value)}
                        placeholder="0b584cb0-0917-..., b54bcd50-..."
                        rows={2}
                        className="font-mono text-xs"
                    />
                </Field>

                <Field
                    label="Liberar a partir de"
                    htmlFor="trail-release"
                    optional
                    helper="Trilha fica trancada até essa data, mesmo pra quem tem acesso. Útil pra lançamento."
                >
                    <div className="flex items-center gap-2">
                        <input
                            id="trail-release"
                            type="datetime-local"
                            value={releaseAt}
                            onChange={e => setReleaseAt(e.target.value)}
                            className="flex-1 bg-cream-elevated text-carvao-quente text-sm rounded-[10px] px-3 py-2.5 border border-borda-cafe focus:border-coral-terra focus:outline-none min-h-[42px]"
                        />
                        {releaseAt && (
                            <button
                                type="button"
                                onClick={() => setReleaseAt('')}
                                className="text-xs text-vermelho-tijolo hover:underline shrink-0"
                            >
                                Liberar agora
                            </button>
                        )}
                    </div>
                </Field>
            </div>
        </FormModal>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// LESSON FORM MODAL
// ─────────────────────────────────────────────────────────────────────────

function LessonFormModal({
    trail, lesson, lessonsCount, onOpenLibrary, onClose, onSaved,
}: {
    trail: Trail;
    lesson: JoinedLesson | null;
    lessonsCount: number;
    onOpenLibrary: () => void;
    onClose: () => void;
    onSaved: () => void;
}) {
    const [title, setTitle] = useState(lesson?.title ?? '');
    const [description, setDescription] = useState(lesson?.description ?? '');
    const [videoUrl, setVideoUrl] = useState(lesson?.video_url ?? '');
    const [chapter, setChapter] = useState(lesson?.chapter ?? '');
    const [highlights, setHighlights] = useState<string[]>(lesson?.highlights ?? []);
    const [newHighlight, setNewHighlight] = useState('');
    const [resources, setResources] = useState<LessonResource[]>(lesson?.resources ?? []);
    const [newResourceTitle, setNewResourceTitle] = useState('');
    const [newResourceUrl, setNewResourceUrl] = useState('');
    const [thumbnailUrl, setThumbnailUrl] = useState(lesson?.thumbnail_url ?? '');

    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
    const [aiError, setAiError] = useState('');

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Recebe URL escolhida da biblioteca
    useEffect(() => {
        function handlePickFromLibrary(e: Event) {
            const detail = (e as CustomEvent).detail;
            if (typeof detail === 'string') setVideoUrl(detail);
        }
        window.addEventListener('trails:pick-video', handlePickFromLibrary);
        return () => window.removeEventListener('trails:pick-video', handlePickFromLibrary);
    }, []);

    async function handleVideoUpload(file: File) {
        setUploading(true);
        setUploadProgress(0);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado');

            const authResp = await fetch('/api/admin/b2-auth', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            if (!authResp.ok) {
                const e = await authResp.json();
                throw new Error(e.error || 'Falha na autenticação B2');
            }
            const { uploadUrl, uploadAuthToken, publicUrlBase } = await authResp.json();

            const sha1 = await crypto.subtle.digest('SHA-1', await file.arrayBuffer())
                .then(hash => Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join(''));

            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.upload.addEventListener('progress', evt => {
                    if (evt.lengthComputable) setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
                });
                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const b2 = JSON.parse(xhr.responseText);
                            const finalUrl = `${publicUrlBase}/${b2.fileName}`;
                            setVideoUrl(finalUrl);
                            // Auto-trigger AI análise se campos vazios
                            setTimeout(() => {
                                if (!title.trim() && !description.trim()) {
                                    handleAIAnalyze(finalUrl).catch(() => {});
                                }
                            }, 400);
                            resolve();
                        } catch {
                            reject(new Error('Falha ao processar resposta do B2'));
                        }
                    } else {
                        reject(new Error(`B2 falhou (${xhr.status})`));
                    }
                });
                xhr.addEventListener('error', () => reject(new Error('Falha de conexão com B2')));
                xhr.addEventListener('abort', () => reject(new Error('Upload cancelado')));
                xhr.open('POST', uploadUrl);
                xhr.setRequestHeader('Authorization', uploadAuthToken);
                xhr.setRequestHeader('X-Bz-File-Name', encodeURIComponent(file.name));
                xhr.setRequestHeader('Content-Type', file.type || 'b2/x-auto');
                xhr.setRequestHeader('X-Bz-Content-Sha1', sha1);
                xhr.send(file);
            });
        } catch (e: unknown) {
            alert('Upload: ' + (e instanceof Error ? e.message : 'falhou'));
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    }

    async function handleAIAnalyze(overrideUrl?: string) {
        const url = overrideUrl || videoUrl;
        if (!url) {
            setAiError('Adicione um vídeo antes de gerar com IA.');
            setAiStatus('error');
            return;
        }
        setAiStatus('loading');
        setAiError('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado');
            const res = await fetch('/api/admin/analyze-lesson', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ videoUrl: url }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Falha na análise');
            if (data.title) setTitle(data.title);
            if (data.description) setDescription(data.description);
            if (data.highlights?.length) setHighlights(data.highlights);
            setAiStatus('success');
        } catch (e: unknown) {
            setAiError(e instanceof Error ? e.message : 'Erro');
            setAiStatus('error');
        }
    }

    function addHighlight() {
        const v = newHighlight.trim();
        if (!v) return;
        setHighlights(prev => [...prev, v]);
        setNewHighlight('');
    }
    function removeHighlight(i: number) {
        setHighlights(prev => prev.filter((_, idx) => idx !== i));
    }
    function addResource() {
        const t = newResourceTitle.trim();
        const u = newResourceUrl.trim();
        if (!t || !u) return;
        setResources(prev => [...prev, { title: t, url: u }]);
        setNewResourceTitle('');
        setNewResourceUrl('');
    }
    function removeResource(i: number) {
        setResources(prev => prev.filter((_, idx) => idx !== i));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!title.trim()) {
            setError('Título é obrigatório.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            // 1. Upsert lesson
            const lessonPayload = {
                ...(lesson?.id ? { id: lesson.id } : {}),
                title: title.trim(),
                description: description.trim() || null,
                video_url: videoUrl || null,
                highlights: highlights.length > 0 ? highlights : null,
                thumbnail_url: thumbnailUrl || null,
            };
            const { data: savedLesson, error: lessonErr } = await supabase
                .from('lessons')
                .upsert(lessonPayload)
                .select('id')
                .single();
            if (lessonErr) throw lessonErr;

            const lessonId = savedLesson.id;

            // 2. Upsert trail_lessons
            const tlPayload = {
                trail_id: trail.id,
                lesson_id: lessonId,
                chapter: chapter.trim() || null,
                display_order: lesson?.display_order ?? lessonsCount,
            };
            const { error: tlErr } = await supabase
                .from('trail_lessons')
                .upsert(tlPayload, { onConflict: 'trail_id,lesson_id' });
            if (tlErr) throw tlErr;

            // 3. Resync resources
            await supabase.from('lesson_resources').delete().eq('lesson_id', lessonId);
            if (resources.length > 0) {
                await supabase.from('lesson_resources').insert(
                    resources.map((r, i) => ({
                        lesson_id: lessonId,
                        title: r.title,
                        url: r.url,
                        display_order: i,
                    }))
                );
            }

            onSaved();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Erro ao salvar.');
        } finally {
            setSaving(false);
        }
    }

    return (
        <FormModal
            open
            title={lesson ? 'Editar aula' : 'Nova aula'}
            description={`Trilha: ${trail.title}`}
            onClose={onClose}
            onSubmit={handleSubmit}
            submitting={saving}
            width="lg"
        >
            {error && <Banner tone="error">{error}</Banner>}

            {/* Vídeo */}
            <div className="space-y-2.5">
                <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em]">Vídeo da aula</p>

                {videoUrl ? (
                    <div className="flex items-center gap-3 p-3 bg-cream-elevated border border-borda-cafe rounded-[10px]">
                        <Video className="w-4 h-4 text-coral-terra shrink-0" />
                        <p className="flex-1 min-w-0 text-xs font-mono text-cafe-medio truncate">{videoUrl}</p>
                        <button
                            type="button"
                            onClick={() => setVideoUrl('')}
                            className="text-xs text-vermelho-tijolo hover:underline shrink-0"
                        >
                            Remover
                        </button>
                    </div>
                ) : uploading ? (
                    <div className="space-y-2 p-4 bg-cream-elevated border border-borda-cafe rounded-[10px]">
                        <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin text-coral-terra" />
                            <p className="text-sm font-semibold text-carvao-quente">Enviando vídeo… {uploadProgress}%</p>
                        </div>
                        <div className="w-full h-1.5 bg-borda-cafe rounded-full overflow-hidden">
                            <div className="h-full bg-coral-terra transition-all" style={{ width: `${uploadProgress}%` }} />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2">
                        <label className="flex flex-col items-center justify-center gap-1.5 h-20 bg-cream-elevated hover:bg-coral-wash border border-dashed border-borda-cafe hover:border-coral-terra/40 rounded-[10px] cursor-pointer transition-colors">
                            <UploadCloud className="w-4 h-4 text-cafe-cinza-quente" />
                            <span className="text-xs font-semibold text-cafe-medio">Upload novo</span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="video/*"
                                className="hidden"
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f); }}
                            />
                        </label>
                        <button
                            type="button"
                            onClick={onOpenLibrary}
                            className="flex flex-col items-center justify-center gap-1.5 h-20 bg-cream-elevated hover:bg-coral-wash border border-borda-cafe hover:border-coral-terra/40 rounded-[10px] transition-colors"
                        >
                            <FolderOpen className="w-4 h-4 text-cafe-cinza-quente" />
                            <span className="text-xs font-semibold text-cafe-medio">Da biblioteca</span>
                        </button>
                    </div>
                )}

                {videoUrl && (
                    <button
                        type="button"
                        onClick={() => handleAIAnalyze()}
                        disabled={aiStatus === 'loading'}
                        className="inline-flex items-center gap-2 text-xs font-semibold text-coral-terra hover:text-terracota-profundo disabled:opacity-50"
                    >
                        {aiStatus === 'loading' ? (
                            <><Loader2 className="w-3 h-3 animate-spin" /> Analisando…</>
                        ) : aiStatus === 'success' ? (
                            <><RefreshCw className="w-3 h-3" /> Re-analisar com IA</>
                        ) : (
                            <><Sparkles className="w-3 h-3" /> Gerar título/descrição/highlights com IA</>
                        )}
                    </button>
                )}
                {aiStatus === 'error' && (
                    <p className="text-xs text-vermelho-tijolo">{aiError}</p>
                )}
            </div>

            {/* Título + descrição */}
            <Field label="Título da aula" htmlFor="lesson-title">
                <Input
                    id="lesson-title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Ex: Como funciona o editor do template"
                    required
                />
            </Field>

            <Field label="Descrição" htmlFor="lesson-description" optional>
                <Textarea
                    id="lesson-description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={3}
                    placeholder="O que o aluno vai aprender nesta aula"
                />
            </Field>

            <Field label="Capítulo (opcional)" htmlFor="lesson-chapter" helper="Agrupa aulas dentro da trilha. Ex: 'Antes de começar', 'Publicação'.">
                <Input
                    id="lesson-chapter"
                    value={chapter}
                    onChange={e => setChapter(e.target.value)}
                    placeholder="Antes de começar"
                />
            </Field>

            {/* Highlights */}
            <div className="space-y-2">
                <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em]">Highlights da aula</p>
                {highlights.length > 0 && (
                    <ul className="space-y-1.5">
                        {highlights.map((h, i) => (
                            <li key={i} className="flex items-start gap-2 p-2 bg-cream-elevated rounded-[8px]">
                                <Sparkles className="w-3.5 h-3.5 text-coral-terra shrink-0 mt-0.5" />
                                <span className="flex-1 text-sm text-carvao-quente leading-snug">{h}</span>
                                <button
                                    type="button"
                                    onClick={() => removeHighlight(i)}
                                    className="text-cafe-cinza-quente hover:text-vermelho-tijolo shrink-0"
                                    aria-label="Remover highlight"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                <div className="flex gap-2">
                    <Input
                        value={newHighlight}
                        onChange={e => setNewHighlight(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHighlight(); } }}
                        placeholder="Aprenda a publicar em 2 minutos"
                    />
                    <button
                        type="button"
                        onClick={addHighlight}
                        disabled={!newHighlight.trim()}
                        className="inline-flex items-center gap-1 bg-cream-elevated hover:bg-coral-wash text-carvao-quente hover:text-terracota-profundo border border-borda-cafe px-3 py-2 rounded-[10px] font-semibold text-xs disabled:opacity-50 shrink-0"
                    >
                        <Plus className="w-3 h-3" /> Add
                    </button>
                </div>
            </div>

            {/* Thumbnail — gerador automático */}
            <div className="pt-4 border-t border-borda-cafe">
                <ThumbnailGenerator
                    badge="AULA"
                    initialTitle={title}
                    initialContext={trail.title}
                    initialUrl={thumbnailUrl}
                    uploadPrefix="lesson-thumb"
                    onGenerated={url => setThumbnailUrl(url)}
                    onRemove={() => setThumbnailUrl('')}
                />
            </div>

            {/* Resources */}
            <div className="space-y-2">
                <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em]">Recursos (PDFs, links)</p>
                {resources.length > 0 && (
                    <ul className="space-y-1.5">
                        {resources.map((r, i) => (
                            <li key={i} className="flex items-start gap-2 p-2 bg-cream-elevated rounded-[8px]">
                                <LinkIcon className="w-3.5 h-3.5 text-coral-terra shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-carvao-quente truncate">{r.title}</p>
                                    <p className="text-xs font-mono text-cafe-cinza-quente truncate">{r.url}</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => removeResource(i)}
                                    className="text-cafe-cinza-quente hover:text-vermelho-tijolo shrink-0"
                                    aria-label="Remover recurso"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                <div className="grid grid-cols-2 gap-2">
                    <Input
                        value={newResourceTitle}
                        onChange={e => setNewResourceTitle(e.target.value)}
                        placeholder="Título do recurso"
                    />
                    <div className="flex gap-2">
                        <Input
                            value={newResourceUrl}
                            onChange={e => setNewResourceUrl(e.target.value)}
                            placeholder="https://…"
                        />
                        <button
                            type="button"
                            onClick={addResource}
                            disabled={!newResourceTitle.trim() || !newResourceUrl.trim()}
                            className="inline-flex items-center gap-1 bg-cream-elevated hover:bg-coral-wash text-carvao-quente hover:text-terracota-profundo border border-borda-cafe px-3 py-2 rounded-[10px] font-semibold text-xs disabled:opacity-50 shrink-0"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>
        </FormModal>
    );
}

// ─────────────────────────────────────────────────────────────────────────
// VIDEO LIBRARY MODAL
// ─────────────────────────────────────────────────────────────────────────

function VideoLibraryModal({ onClose, onPick }: { onClose: () => void; onPick: (url: string) => void }) {
    // Shape do /api/admin/b2-list: { name, url, size, type, uploaded_at }
    const [files, setFiles] = useState<{ name: string; url: string; size: number; type: string; uploaded_at: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 20;

    useEffect(() => { load(); }, []);
    useEffect(() => { setPage(1); }, [search]);

    async function load() {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            const res = await fetch('/api/admin/b2-list', {
                headers: { 'Authorization': `Bearer ${session.access_token}` },
            });
            if (res.ok) setFiles(await res.json());
        } finally {
            setLoading(false);
        }
    }

    function normalize(t: string) {
        return t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    }

    const filtered = search.trim()
        ? files.filter(f => normalize(f.name).includes(normalize(search)))
        : files;

    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <FormModal
            open
            title="Biblioteca de vídeos"
            description="Vídeos já enviados ao B2. Clique pra reusar em qualquer aula."
            onClose={onClose}
            width="lg"
        >
            <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-cafe-cinza-quente shrink-0" />
                <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nome…"
                />
            </div>

            {loading ? (
                <div className="flex items-center justify-center gap-2 py-10">
                    <Loader2 className="w-4 h-4 animate-spin text-coral-terra" />
                    <span className="text-sm text-cafe-medio">Carregando biblioteca…</span>
                </div>
            ) : filtered.length === 0 ? (
                <p className="text-sm text-cafe-medio italic py-6 text-center">
                    {search ? 'Nenhum vídeo encontrado pra essa busca.' : 'Biblioteca vazia.'}
                </p>
            ) : (
                <>
                    <ul className="space-y-1.5">
                        {paginated.map(f => {
                            const cleanName = decodeURIComponent(f.name || '')
                                .replace(/^\d{13}-/, '')
                                .replace(/\.(mp4|mov|avi|wmv|mkv)$/i, '');
                            const sizeMb = f.size ? (f.size / 1024 / 1024).toFixed(1) : '?';
                            return (
                                <li key={f.name}>
                                    <button
                                        type="button"
                                        onClick={() => onPick(f.url)}
                                        className="w-full flex items-center gap-3 p-3 bg-cream-elevated hover:bg-coral-wash text-left rounded-[10px] transition-colors group"
                                    >
                                        <Video className="w-4 h-4 text-coral-terra shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-carvao-quente truncate">{cleanName}</p>
                                            <p className="text-xs text-cafe-cinza-quente tabular-nums">{sizeMb} MB</p>
                                        </div>
                                        <Plus className="w-4 h-4 text-cafe-cinza-quente group-hover:text-coral-terra shrink-0" />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    <Pagination
                        page={page}
                        pageSize={PAGE_SIZE}
                        total={filtered.length}
                        onPageChange={setPage}
                        label="vídeos"
                    />
                </>
            )}
        </FormModal>
    );
}
