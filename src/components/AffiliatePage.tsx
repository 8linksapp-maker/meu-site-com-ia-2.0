import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import {
    DollarSign, TrendingUp, Gift, Loader2, Check, Clock,
    Copy, Sparkles, ArrowRight, ArrowLeft, ExternalLink,
} from 'lucide-react';
import { Card, Banner, Field, Input, Textarea } from './ui';

// Link Kiwify pra cadastro como afiliado (etapa final do fluxo após o wizard).
// Quando o aluno termina o wizard interno, é redirecionado pra cá pra concluir
// inscrição na plataforma de pagamento.
const KIWIFY_AFFILIATE_URL = 'https://dashboard.kiwify.com/join/affiliate/Ao8RAkVV';

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
    phone: string;
    answers: Record<string, string | string[]>;
    status: ApplicationStatus;
    admin_note: string;
    affiliate_code: string | null;
    created_at: string;
    reviewed_at: string | null;
}

export default function AffiliatePage() {
    const [loading, setLoading] = useState(true);
    const [application, setApplication] = useState<Application | null>(null);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [userEmail, setUserEmail] = useState('');
    const [userName, setUserName] = useState('');
    const [userId, setUserId] = useState('');

    const [wizardOpen, setWizardOpen] = useState(false);

    useEffect(() => { load(); }, []);

    async function load() {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserEmail(user.email || '');
            setUserId(user.id);

            const [profileResult, appResult, questionsResult] = await Promise.all([
                supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
                supabase.from('affiliate_applications').select('*').eq('user_id', user.id).maybeSingle(),
                supabase.from('affiliate_questions').select('*').order('step_group').order('display_order'),
            ]);

            setUserName(profileResult.data?.full_name || '');
            if (appResult.data) setApplication(appResult.data as Application);
            if (questionsResult.data) setQuestions(questionsResult.data as Question[]);
        } catch (err) {
            console.error('Erro ao carregar afiliados:', err);
        } finally {
            setLoading(false);
        }
    }

    async function copyAffiliateLink() {
        if (!application?.affiliate_code) return;
        const url = `https://meusitecomia.com.br/?ref=${application.affiliate_code}`;
        try {
            await navigator.clipboard.writeText(url);
            alert('Link copiado!');
        } catch {
            prompt('Copie seu link:', url);
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

    if (application?.status === 'approved' && application.affiliate_code) {
        return (
            <div className="max-w-3xl mx-auto space-y-6 pb-8">
                <ApprovedView application={application} questions={questions} onCopyLink={copyAffiliateLink} />
            </div>
        );
    }

    if (application?.status === 'pending') {
        return (
            <div className="max-w-3xl mx-auto space-y-6 pb-8">
                <PendingView application={application} questions={questions} />
            </div>
        );
    }

    if (application?.status === 'rejected') {
        return (
            <div className="max-w-3xl mx-auto space-y-6 pb-8">
                <RejectedView application={application} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto pb-8">
            <SalesPitch onApply={() => setWizardOpen(true)} />

            {wizardOpen && (
                <WizardModal
                    questions={questions}
                    userId={userId}
                    userEmail={userEmail}
                    userName={userName}
                    onClose={() => setWizardOpen(false)}
                    onSaved={(app) => {
                        setApplication(app);
                        setWizardOpen(false);
                    }}
                />
            )}
        </div>
    );
}

// ========================================
// SALES PITCH (sem application)
// ========================================

function SalesPitch({ onApply }: { onApply: () => void }) {
    return (
        <>
            <div className="text-center mb-12 pt-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-coral-wash text-coral-terra rounded-full text-xs font-bold uppercase tracking-[0.12em] mb-5">
                    <Sparkles className="w-3 h-3" />
                    Programa de afiliados MSIA
                </div>
                <h1 className="font-display text-4xl md:text-5xl font-normal text-carvao-quente tracking-tight leading-tight max-w-3xl mx-auto">
                    Ganhe <span className="text-coral-terra">30% de comissão</span> indicando<br />
                    a MSIA pra outras pessoas
                </h1>
                <p className="text-base md:text-lg text-cafe-medio mt-5 max-w-2xl mx-auto leading-relaxed">
                    Você já usa, conhece e domina a plataforma. Agora ganha dinheiro de verdade
                    indicando pra quem precisa de um site.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                <BenefitCard icon={DollarSign} title="30% por venda"
                    description="Comissão generosa pelo mercado de SaaS pra leigos. Cada plano vendido por sua indicação rende 30% direto pra você." />
                <BenefitCard icon={TrendingUp} title="Pagamentos recorrentes"
                    description="Indicou alguém? Enquanto a pessoa pagar mensalidade, você recebe. Renda passiva real." />
                <BenefitCard icon={Gift} title="Materiais prontos"
                    description="Banners, textos, vídeos e copy de vendas — tudo pronto pra você usar nos seus canais. Zero esforço de criação." />
            </div>

            <div className="mb-12">
                <h2 className="font-display text-2xl md:text-3xl font-normal text-carvao-quente tracking-tight mb-1">
                    Como funciona
                </h2>
                <p className="text-sm text-cafe-medio mb-6">3 passos simples pra começar a faturar.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StepCard number={1} title="Você se candidata"
                        description="Preenche o formulário com seus canais, audiência e objetivos. Avaliamos em até 3 dias úteis." />
                    <StepCard number={2} title="Recebe seu link único"
                        description="Aprovado, você ganha um link de afiliado personalizado pra divulgar onde quiser." />
                    <StepCard number={3} title="Recebe as comissões"
                        description="Cada venda gerada pelo seu link rende 30% pra você. Pagamento mensal direto na conta." />
                </div>
            </div>

            <div className="bg-cream-surface border border-borda-cafe rounded-[12px] p-6 md:p-8 mb-12 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-borda-cafe">
                <Stat value="R$ 497" label="Ticket médio do plano" />
                <Stat value="R$ 149,10" label="Comissão por venda" />
                <Stat value="30%" label="Por toda mensalidade" />
            </div>

            <div className="text-center">
                <button
                    type="button"
                    onClick={onApply}
                    className="inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-8 py-4 rounded-[12px] font-semibold text-base transition-colors active:scale-[0.98] min-h-[56px] shadow-[0_10px_25px_-5px_rgba(80,40,20,0.20)]"
                >
                    Quero me candidatar
                    <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-xs text-cafe-cinza-quente mt-3">Leva uns 3 minutos pra preencher.</p>
            </div>
        </>
    );
}

// ========================================
// WIZARD MULTI-STEP MODAL
// ========================================

function WizardModal({
    questions, userId, userEmail, userName, onClose, onSaved,
}: {
    questions: Question[];
    userId: string;
    userEmail: string;
    userName: string;
    onClose: () => void;
    onSaved: (app: Application) => void;
}) {
    // Agrupa perguntas por step
    const steps = useMemo(() => {
        const groups = new Map<number, { label: string; questions: Question[] }>();
        for (const q of questions) {
            if (!groups.has(q.step_group)) groups.set(q.step_group, { label: q.step_label, questions: [] });
            groups.get(q.step_group)!.questions.push(q);
        }
        return Array.from(groups.entries())
            .sort(([a], [b]) => a - b)
            .map(([_, data]) => data);
    }, [questions]);

    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    function setAnswer(qId: string, value: string | string[]) {
        setAnswers(prev => ({ ...prev, [qId]: value }));
        setError('');
    }

    function validateCurrentStep(): { ok: boolean; firstInvalidId?: string } {
        const stepQuestions = steps[currentStep]?.questions ?? [];
        for (const q of stepQuestions) {
            if (!q.is_required) continue;
            const v = answers[q.id];
            if (q.question_type === 'multiple_choice') {
                if (!Array.isArray(v) || v.length === 0) return { ok: false, firstInvalidId: q.id };
            } else {
                if (typeof v !== 'string' || !v.trim()) return { ok: false, firstInvalidId: q.id };
            }
        }
        return { ok: true };
    }

    function goNext() {
        const { ok } = validateCurrentStep();
        if (!ok) {
            setError('Preenche todas as perguntas obrigatórias pra avançar.');
            return;
        }
        if (currentStep < steps.length - 1) {
            setCurrentStep(s => s + 1);
            setError('');
        } else {
            handleSubmit();
        }
    }

    function goBack() {
        if (currentStep > 0) {
            setCurrentStep(s => s - 1);
            setError('');
        }
    }

    async function handleSubmit() {
        setSaving(true);
        setError('');
        try {
            // Phone fica em coluna própria pra UX rápida no admin
            const phoneQuestion = questions.find(q => q.question_type === 'phone');
            const phoneValue = phoneQuestion ? (answers[phoneQuestion.id] as string) || '' : '';

            const { data, error: e } = await supabase
                .from('affiliate_applications')
                .insert({
                    user_id: userId,
                    user_email: userEmail,
                    user_name: userName,
                    phone: phoneValue,
                    answers,
                })
                .select('*')
                .single();
            if (e) throw e;
            onSaved(data as Application);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Erro ao enviar.');
        } finally {
            setSaving(false);
        }
    }

    useEffect(() => {
        function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
        document.addEventListener('keydown', onEsc);
        return () => document.removeEventListener('keydown', onEsc);
    }, [onClose]);

    if (steps.length === 0) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-carvao-quente/50">
                <Card padding="lg" className="max-w-md">
                    <p className="text-sm text-vermelho-tijolo">
                        Nenhuma pergunta configurada. Admin precisa cadastrar perguntas em /admin/afiliados.
                    </p>
                    <button type="button" onClick={onClose} className="mt-4 text-sm text-cafe-medio hover:text-coral-terra">
                        Fechar
                    </button>
                </Card>
            </div>
        );
    }

    const step = steps[currentStep];
    const progress = ((currentStep + 1) / steps.length) * 100;
    const isLastStep = currentStep === steps.length - 1;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-carvao-quente/50 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative bg-cream-surface w-full max-w-2xl rounded-[12px] shadow-[0_12px_32px_-12px_rgba(80,40,20,0.30)] overflow-hidden border border-borda-cafe max-h-[90vh] flex flex-col">
                {/* Progress bar */}
                <div className="h-1 bg-cream-elevated w-full overflow-hidden shrink-0">
                    <div
                        className="h-full bg-coral-terra transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Header */}
                <div className="px-7 py-5 border-b border-borda-cafe shrink-0 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-xs font-bold text-coral-terra uppercase tracking-[0.12em]">
                            Etapa {currentStep + 1} de {steps.length}
                        </p>
                        <h3 className="font-display text-xl font-normal text-carvao-quente tracking-tight mt-0.5">
                            {step.label}
                        </h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fechar"
                        className="w-9 h-9 flex items-center justify-center text-cafe-cinza-quente hover:text-coral-terra hover:bg-coral-wash rounded-md transition-colors shrink-0"
                    >
                        ✕
                    </button>
                </div>

                {/* Body */}
                <div className="px-7 py-6 space-y-5 overflow-y-auto flex-1">
                    {step.questions.map(q => (
                        <QuestionField
                            key={q.id}
                            question={q}
                            value={answers[q.id]}
                            onChange={v => setAnswer(q.id, v)}
                        />
                    ))}

                    {error && <Banner tone="error">{error}</Banner>}
                </div>

                {/* Footer */}
                <div className="px-7 py-5 border-t border-borda-cafe flex items-center justify-between gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={goBack}
                        disabled={currentStep === 0}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-cafe-medio hover:text-coral-terra hover:bg-coral-wash rounded-[8px] transition-colors disabled:opacity-0 min-h-[40px]"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </button>
                    <button
                        type="button"
                        onClick={goNext}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-coral-terra hover:bg-terracota-profundo text-papel-craft rounded-[10px] font-semibold text-sm transition-colors active:scale-[0.98] disabled:opacity-60 min-h-[44px] min-w-[140px] justify-center"
                    >
                        {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isLastStep ? (
                            <>Enviar candidatura <Check className="w-4 h-4" /></>
                        ) : (
                            <>Próximo <ArrowRight className="w-4 h-4" /></>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

function QuestionField({
    question, value, onChange,
}: {
    question: Question;
    value: string | string[] | undefined;
    onChange: (v: string | string[]) => void;
}) {
    const stringValue = typeof value === 'string' ? value : '';
    const arrayValue = Array.isArray(value) ? value : [];

    return (
        <div className="space-y-2">
            <div>
                <label className="block text-sm font-semibold text-carvao-quente">
                    {question.question_text}
                    {!question.is_required && <span className="text-cafe-cinza-quente font-normal ml-1">(opcional)</span>}
                </label>
                {question.helper_text && (
                    <p className="text-xs text-cafe-cinza-quente mt-1 leading-relaxed">{question.helper_text}</p>
                )}
            </div>

            {(question.question_type === 'text' || question.question_type === 'phone') && (
                question.question_type === 'phone' || stringValue.length > 60 ? (
                    question.question_type === 'phone' ? (
                        <Input
                            type="tel"
                            value={stringValue}
                            onChange={e => onChange(e.target.value)}
                            placeholder={question.placeholder || '(11) 99999-9999'}
                        />
                    ) : (
                        <Textarea
                            value={stringValue}
                            onChange={e => onChange(e.target.value)}
                            placeholder={question.placeholder}
                            rows={4}
                        />
                    )
                ) : (
                    <Textarea
                        value={stringValue}
                        onChange={e => onChange(e.target.value)}
                        placeholder={question.placeholder}
                        rows={3}
                    />
                )
            )}

            {question.question_type === 'single_choice' && (
                <div className="space-y-2">
                    {question.options.map(opt => {
                        const checked = stringValue === opt;
                        return (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => onChange(opt)}
                                className={`w-full text-left px-4 py-3 rounded-[10px] border transition-colors text-sm ${
                                    checked
                                        ? 'border-coral-terra bg-coral-wash text-terracota-profundo font-semibold'
                                        : 'border-borda-cafe bg-cream-elevated hover:bg-coral-wash/50 hover:border-coral-terra/30 text-carvao-quente'
                                }`}
                            >
                                <span className="flex items-center justify-between">
                                    {opt}
                                    {checked && <Check className="w-4 h-4 text-coral-terra shrink-0" />}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {question.question_type === 'multiple_choice' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {question.options.map(opt => {
                        const checked = arrayValue.includes(opt);
                        return (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                    const next = checked ? arrayValue.filter(x => x !== opt) : [...arrayValue, opt];
                                    onChange(next);
                                }}
                                className={`text-left px-3 py-2.5 rounded-[10px] border transition-colors text-sm flex items-center gap-2 ${
                                    checked
                                        ? 'border-coral-terra bg-coral-wash text-terracota-profundo font-semibold'
                                        : 'border-borda-cafe bg-cream-elevated hover:bg-coral-wash/50 hover:border-coral-terra/30 text-carvao-quente'
                                }`}
                            >
                                <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                                    checked ? 'bg-coral-terra' : 'bg-cream-surface border border-borda-cafe'
                                }`}>
                                    {checked && <Check className="w-3 h-3 text-papel-craft" strokeWidth={3} />}
                                </div>
                                <span>{opt}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ========================================
// VIEWS POR ESTADO
// ========================================

function PendingView({ application, questions }: { application: Application; questions: Question[] }) {
    return (
        <>
            <div className="text-center pt-6">
                <div className="w-16 h-16 rounded-full bg-verde-oliva flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-papel-craft" strokeWidth={3} />
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-normal text-carvao-quente tracking-tight">
                    Inscrição enviada
                </h1>
                <p className="text-base text-cafe-medio mt-3 max-w-xl mx-auto leading-relaxed">
                    Recebemos sua candidatura em <strong className="text-carvao-quente tabular-nums">{new Date(application.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</strong>.
                </p>
            </div>

            {/* CTA principal — finalizar na Kiwify */}
            <Card padding="lg" className="!border-coral-terra/30 !bg-coral-wash/40">
                <div className="text-center space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-coral-terra text-papel-craft rounded-full text-xs font-bold uppercase tracking-[0.12em]">
                        <ArrowRight className="w-3 h-3" />
                        Próximo passo
                    </div>
                    <h2 className="font-display text-2xl md:text-3xl font-normal text-carvao-quente tracking-tight">
                        Finalize seu cadastro como afiliado na Kiwify
                    </h2>
                    <p className="text-sm text-cafe-medio max-w-lg mx-auto leading-relaxed">
                        Você ainda precisa criar sua conta de afiliado na Kiwify pra gerar seu link personalizado e receber comissões.
                        É rápido e gratuito.
                    </p>
                    <a
                        href={KIWIFY_AFFILIATE_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-6 py-3.5 rounded-[12px] font-semibold text-base transition-colors active:scale-[0.98] min-h-[52px] shadow-[0_10px_25px_-5px_rgba(80,40,20,0.20)]"
                    >
                        Cadastrar como afiliado na Kiwify
                        <ExternalLink className="w-4 h-4" />
                    </a>
                    <p className="text-xs text-cafe-cinza-quente">
                        Abre em nova aba · você é redirecionado pra dashboard.kiwify.com
                    </p>
                </div>
            </Card>

            <details>
                <summary className="cursor-pointer text-sm font-semibold text-cafe-medio hover:text-coral-terra select-none">
                    Ver respostas da minha candidatura
                </summary>
                <div className="mt-3">
                    <AnswersRecap application={application} questions={questions} />
                </div>
            </details>
        </>
    );
}

function ApprovedView({ application, questions, onCopyLink }: { application: Application; questions: Question[]; onCopyLink: () => void }) {
    const link = `https://meusitecomia.com.br/?ref=${application.affiliate_code}`;
    return (
        <>
            <div className="text-center pt-6">
                <div className="w-16 h-16 rounded-full bg-verde-oliva flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-papel-craft" strokeWidth={3} />
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-normal text-carvao-quente tracking-tight">
                    Você é afiliado MSIA
                </h1>
                <p className="text-base text-cafe-medio mt-3 max-w-xl mx-auto leading-relaxed">
                    Aprovado em <strong className="text-carvao-quente tabular-nums">{application.reviewed_at ? new Date(application.reviewed_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '-'}</strong>.
                    Use seu link único pra começar a indicar.
                </p>
            </div>

            <Card padding="lg" className="!border-coral-terra/30 !bg-coral-wash/40">
                <p className="text-xs font-bold text-coral-terra uppercase tracking-[0.12em] mb-2">
                    Seu link de afiliado
                </p>
                <div className="flex items-center gap-3">
                    <code className="flex-1 min-w-0 bg-cream-surface border border-borda-cafe rounded-[10px] px-4 py-3 font-mono text-sm text-carvao-quente truncate">
                        {link}
                    </code>
                    <button
                        type="button"
                        onClick={onCopyLink}
                        className="inline-flex items-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-4 py-3 rounded-[10px] font-semibold text-sm transition-colors active:scale-[0.98] shrink-0 min-h-[44px]"
                    >
                        <Copy className="w-4 h-4" />
                        Copiar
                    </button>
                </div>
                <p className="text-xs text-cafe-cinza-quente mt-3">
                    Código: <code className="font-mono font-semibold text-cafe-medio">{application.affiliate_code}</code>
                </p>
            </Card>

            {application.admin_note && (
                <Card padding="md">
                    <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em] mb-1">
                        Mensagem da equipe
                    </p>
                    <p className="text-sm text-carvao-quente leading-relaxed whitespace-pre-wrap">{application.admin_note}</p>
                </Card>
            )}

            <details>
                <summary className="cursor-pointer text-sm font-semibold text-cafe-medio hover:text-coral-terra select-none">
                    Ver respostas da minha candidatura
                </summary>
                <div className="mt-3">
                    <AnswersRecap application={application} questions={questions} />
                </div>
            </details>
        </>
    );
}

function RejectedView({ application }: { application: Application }) {
    return (
        <>
            <div className="text-center pt-6">
                <div className="w-16 h-16 rounded-full bg-[oklch(80%_0.080_35)] flex items-center justify-center mx-auto mb-4">
                    <Clock className="w-7 h-7 text-papel-craft" />
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-normal text-carvao-quente tracking-tight">
                    Sua candidatura não foi aprovada agora
                </h1>
                <p className="text-base text-cafe-medio mt-3 max-w-xl mx-auto leading-relaxed">
                    A equipe avaliou seu perfil e identificou que esse ainda não é o melhor momento.
                </p>
            </div>

            {application.admin_note && (
                <Card padding="md" className="!border-[oklch(85%_0.060_35)] !bg-[oklch(96%_0.015_35)]">
                    <p className="text-xs font-bold text-[oklch(40%_0.090_35)] uppercase tracking-[0.12em] mb-1">
                        Mensagem da equipe
                    </p>
                    <p className="text-sm text-carvao-quente leading-relaxed whitespace-pre-wrap">{application.admin_note}</p>
                </Card>
            )}

            <Card padding="md">
                <p className="text-sm text-cafe-medio leading-relaxed">
                    Se quiser conversar sobre, fale com a equipe pelo botão de Ajuda no canto inferior direito.
                </p>
            </Card>
        </>
    );
}

function AnswersRecap({ application, questions }: { application: Application; questions: Question[] }) {
    return (
        <Card padding="lg">
            <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em] mb-4">
                O que você enviou
            </p>
            <dl className="space-y-4">
                {questions.map(q => {
                    const answer = application.answers[q.id];
                    if (!answer || (Array.isArray(answer) && answer.length === 0)) return null;
                    return (
                        <div key={q.id} className="text-sm">
                            <dt className="font-semibold text-cafe-medio">{q.question_text}</dt>
                            <dd className="text-carvao-quente mt-0.5 leading-relaxed">
                                {Array.isArray(answer) ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {answer.map(a => (
                                            <span key={a} className="inline-flex items-center text-xs font-semibold px-2 py-0.5 bg-coral-wash text-terracota-profundo rounded-full">
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
        </Card>
    );
}

// ========================================
// PRIMITIVES
// ========================================

function BenefitCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
    return (
        <div
            className="bg-cream-surface border border-borda-cafe rounded-[12px] p-5 transition-all"
            style={{ boxShadow: '0 1px 2px 0 rgba(80, 40, 20, 0.04)' }}
        >
            <div className="w-11 h-11 rounded-[10px] bg-coral-wash flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-coral-terra" />
            </div>
            <h3 className="font-display text-lg font-normal text-carvao-quente tracking-tight mb-1.5">{title}</h3>
            <p className="text-sm text-cafe-medio leading-relaxed">{description}</p>
        </div>
    );
}

function StepCard({ number, title, description }: { number: number; title: string; description: string }) {
    return (
        <div className="bg-cream-surface border border-borda-cafe rounded-[12px] p-5">
            <div className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-coral-terra text-papel-craft font-display text-base font-normal tracking-tight mb-3">
                {number}
            </div>
            <h3 className="font-display text-base font-normal text-carvao-quente tracking-tight mb-1">{title}</h3>
            <p className="text-sm text-cafe-medio leading-relaxed">{description}</p>
        </div>
    );
}

function Stat({ value, label }: { value: string; label: string }) {
    return (
        <div className="text-center px-4 py-4 md:py-0">
            <p className="font-display text-2xl md:text-3xl font-normal text-coral-terra tracking-tight tabular-nums leading-none">
                {value}
            </p>
            <p className="text-xs text-cafe-cinza-quente uppercase tracking-wide font-semibold mt-2">{label}</p>
        </div>
    );
}
