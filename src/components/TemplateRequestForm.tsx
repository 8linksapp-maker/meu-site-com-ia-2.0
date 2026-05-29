import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
    ArrowLeft, ArrowRight, Check, Sparkles, Loader2, Lightbulb,
    Store, FileText, Megaphone, Building2, Briefcase, UtensilsCrossed,
    UserCircle2, GraduationCap, Link2, Users, Calendar, Home, Cog, HelpCircle,
    ThumbsUp, Search,
} from 'lucide-react';
import { Card, Banner, Field, Input, Textarea } from './ui';

// Domingo da semana atual em UTC — mesmo cálculo do VotingPanel
function getCurrentWeekStart(): string {
    const now = new Date();
    const dow = now.getUTCDay();
    const sunday = new Date(now);
    sunday.setUTCDate(now.getUTCDate() - dow);
    sunday.setUTCHours(0, 0, 0, 0);
    return sunday.toISOString().slice(0, 10);
}

interface SimilarRequest {
    id: string;
    niche: string;
    business_type: string;
    user_name: string;
    votes_count: number;
    user_voted: boolean;
}

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

// Previews CSS dos estilos — mantidos como mockups internos (representação dos estilos
// sendo demonstrados ao user, NÃO refletem a paleta MSIA principal).
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
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Erro ao enviar. Tenta de novo daqui a pouco.');
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
            <Card padding="lg" className="max-w-2xl mx-auto !border-verde-oliva/40">
                <div className="text-center py-6">
                    <div className="w-16 h-16 bg-verde-oliva rounded-full flex items-center justify-center mx-auto mb-4">
                        <Check className="w-8 h-8 text-papel-craft" strokeWidth={2.5} />
                    </div>
                    <h2 className="font-display text-2xl font-normal text-carvao-quente tracking-tight">
                        Solicitação enviada.
                    </h2>
                    <p className="text-base text-cafe-medio mt-2 mb-6 max-w-md mx-auto leading-relaxed">
                        Recebemos sua sugestão e ela já entra na votação dessa semana. Outros alunos podem votar — se for a campeã, vira template ao vivo na sexta.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <button
                            type="button"
                            onClick={resetForm}
                            className="inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-5 py-2.5 rounded-[12px] font-semibold text-sm transition-colors active:scale-[0.98] min-h-[44px]"
                        >
                            Enviar outra sugestão
                        </button>
                        <a
                            href="/dashboard"
                            className="inline-flex items-center justify-center gap-2 bg-cream-elevated hover:bg-coral-wash text-carvao-quente hover:text-terracota-profundo border border-borda-cafe px-5 py-2.5 rounded-[12px] font-semibold text-sm transition-colors active:scale-[0.98] min-h-[44px]"
                        >
                            Voltar ao dashboard
                        </a>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <div className="max-w-3xl mx-auto pb-8 space-y-6">
            {/* Header explicação */}
            <Card padding="md" className="!border-coral-terra/30">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-coral-wash flex items-center justify-center shrink-0">
                        <Lightbulb className="w-5 h-5 text-coral-terra" />
                    </div>
                    <div className="min-w-0">
                        <p className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                            Sugira o template que você precisa
                        </p>
                        <p className="text-sm text-cafe-medio mt-1 leading-relaxed">
                            Não achou template ideal pro seu nicho? Conta o que falta — leva 2-3 minutos. Outros alunos votam na sua sugestão. As mais votadas viram template ao vivo.
                        </p>
                    </div>
                </div>
            </Card>

            {/* Stepper */}
            <div className="flex items-center justify-between px-2">
                {[1, 2, 3].map((n, i) => (
                    <div key={n} className="flex items-center flex-1">
                        <div className={`relative flex flex-col items-center ${i === 0 ? '' : 'flex-1'}`}>
                            {i > 0 && (
                                <div className={`absolute right-1/2 top-5 h-px w-full ${step > n - 1 ? 'bg-coral-terra' : 'bg-borda-cafe'}`} />
                            )}
                            <div
                                className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm border transition-colors ${
                                    step > n
                                        ? 'bg-verde-oliva border-verde-oliva text-papel-craft'
                                        : step === n
                                            ? 'bg-coral-terra border-coral-terra text-papel-craft'
                                            : 'bg-cream-elevated border-borda-cafe text-cafe-cinza-quente'
                                }`}
                            >
                                {step > n ? <Check className="w-5 h-5" strokeWidth={2.5} /> : <span className="tabular-nums">{n}</span>}
                            </div>
                            <span className={`mt-2 text-xs font-semibold whitespace-nowrap ${
                                step === n
                                    ? 'text-coral-terra'
                                    : step > n
                                        ? 'text-carvao-quente'
                                        : 'text-cafe-cinza-quente'
                            }`}>
                                {n === 1 ? 'Negócio' : n === 2 ? 'Funcionalidades' : 'Estilo'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Card do wizard */}
            <Card padding="lg" className="space-y-6">
                {step === 1 && <Step1 form={form} update={updateField} />}
                {step === 2 && <Step2 form={form} toggleFeature={toggleFeature} />}
                {step === 3 && <Step3 form={form} update={updateField} updateRefUrl={updateRefUrl} />}

                {error && <Banner tone="error">{error}</Banner>}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-5 border-t border-borda-cafe">
                    <button
                        type="button"
                        onClick={prev}
                        disabled={step === 1}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-cafe-medio hover:text-coral-terra disabled:opacity-30 disabled:cursor-not-allowed font-semibold text-sm transition-colors min-h-[44px]"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </button>
                    {step < 3 ? (
                        <button
                            type="button"
                            onClick={next}
                            disabled={!canAdvance()}
                            className="inline-flex items-center gap-2 bg-coral-terra hover:bg-terracota-profundo disabled:opacity-60 disabled:cursor-not-allowed text-papel-craft px-5 py-2.5 rounded-[12px] font-semibold text-sm transition-colors active:scale-[0.98] min-h-[44px]"
                        >
                            Próximo
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!canAdvance() || submitting}
                            className="inline-flex items-center gap-2 bg-coral-terra hover:bg-terracota-profundo disabled:opacity-60 disabled:cursor-not-allowed text-papel-craft px-5 py-2.5 rounded-[12px] font-semibold text-sm transition-colors active:scale-[0.98] min-h-[44px]"
                        >
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {submitting ? 'Enviando…' : 'Enviar solicitação'}
                        </button>
                    )}
                </div>
            </Card>
        </div>
    );
}

// ── STEP 1 ─────────────────────────────────────────────────────────────
function Step1({ form, update }: {
    form: FormState;
    update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
    const [similar, setSimilar] = useState<SimilarRequest[]>([]);
    const [searching, setSearching] = useState(false);
    const [supporting, setSupporting] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const q = form.niche.trim();
        if (q.length < 4) {
            setSimilar([]);
            return;
        }
        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const uid = session?.user.id || null;

                const baseQ = supabase
                    .from('template_requests')
                    .select('id, niche, business_type, user_name')
                    .ilike('niche', `%${q}%`)
                    .in('status', ['new', 'in_review', 'planned', 'in_progress'])
                    .limit(3);

                const { data: matches } = form.businessType
                    ? await baseQ.eq('business_type', form.businessType)
                    : await baseQ;

                if (!matches || matches.length === 0) {
                    setSimilar([]);
                    return;
                }

                const ids = matches.map(m => m.id);
                const weekStart = getCurrentWeekStart();
                const { data: votes } = await supabase
                    .from('template_request_votes')
                    .select('request_id, user_id')
                    .in('request_id', ids)
                    .eq('week_start', weekStart);

                const countMap: Record<string, number> = {};
                const minePresence: Record<string, boolean> = {};
                (votes || []).forEach((v: { request_id: string; user_id: string }) => {
                    countMap[v.request_id] = (countMap[v.request_id] || 0) + 1;
                    if (uid && v.user_id === uid) minePresence[v.request_id] = true;
                });

                setSimilar(matches.map(m => ({
                    id: m.id,
                    niche: m.niche,
                    business_type: m.business_type,
                    user_name: m.user_name || 'aluno',
                    votes_count: countMap[m.id] || 0,
                    user_voted: minePresence[m.id] || false,
                })));
            } catch {
                setSimilar([]);
            } finally {
                setSearching(false);
            }
        }, 600);
        return () => clearTimeout(timer);
    }, [form.niche, form.businessType]);

    async function supportExisting(req: SimilarRequest) {
        if (req.user_voted) return;
        setSupporting(prev => ({ ...prev, [req.id]: true }));
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert('Você precisa estar logado pra apoiar.');
                return;
            }
            const { error } = await supabase
                .from('template_request_votes')
                .insert({
                    request_id: req.id,
                    user_id: session.user.id,
                    week_start: getCurrentWeekStart(),
                });
            if (error) throw error;
            setSimilar(prev => prev.map(s => s.id === req.id
                ? { ...s, user_voted: true, votes_count: s.votes_count + 1 }
                : s));
        } catch (e: unknown) {
            alert('Erro: ' + (e instanceof Error ? e.message : 'falha ao apoiar'));
        } finally {
            setSupporting(prev => ({ ...prev, [req.id]: false }));
        }
    }

    return (
        <>
            <div>
                <h3 className="font-display text-xl font-normal text-carvao-quente tracking-tight">
                    Qual o tipo de site?
                </h3>
                <p className="text-sm text-cafe-medio mt-1">Escolhe a opção mais próxima. Depois afina nos campos abaixo.</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {BUSINESS_TYPES.map(opt => {
                    const Icon = opt.icon;
                    const selected = form.businessType === opt.value;
                    return (
                        <button
                            key={opt.value}
                            type="button"
                            onClick={() => update('businessType', opt.value)}
                            className={`text-left p-3 rounded-[10px] border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra ${
                                selected
                                    ? 'border-coral-terra bg-coral-wash'
                                    : 'border-borda-cafe bg-cream-elevated hover:bg-coral-wash/50 hover:border-coral-terra/30'
                            }`}
                        >
                            <Icon className={`w-5 h-5 mb-2 ${selected ? 'text-coral-terra' : 'text-cafe-cinza-quente'}`} />
                            <p className={`font-semibold text-sm ${selected ? 'text-terracota-profundo' : 'text-carvao-quente'}`}>
                                {opt.label}
                            </p>
                            <p className="text-xs text-cafe-medio mt-0.5 leading-tight">{opt.description}</p>
                        </button>
                    );
                })}
            </div>

            <Field
                label="Nicho específico"
                htmlFor="niche"
                helper='Quanto mais específico, melhor — não vale só "blog" ou "loja".'
            >
                <Input
                    id="niche"
                    type="text"
                    value={form.niche}
                    onChange={e => update('niche', e.target.value)}
                    placeholder="Ex: Restaurante japonês em SP, Blog sobre maternidade real, Loja de produtos veganos…"
                    required
                />
            </Field>

            {/* Detecção de duplicados */}
            {form.niche.trim().length >= 4 && (searching || similar.length > 0) && (
                <div className="rounded-[10px] border border-mostarda-amber/40 bg-[oklch(97%_0.025_80)] p-4">
                    <div className="flex items-center gap-2 mb-3">
                        {searching ? (
                            <Loader2 className="w-4 h-4 animate-spin text-[oklch(45%_0.110_80)]" />
                        ) : (
                            <Search className="w-4 h-4 text-[oklch(45%_0.110_80)]" />
                        )}
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-[oklch(40%_0.110_80)]">
                            {searching ? 'Buscando pedidos parecidos…' : `Já encontrei ${similar.length} pedido${similar.length > 1 ? 's' : ''} parecido${similar.length > 1 ? 's' : ''}`}
                        </p>
                    </div>
                    {!searching && similar.length > 0 && (
                        <>
                            <p className="text-sm text-cafe-medio mb-3 leading-relaxed">
                                Em vez de criar novo, você pode <strong className="text-carvao-quente">apoiar um pedido existente</strong> — ele ganha mais votos e sobe na fila.
                            </p>
                            <div className="space-y-2">
                                {similar.map(s => (
                                    <div key={s.id} className="flex items-center gap-3 bg-cream-surface border border-borda-cafe rounded-[8px] p-3">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-carvao-quente truncate">{s.niche}</p>
                                            <p className="text-xs text-cafe-cinza-quente mt-0.5">
                                                Por <strong className="text-cafe-medio">{s.user_name}</strong>
                                                {' · '}
                                                <span className="tabular-nums">{s.votes_count} {s.votes_count === 1 ? 'voto' : 'votos'} essa semana</span>
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => supportExisting(s)}
                                            disabled={s.user_voted || !!supporting[s.id]}
                                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] font-semibold text-xs whitespace-nowrap transition-colors min-h-[36px] shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra disabled:cursor-default ${
                                                s.user_voted
                                                    ? 'bg-verde-oliva text-papel-craft'
                                                    : 'bg-coral-terra hover:bg-terracota-profundo text-papel-craft active:scale-[0.98]'
                                            }`}
                                        >
                                            {supporting[s.id] ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : s.user_voted ? (
                                                <><Check className="w-3.5 h-3.5" strokeWidth={3} /> Apoiada</>
                                            ) : (
                                                <><ThumbsUp className="w-3.5 h-3.5" /> Apoiar</>
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-cafe-cinza-quente mt-3">
                                Não é nenhum desses? Continue preenchendo abaixo — sua sugestão também entra na votação.
                            </p>
                        </>
                    )}
                </div>
            )}
        </>
    );
}

// ── STEP 2 ─────────────────────────────────────────────────────────────
function Step2({ form, toggleFeature }: {
    form: FormState;
    toggleFeature: (v: string) => void;
}) {
    return (
        <>
            <div>
                <h3 className="font-display text-xl font-normal text-carvao-quente tracking-tight">
                    O que o site precisa fazer?
                </h3>
                <p className="text-sm text-cafe-medio mt-1">
                    Marca tudo que faz sentido. Quanto mais marca, melhor a gente entende.
                </p>
            </div>

            <div className="space-y-3">
                <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em]">
                    Funcionalidades (mínimo 1)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {FEATURES.map(f => {
                        const checked = form.features.includes(f.value);
                        return (
                            <button
                                key={f.value}
                                type="button"
                                onClick={() => toggleFeature(f.value)}
                                className={`flex items-center gap-3 p-3 rounded-[10px] border transition-colors text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra ${
                                    checked
                                        ? 'border-coral-terra bg-coral-wash'
                                        : 'border-borda-cafe bg-cream-elevated hover:bg-coral-wash/50 hover:border-coral-terra/30'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors ${
                                    checked ? 'bg-coral-terra' : 'bg-cream-surface border border-borda-cafe'
                                }`}>
                                    {checked && <Check className="w-3.5 h-3.5 text-papel-craft" strokeWidth={3} />}
                                </div>
                                <span className={`text-sm ${checked ? 'font-semibold text-terracota-profundo' : 'text-carvao-quente'}`}>
                                    {f.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
}

// ── STEP 3 ─────────────────────────────────────────────────────────────
function Step3({ form, update, updateRefUrl }: {
    form: FormState;
    update: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
    updateRefUrl: (i: number, v: string) => void;
}) {
    return (
        <>
            <div>
                <h3 className="font-display text-xl font-normal text-carvao-quente tracking-tight">
                    Que vibe você quer?
                </h3>
                <p className="text-sm text-cafe-medio mt-1">
                    Escolhe o estilo visual que mais te agrada. Não pensa muito, vai pelo que olha e gosta.
                </p>
            </div>

            <div className="space-y-3">
                <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em]">
                    Estilo visual
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {STYLES.map(s => {
                        const selected = form.stylePreference === s.value;
                        return (
                            <button
                                key={s.value}
                                type="button"
                                onClick={() => update('stylePreference', s.value)}
                                className={`group rounded-[10px] border transition-colors overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra ${
                                    selected
                                        ? 'border-coral-terra ring-2 ring-coral-terra/30'
                                        : 'border-borda-cafe hover:border-coral-terra/40'
                                }`}
                            >
                                <div className="relative aspect-[4/3] overflow-hidden">
                                    {s.preview}
                                    {selected && (
                                        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-coral-terra rounded-full flex items-center justify-center shadow-[0_2px_6px_rgba(80,40,20,0.20)]">
                                            <Check className="w-3 h-3 text-papel-craft" strokeWidth={3} />
                                        </div>
                                    )}
                                </div>
                                <p className={`p-2.5 text-xs text-center leading-tight ${
                                    selected
                                        ? 'font-semibold text-terracota-profundo bg-coral-wash'
                                        : 'font-semibold text-carvao-quente bg-cream-elevated'
                                }`}>
                                    {s.label}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>

            <Field
                label="Sites que você gosta"
                htmlFor="ref-url-0"
                optional
                helper="Não precisa ser do mesmo nicho — qualquer site cujo visual te agrade (até 3)."
            >
                <div className="space-y-2">
                    {form.referenceUrls.map((url, i) => (
                        <Input
                            key={i}
                            id={`ref-url-${i}`}
                            type="url"
                            value={url}
                            onChange={e => updateRefUrl(i, e.target.value)}
                            placeholder={`https://exemplo${i + 1}.com`}
                        />
                    ))}
                </div>
            </Field>

            <Field label="Mais alguma coisa?" htmlFor="extra-notes" optional>
                <Textarea
                    id="extra-notes"
                    value={form.extraNotes}
                    onChange={e => update('extraNotes', e.target.value)}
                    placeholder="Qualquer detalhe extra que ajude a gente a entender o que você precisa…"
                    rows={4}
                />
            </Field>
        </>
    );
}
