import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Send, Loader2, RefreshCw, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import Pagination from '../ui/admin/Pagination';

interface Comment {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
    lesson_id: string;
    profiles: { full_name: string | null; email: string | null; role: string | null } | null;
}

interface LessonGroup {
    lesson_id: string;
    lesson_title: string;
    trail_title: string;
    comments: Comment[];
}

export default function LessonQuestions() {
    const [groups, setGroups] = useState<LessonGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
    const [replyText, setReplyText] = useState<Record<string, string>>({});
    const [posting, setPosting] = useState<Record<string, boolean>>({});
    const [filter, setFilter] = useState<'all' | 'unanswered'>('all');
    const [page, setPage] = useState(1);
    const QUESTIONS_PAGE_SIZE = 15;
    useEffect(() => { setPage(1); }, [filter]);

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);

        const [{ data: comments }, { data: lessons }, { data: trailLessons }, { data: trails }] = await Promise.all([
            supabase
                .from('lesson_comments')
                .select('id, user_id, content, created_at, lesson_id, profiles(full_name, email, role)')
                .order('created_at', { ascending: true }),
            supabase.from('lessons').select('id, title'),
            supabase.from('trail_lessons').select('lesson_id, trail_id, display_order').order('display_order'),
            supabase.from('trails').select('id, title'),
        ]);

        if (!comments || !lessons || !trailLessons || !trails) { setLoading(false); return; }

        // Group by lesson — schema novo: lesson → trail_lessons (M:N) → trail
        const lessonMap = new Map(lessons.map(l => [l.id, l]));
        const trailMap = new Map(trails.map(t => [t.id, t]));
        // Pra cada lesson, pega o primeiro trail que a contém (ordenado por display_order)
        const lessonToTrail = new Map<string, string>();
        for (const tl of trailLessons) {
            if (!lessonToTrail.has(tl.lesson_id)) {
                lessonToTrail.set(tl.lesson_id, tl.trail_id);
            }
        }

        const grouped = new Map<string, LessonGroup>();
        for (const c of comments as Comment[]) {
            const lesson = lessonMap.get(c.lesson_id);
            if (!lesson) continue;
            const trailId = lessonToTrail.get(c.lesson_id);
            const trail = trailId ? trailMap.get(trailId) : null;
            if (!grouped.has(c.lesson_id)) {
                grouped.set(c.lesson_id, {
                    lesson_id: c.lesson_id,
                    lesson_title: lesson.title,
                    trail_title: trail?.title || 'Trilha',
                    comments: [],
                });
            }
            grouped.get(c.lesson_id)!.comments.push(c);
        }

        const result = Array.from(grouped.values()).sort((a, b) => {
            const aLast = a.comments[a.comments.length - 1]?.created_at || '';
            const bLast = b.comments[b.comments.length - 1]?.created_at || '';
            return bLast.localeCompare(aLast); // most recent first
        });

        setGroups(result);
        // Auto-open all groups with unanswered questions
        const autoOpen = new Set<string>();
        for (const g of result) {
            if (!g.comments.some(c => c.profiles?.role === 'admin')) autoOpen.add(g.lesson_id);
        }
        setOpenGroups(autoOpen);
        setLoading(false);
    };

    const postReply = async (lessonId: string) => {
        const text = replyText[lessonId]?.trim();
        if (!text) return;
        setPosting(p => ({ ...p, [lessonId]: true }));

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await supabase.from('lesson_comments').insert({ user_id: user.id, lesson_id: lessonId, content: text });
        }

        setReplyText(r => ({ ...r, [lessonId]: '' }));
        setPosting(p => ({ ...p, [lessonId]: false }));
        fetchAll();
    };

    const deleteComment = async (commentId: string) => {
        if (!confirm('Excluir este comentário?')) return;
        await supabase.from('lesson_comments').delete().eq('id', commentId);
        fetchAll();
    };

    const toggleGroup = (lessonId: string) => {
        setOpenGroups(prev => {
            const next = new Set(prev);
            next.has(lessonId) ? next.delete(lessonId) : next.add(lessonId);
            return next;
        });
    };

    const filteredGroups = filter === 'unanswered'
        ? groups.filter(g => !g.comments.some(c => c.profiles?.role === 'admin'))
        : groups;

    const totalComments = groups.reduce((acc, g) => acc + g.comments.length, 0);
    const unansweredCount = groups.filter(g => !g.comments.some(c => c.profiles?.role === 'admin')).length;

    if (loading) return (
        <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-cream-surface rounded-[12px] border border-borda-cafe animate-pulse" />)}
        </div>
    );

    return (
        <div className="space-y-6 pb-8">

            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3 border-b border-borda-cafe pb-4">
                <div className="min-w-0">
                    <h1 className="font-display text-2xl md:text-[1.625rem] font-normal text-carvao-quente tracking-tight leading-tight">
                        Perguntas dos alunos
                    </h1>
                    <p className="text-sm text-cafe-medio mt-1 tabular-nums">
                        {totalComments} {totalComments === 1 ? 'mensagem' : 'mensagens'} em {groups.length} {groups.length === 1 ? 'aula' : 'aulas'}
                        {unansweredCount > 0 && (
                            <span className="ml-2 text-[oklch(40%_0.110_80)] font-semibold">· {unansweredCount} sem resposta</span>
                        )}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={fetchAll}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-cafe-medio hover:text-coral-terra hover:bg-coral-wash rounded-[8px] transition-colors min-h-[36px]"
                >
                    <RefreshCw className="w-4 h-4" />
                    Atualizar
                </button>
            </div>

            {/* Filter tabs */}
            <div className="inline-flex gap-1 bg-cream-elevated p-1 rounded-[10px] border border-borda-cafe">
                {([
                    { key: 'all', label: 'Todas' },
                    { key: 'unanswered', label: `Sem resposta (${unansweredCount})` },
                ] as const).map(tab => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setFilter(tab.key)}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-[8px] transition-colors ${
                            filter === tab.key
                                ? 'bg-cream-surface text-carvao-quente shadow-[0_1px_2px_rgba(80,40,20,0.04)]'
                                : 'text-cafe-medio hover:text-coral-terra'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Groups */}
            {filteredGroups.length === 0 ? (
                <div className="text-center py-20 bg-cream-surface rounded-[12px] border border-borda-cafe">
                    <MessageSquare className="w-10 h-10 text-cafe-cinza-quente mx-auto mb-3" />
                    <h3 className="font-display text-lg font-normal text-carvao-quente tracking-tight">Nenhuma pergunta ainda</h3>
                    <p className="text-cafe-cinza-quente text-sm mt-1">Quando os alunos comentarem nas aulas, aparecerão aqui.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredGroups.slice((page - 1) * QUESTIONS_PAGE_SIZE, page * QUESTIONS_PAGE_SIZE).map(group => {
                        const isOpen = openGroups.has(group.lesson_id);
                        const hasAdminReply = group.comments.some(c => c.profiles?.role === 'admin');
                        const studentCount = group.comments.filter(c => c.profiles?.role !== 'admin').length;

                        return (
                            <div key={group.lesson_id} className="bg-cream-surface rounded-[12px] border border-borda-cafe overflow-hidden">
                                {/* Group header */}
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(group.lesson_id)}
                                    className="w-full px-5 py-4 flex items-center gap-3 hover:bg-cream-elevated transition-colors text-left"
                                >
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${hasAdminReply ? 'bg-verde-oliva' : 'bg-mostarda-amber'}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-cafe-cinza-quente uppercase tracking-[0.12em] mb-0.5">{group.trail_title}</p>
                                        <p className="font-semibold text-carvao-quente text-sm truncate">{group.lesson_title}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                            hasAdminReply
                                                ? 'bg-[oklch(94%_0.020_145)] text-[oklch(40%_0.060_145)]'
                                                : 'bg-[oklch(94%_0.035_80)] text-[oklch(40%_0.110_80)]'
                                        }`}>
                                            {hasAdminReply ? 'Respondida' : 'Sem resposta'}
                                        </span>
                                        <span className="inline-flex items-center text-[10px] font-semibold text-cafe-medio bg-cream-elevated px-2 py-0.5 rounded-full">
                                            {studentCount} {studentCount === 1 ? 'pergunta' : 'perguntas'}
                                        </span>
                                        {isOpen ? <ChevronUp className="w-4 h-4 text-cafe-cinza-quente" /> : <ChevronDown className="w-4 h-4 text-cafe-cinza-quente" />}
                                    </div>
                                </button>

                                {/* Thread */}
                                {isOpen && (
                                    <div className="border-t border-borda-cafe">
                                        <div className="px-5 py-4 space-y-3">
                                            {group.comments.map(c => {
                                                const isAdmin = c.profiles?.role === 'admin';
                                                return (
                                                    <div key={c.id} className={`flex gap-3 group/comment ${isAdmin ? 'flex-row-reverse' : ''}`}>
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-semibold ${
                                                            isAdmin
                                                                ? 'bg-coral-terra text-papel-craft'
                                                                : 'bg-cream-elevated text-cafe-medio border border-borda-cafe'
                                                        }`}>
                                                            {(c.profiles?.full_name || c.profiles?.email || 'U').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className={`flex-1 rounded-[10px] px-4 py-3 relative ${
                                                            isAdmin
                                                                ? 'bg-coral-wash border border-coral-terra/20'
                                                                : 'bg-cream-elevated border border-borda-cafe'
                                                        }`}>
                                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                <span className={`text-xs font-semibold ${isAdmin ? 'text-coral-terra' : 'text-cafe-medio'}`}>
                                                                    {c.profiles?.full_name || c.profiles?.email || 'Aluno'}
                                                                </span>
                                                                {isAdmin && (
                                                                    <span className="text-[9px] font-semibold bg-coral-terra text-papel-craft px-1.5 py-0.5 rounded-full uppercase tracking-wide">Admin</span>
                                                                )}
                                                                <span className="text-[10px] text-cafe-cinza-quente tabular-nums">
                                                                    {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-carvao-quente leading-relaxed whitespace-pre-wrap">{c.content}</p>

                                                            <button
                                                                type="button"
                                                                onClick={() => deleteComment(c.id)}
                                                                className="absolute top-2 right-2 opacity-0 group-hover/comment:opacity-100 p-1 hover:bg-[oklch(94%_0.025_28)] hover:text-vermelho-tijolo text-cafe-cinza-quente rounded transition-colors"
                                                                aria-label="Excluir comentário"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Reply box */}
                                        <div className="px-5 pb-5 pt-1 flex gap-2 items-end">
                                            <div className="flex-1 relative">
                                                <textarea
                                                    value={replyText[group.lesson_id] || ''}
                                                    onChange={(e) => setReplyText(r => ({ ...r, [group.lesson_id]: e.target.value }))}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) postReply(group.lesson_id); }}
                                                    placeholder="Responder como admin… (Ctrl+Enter pra enviar)"
                                                    rows={2}
                                                    className="w-full px-4 py-3 text-sm text-carvao-quente bg-cream-elevated border border-borda-cafe rounded-[10px] resize-none focus:outline-none focus:border-coral-terra transition-colors placeholder:text-cafe-cinza-quente"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => postReply(group.lesson_id)}
                                                disabled={posting[group.lesson_id] || !replyText[group.lesson_id]?.trim()}
                                                className="shrink-0 w-10 h-10 bg-coral-terra hover:bg-terracota-profundo text-papel-craft rounded-[10px] flex items-center justify-center disabled:opacity-40 transition-colors"
                                                aria-label="Enviar resposta"
                                            >
                                                {posting[group.lesson_id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <Pagination
                        page={page}
                        pageSize={QUESTIONS_PAGE_SIZE}
                        total={filteredGroups.length}
                        onPageChange={setPage}
                        label="threads"
                    />
                </div>
            )}
        </div>
    );
}
