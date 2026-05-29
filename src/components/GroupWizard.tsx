import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    X,
    ChevronRight,
    ChevronLeft,
    MessageSquare,
    Users,
    Trophy,
    CheckCircle2,
    Lock,
    Sparkles
} from 'lucide-react';

interface Question {
    id: string;
    question_text: string;
    question_type: 'text' | 'single_choice' | 'multiple_choice';
    options: string[];
    is_required: boolean;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

export default function GroupWizard({ isOpen: propIsOpen, onClose }: Props) {
    const [visible, setVisible] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentStep, setCurrentStep] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [whatsappUrl, setWhatsappUrl] = useState('');
    const [successTitle, setSuccessTitle] = useState('Tudo pronto! 🚀');
    const [successDesc, setSuccessDesc] = useState('Você foi qualificado com sucesso. Clique abaixo para entrar no grupo oficial de alunos.');
    const [loading, setLoading] = useState(true);
    const [isFinished, setIsFinished] = useState(false);

    // Sync with prop if provided
    useEffect(() => {
        if (propIsOpen !== undefined) setVisible(propIsOpen);
    }, [propIsOpen]);

    // Global Event Listener
    useEffect(() => {
        const handleOpen = () => {
            setVisible(true);
            loadWizardData();
            setCurrentStep(0);
            setIsFinished(false);
            setAnswers({});
        };
        window.addEventListener('open-group-wizard', handleOpen);
        return () => window.removeEventListener('open-group-wizard', handleOpen);
    }, []);

    const handleClose = () => {
        setVisible(false);
        if (onClose) onClose();
    };

    useEffect(() => {
        if (visible) {
            loadWizardData();
            setCurrentStep(0);
            setIsFinished(false);
            setAnswers({});
        }
    }, [visible]);

    const loadWizardData = async () => {
        setLoading(true);
        try {
            const { data: qs } = await supabase
                .from('wizard_questions')
                .select('*')
                .order('order_index', { ascending: true });

            const { data: settings } = await supabase.from('platform_settings').select('whatsapp_group_url, wizard_success_title, wizard_success_description').limit(1).single();

            if (qs) setQuestions(qs);
            if (settings) {
                setWhatsappUrl(settings.whatsapp_group_url || '');
                if (settings.wizard_success_title) setSuccessTitle(settings.wizard_success_title);
                if (settings.wizard_success_description) setSuccessDesc(settings.wizard_success_description);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    const handleNext = async () => {
        if (currentStep < questions.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            // Finalizing: Save responses
            setIsSaving(true);
            setSaveError(null);
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) throw new Error('Usuário não autenticado');

                // Tentar buscar o nome do perfil
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single();

                const { error } = await supabase.from('wizard_responses').insert({
                    user_id: user.id,
                    user_email: user.email,
                    user_name: profile?.full_name || null,
                    answers: answers
                });

                if (error) throw error;

                setIsFinished(true);
                // Notifica o Dashboard pra atualizar o checklist
                window.dispatchEvent(new CustomEvent('wizard-completed'));
            } catch (err: any) {
                console.error('Erro ao salvar respostas:', err);
                setSaveError('Erro ao salvar suas respostas. Verifique se a tabela wizard_responses existe no seu banco de dados.');
            } finally {
                setIsSaving(false);
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const setAnswer = (questionId: string, value: any) => {
        setAnswers(prev => ({ ...prev, [questionId]: value }));
    };

    if (!visible) return null;

    const currentQuestion = questions[currentStep];
    const progress = questions.length > 0 ? ((currentStep + (isFinished ? 1 : 0)) / questions.length) * 100 : 0;
    const canContinue = isFinished || !currentQuestion?.is_required || !!answers[currentQuestion?.id];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-carvao-quente/50 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={handleClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-cream-surface w-full max-w-xl rounded-[12px] shadow-[0_12px_32px_-12px_rgba(80,40,20,0.30)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 border border-borda-cafe">

                {/* Progress bar */}
                <div className="relative h-1 bg-cream-elevated w-full overflow-hidden">
                    <div
                        className="absolute h-full bg-coral-terra transition-all duration-700 ease-out"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                <button
                    type="button"
                    onClick={handleClose}
                    aria-label="Fechar"
                    className="absolute top-5 right-5 w-9 h-9 flex items-center justify-center text-cafe-cinza-quente hover:text-coral-terra hover:bg-coral-wash rounded-md transition-colors z-10"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="p-7 lg:p-9">
                    {!isFinished ? (
                        <div className="space-y-7 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-coral-terra" />
                                <span className="text-xs font-bold text-coral-terra uppercase tracking-[0.12em]">
                                    Etapa {currentStep + 1} de {questions.length}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <h3 className="font-display text-2xl font-normal text-carvao-quente tracking-tight leading-tight">
                                    {currentQuestion?.question_text}
                                </h3>

                                {loading ? (
                                    <div className="h-40 flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-coral-terra/30 border-t-coral-terra"></div>
                                    </div>
                                ) : (
                                    <div className="py-1">
                                        {currentQuestion?.question_type === 'text' && (
                                            <textarea
                                                className="w-full px-4 py-3 bg-cream-elevated border border-borda-cafe rounded-[10px] focus:bg-cream-surface focus:border-coral-terra transition-colors text-carvao-quente min-h-[120px] outline-none placeholder:text-cafe-cinza-quente"
                                                placeholder="Sua resposta aqui…"
                                                value={answers[currentQuestion.id] || ''}
                                                onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                                            />
                                        )}

                                        {(currentQuestion?.question_type === 'single_choice' || currentQuestion?.question_type === 'multiple_choice') && (
                                            <div className="grid grid-cols-1 gap-2">
                                                {currentQuestion.options.map((opt, i) => {
                                                    const isSelected = currentQuestion.question_type === 'multiple_choice'
                                                        ? (answers[currentQuestion.id] || []).includes(opt)
                                                        : answers[currentQuestion.id] === opt;

                                                    return (
                                                        <button
                                                            key={i}
                                                            type="button"
                                                            onClick={() => {
                                                                if (currentQuestion.question_type === 'multiple_choice') {
                                                                    const current = answers[currentQuestion.id] || [];
                                                                    const next = current.includes(opt)
                                                                        ? current.filter((o: string) => o !== opt)
                                                                        : [...current, opt];
                                                                    setAnswer(currentQuestion.id, next);
                                                                } else {
                                                                    setAnswer(currentQuestion.id, opt);
                                                                }
                                                            }}
                                                            className={`text-left px-4 py-3 rounded-[10px] border transition-colors flex items-center justify-between group ${
                                                                isSelected
                                                                    ? 'border-coral-terra bg-coral-wash text-terracota-profundo font-semibold'
                                                                    : 'border-borda-cafe bg-cream-elevated hover:bg-coral-wash/50 hover:border-coral-terra/30 text-carvao-quente'
                                                            }`}
                                                        >
                                                            <span className="text-sm">{opt}</span>
                                                            {isSelected && <CheckCircle2 className="w-5 h-5 text-coral-terra shrink-0" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-borda-cafe -mx-2 px-2 pt-5">
                                <button
                                    type="button"
                                    onClick={handleBack}
                                    disabled={currentStep === 0}
                                    className="inline-flex items-center gap-1.5 py-2 px-3 rounded-[8px] text-cafe-medio hover:text-coral-terra hover:bg-coral-wash font-semibold text-sm transition-colors disabled:opacity-0 min-h-[40px]"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Voltar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    disabled={!canContinue || isSaving}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-coral-terra hover:bg-terracota-profundo text-papel-craft rounded-[10px] font-semibold text-sm transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] min-w-[140px] justify-center"
                                >
                                    {isSaving ? (
                                        <div className="w-4 h-4 border-2 border-papel-craft/30 border-t-papel-craft rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            {currentStep === questions.length - 1 ? 'Finalizar' : 'Próximo'}
                                            <ChevronRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>

                            {saveError && (
                                <div className="mt-2 p-3 bg-[oklch(94%_0.025_28)] border border-[oklch(80%_0.080_28)] rounded-[10px] flex items-center gap-2 text-vermelho-tijolo text-xs font-semibold animate-in slide-in-from-top-2">
                                    <X className="w-3.5 h-3.5 shrink-0" />
                                    {saveError}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center space-y-7 py-4 animate-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-verde-oliva rounded-full flex items-center justify-center mx-auto shadow-[0_10px_25px_-5px_rgba(80,40,20,0.20)]">
                                <Trophy className="w-9 h-9 text-papel-craft" />
                            </div>

                            <div className="space-y-2">
                                <h3 className="font-display text-3xl font-normal text-carvao-quente tracking-tight">{successTitle}</h3>
                                <p className="text-cafe-medio leading-relaxed max-w-md mx-auto">{successDesc}</p>
                            </div>

                            <div className="bg-[oklch(94%_0.020_145)] border border-verde-oliva/40 rounded-[12px] p-5 flex flex-col gap-3">
                                <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full py-3.5 bg-verde-oliva hover:bg-[oklch(35%_0.075_145)] text-papel-craft rounded-[10px] font-semibold text-sm transition-colors flex items-center justify-center gap-2 active:scale-[0.98] min-h-[48px]"
                                >
                                    <MessageSquare className="w-5 h-5" />
                                    Entrar no grupo agora
                                </a>
                                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-[oklch(40%_0.060_145)] uppercase tracking-[0.12em]">
                                    <Lock className="w-3 h-3" />
                                    Acesso limitado aos alunos
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
                @keyframes zoom-in { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
                .animate-in { animation: zoom-in 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
}
