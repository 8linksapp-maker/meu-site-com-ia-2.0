import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { MessageSquare, Send, Loader2, RefreshCw, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';

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
    module_title: string;
    comments: Comment[];
}

export default function LessonQuestions() {
    const [groups, setGroups] = useState<LessonGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
    const [replyText, setReplyText] = useState<Record<string, string>>({});
    const [posting, setPosting] = useState<Record<string, boolean>>({});
    const [filter, setFilter] = useState<'all' | 'unanswered'>('all');

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);

        const [{ data: comments }, { data: lessons }, { data: modules }] = await Promise.all([
            supabase
                .from('lesson_comments')
                .select('id, user_id, content, created_at, lesson_id, profiles(full_name, email, role)')
                .order('created_at', { ascending: true }),
            supabase.from('lessons').select('id, title, module_id'),
            supabase.from('modules').select('id, title'),
        ]);

        if (!comments || !lessons || !modules) { setLoading(false); return; }

        // Group by lesson
        const lessonMap = new Map(lessons.map(l => [l.id, l]));
        const moduleMap = new Map(modules.map(m => [m.id, m]));
        const grouped = new Map<string, LessonGroup>();

        for (const c of comments as Comment[]) {
            const lesson = lessonMap.get(c.lesson_id);
            if (!lesson) continue;
            const mod = moduleMap.get(lesson.module_id);
            if (!grouped.has(c.lesson_id)) {
                grouped.set(c.lesson_id, {
                    lesson_id: c.lesson_id,
                    lesson_title: lesson.title,
                    module_title: mod?.title || 'Módulo',
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
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-white rounded-2xl border border-gray-100 animate-pulse" />)}
        </div>
    );

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black text-gray-900">Perguntas dos Alunos</h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {totalComments} {totalComments === 1 ? 'mensagem' : 'mensagens'} em {groups.length} {groups.length === 1 ? 'aula' : 'aulas'}
                        {unansweredCount > 0 && (
                            <span className="ml-2 text-amber-600 font-bold">· {unansweredCount} sem resposta</span>
                        )}
                    </p>
                </div>
                <button
                    onClick={fetchAll}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition"
                >
                    <RefreshCw className="w-4 h-4" />
                    Atualizar
                </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                {([
                    { key: 'all', label: 'Todas' },
                    { key: 'unanswered', label: `Sem resposta (${unansweredCount})` },
                ] as const).map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition ${filter === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Groups */}
            {filteredGroups.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
                    <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <h3 className="font-black text-gray-700">Nenhuma pergunta ainda</h3>
                    <p className="text-gray-400 text-sm mt-1">Quando os alunos comentarem nas aulas, aparecerão aqui.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredGroups.map(group => {
                        const isOpen = openGroups.has(group.lesson_id);
                        const hasAdminReply = group.comments.some(c => c.profiles?.role === 'admin');
                        const studentCount = group.comments.filter(c => c.profiles?.role !== 'admin').length;

                        return (
                            <div key={group.lesson_id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                {/* Group header */}
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(group.lesson_id)}
                                    className="w-full px-5 py-4 flex items-center gap-3 hover:bg-gray-50 transition text-left"
                                >
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${hasAdminReply ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{group.module_title}</p>
                                        <p className="font-black text-gray-900 text-sm truncate">{group.lesson_title}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${hasAdminReply ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {hasAdminReply ? 'Respondida' : 'Sem resposta'}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                                            {studentCount} {studentCount === 1 ? 'pergunta' : 'perguntas'}
                                        </span>
                                        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                                    </div>
                                </button>

                                {/* Thread */}
                                {isOpen && (
                                    <div className="border-t border-gray-100">
                                        <div className="px-5 py-4 space-y-3">
                                            {group.comments.map(c => {
                                                const isAdmin = c.profiles?.role === 'admin';
                                                return (
                                                    <div key={c.id} className={`flex gap-3 group/comment ${isAdmin ? 'flex-row-reverse' : ''}`}>
                                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-black ${isAdmin ? 'bg-[#7c3aed] text-white' : 'bg-gray-200 text-gray-600'}`}>
                                                            {(c.profiles?.full_name || c.profiles?.email || 'U').charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className={`flex-1 rounded-xl px-4 py-3 relative ${isAdmin ? 'bg-[#7c3aed]/5 border border-[#7c3aed]/15' : 'bg-gray-50'}`}>
                                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                                <span className={`text-xs font-bold ${isAdmin ? 'text-[#7c3aed]' : 'text-gray-700'}`}>
                                                                    {c.profiles?.full_name || c.profiles?.email || 'Aluno'}
                                                                </span>
                                                                {isAdmin && (
                                                                    <span className="text-[9px] font-black bg-[#7c3aed] text-white px-1.5 py-0.5 rounded-full">Admin</span>
                                                                )}
                                                                <span className="text-[10px] text-gray-400">
                                                                    {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-gray-700 leading-relaxed">{c.content}</p>

                                                            <button
                                                                type="button"
                                                                onClick={() => deleteComment(c.id)}
                                                                className="absolute top-2 right-2 opacity-0 group-hover/comment:opacity-100 p-1 hover:bg-red-50 hover:text-red-500 text-gray-300 rounded transition"
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
                                                    placeholder="Responder como admin... (Ctrl+Enter para enviar)"
                                                    rows={2}
                                                    className="w-full px-4 py-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed]/50 transition placeholder-gray-300"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => postReply(group.lesson_id)}
                                                disabled={posting[group.lesson_id] || !replyText[group.lesson_id]?.trim()}
                                                className="shrink-0 w-10 h-10 bg-[#7c3aed] text-white rounded-xl flex items-center justify-center hover:bg-[#6d28d9] disabled:opacity-40 transition"
                                            >
                                                {posting[group.lesson_id] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
