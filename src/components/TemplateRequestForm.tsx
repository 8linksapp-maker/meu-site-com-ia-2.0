import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    ArrowLeft, ArrowRight, Check, Sparkles, Loader2, Plus, X, Lightbulb,
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

const CONTENT_SCALES = [
    { value: '1-5', label: '1 a 5 páginas/produtos' },
    { value: '6-20', label: '6 a 20 páginas/produtos' },
    { value: '21-50', label: '21 a 50 páginas/produtos' },
    { value: '50+', label: 'Mais de 50' },
];

const STYLES = [
    { value: 'moderno-minimalista', label: 'Moderno e minimalista' },
    { value: 'colorido-vibrante', label: 'Colorido e vibrante' },
    { value: 'elegante-sofisticado', label: 'Elegante e sofisticado' },
    { value: 'profissional-corporativo', label: 'Profissional / corporativo' },
    { value: 'divertido-casual', label: 'Divertido e casual' },
    { value: 'rustico-natural', label: 'Rústico / natural' },
    { value: 'tech-futurista', label: 'Tech / futurista' },
    { value: 'nao-sei', label: 'Não sei — preciso de sugestão' },
];

const URGENCIES = [
    { value: 'agora', label: 'Agora — já preciso', color: 'red' },
    { value: '30d', label: 'Próximos 30 dias', color: 'amber' },
    { value: '90d', label: 'Próximos 90 dias', color: 'blue' },
    { value: 'sem-pressa', label: 'Sem pressa, só pesquisando', color: 'slate' },
];

type FormState = {
    businessType: string;
    niche: string;
    targetAudience: string;
    features: string[];
    contentScale: string;
    referenceUrls: string[];
    stylePreference: string;
    urgency: string;
    extraNotes: string;
};

const INITIAL_STATE: FormState = {
    businessType: '',
    niche: '',
    targetAudience: '',
    features: [],
    contentScale: '',
    referenceUrls: ['', '', ''],
    stylePreference: '',
    urgency: '',
    extraNotes: '',
};

export default function TemplateRequestForm() {
    const [step, setStep] = useState(1);
    const [form, setForm] = useState<FormState>(INITIAL_STATE);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [previousRequests, setPreviousRequests] = useState<any[]>([]);
    const [loadingPrevious, setLoadingPrevious] = useState(true);

    useEffect(() => {
        loadPrevious();
    }, []);

    async function loadPrevious() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                setLoadingPrevious(false);
                return;
            }
            const { data } = await supabase
                .from('template_requests')
                .select('id, business_type, niche, status, created_at')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: false })
                .limit(5);
            if (data) setPreviousRequests(data);
        } catch (e) {
            // tabela pode não existir ainda — ignora silenciosamente
        } finally {
            setLoadingPrevious(false);
        }
    }

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
        if (step === 1) return !!form.businessType && form.niche.trim().length >= 3 && form.targetAudience.trim().length >= 5;
        if (step === 2) return form.features.length >= 1 && !!form.contentScale;
        if (step === 3) return !!form.stylePreference && !!form.urgency;
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
                target_audience: form.targetAudience.trim(),
                features: form.features,
                content_scale: form.contentScale,
                reference_urls: form.referenceUrls.map(u => u.trim()).filter(Boolean),
                style_preference: form.stylePreference,
                urgency: form.urgency,
                extra_notes: form.extraNotes.trim(),
                status: 'new',
            };
            const { error: insertError } = await supabase.from('template_requests').insert(payload);
            if (insertError) throw insertError;
            setSubmitted(true);
            loadPrevious();
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
                {step === 2 && <Step2 form={form} update={updateField} toggleFeature={toggleFeature} />}
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

            {/* Histórico */}
            {!loadingPrevious && previousRequests.length > 0 && (
                <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-6">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#7c3aed]" />
                        Suas solicitações anteriores
                    </h3>
                    <div className="space-y-2">
                        {previousRequests.map(r => {
                            const bt = BUSINESS_TYPES.find(b => b.value === r.business_type);
                            const Icon = bt?.icon || HelpCircle;
                            return (
                                <div key={r.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                    <Icon className="w-5 h-5 text-gray-500 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 truncate">{bt?.label || r.business_type} — {r.niche}</p>
                                        <p className="text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                    <StatusBadge status={r.status} />
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
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

            <div className="space-y-4">
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

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                        Quem é o público-alvo? <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={form.targetAudience}
                        onChange={e => update('targetAudience', e.target.value)}
                        placeholder="Ex: Mulheres 25-45 anos, mães de primeira viagem, classe média, buscam dicas práticas..."
                        rows={2}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-purple-500/20 resize-none"
                    />
                </div>
            </div>
        </>
    );
}

function Step2({ form, update, toggleFeature }: {
    form: FormState;
    update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
    toggleFeature: (v: string) => void;
}) {
    return (
        <>
            <h3 className="text-xl font-bold text-gray-900 mb-1">O que o site precisa fazer?</h3>
            <p className="text-sm text-gray-500 mb-6">Marca tudo que faz sentido pro seu caso. Quanto mais marca, melhor a gente entende.</p>

            <div className="mb-6">
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

            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Qual o volume estimado de conteúdo? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {CONTENT_SCALES.map(s => (
                        <button
                            key={s.value}
                            type="button"
                            onClick={() => update('contentScale', s.value)}
                            className={`p-3 rounded-xl border-2 transition-all text-sm font-semibold ${
                                form.contentScale === s.value
                                    ? 'border-[#7c3aed] bg-violet-50 text-[#7c3aed]'
                                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
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
            <h3 className="text-xl font-bold text-gray-900 mb-1">Estilo e referências</h3>
            <p className="text-sm text-gray-500 mb-6">Última etapa. Aqui a gente captura o "look and feel" que você quer.</p>

            <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Estilo desejado <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {STYLES.map(s => (
                        <button
                            key={s.value}
                            type="button"
                            onClick={() => update('stylePreference', s.value)}
                            className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                                form.stylePreference === s.value
                                    ? 'border-[#7c3aed] bg-violet-50 text-[#7c3aed] font-semibold'
                                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                            }`}
                        >
                            {s.label}
                        </button>
                    ))}
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

            <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quando você precisa? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {URGENCIES.map(u => (
                        <button
                            key={u.value}
                            type="button"
                            onClick={() => update('urgency', u.value)}
                            className={`p-3 rounded-xl border-2 transition-all text-sm font-medium ${
                                form.urgency === u.value
                                    ? 'border-[#7c3aed] bg-violet-50 text-[#7c3aed] font-semibold'
                                    : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
                            }`}
                        >
                            {u.label}
                        </button>
                    ))}
                </div>
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

function StatusBadge({ status }: { status: string }) {
    const map: Record<string, { label: string; bg: string; text: string }> = {
        new: { label: 'Nova', bg: 'bg-blue-100', text: 'text-blue-700' },
        in_review: { label: 'Em análise', bg: 'bg-amber-100', text: 'text-amber-700' },
        planned: { label: 'Aprovada', bg: 'bg-emerald-100', text: 'text-emerald-700' },
        in_progress: { label: 'Em produção', bg: 'bg-violet-100', text: 'text-violet-700' },
        delivered: { label: 'Entregue', bg: 'bg-emerald-100', text: 'text-emerald-700' },
        declined: { label: 'Não viável', bg: 'bg-gray-100', text: 'text-gray-600' },
    };
    const cfg = map[status] || map.new;
    return (
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text} whitespace-nowrap`}>
            {cfg.label}
        </span>
    );
}
