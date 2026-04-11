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
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
                onClick={handleClose}
            ></div>

            {/* Modal Content */}
            <div className="relative bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 border border-white/20">

                {/* Header / Progress */}
                <div className="relative h-2 bg-gray-100 w-full overflow-hidden">
                    <div
                        className="absolute h-full bg-gradient-to-r from-[#7c3aed] to-blue-500 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(124,58,237,0.5)]"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                <button
                    onClick={handleClose}
                    className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-900 border border-gray-100 rounded-full hover:bg-gray-50 transition-all z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="p-8 lg:p-10">
                    {!isFinished ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#7c3aed]/10 rounded-xl">
                                    <Sparkles className="w-5 h-5 text-[#7c3aed]" />
                                </div>
                                <span className="text-[10px] font-black text-[#7c3aed] uppercase tracking-widest bg-[#7c3aed]/5 px-2 py-0.5 rounded-md">
                                    Etapa {currentStep + 1} de {questions.length}
                                </span>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">
                                    {currentQuestion?.question_text}
                                </h3>

                                {loading ? (
                                    <div className="h-40 flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7c3aed]"></div>
                                    </div>
                                ) : (
                                    <div className="py-2">
                                        {currentQuestion?.question_type === 'text' && (
                                            <textarea
                                                className="w-full px-5 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-[#7c3aed]/10 focus:border-[#7c3aed] transition font-medium min-h-[120px] outline-none"
                                                placeholder="Sua resposta aqui..."
                                                value={answers[currentQuestion.id] || ''}
                                                onChange={(e) => setAnswer(currentQuestion.id, e.target.value)}
                                            />
                                        )}

                                        {(currentQuestion?.question_type === 'single_choice' || currentQuestion?.question_type === 'multiple_choice') && (
                                            <div className="grid grid-cols-1 gap-3">
                                                {currentQuestion.options.map((opt, i) => {
                                                    const isSelected = currentQuestion.question_type === 'multiple_choice'
                                                        ? (answers[currentQuestion.id] || []).includes(opt)
                                                        : answers[currentQuestion.id] === opt;

                                                    return (
                                                        <button
                                                            key={i}
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
                                                            className={`text-left px-5 py-4 rounded-2xl border-2 font-bold text-sm transition-all flex items-center justify-between group ${isSelected ? 'border-[#7c3aed] bg-[#7c3aed]/5 text-[#7c3aed] shadow-lg shadow-purple-500/5 translate-x-1' : 'border-gray-50 bg-gray-50 hover:bg-white hover:border-gray-200 text-gray-600'}`}
                                                        >
                                                            {opt}
                                                            {isSelected && <CheckCircle2 className="w-5 h-5 text-[#7c3aed] animate-in zoom-in" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-4">
                                <button
                                    onClick={handleBack}
                                    disabled={currentStep === 0}
                                    className="flex items-center gap-2 text-gray-400 font-bold text-xs uppercase tracking-widest hover:text-gray-900 transition disabled:opacity-0"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                    Voltar
                                </button>
                                <button
                                    onClick={handleNext}
                                    disabled={!canContinue || isSaving}
                                    className="px-8 py-4 bg-gray-900 text-white rounded-[20px] font-black text-xs hover:bg-black transition-all flex items-center gap-2 disabled:bg-gray-200 disabled:cursor-not-allowed shadow-xl shadow-gray-200 min-w-[140px] justify-center"
                                >
                                    {isSaving ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            {currentStep === questions.length - 1 ? 'FINALIZAR' : 'PRÓXIMO'}
                                            <ChevronRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>

                            {saveError && (
                                <div className="mt-4 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-[11px] font-bold animate-in slide-in-from-top-2">
                                    <X className="w-4 h-4 bg-rose-100 rounded-full p-0.5" />
                                    {saveError}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center space-y-8 py-6 animate-in zoom-in-95 duration-500">
                            <div className="relative inline-block">
                                <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 animate-pulse"></div>
                                <div className="relative w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-[32px] flex items-center justify-center mx-auto shadow-2xl">
                                    <Trophy className="w-10 h-10 text-white" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-3xl font-black text-gray-900 tracking-tight">{successTitle}</h3>
                                <p className="text-gray-500 font-medium">{successDesc}</p>
                            </div>

                            <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex flex-col gap-4">
                                <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 shadow-lg shadow-emerald-200"
                                >
                                    <MessageSquare className="w-5 h-5 fill-white/20" />
                                    ENTRAR NO GRUPO AGORA
                                </a>
                                <div className="flex items-center justify-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest opacity-60">
                                    <Lock className="w-3 h-3" />
                                    Acesso Limitado aos Alunos
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
                @keyframes zoom-in { 0% { opacity: 0; transform: scale(0.95); } 100% { opacity: 1; transform: scale(1); } }
                @keyframes slide-in-bottom { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
                .animate-in { animation: zoom-in 0.3s ease-out forwards; }
            `}</style>
        </div>
    );
}
