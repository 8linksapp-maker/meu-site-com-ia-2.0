import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Plus, Pencil, Trash2, Check, X, Loader2, Search,
    DollarSign, Users, ListChecks, ChevronUp, ChevronDown, Clock,
} from 'lucide-react';
import PageHeader from '../ui/admin/PageHeader';
import StatusBadge from '../ui/admin/StatusBadge';
import FormModal from '../ui/admin/FormModal';
import Pagination from '../ui/admin/Pagination';
import { Card, Banner, Field, Input, Textarea, EmptyState } from '../ui';

type ApplicationStatus = 'pending' | 'approved' | 'rejected';
type QuestionType = 'text' | 'single_choice' | 'multiple_choice' | 'phone';

interface Question {
    id: string;
    question_text: string;
    question_type: QuestionType;
    options: string[];
    helper_text: string;
    placeholder: string;
    step_group: number;
    step_label: string;
    display_order: number;
    is_required: boolean;
}

interface Application {
    id: string;
    user_id: string;
    user_email: string;
    user_name: string;
    phone: string;
    answers: Record<string, string | string[]>;
    status: ApplicationStatus;
    admin_note: string;
    affiliate_code: string | null;
    created_at: string;
    reviewed_at: string | null;
}

type Tab = 'applications' | 'questions';

export default function AffiliatesManager() {
    const [tab, setTab] = useState<Tab>('applications');
    const [applications, setApplications] = useState<Application[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const [appsResult, questionsResult] = await Promise.all([
                supabase.from('affiliate_applications').select('*').order('created_at', { ascending: false }),
                supabase.from('affiliate_questions').select('*').order('step_group').order('display_order'),
            ]);
            if (appsResult.data) setApplications(appsResult.data as Application[]);
            if (questionsResult.data) setQuestions(questionsResult.data as Question[]);
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-coral-terra" />
                <p className="text-cafe-medio text-sm">Carregando…</p>
            </div>
        );
    }

    const stats = {
        pending: applications.filter(a => a.status === 'pending').length,
        approved: applications.filter(a => a.status === 'approved').length,
        rejected: applications.filter(a => a.status === 'rejected').length,
    };

    return (
        <div className="space-y-6 pb-8">
            <PageHeader
                icon={<DollarSign className="w-5 h-5" />}
                title="Afiliados"
                tagline="Gerencie candidatos ao programa e configure perguntas do wizard."
            />

            {/* Stats em linha */}
            <div className="grid grid-cols-3 gap-4">
                <StatBox label="Aguardando" value={stats.pending} tone="pending" />
                <StatBox label="Aprovados" value={stats.approved} tone="success" />
                <StatBox label="Rejeitados" value={stats.rejected} tone="neutral" />
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 border-b border-borda-cafe">
                <TabButton active={tab === 'applications'} onClick={() => setTab('applications')} icon={Users}>
                    Candidatos ({applications.length})
                </TabButton>
                <TabButton active={tab === 'questions'} onClick={() => setTab('questions')} icon={ListChecks}>
                    Perguntas ({questions.length})
                </TabButton>
            </div>

            {tab === 'applications' && (
                <ApplicationsTab applications={applications} questions={questions} onChange={load} />
            )}

            {tab === 'questions' && (
                <QuestionsTab questions={questions} onChange={load} />
            )}
        </div>
    );
}

// ========================================
// TAB: APPLICATIONS
// ========================================

function ApplicationsTab({
    applications, questions, onChange,
}: {
    applications: Application[];
    questions: Question[];
    onChange: () => void;
}) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | ApplicationStatus>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const PAGE_SIZE = 10;

    useEffect(() => { setPage(1); }, [search, statusFilter]);

    const filtered = useMemo(() => {
        let result = applications;
        if (statusFilter !== 'all') result = result.filter(a => a.status === statusFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(a =>
                a.user_email.toLowerCase().includes(q) ||
                (a.user_name || '').toLowerCase().includes(q) ||
                (a.phone || '').toLowerCase().includes(q) ||
                (a.affiliate_code || '').toLowerCase().includes(q)
            );
        }
        return result;
    }, [applications, search, statusFilter]);

    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex-1 min-w-[200px] relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cafe-cinza-quente pointer-events-none" />
                    <input
                        type="search"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Email, nome, telefone, código…"
                        className="w-full pl-9 pr-4 py-2 bg-cream-elevated text-carvao-quente text-sm font-normal rounded-[10px] border border-borda-cafe focus:border-coral-terra focus:outline-none transition-colors min-h-[40px]"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as 'all' | ApplicationStatus)}
                    className="bg-cream-surface text-carvao-quente text-sm font-semibold rounded-[10px] px-3 py-2 border border-borda-cafe focus:border-coral-terra focus:outline-none min-h-[40px]"
                >
                    <option value="all">Todos status</option>
                    <option value="pending">Aguardando</option>
                    <option value="approved">Aprovados</option>
                    <option value="rejected">Rejeitados</option>
                </select>
            </div>

            {filtered.length === 0 ? (
                <EmptyState
                    icon={Users}
                    title="Nenhum candidato encontrado"
                    description={search || statusFilter !== 'all' ? 'Tenta outro filtro.' : 'Aguarde alunos enviarem candidaturas.'}
                />
            ) : (
                <div className="space-y-2.5">
                    {paginated.map(app => (
                        <ApplicationRow
                            key={app.id}
                            application={app}
                            questions={questions}
                            expanded={expandedId === app.id}
                            onToggle={() => setExpandedId(prev => prev === app.id ? null : app.id)}
                            onChange={onChange}
                        />
                    ))}
                    <Pagination
                        page={page}
                        pageSize={PAGE_SIZE}
                        total={filtered.length}
                        onPageChange={setPage}
                        label="candidatos"
                    />
                </div>
            )}
        </div>
    );
}

function ApplicationRow({
    application: app, questions, expanded, onToggle, onChange,
}: {
    application: Application;
    questions: Question[];
    expanded: boolean;
    onToggle: () => void;
    onChange: () => void;
}) {
    const [savingId, setSavingId] = useState<string | null>(null);
    const [editingCode, setEditingCode] = useState(false);
    const [code, setCode] = useState(app.affiliate_code || '');
    const [editingNote, setEditingNote] = useState(false);
    const [note, setNote] = useState(app.admin_note || '');

    const tone = app.status === 'approved' ? 'success' : app.status === 'pending' ? 'pending' : 'neutral';
    const statusLabel = app.status === 'approved' ? 'Aprovado' : app.status === 'pending' ? 'Aguardando' : 'Rejeitado';

    async function updateStatus(newStatus: ApplicationStatus, extras: Partial<Application> = {}) {
        setSavingId(app.id);
        try {
            const payload: Record<string, unknown> = {
                status: newStatus,
                reviewed_at: new Date().toISOString(),
                ...extras,
            };
            const { error } = await supabase
                .from('affiliate_applications')
                .update(payload)
                .eq('id', app.id);
            if (error) throw error;
            onChange();
        } catch (e: unknown) {
            alert('Erro: ' + (e instanceof Error ? e.message : 'falha'));
        } finally {
            setSavingId(null);
        }
    }

    async function handleApprove() {
        if (!code.trim()) {
            alert('Defina um código de afiliado antes de aprovar.');
            return;
        }
        await updateStatus('approved', { affiliate_code: code.trim(), admin_note: note });
    }

    async function handleReject() {
        const reason = note.trim() || prompt('Motivo da rejeição (opcional):') || '';
        await updateStatus('rejected', { admin_note: reason, affiliate_code: null });
    }

    async function handleSaveCode() {
        setSavingId(app.id);
        try {
            const { error } = await supabase
                .from('affiliate_applications')
                .update({ affiliate_code: code.trim() || null })
                .eq('id', app.id);
            if (error) throw error;
            setEditingCode(false);
            onChange();
        } finally {
            setSavingId(null);
        }
    }

    async function handleSaveNote() {
        setSavingId(app.id);
        try {
            const { error } = await supabase
                .from('affiliate_applications')
                .update({ admin_note: note })
                .eq('id', app.id);
            if (error) throw error;
            setEditingNote(false);
            onChange();
        } finally {
            setSavingId(null);
        }
    }

    return (
        <Card padding="md">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-start gap-3 text-left"
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <StatusBadge tone={tone}>{statusLabel}</StatusBadge>
                        {app.affiliate_code && (
                            <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 bg-coral-wash text-terracota-profundo rounded-full font-mono">
                                {app.affiliate_code}
                            </span>
                        )}
                        <span className="text-xs text-cafe-cinza-quente tabular-nums">
                            {new Date(app.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                    <p className="font-semibold text-carvao-quente truncate">
                        {app.user_name || app.user_email}
                    </p>
                    <p className="text-xs text-cafe-cinza-quente mt-0.5 truncate">
                        {app.user_email} · <span className="font-mono">{app.phone}</span>
                    </p>
                </div>
                {expanded ? (
                    <ChevronUp className="w-4 h-4 text-cafe-cinza-quente shrink-0 mt-1" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-cafe-cinza-quente shrink-0 mt-1" />
                )}
            </button>

            {expanded && (
                <div className="mt-5 pt-5 border-t border-borda-cafe space-y-5">
                    {/* Respostas */}
                    <div>
                        <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em] mb-3">
                            Respostas
                        </p>
                        <dl className="space-y-3 text-sm">
                            {questions.map(q => {
                                const answer = app.answers[q.id];
                                if (!answer || (Array.isArray(answer) && answer.length === 0)) return null;
                                return (
                                    <div key={q.id}>
                                        <dt className="font-semibold text-cafe-medio text-xs">{q.question_text}</dt>
                                        <dd className="text-carvao-quente mt-0.5 leading-relaxed">
                                            {Array.isArray(answer) ? (
                                                <div className="flex flex-wrap gap-1.5 mt-1">
                                                    {answer.map(a => (
                                                        <span key={a} className="inline-flex items-center text-xs font-semibold px-2 py-0.5 bg-cream-elevated text-cafe-medio rounded-full">
                                                            {a}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className={q.question_type === 'phone' ? 'font-mono' : 'whitespace-pre-wrap'}>{answer}</span>
                                            )}
                                        </dd>
                                    </div>
                                );
                            })}
                        </dl>
                    </div>

                    {/* Código de afiliado */}
                    <div>
                        <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em] mb-2">
                            Código de afiliado
                        </p>
                        {editingCode ? (
                            <div className="flex items-center gap-2">
                                <Input
                                    value={code}
                                    onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                                    placeholder="JOAO50"
                                />
                                <button
                                    type="button"
                                    onClick={handleSaveCode}
                                    disabled={savingId === app.id}
                                    className="inline-flex items-center gap-1 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-3 py-2 rounded-[8px] font-semibold text-xs disabled:opacity-50 min-h-[36px] shrink-0"
                                >
                                    Salvar
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setEditingCode(false); setCode(app.affiliate_code || ''); }}
                                    className="text-xs text-cafe-medio hover:text-vermelho-tijolo shrink-0"
                                >
                                    Cancelar
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <code className="flex-1 bg-cream-elevated border border-borda-cafe rounded-[8px] px-3 py-2 font-mono text-sm text-carvao-quente">
                                    {app.affiliate_code || <span className="text-cafe-cinza-quente italic">não definido</span>}
                                </code>
                                <button
                                    type="button"
                                    onClick={() => setEditingCode(true)}
                                    className="inline-flex items-center gap-1 text-cafe-medio hover:text-coral-terra hover:bg-coral-wash p-2 rounded-[8px] transition-colors"
                                    aria-label="Editar código"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Nota admin */}
                    <div>
                        <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em] mb-2">
                            Mensagem pra mostrar ao aluno
                        </p>
                        {editingNote ? (
                            <div className="space-y-2">
                                <Textarea
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    rows={3}
                                    placeholder="Mensagem que aparece pro aluno na página dele."
                                />
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={handleSaveNote}
                                        disabled={savingId === app.id}
                                        className="inline-flex items-center gap-1 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-3 py-2 rounded-[8px] font-semibold text-xs disabled:opacity-50 min-h-[36px]"
                                    >
                                        Salvar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setEditingNote(false); setNote(app.admin_note || ''); }}
                                        className="text-xs text-cafe-medio hover:text-vermelho-tijolo"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-start gap-2">
                                <div className="flex-1 bg-cream-elevated border border-borda-cafe rounded-[8px] px-3 py-2 text-sm text-carvao-quente min-h-[36px] leading-relaxed whitespace-pre-wrap">
                                    {app.admin_note || <span className="text-cafe-cinza-quente italic">sem mensagem</span>}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setEditingNote(true)}
                                    className="inline-flex items-center gap-1 text-cafe-medio hover:text-coral-terra hover:bg-coral-wash p-2 rounded-[8px] transition-colors mt-0.5 shrink-0"
                                    aria-label="Editar nota"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-2 pt-2 border-t border-borda-cafe">
                        {app.status !== 'approved' && (
                            <button
                                type="button"
                                onClick={handleApprove}
                                disabled={savingId === app.id}
                                className="inline-flex items-center gap-2 bg-verde-oliva hover:bg-[oklch(35%_0.075_145)] text-papel-craft px-4 py-2 rounded-[10px] font-semibold text-sm transition-colors min-h-[40px] disabled:opacity-50"
                            >
                                <Check className="w-4 h-4" />
                                Aprovar
                            </button>
                        )}
                        {app.status !== 'rejected' && (
                            <button
                                type="button"
                                onClick={handleReject}
                                disabled={savingId === app.id}
                                className="inline-flex items-center gap-2 bg-cream-elevated hover:bg-[oklch(94%_0.025_28)] text-vermelho-tijolo border border-borda-cafe px-4 py-2 rounded-[10px] font-semibold text-sm transition-colors min-h-[40px] disabled:opacity-50"
                            >
                                <X className="w-4 h-4" />
                                Rejeitar
                            </button>
                        )}
                        {app.status !== 'pending' && (
                            <button
                                type="button"
                                onClick={() => updateStatus('pending', { affiliate_code: null })}
                                disabled={savingId === app.id}
                                className="inline-flex items-center gap-1.5 text-cafe-medio hover:text-coral-terra font-semibold text-xs px-3 py-2 ml-auto"
                            >
                                <Clock className="w-3.5 h-3.5" />
                                Voltar pra pendente
                            </button>
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
}

// ========================================
// TAB: QUESTIONS (CRUD)
// ========================================

const EMPTY_QUESTION: Omit<Question, 'id'> = {
    question_text: '',
    question_type: 'text',
    options: [],
    helper_text: '',
    placeholder: '',
    step_group: 1,
    step_label: 'Sobre você',
    display_order: 0,
    is_required: true,
};

function QuestionsTab({ questions, onChange }: { questions: Question[]; onChange: () => void }) {
    const [editing, setEditing] = useState<(Omit<Question, 'id'> & { id?: string }) | null>(null);

    // Agrupar por step pra visualização
    const grouped = useMemo(() => {
        const map = new Map<number, { label: string; questions: Question[] }>();
        for (const q of questions) {
            if (!map.has(q.step_group)) map.set(q.step_group, { label: q.step_label, questions: [] });
            map.get(q.step_group)!.questions.push(q);
        }
        return Array.from(map.entries()).sort(([a], [b]) => a - b);
    }, [questions]);

    async function handleDelete(id: string) {
        if (!confirm('Apagar essa pergunta? Respostas existentes ficam órfãs.')) return;
        await supabase.from('affiliate_questions').delete().eq('id', id);
        onChange();
    }

    async function handleMove(question: Question, dir: 'up' | 'down') {
        const sameStep = questions.filter(q => q.step_group === question.step_group).sort((a, b) => a.display_order - b.display_order);
        const idx = sameStep.findIndex(q => q.id === question.id);
        const other = dir === 'up' ? idx - 1 : idx + 1;
        if (other < 0 || other >= sameStep.length) return;
        const a = sameStep[idx];
        const b = sameStep[other];
        await Promise.all([
            supabase.from('affiliate_questions').update({ display_order: b.display_order }).eq('id', a.id),
            supabase.from('affiliate_questions').update({ display_order: a.display_order }).eq('id', b.id),
        ]);
        onChange();
    }

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <p className="text-sm text-cafe-medio">
                    Configure o que perguntar pros candidatos. Agrupe em até 4 steps no wizard.
                </p>
                <button
                    type="button"
                    onClick={() => setEditing({ ...EMPTY_QUESTION })}
                    className="inline-flex items-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-4 py-2 rounded-[10px] font-semibold text-sm transition-colors min-h-[40px]"
                >
                    <Plus className="w-4 h-4" />
                    Nova pergunta
                </button>
            </div>

            {grouped.length === 0 ? (
                <EmptyState
                    icon={ListChecks}
                    title="Nenhuma pergunta configurada"
                    description="Adicione perguntas pra montar o wizard de candidatura."
                />
            ) : (
                grouped.map(([stepGroup, data]) => (
                    <div key={stepGroup} className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-coral-terra text-papel-craft font-display text-sm font-normal">
                                {stepGroup}
                            </span>
                            <h3 className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                                {data.label}
                            </h3>
                            <span className="text-xs text-cafe-cinza-quente tabular-nums">
                                {data.questions.length} {data.questions.length === 1 ? 'pergunta' : 'perguntas'}
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            {data.questions.map((q, i) => (
                                <Card key={q.id} padding="md">
                                    <div className="flex items-start gap-3">
                                        <div className="flex flex-col gap-0.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleMove(q, 'up')}
                                                disabled={i === 0}
                                                className="w-6 h-6 flex items-center justify-center text-cafe-cinza-quente hover:text-coral-terra disabled:opacity-30"
                                            >
                                                <ChevronUp className="w-3 h-3" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleMove(q, 'down')}
                                                disabled={i === data.questions.length - 1}
                                                className="w-6 h-6 flex items-center justify-center text-cafe-cinza-quente hover:text-coral-terra disabled:opacity-30"
                                            >
                                                <ChevronDown className="w-3 h-3" />
                                            </button>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                <StatusBadge tone="info">{q.question_type}</StatusBadge>
                                                {q.is_required && <StatusBadge tone="active">obrigatória</StatusBadge>}
                                            </div>
                                            <p className="font-semibold text-carvao-quente text-sm">{q.question_text}</p>
                                            {q.helper_text && <p className="text-xs text-cafe-medio mt-0.5">{q.helper_text}</p>}
                                            {q.options.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {q.options.map(o => (
                                                        <span key={o} className="text-xs font-semibold px-2 py-0.5 bg-cream-elevated text-cafe-medio rounded-full">
                                                            {o}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => setEditing(q)}
                                                aria-label="Editar"
                                                className="w-9 h-9 flex items-center justify-center text-cafe-medio hover:text-coral-terra hover:bg-coral-wash rounded-md transition-colors"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(q.id)}
                                                aria-label="Apagar"
                                                className="w-9 h-9 flex items-center justify-center text-cafe-cinza-quente hover:text-vermelho-tijolo hover:bg-[oklch(94%_0.025_28)] rounded-md transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))
            )}

            {editing && (
                <QuestionFormModal
                    question={editing}
                    onClose={() => setEditing(null)}
                    onSaved={() => { setEditing(null); onChange(); }}
                />
            )}
        </div>
    );
}

function QuestionFormModal({
    question, onClose, onSaved,
}: {
    question: Omit<Question, 'id'> & { id?: string };
    onClose: () => void;
    onSaved: () => void;
}) {
    const [questionText, setQuestionText] = useState(question.question_text);
    const [questionType, setQuestionType] = useState<QuestionType>(question.question_type);
    const [optionsText, setOptionsText] = useState((question.options || []).join('\n'));
    const [helperText, setHelperText] = useState(question.helper_text);
    const [placeholder, setPlaceholder] = useState(question.placeholder);
    const [stepGroup, setStepGroup] = useState(question.step_group);
    const [stepLabel, setStepLabel] = useState(question.step_label);
    const [displayOrder, setDisplayOrder] = useState(question.display_order);
    const [isRequired, setIsRequired] = useState(question.is_required);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const needsOptions = questionType === 'single_choice' || questionType === 'multiple_choice';

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!questionText.trim()) {
            setError('Texto da pergunta é obrigatório.');
            return;
        }
        if (needsOptions && optionsText.split('\n').filter(o => o.trim()).length === 0) {
            setError('Adicione pelo menos 1 opção pra esse tipo de pergunta.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            const payload = {
                ...(question.id ? { id: question.id } : {}),
                question_text: questionText.trim(),
                question_type: questionType,
                options: needsOptions ? optionsText.split('\n').map(o => o.trim()).filter(Boolean) : [],
                helper_text: helperText.trim(),
                placeholder: placeholder.trim(),
                step_group: stepGroup,
                step_label: stepLabel.trim() || `Step ${stepGroup}`,
                display_order: displayOrder,
                is_required: isRequired,
            };
            const { error: e } = await supabase.from('affiliate_questions').upsert(payload);
            if (e) throw e;
            onSaved();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Erro');
        } finally {
            setSaving(false);
        }
    }

    return (
        <FormModal
            open
            title={question.id ? 'Editar pergunta' : 'Nova pergunta'}
            onClose={onClose}
            onSubmit={handleSubmit}
            submitting={saving}
            width="lg"
        >
            {error && <Banner tone="error">{error}</Banner>}

            <Field label="Texto da pergunta" htmlFor="q-text">
                <Textarea
                    id="q-text"
                    value={questionText}
                    onChange={e => setQuestionText(e.target.value)}
                    rows={2}
                    placeholder="Ex: Onde você vai divulgar a MSIA?"
                />
            </Field>

            <Field label="Texto de ajuda" htmlFor="q-helper" optional helper="Aparece embaixo da pergunta como dica.">
                <Input
                    id="q-helper"
                    value={helperText}
                    onChange={e => setHelperText(e.target.value)}
                    placeholder="Marca todos os canais que vai usar."
                />
            </Field>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Tipo de resposta" htmlFor="q-type">
                    <select
                        id="q-type"
                        value={questionType}
                        onChange={e => setQuestionType(e.target.value as QuestionType)}
                        className="w-full bg-cream-elevated text-carvao-quente text-sm rounded-[10px] px-3 py-2.5 border border-borda-cafe focus:border-coral-terra focus:outline-none min-h-[42px]"
                    >
                        <option value="text">Texto livre</option>
                        <option value="phone">Telefone</option>
                        <option value="single_choice">Escolha única</option>
                        <option value="multiple_choice">Múltipla escolha</option>
                    </select>
                </Field>
                <Field label="Placeholder" htmlFor="q-placeholder" optional helper="Só pra text/phone.">
                    <Input
                        id="q-placeholder"
                        value={placeholder}
                        onChange={e => setPlaceholder(e.target.value)}
                        placeholder="Ex: (11) 99999-9999"
                    />
                </Field>
            </div>

            {needsOptions && (
                <Field label="Opções (uma por linha)" htmlFor="q-options">
                    <Textarea
                        id="q-options"
                        value={optionsText}
                        onChange={e => setOptionsText(e.target.value)}
                        rows={5}
                        placeholder={'Instagram\nYouTube\nWhatsApp\nSite/Blog'}
                    />
                </Field>
            )}

            <div className="pt-4 border-t border-borda-cafe space-y-4">
                <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em]">
                    Agrupamento no wizard
                </p>
                <div className="grid grid-cols-3 gap-3">
                    <Field label="Step" htmlFor="q-step">
                        <Input
                            id="q-step"
                            type="number"
                            min={1}
                            max={6}
                            value={stepGroup}
                            onChange={e => setStepGroup(parseInt(e.target.value) || 1)}
                        />
                    </Field>
                    <Field label="Label do step" htmlFor="q-step-label">
                        <Input
                            id="q-step-label"
                            value={stepLabel}
                            onChange={e => setStepLabel(e.target.value)}
                            placeholder="Sobre você"
                        />
                    </Field>
                    <Field label="Ordem no step" htmlFor="q-order">
                        <Input
                            id="q-order"
                            type="number"
                            min={0}
                            value={displayOrder}
                            onChange={e => setDisplayOrder(parseInt(e.target.value) || 0)}
                        />
                    </Field>
                </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                    type="checkbox"
                    checked={isRequired}
                    onChange={e => setIsRequired(e.target.checked)}
                    className="w-4 h-4 accent-coral-terra"
                />
                <span className="text-sm text-carvao-quente font-semibold">Obrigatória</span>
            </label>
        </FormModal>
    );
}

// ========================================
// PRIMITIVES
// ========================================

function TabButton({
    active, onClick, children, icon: Icon,
}: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    icon: React.ElementType;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px inline-flex items-center gap-2 ${
                active
                    ? 'border-coral-terra text-coral-terra'
                    : 'border-transparent text-cafe-medio hover:text-coral-terra'
            }`}
        >
            <Icon className="w-4 h-4" />
            {children}
        </button>
    );
}

function StatBox({ label, value, tone }: { label: string; value: number; tone: 'pending' | 'success' | 'neutral' }) {
    const colors = {
        pending: 'bg-[oklch(94%_0.035_80)] text-[oklch(40%_0.110_80)]',
        success: 'bg-[oklch(94%_0.020_145)] text-[oklch(40%_0.060_145)]',
        neutral: 'bg-cream-elevated text-cafe-cinza-quente',
    }[tone];
    return (
        <div className="bg-cream-surface border border-borda-cafe rounded-[12px] p-4">
            <span className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${colors}`}>
                {label}
            </span>
            <p className="font-display text-3xl font-normal text-carvao-quente tabular-nums tracking-tight leading-none mt-2">
                {value}
            </p>
        </div>
    );
}
