import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
    Check, Eye, EyeOff, Shield, Zap, ArrowRight,
    Info, AlertCircle, CheckCircle2, Lock, Settings2
} from 'lucide-react';
import { TutorialBlockBySlug } from './ui/TutorialBlock';

// ── SVG ICONS ─────────────────────────────────────────────────────────
function VercelIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 22.525H0l12-21.05 12 21.05z" />
        </svg>
    );
}

function GithubIcon({ className = 'w-5 h-5' }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
        </svg>
    );
}

// ── STEP CARD ─────────────────────────────────────────────────────────
function StepCard({
    step, title, icon, isComplete, isCurrent, children,
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
        // Só auto-abre quando este step se torna o atual (false → true)
        // Nunca força fechamento — respeita o toggle manual do usuário
        if (isCurrent && !prevIsCurrent.current) setOpen(true);
        prevIsCurrent.current = isCurrent;
    }, [isCurrent]);

    return (
        <div className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
            isComplete
                ? 'border-emerald-200 bg-emerald-50/40'
                : isCurrent
                    ? 'border-[#7c3aed]/25 bg-white shadow-sm shadow-purple-100'
                    : 'border-gray-100 bg-white opacity-60'
        }`}>
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center gap-4 p-5 text-left"
            >
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all ${
                    isComplete
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                            ? 'bg-[#7c3aed] text-white shadow-md shadow-purple-200'
                            : 'bg-gray-100 text-gray-400'
                }`}>
                    {isComplete ? <Check className="w-5 h-5" /> : icon}
                </div>

                <div className="flex-1 min-w-0">
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${
                        isComplete ? 'text-emerald-600' : isCurrent ? 'text-[#7c3aed]' : 'text-gray-400'
                    }`}>
                        Passo {step} de 2
                    </p>
                    <p className={`font-black text-sm ${isComplete || isCurrent ? 'text-gray-900' : 'text-gray-400'}`}>
                        {title}
                    </p>
                </div>

                {isComplete && (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full shrink-0 border border-emerald-200">
                        Configurado ✓
                    </span>
                )}
                {!isComplete && !isCurrent && (
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-400 text-[10px] font-bold rounded-full shrink-0">
                        Pendente
                    </span>
                )}
            </button>

            {open && (
                <div className="px-5 pb-6 pt-1">
                    {children}
                </div>
            )}
        </div>
    );
}

// ── TOKEN INPUT ───────────────────────────────────────────────────────
function TokenInput({
    value, onChange, placeholder, isValid,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    isValid: boolean;
}) {
    const [show, setShow] = useState(false);
    return (
        <div className="relative">
            <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={`w-full pr-20 pl-4 py-2.5 rounded-xl border text-sm font-mono transition-all outline-none ${
                    isValid
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'
                        : value
                            ? 'border-amber-300 bg-amber-50/50 text-amber-800 focus:border-[#7c3aed] focus:ring-2 focus:ring-purple-100'
                            : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-[#7c3aed] focus:ring-2 focus:ring-purple-100'
                }`}
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {isValid && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                <button
                    type="button"
                    onClick={() => setShow(s => !s)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
            </div>
        </div>
    );
}

// ── MAIN ──────────────────────────────────────────────────────────────
export default function ConfigSettings() {
    const [activeTab, setActiveTab] = useState<'acesso' | 'integracao'>('acesso');

    const [githubToken, setGithubToken] = useState('');
    const [vercelToken, setVercelToken] = useState('');
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [saveMsg, setSaveMsg] = useState('');

    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authStatus, setAuthStatus] = useState('');

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
            setSaveMsg('Tokens salvos! Agora você pode criar seus sites.');
        } catch (err: any) {
            setSaveStatus('error');
            setSaveMsg(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword) { setAuthStatus('Digite uma nova senha.'); return; }
        setAuthLoading(true);
        setAuthStatus('Atualizando...');
        try {
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            if (error) throw error;
            setAuthStatus('Senha atualizada com sucesso!');
            setNewPassword('');
        } catch (err: any) {
            setAuthStatus(`Erro: ${err.message}`);
        } finally {
            setAuthLoading(false);
        }
    };

    return (
        <div className="max-w-2xl space-y-1">

            {/* TABS */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl w-fit mb-6">
                {(['integracao', 'acesso'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                            activeTab === tab
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab === 'integracao' ? (
                            <span className="flex items-center gap-2">
                                <Zap className="w-3.5 h-3.5" />
                                Integração
                                {!bothSaved && <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />}
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Lock className="w-3.5 h-3.5" />
                                Conta
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* INTEGRAÇÃO */}
            {activeTab === 'integracao' && (
                <div className="space-y-4">
                    <div className="flex gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-700 leading-relaxed">
                            Para publicar sites automaticamente, a plataforma precisa de acesso ao seu GitHub (para criar o repositório) e à Vercel (para fazer o deploy). Configure abaixo — é feito uma vez só.
                        </p>
                    </div>

                    <form onSubmit={handleSaveTokens} className="space-y-4">

                        {/* PASSO 1 — GITHUB */}
                        <StepCard
                            step={1}
                            title="Token do GitHub"
                            icon={<GithubIcon className="w-5 h-5" />}
                            isComplete={githubValid}
                            isCurrent={currentStep === 1}
                        >
                            <div className="space-y-4">
                                <TutorialBlockBySlug slug="github-token" />

                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-2.5">
                                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-700">
                                        <strong>Atenção:</strong> O token só aparece uma vez. Copie logo após gerar e cole abaixo antes de fechar a página.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-600">Seu token do GitHub</label>
                                    <TokenInput
                                        value={githubToken}
                                        onChange={setGithubToken}
                                        placeholder="github_pat_... ou ghp_..."
                                        isValid={githubValid}
                                    />
                                    {githubValid && (
                                        <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                                            <Check className="w-3 h-3" /> Token detectado — bom trabalho!
                                        </p>
                                    )}
                                </div>
                            </div>
                        </StepCard>

                        {/* PASSO 2 — VERCEL */}
                        <StepCard
                            step={2}
                            title="Token da Vercel"
                            icon={<VercelIcon className="w-5 h-5" />}
                            isComplete={vercelValid}
                            isCurrent={currentStep === 2}
                        >
                            <div className="space-y-4">
                                <TutorialBlockBySlug slug="vercel-token" />

                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-2.5">
                                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-700">
                                        <strong>Atenção:</strong> O token da Vercel também só aparece uma vez. Copie imediatamente após criar.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-600">Seu token da Vercel</label>
                                    <TokenInput
                                        value={vercelToken}
                                        onChange={setVercelToken}
                                        placeholder="Cole aqui o token da Vercel..."
                                        isValid={vercelValid}
                                    />
                                    {vercelValid && (
                                        <p className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                                            <Check className="w-3 h-3" /> Token detectado — quase lá!
                                        </p>
                                    )}
                                </div>
                            </div>
                        </StepCard>

                        {/* SAVE */}
                        <div className="pt-1">
                            {saveStatus === 'success' ? (
                                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
                                        <Check className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-black text-emerald-800 text-sm">{saveMsg}</p>
                                        <a href="/sites" className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5 hover:underline">
                                            Criar meu primeiro site agora <ArrowRight className="w-3 h-3" />
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={saving || (!githubToken && !vercelToken)}
                                    className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                                        bothSaved
                                            ? 'bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-lg shadow-purple-200 active:scale-[0.98]'
                                            : 'bg-gray-900 text-white hover:bg-black active:scale-[0.98]'
                                    }`}
                                >
                                    {saving ? (
                                        <>
                                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Salvando...
                                        </>
                                    ) : bothSaved ? (
                                        <>
                                            <Zap className="w-4 h-4" />
                                            Salvar e Ativar Conta
                                        </>
                                    ) : (
                                        <>
                                            <Shield className="w-4 h-4" />
                                            Salvar Tokens
                                        </>
                                    )}
                                </button>
                            )}

                            {saveStatus === 'error' && (
                                <div className="mt-2 flex gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-700">{saveMsg}</p>
                                </div>
                            )}
                        </div>
                    </form>
                </div>
            )}

            {/* CONTA */}
            {activeTab === 'acesso' && (
                <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
                    <div>
                        <h3 className="font-black text-gray-900">Dados da Conta</h3>
                        <p className="text-sm text-gray-500 mt-1">Altere sua senha de acesso à plataforma.</p>
                    </div>

                    <form onSubmit={handleUpdateAccess} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600">E-mail</label>
                            <input
                                type="email"
                                value={email}
                                disabled
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-400 cursor-not-allowed"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-600">Nova Senha</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 transition-all focus:outline-none focus:border-[#7c3aed] focus:ring-2 focus:ring-purple-100"
                            />
                        </div>

                        {authStatus && (
                            <div className={`p-3 rounded-xl text-sm flex gap-2 items-start ${
                                authStatus.includes('Erro')
                                    ? 'bg-red-50 text-red-700 border border-red-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                                {authStatus.includes('Erro')
                                    ? <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    : <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                                }
                                {authStatus}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={authLoading}
                            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all disabled:opacity-50 active:scale-[0.98]"
                        >
                            <Settings2 className="w-4 h-4" />
                            {authLoading ? 'Atualizando...' : 'Atualizar Senha'}
                        </button>
                    </form>
                </div>
            )}

        </div>
    );
}
