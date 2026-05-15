import { useState } from 'react';
import { supabase } from '../lib/supabase';
import {
    ArrowLeft, ArrowRight, Check, Sparkles, Loader2, Lightbulb,
    Store, FileText, Megaphone, Building2, Briefcase, UtensilsCrossed,
    UserCircle2, GraduationCap, Link2, Users, Calendar, Home, Cog, HelpCircle,
} from 'lucide-react';

interface BusinessOption {
    value: string;
    label: string;
    icon: React.ElementType;
    description: string;
}

const BUSINESS_TYPES: BusinessOption[] = [
    { value: 'ecommerce', label: 'Loja Online', icon: Store, description: 'Vender produtos com carrinho e checkout' },
    { value: 'blog', label: 'Blog / Portal', icon: FileText, description: 'Conteúdo, artigos, revista digital' },
    { value: 'landing', label: 'Landing Page', icon: Megaphone, description: 'Captura de leads, um único produto/serviço' },
    { value: 'institucional', label: 'Site Institucional', icon: Building2, description: 'Empresa, escritório, organização' },
    { value: 'servicos-locais', label: 'Serviços Locais', icon: Briefcase, description: 'Médico, dentista, advogado, oficina' },
    { value: 'restaurante', label: 'Restaurante / Café', icon: UtensilsCrossed, description: 'Cardápio, reservas, delivery' },
    { value: 'portfolio', label: 'Portfólio Pessoal', icon: UserCircle2, description: 'Designer, fotógrafo, freelancer' },
    { value: 'curso', label: 'Curso / Infoproduto', icon: GraduationCap, description: 'Área de membros, aulas, comunidade' },
    { value: 'afiliados', label: 'Reviews / Afiliados', icon: Link2, description: 'Comparativos, indicações Amazon/ML' },
    { value: 'comunidade', label: 'Comunidade / Fórum', icon: Users, description: 'Discussão entre membros' },
    { value: 'eventos', label: 'Eventos / Agendamento', icon: Calendar, description: 'Calendário, marcação, inscrições' },
    { value: 'imobiliaria', label: 'Imobiliária', icon: Home, description: 'Catálogo de imóveis, busca' },
    { value: 'saas', label: 'SaaS / Startup', icon: Cog, description: 'App ou serviço digital' },
    { value: 'outro', label: 'Outro', icon: HelpCircle, description: 'Conta pra gente nos campos abaixo' },
];

const FEATURES: { value: string; label: string }[] = [
    { value: 'blog', label: 'Blog / Sistema de posts' },
    { value: 'loja', label: 'Loja com carrinho + checkout' },
    { value: 'catalogo', label: 'Catálogo (sem checkout, só vitrine)' },
    { value: 'portfolio-galeria', label: 'Galeria / portfólio visual' },
    { value: 'agendamento', label: 'Sistema de agendamento' },
    { value: 'contato-avancado', label: 'Formulário de contato avançado' },
    { value: 'newsletter', label: 'Captura de email / newsletter' },
    { value: 'whatsapp', label: 'Integração com WhatsApp' },
    { value: 'mapa', label: 'Mapa / localização' },
    { value: 'multi-idioma', label: 'Multi-idioma' },
    { value: 'area-membros', label: 'Área de membros / login cliente' },
    { value: 'calculadora', label: 'Calculadora ou orçamento' },
    { value: 'depoimentos', label: 'Depoimentos / avaliações' },
    { value: 'faq', label: 'FAQ / perguntas frequentes' },
    { value: 'equipe', label: 'Equipe / autores múltiplos' },
    { value: 'afiliados-ecommerce', label: 'Integração afiliados (Amazon/ML/Shopee)' },
    { value: 'pix', label: 'Pagamento PIX direto' },
    { value: 'pdf-download', label: 'Download de PDFs / e-books' },
];

// Cada estilo tem um mini-preview visual gerado em CSS (sem imagem externa)
const STYLES: { value: string; label: string; preview: React.ReactNode }[] = [
    {
        value: 'moderno-minimalista',
        label: 'Moderno e minimalista',
        preview: (
            <div className="absolute inset-0 bg-white p-2.5">
                <div className="h-1.5 w-12 bg-slate-900 rounded-full mb-2" />
                <div className="h-1.5 w-20 bg-slate-300 rounded-full mb-3" />
                <div className="grid grid-cols-2 gap-1.5">
                    <div className="aspect-square bg-slate-100 rounded-md" />
                    <div className="aspect-square bg-slate-100 rounded-md" />
                </div>
            </div>
        ),
    },
    {
        value: 'colorido-vibrante',
        label: 'Colorido e vibrante',
        preview: (
            <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500 via-orange-400 to-yellow-300 p-2.5">
                <div className="h-2 w-10 bg-white rounded-full mb-2" />
                <div className="flex gap-1.5 mb-1.5">
                    <div className="w-5 h-5 rounded-full bg-cyan-400" />
                    <div className="w-5 h-5 rounded-full bg-violet-500" />
                    <div className="w-5 h-5 rounded-full bg-emerald-400" />
                </div>
                <div className="h-1.5 w-3/4 bg-white/80 rounded-full" />
            </div>
        ),
    },
    {
        value: 'elegante-sofisticado',
        label: 'Elegante e sofisticado',
        preview: (
            <div className="absolute inset-0 bg-stone-50 p-2.5">
                <div className="h-px w-full bg-amber-700 mb-2" />
                <p className="text-[10px] font-serif italic text-stone-800 leading-none mb-1.5">Lorem</p>
                <div className="h-1 w-16 bg-stone-300 rounded-full mb-1" />
                <div className="h-1 w-12 bg-stone-300 rounded-full mb-2" />
                <div className="h-px w-full bg-amber-700" />
            </div>
        ),
    },
    {
        value: 'profissional-corporativo',
        label: 'Profissional / corporativo',
        preview: (
            <div className="absolute inset-0 bg-white p-2.5">
                <div className="h-3 w-full bg-blue-700 rounded-sm mb-2" />
                <div className="grid grid-cols-3 gap-1">
                    <div className="h-6 bg-slate-100 rounded-sm" />
                    <div className="h-6 bg-slate-100 rounded-sm" />
                    <div className="h-6 bg-slate-100 rounded-sm" />
                </div>
                <div className="h-1 w-full bg-slate-200 mt-1.5 rounded-full" />
            </div>
        ),
    },
    {
        value: 'divertido-casual',
        label: 'Divertido e casual',
        preview: (
            <div className="absolute inset-0 bg-pink-50 p-2.5">
                <div className="h-2.5 w-14 bg-pink-400 rounded-full mb-1.5" />
                <div className="flex gap-1 mb-1.5">
                    <div className="w-7 h-7 rounded-2xl bg-yellow-300" />
                    <div className="w-7 h-7 rounded-2xl bg-teal-300" />
                </div>
                <div className="h-1.5 w-3/4 bg-pink-300 rounded-full" />
            </div>
        ),
    },
    {
        value: 'rustico-natural',
        label: 'Rústico / natural',
        preview: (
            <div className="absolute inset-0 bg-amber-50 p-2.5">
                <div className="h-2 w-14 bg-amber-900 rounded-sm mb-2" />
                <div className="h-6 w-full bg-gradient-to-r from-green-700 to-amber-700 rounded-sm mb-1.5" />
                <div className="h-1 w-3/4 bg-amber-800/40 rounded-full" />
            </div>
        ),
    },
    {
        value: 'tech-futurista',
        label: 'Tech / futurista',
        preview: (
            <div className="absolute inset-0 bg-slate-900 p-2.5 overflow-hidden">
                <div className="absolute inset-0 opacity-30" style={{
                    backgroundImage: 'linear-gradient(rgba(0,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.3) 1px, transparent 1px)',
                    backgroundSize: '12px 12px',
                }} />
                <div className="relative h-2 w-12 bg-cyan-400 rounded-full mb-2 shadow-[0_0_8px_rgba(0,255,255,0.8)]" />
                <div className="relative h-1.5 w-16 bg-fuchsia-400 rounded-full mb-1 shadow-[0_0_6px_rgba(255,0,255,0.7)]" />
                <div className="relative h-1.5 w-10 bg-cyan-400/70 rounded-full" />
            </div>
        ),
    },
    {
        value: 'nao-sei',
        label: 'Não sei — sugiram',
        preview: (
            <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <span className="text-3xl font-black text-slate-400">?</span>
            </div>
        ),
    },
];

type FormState = {
    businessType: string;
    niche: string;
    features: string[];
    referenceUrls: string[];
    stylePreference: string;
    extraNotes: string;
};

const INITIAL_STATE: FormState = {
    businessType: '',
    niche: '',
    features: [],
    referenceUrls: ['', '', ''],
    stylePreference: '',
    extraNotes: '',
};

export default function TemplateRequestForm() {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormState>(INITIAL_STATE);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm(prev => ({ ...prev, [key]: value }));
        setError('');
    }

    function toggleFeature(value: string) {
        setForm(prev => ({
            ...prev,
            features: prev.features.includes(value)
                ? prev.features.filter(f => f !== value)
                : [...prev.features, value],
        }));
    }

    function updateRefUrl(index: number, value: string) {
        setForm(prev => ({
            ...prev,
            referenceUrls: prev.referenceUrls.map((u, i) => (i === index ? value : u)),
        }));
    }

    function canAdvance() {
        if (step === 1) return !!form.businessType && form.niche.trim().length >= 3;
        if (step === 2) return form.features.length >= 1;
        if (step === 3) return !!form.stylePreference;
        return true;
    }

    function next() {
        if (!canAdvance()) {
            setError('Preencha os campos obrigatórios pra avançar.');
            return;
        }
        setStep(s => Math.min(3, s + 1));
        setError('');
    }

    function prev() {
        setStep(s => Math.max(1, s - 1));
        setError('');
    }

    async function handleSubmit() {
        if (!canAdvance()) {
            setError('Preencha os campos obrigatórios.');
            return;
        }
        setSubmitting(true);
        setError('');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setError('Você precisa estar logado.');
                window.location.href = '/';
                return;
            }
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', session.user.id)
                .maybeSingle();

            const payload = {
                user_id: session.user.id,
                user_email: session.user.email || '',
                user_name: profile?.full_name || (session.user.email || '').split('@')[0],
                business_type: form.businessType,
                niche: form.niche.trim(),
                features: form.features,
                reference_urls: form.referenceUrls.map(u => u.trim()).filter(Boolean),
                style_preference: form.stylePreference,
                extra_notes: form.extraNotes.trim(),
                status: 'new',
            };
            const { error: insertError } = await supabase.from('template_requests').insert(payload);
            if (insertError) throw insertError;
            setSubmitted(true);
        } catch (e: any) {
            setError(e?.message || 'Erro ao enviar. Tenta de novo daqui a pouco.');
        } finally {
            setSubmitting(false);
        }
    }

    function resetForm() {
        setForm(INITIAL_STATE);
        setStep(1);
        setSubmitted(false);
        setError('');
    }

    if (submitted) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-10 text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Solicitação enviada!</h2>
                    <p className="text-gray-600 mb-6">
                        Recebemos sua sugestão e ela já está na nossa fila de análise.
                        Quando criarmos um template que encaixe no seu pedido, você é avisado.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            onClick={resetForm}
                            className="px-6 py-3 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold rounded-xl transition-colors"
                        >
                            Enviar outra sugestão
                        </button>
                        <a
                            href="/dashboard"
                            className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                        >
                            Voltar ao dashboard
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto pb-12">
            {/* Header explanation */}
            <div className="mb-6 flex items-start gap-4 bg-violet-50 border border-violet-100 rounded-2xl p-5">
                <div className="w-10 h-10 bg-[#7c3aed] rounded-xl flex items-center justify-center shrink-0">
                    <Lightbulb className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h2 className="font-bold text-gray-900 mb-1">Ajude a gente a criar o template que você precisa</h2>
                    <p className="text-sm text-gray-600">
                        Não achou um template ideal pro seu nicho? Conta o que falta. Levamos 2-3 minutos pra você responder
                        e a gente prioriza criar templates baseado nessa demanda real.
                    </p>
                </div>
            </div>

            {/* Stepper */}
            <div className="flex items-center justify-between mb-8 px-2">
                {[1, 2, 3].map((n, i) => (
                    <div key={n} className="flex items-center flex-1">
                        <div className={`relative flex flex-col items-center ${i === 0 ? '' : 'flex-1'}`}>
                            {i > 0 && (
                                <div className={`absolute right-1/2 top-5 h-0.5 w-full ${step > n - 1 ? 'bg-[#7c3aed]' : 'bg-gray-200'}`} />
                            )}
                            <div
                                className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all ${
                                    step > n
                                        ? 'bg-[#7c3aed] border-[#7c3aed] text-white'
                                        : step === n
                                            ? 'bg-white border-[#7c3aed] text-[#7c3aed] shadow-md shadow-purple-500/20'
                                            : 'bg-gray-100 border-gray-200 text-gray-400'
                                }`}
                            >
                                {step > n ? <Check className="w-5 h-5" /> : n}
                            </div>
                            <span className={`mt-2 text-xs font-semibold whitespace-nowrap ${step === n ? 'text-[#7c3aed]' : step > n ? 'text-gray-700' : 'text-gray-400'}`}>
                                {n === 1 ? 'Negócio' : n === 2 ? 'Funcionalidades' : 'Estilo'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
                {step === 1 && <Step1 form={form} update={updateField} />}
                {step === 2 && <Step2 form={form} toggleFeature={toggleFeature} />}
                {step === 3 && <Step3 form={form} update={updateField} updateRefUrl={updateRefUrl} />}

                {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                        {error}
                    </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-100">
                    <button
                        onClick={prev}
                        disabled={step === 1}
                        className="flex items-center gap-2 px-4 py-2.5 text-gray-600 hover:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed font-medium transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </button>
                    {step < 3 ? (
                        <button
                            onClick={next}
                            disabled={!canAdvance()}
                            className="flex items-center gap-2 px-6 py-2.5 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-md shadow-purple-500/20"
                        >
                            Próximo
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={!canAdvance() || submitting}
                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors shadow-md shadow-emerald-500/20"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {submitting ? 'Enviando...' : 'Enviar solicitação'}
                        </button>
                    )}
                </div>
            </div>

        </div>
    );
}

function Step1({ form, update }: { form: FormState; update: <K extends keyof FormState>(k: K, v: FormState[K]) => void }) {
    return (
        <>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Qual o tipo de site?</h3>
            <p className="text-sm text-gray-500 mb-6">Escolhe a opção que mais se aproxima. Depois afine nos campos abaixo.</p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {BUSINESS_TYPES.map(opt => {
                    const Icon = opt.icon;
                    const selected = form.businessType === opt.value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => update('businessType', opt.value)}
                            className={`text-left p-3 rounded-xl border-2 transition-all ${
                                selected
                                    ? 'border-[#7c3aed] bg-violet-50 shadow-md shadow-purple-500/10'
                                    : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                        >
                            <Icon className={`w-5 h-5 mb-2 ${selected ? 'text-[#7c3aed]' : 'text-gray-500'}`} />
                            <p className={`font-semibold text-sm ${selected ? 'text-[#7c3aed]' : 'text-gray-800'}`}>{opt.label}</p>
                            <p className="text-[11px] text-gray-500 mt-0.5 leading-tight">{opt.description}</p>
                        </button>
                    );
                })}
            </div>

            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Nicho específico <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    value={form.niche}
                    onChange={e => update('niche', e.target.value)}
                    placeholder="Ex: Restaurante japonês em São Paulo, Blog sobre maternidade real, Loja de produtos veganos..."
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-purple-500/20"
                />
                <p className="text-xs text-gray-500 mt-1">Quanto mais específico, melhor — não vale só "blog" ou "loja".</p>
            </div>
        </>
    );
}

function Step2({ form, toggleFeature }: {
    form: FormState;
    toggleFeature: (v: string) => void;
}) {
    return (
        <>
            <h3 className="text-xl font-bold text-gray-900 mb-1">O que o site precisa fazer?</h3>
            <p className="text-sm text-gray-500 mb-6">Marca tudo que faz sentido pro seu caso. Quanto mais marca, melhor a gente entende.</p>

            <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Funcionalidades (escolha 1 ou mais)</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {FEATURES.map(f => {
                        const checked = form.features.includes(f.value);
                        return (
                            <button
                                key={f.value}
                                type="button"
                                onClick={() => toggleFeature(f.value)}
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                                    checked
                                        ? 'border-[#7c3aed] bg-violet-50'
                                        : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-all ${
                                    checked ? 'bg-[#7c3aed]' : 'bg-white border-2 border-gray-300'
                                }`}>
                                    {checked && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                                <span className={`text-sm ${checked ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{f.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

function Step3({ form, update, updateRefUrl }: {
    form: FormState;
    update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
    updateRefUrl: (i: number, v: string) => void;
}) {
    return (
        <>
            <h3 className="text-xl font-bold text-gray-900 mb-1">Que vibe você quer?</h3>
            <p className="text-sm text-gray-500 mb-6">Escolhe o estilo visual que mais te agrada. Não pensa muito — vai pelo que olha e gosta.</p>

            <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Estilo visual <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {STYLES.map(s => {
                        const selected = form.stylePreference === s.value;
                        return (
                            <button
                                key={s.value}
                                type="button"
                                onClick={() => update('stylePreference', s.value)}
                                className={`group rounded-xl border-2 transition-all overflow-hidden ${
                                    selected
                                        ? 'border-[#7c3aed] shadow-md shadow-purple-500/20 ring-2 ring-purple-500/20'
                                        : 'border-gray-200 hover:border-gray-400'
                                }`}
                            >
                                <div className="relative aspect-[4/3] overflow-hidden">
                                    {s.preview}
                                    {selected && (
                                        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-[#7c3aed] rounded-full flex items-center justify-center shadow-md">
                                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                        </div>
                                    )}
                                </div>
                                <p className={`p-2.5 text-xs text-center leading-tight ${selected ? 'font-bold text-[#7c3aed] bg-violet-50' : 'font-semibold text-gray-700 bg-white'}`}>
                                    {s.label}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Sites que você gosta (opcional, até 3)
                </label>
                <div className="space-y-2">
                    {form.referenceUrls.map((url, i) => (
                        <input
                            key={i}
                            type="url"
                            value={url}
                            onChange={e => updateRefUrl(i, e.target.value)}
                            placeholder={`https://exemplo${i + 1}.com`}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-purple-500/20"
                        />
                    ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Não precisa ser do mesmo nicho — qualquer site cujo visual te agrade.</p>
            </div>

            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Mais alguma coisa? (opcional)
                </label>
                <textarea
                    value={form.extraNotes}
                    onChange={e => update('extraNotes', e.target.value)}
                    placeholder="Qualquer detalhe extra que ajude a gente a entender o que você precisa..."
                    rows={4}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-purple-500/20 resize-none"
                />
            </div>
        </>
    );
}

