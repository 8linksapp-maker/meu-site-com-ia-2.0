import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Check, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { Tabs, Banner, Button, Field, Input, Card } from './ui';
import type { TabItem } from './ui';
import { TutorialBlockBySlug } from './ui/TutorialBlock';

// ── SVG ICONS de marca (mantidos locais) ─────────────────────────────────
function VercelIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M24 22.525H0l12-21.05 12 21.05z" />
        </svg>
    );
}

function GithubIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
        </svg>
    );
}

// ── STEP CARD Café-da-Tarde ──────────────────────────────────────────────
function StepCard({
    step,
    title,
    icon,
    isComplete,
    isCurrent,
    children,
}: {
    step: number;
    title: string;
    icon: React.ReactNode;
    isComplete: boolean;
    isCurrent: boolean;
    children: React.ReactNode;
}) {
    const [open, setOpen] = useState(isCurrent);
    const prevIsCurrent = useRef(isCurrent);
    useEffect(() => {
        if (isCurrent && !prevIsCurrent.current) setOpen(true);
        prevIsCurrent.current = isCurrent;
    }, [isCurrent]);

    const stateBorder = isComplete
        ? 'border-verde-oliva/40'
        : isCurrent
            ? 'border-coral-terra/30'
            : 'border-borda-cafe';
    const stateBg = isComplete
        ? 'bg-[oklch(96%_0.020_145)]'
        : 'bg-cream-surface';
    const opacity = !isComplete && !isCurrent ? 'opacity-70' : '';

    const iconChipBg = isComplete
        ? 'bg-verde-oliva text-papel-craft'
        : isCurrent
            ? 'bg-coral-terra text-papel-craft'
            : 'bg-cream-elevated text-cafe-cinza-quente';
    const eyebrowColor = isComplete
        ? 'text-[oklch(40%_0.060_145)]'
        : isCurrent
            ? 'text-coral-terra'
            : 'text-cafe-cinza-quente';
    const titleColor = isComplete || isCurrent
        ? 'text-carvao-quente'
        : 'text-cafe-cinza-quente';

    return (
        <div className={`border ${stateBorder} ${stateBg} ${opacity} rounded-[12px] overflow-hidden transition-colors`}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="w-full flex items-center gap-4 p-4 md:p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-coral-terra"
            >
                <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 transition-colors ${iconChipBg}`}>
                    {isComplete ? <Check className="w-5 h-5" /> : icon}
                </div>

                <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold uppercase tracking-[0.12em] mb-0.5 ${eyebrowColor}`}>
                        Passo {step} de 2
                    </p>
                    <p className={`font-semibold text-sm ${titleColor}`}>
                        {title}
                    </p>
                </div>

                {isComplete && (
                    <span className="px-2.5 py-1 bg-verde-oliva text-papel-craft text-xs font-semibold rounded-full shrink-0 uppercase tracking-wide">
                        Conectado
                    </span>
                )}
                {!isComplete && !isCurrent && (
                    <span className="px-2.5 py-1 bg-cream-elevated text-cafe-cinza-quente text-xs font-semibold rounded-full shrink-0 uppercase tracking-wide">
                        Falta fazer
                    </span>
                )}
            </button>

            {open && (
                <div className="px-4 md:px-5 pb-5 pt-1">
                    {children}
                </div>
            )}
        </div>
    );
}

// ── TOKEN INPUT (custom — usa <Input> com rightAddon pra eye toggle) ─────
function TokenInput({
    id,
    value,
    onChange,
    placeholder,
    isValid,
}: {
    id?: string;
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    isValid: boolean;
}) {
    const [show, setShow] = useState(false);
    return (
        <Input
            id={id}
            type={show ? 'text' : 'password'}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="font-mono text-sm"
            invalid={value.length > 0 && !isValid}
            rightAddon={
                <div className="flex items-center gap-1">
                    {isValid && <Check className="w-4 h-4 text-verde-oliva" aria-label="Chave detectada" />}
                    <button
                        type="button"
                        onClick={() => setShow(s => !s)}
                        aria-label={show ? 'Ocultar chave' : 'Mostrar chave'}
                        className="w-9 h-9 flex items-center justify-center text-cafe-cinza-quente hover:text-coral-terra transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-coral-terra rounded-md"
                    >
                        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
            }
        />
    );
}

// ── MAIN ──────────────────────────────────────────────────────────────────
export default function ConfigSettings() {
    const [activeTab, setActiveTab] = useState<'integracao' | 'acesso'>('integracao');

    const [githubToken, setGithubToken] = useState('');
    const [vercelToken, setVercelToken] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [saveMsg, setSaveMsg] = useState('');

    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authStatus, setAuthStatus] = useState<{ tone: 'success' | 'error'; msg: string } | null>(null);

    const githubValid = githubToken.length > 10;
    const vercelValid = vercelToken.length > 10;
    const bothSaved = githubValid && vercelValid;
    const currentStep = !githubValid ? 1 : !vercelValid ? 2 : 3;

    useEffect(() => {
        loadProfile();
        const tab = new URLSearchParams(window.location.search).get('tab');
        if (tab === 'integracao' || tab === 'acesso') setActiveTab(tab);
    }, []);

    const loadProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        setEmail(user.email || '');
        const { data } = await supabase
            .from('profiles').select('github_token, vercel_token')
            .eq('id', user.id).limit(1);
        if (data?.[0]) {
            setGithubToken(data[0].github_token || '');
            setVercelToken(data[0].vercel_token || '');
        }
    };

    const handleSaveTokens = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSaveStatus('idle');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Sessão expirada');
            const { error } = await supabase.from('profiles').update({
                github_token: githubToken,
                vercel_token: vercelToken,
                updated_at: new Date().toISOString(),
            }).eq('id', user.id);
            if (error) throw error;
            setSaveStatus('success');
            setSaveMsg('Suas contas estão conectadas. Agora dá pra criar seu primeiro site.');
        } catch (err: unknown) {
            setSaveStatus('error');
            setSaveMsg(err instanceof Error ? err.message : 'Algo deu errado salvando suas chaves.');
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword) {
            setAuthStatus({ tone: 'error', msg: 'Digite uma nova senha.' });
            return;
        }
        setAuthLoading(true);
        setAuthStatus(null);
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setAuthStatus({ tone: 'success', msg: 'Senha atualizada.' });
            setNewPassword('');
        } catch (err: unknown) {
            setAuthStatus({ tone: 'error', msg: err instanceof Error ? err.message : 'Algo deu errado.' });
        } finally {
            setAuthLoading(false);
        }
    };

    const tabs: TabItem[] = [
        {
            id: 'integracao',
            label: 'Conexões',
            badge: !bothSaved ? '!' : undefined,
        },
        { id: 'acesso', label: 'Conta' },
    ];

    return (
        <div className="max-w-2xl space-y-6 pb-8">

            <Tabs
                items={tabs}
                activeId={activeTab}
                onChange={(id) => setActiveTab(id as 'integracao' | 'acesso')}
            />

            {/* ── CONEXÕES ──────────────────────────────────────────────── */}
            {activeTab === 'integracao' && (
                <div className="space-y-4">
                    <Banner tone="info">
                        Pra publicar sites automaticamente, a MSIA precisa de acesso ao seu GitHub (criar o repositório) e à Vercel (publicar online). São <strong>2 conexões grátis</strong>, feito uma vez só. A gente te guia.
                    </Banner>

                    <form onSubmit={handleSaveTokens} className="space-y-3">

                        {/* PASSO 1 — GITHUB */}
                        <StepCard
                            step={1}
                            title="Conectar GitHub"
                            icon={<GithubIcon className="w-5 h-5" />}
                            isComplete={githubValid}
                            isCurrent={currentStep === 1}
                        >
                            <div className="space-y-4">
                                <TutorialBlockBySlug slug="github-token" />

                                <Banner tone="warning">
                                    <strong>Atenção:</strong> A chave só aparece uma vez. Copie logo após gerar e cole abaixo antes de fechar a página.
                                </Banner>

                                <Field label="Sua chave do GitHub" htmlFor="github-token">
                                    <TokenInput
                                        id="github-token"
                                        value={githubToken}
                                        onChange={setGithubToken}
                                        placeholder="github_pat_... ou ghp_..."
                                        isValid={githubValid}
                                    />
                                </Field>
                            </div>
                        </StepCard>

                        {/* PASSO 2 — VERCEL */}
                        <StepCard
                            step={2}
                            title="Conectar Vercel"
                            icon={<VercelIcon className="w-5 h-5" />}
                            isComplete={vercelValid}
                            isCurrent={currentStep === 2}
                        >
                            <div className="space-y-4">
                                <TutorialBlockBySlug slug="vercel-token" />

                                <Banner tone="warning">
                                    <strong>Atenção:</strong> A chave da Vercel também só aparece uma vez. Copie imediatamente após criar.
                                </Banner>

                                <Field label="Sua chave da Vercel" htmlFor="vercel-token">
                                    <TokenInput
                                        id="vercel-token"
                                        value={vercelToken}
                                        onChange={setVercelToken}
                                        placeholder="Cole aqui a chave da Vercel..."
                                        isValid={vercelValid}
                                    />
                                </Field>
                            </div>
                        </StepCard>

                        {/* SAVE / RESULT */}
                        <div className="pt-2">
                            {saveStatus === 'success' ? (
                                <Banner
                                    tone="success"
                                    title={saveMsg}
                                    action={
                                        <a
                                            href="/sites"
                                            className="inline-flex items-center gap-1 text-sm font-semibold text-coral-terra hover:text-terracota-profundo transition-colors"
                                        >
                                            Criar primeiro site <ArrowRight className="w-3.5 h-3.5" />
                                        </a>
                                    }
                                />
                            ) : (
                                <Button
                                    type="submit"
                                    disabled={saving || (!githubToken && !vercelToken)}
                                    variant="primary"
                                    size="lg"
                                    fullWidth
                                >
                                    {saving ? 'Salvando…' : bothSaved ? 'Ativar minha conta' : 'Salvar chaves'}
                                </Button>
                            )}

                            {saveStatus === 'error' && (
                                <div className="mt-3">
                                    <Banner tone="error" icon={<AlertCircle className="w-5 h-5" />}>
                                        {saveMsg}
                                    </Banner>
                                </div>
                            )}
                        </div>
                    </form>
                </div>
            )}

            {/* ── CONTA ─────────────────────────────────────────────────── */}
            {activeTab === 'acesso' && (
                <Card padding="lg">
                    <div className="space-y-5">
                        <div>
                            <h3 className="font-display text-xl font-normal text-carvao-quente tracking-tight">
                                Dados da conta
                            </h3>
                            <p className="text-sm text-cafe-medio mt-1">
                                Altere a senha que você usa pra entrar na plataforma.
                            </p>
                        </div>

                        <form onSubmit={handleUpdateAccess} className="space-y-4">
                            <Field label="E-mail" htmlFor="email">
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    disabled
                                />
                            </Field>

                            <Field
                                label="Nova senha"
                                htmlFor="password"
                                helper="Mínimo 6 caracteres"
                            >
                                <Input
                                    id="password"
                                    type="password"
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="••••••"
                                />
                            </Field>

                            {authStatus && (
                                <Banner tone={authStatus.tone}>
                                    {authStatus.msg}
                                </Banner>
                            )}

                            <Button
                                type="submit"
                                disabled={authLoading}
                                variant="primary"
                            >
                                {authLoading ? 'Atualizando…' : 'Atualizar senha'}
                            </Button>
                        </form>
                    </div>
                </Card>
            )}

        </div>
    );
}
