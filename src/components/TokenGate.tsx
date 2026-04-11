import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, CheckCircle2, Loader2, AlertCircle, ArrowRight, Check, Play } from 'lucide-react';

// ── ICON HELPERS ─────────────────────────────────────────────────────
function GithubIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
        </svg>
    );
}

function VercelIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
            <path d="M24 22.525H0l12-21.05 12 21.05z" />
        </svg>
    );
}

// ── TOKEN INPUT ───────────────────────────────────────────────────────
function TokenInput({
    value, onChange, placeholder, show, onToggleShow,
}: {
    value: string; onChange: (v: string) => void;
    placeholder: string; show: boolean; onToggleShow: () => void;
}) {
    return (
        <div className="relative">
            <input
                type={show ? 'text' : 'password'}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 bg-gray-50 text-sm font-mono text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed] transition"
            />
            <button
                type="button"
                onClick={onToggleShow}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
        </div>
    );
}

// ── STEPPER ───────────────────────────────────────────────────────────
function Stepper({ step }: { step: 1 | 2 }) {
    const steps = [
        { n: 1, label: 'GitHub', icon: GithubIcon },
        { n: 2, label: 'Vercel', icon: VercelIcon },
    ];
    return (
        <div className="flex items-center gap-0">
            {steps.map((s, i) => {
                const done = step > s.n;
                const active = step === s.n;
                return (
                    <div key={s.n} className="flex items-center">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black transition-all ${
                            done
                                ? 'bg-emerald-100 text-emerald-700'
                                : active
                                    ? 'bg-[#7c3aed] text-white shadow-md shadow-purple-500/25'
                                    : 'bg-gray-100 text-gray-400'
                        }`}>
                            {done
                                ? <Check className="w-3 h-3" />
                                : <s.icon className="w-3 h-3" />
                            }
                            {s.label}
                        </div>
                        {i < steps.length - 1 && (
                            <div className={`w-8 h-px mx-1 ${done ? 'bg-emerald-300' : 'bg-gray-200'}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────
export default function TokenGate() {
    const [visible, setVisible] = useState(false);
    const [step, setStep] = useState<1 | 2>(1);

    const [githubToken, setGithubToken] = useState('');
    const [vercelToken, setVercelToken] = useState('');
    const [showGithub, setShowGithub] = useState(false);
    const [showVercel, setShowVercel] = useState(false);

    const [saving, setSaving] = useState(false);
    const [validating, setValidating] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Tutorial data do Supabase
    const [tutorialVideo, setTutorialVideo] = useState<string | null>(null);
    const [tutorialPoster, setTutorialPoster] = useState<string | null>(null);
    const [tutorialSteps, setTutorialSteps] = useState<string[]>([]);
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => { checkTokens(); }, []);

    useEffect(() => {
        const slug = step === 1 ? 'github-token' : 'vercel-token';
        supabase.from('tutorial_blocks').select('*').eq('slug', slug).maybeSingle()
            .then(({ data }) => {
                if (data) {
                    setTutorialVideo(data.video_url || null);
                    setTutorialPoster(data.video_poster || null);
                    setTutorialSteps(data.steps || []);
                }
            });
    }, [step]);

    async function checkTokens() {
        const skippedAt = localStorage.getItem('tokengate_skipped_at');
        if (skippedAt) {
            const elapsed = Date.now() - Number(skippedAt);
            if (elapsed < 24 * 60 * 60 * 1000) return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
            .from('profiles')
            .select('github_token, vercel_token')
            .eq('id', user.id)
            .limit(1);
        const row = Array.isArray(data) ? data[0] : data;
        if (!(row?.github_token && row?.vercel_token)) {
            setVisible(true);
        }
    }

    function handleSkip() {
        localStorage.setItem('tokengate_skipped', 'true');
        localStorage.setItem('tokengate_skipped_at', String(Date.now()));
        setVisible(false);
    }

    async function handleNextStep() {
        setError('');
        if (!githubToken.trim()) {
            setError('Cole o token do GitHub para continuar.');
            return;
        }
        if (!githubToken.startsWith('github_pat_') && !githubToken.startsWith('ghp_')) {
            setError('Token inválido. Deve começar com github_pat_ ou ghp_');
            return;
        }

        setValidating(true);
        try {
            const ghRes = await fetch('https://api.github.com/user', {
                headers: { Authorization: `Bearer ${githubToken.trim()}` }
            });
            if (!ghRes.ok) {
                setError('Token do GitHub inválido ou sem permissão. Verifique se copiou corretamente e se marcou o escopo "repo".');
                setValidating(false);
                return;
            }
        } catch {
            setError('Não foi possível validar o token. Verifique sua conexão.');
            setValidating(false);
            return;
        }
        setValidating(false);
        setStep(2);
    }

    async function handleSave() {
        setError('');
        if (!vercelToken.trim()) {
            setError('Cole o token da Vercel para continuar.');
            return;
        }
        setSaving(true);

        try {
            const vcRes = await fetch('https://api.vercel.com/v2/user', {
                headers: { Authorization: `Bearer ${vercelToken.trim()}` }
            });
            if (!vcRes.ok) {
                setError('Token da Vercel inválido. Verifique se copiou corretamente e se o escopo é "Full Account".');
                setSaving(false);
                return;
            }
        } catch {
            setError('Não foi possível validar o token da Vercel. Verifique sua conexão.');
            setSaving(false);
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            setError('Sessão expirada. Recarregue a página.');
            setSaving(false);
            return;
        }

        const { error: err } = await supabase
            .from('profiles')
            .update({ github_token: githubToken.trim(), vercel_token: vercelToken.trim() })
            .eq('id', user.id);

        if (err) {
            setError('Erro ao salvar os tokens. Tente novamente.');
            setSaving(false);
            return;
        }

        const { data: checkData } = await supabase
            .from('profiles')
            .select('github_token, vercel_token')
            .eq('id', user.id)
            .limit(1);
        const check = Array.isArray(checkData) ? checkData[0] : checkData;

        if (!check?.github_token || !check?.vercel_token) {
            setError('Os tokens não foram salvos. Verifique as permissões da sua conta e tente novamente.');
            setSaving(false);
            return;
        }

        setSuccess(true);
        setTimeout(() => window.location.href = '/dashboard', 1400);
    }

    if (!visible) return null;

    const stepConfig = step === 1 ? {
        title: 'Conecte seu GitHub',
        subtitle: 'Assista o vídeo e siga os passos ao lado para criar seu token.',
        icon: <GithubIcon className="w-3.5 h-3.5 text-gray-600" />,
        label: 'Cole seu Token do GitHub aqui',
        hint: <>Permissões: <span className="font-mono text-gray-600">Contents, Metadata, Administration</span></>,
    } : {
        title: 'Conecte sua Vercel',
        subtitle: 'Assista o vídeo e siga os passos ao lado para criar seu token.',
        icon: <VercelIcon className="w-3.5 h-3.5 text-gray-600" />,
        label: 'Cole seu Token da Vercel aqui',
        hint: <>Scope: <span className="font-mono text-gray-600">Full Account</span> — Sem expiração</>,
    };

    const isYouTube = tutorialVideo?.includes('youtube') || tutorialVideo?.includes('youtu.be');

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 overflow-y-auto"
            style={{ background: 'rgba(3,7,18,0.82)', backdropFilter: 'blur(14px)' }}
        >
            {/* Decorative orbs */}
            <div className="fixed top-[-120px] left-[-120px] w-[600px] h-[600px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 65%)' }} />
            <div className="fixed bottom-[-120px] right-[-120px] w-[500px] h-[500px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 65%)' }} />

            <div className="relative w-full max-w-5xl my-auto bg-white rounded-[28px] shadow-2xl overflow-hidden">

                {/* ── HEADER ── */}
                <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-7 pt-6 pb-5">
                    <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '18px 18px' }} />
                    <div className="relative flex items-center justify-between gap-4">
                        <div>
                            <p className="text-[10px] font-black text-[#7c3aed] uppercase tracking-[0.18em] mb-1">
                                Configuração Inicial — 1 vez só
                            </p>
                            <h2 className="text-white font-black text-xl leading-tight">
                                {stepConfig.title}
                            </h2>
                        </div>
                        <Stepper step={step} />
                    </div>
                </div>

                {/* ── BODY: LAYOUT LADO A LADO ── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">

                    {/* ESQUERDA (3/5): VÍDEO DIRETO — sem abas */}
                    <div className="lg:col-span-3 bg-gray-950 p-4 lg:p-5 flex flex-col">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-[10px] font-black text-white/60 uppercase tracking-wider">Assista e siga os passos ao lado</span>
                        </div>
                        {tutorialVideo ? (
                            isYouTube ? (
                                <div className="w-full aspect-video rounded-xl overflow-hidden bg-black flex-1">
                                    <iframe
                                        src={tutorialVideo}
                                        className="w-full h-full"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>
                            ) : (
                                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black flex-1 group">
                                    <video
                                        ref={videoRef}
                                        src={tutorialVideo}
                                        poster={tutorialPoster || undefined}
                                        className="w-full h-full object-cover"
                                        controls
                                        playsInline
                                        autoPlay
                                        muted
                                    />
                                </div>
                            )
                        ) : (
                            <div className="w-full aspect-video rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-2 flex-1">
                                <Loader2 className="w-6 h-6 text-white/30 animate-spin" />
                                <p className="text-white/30 text-xs">Carregando tutorial...</p>
                            </div>
                        )}
                    </div>

                    {/* DIREITA (2/5): INSTRUÇÕES + INPUT + BOTÃO */}
                    <div className="lg:col-span-2 p-5 lg:p-6 flex flex-col justify-between border-l border-gray-100 overflow-y-auto max-h-[80vh]">

                        {/* Instruções de texto */}
                        {tutorialSteps.length > 0 && (
                            <div className="mb-4">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Passo a passo</p>
                                <div className="space-y-2">
                                    {tutorialSteps.map((s, i) => (
                                        <div key={i} className="flex gap-2 items-start">
                                            <span className="w-5 h-5 rounded-full bg-[#7c3aed]/10 text-[#7c3aed] text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5 border border-[#7c3aed]/20">
                                                {i + 1}
                                            </span>
                                            <p className="text-xs text-gray-600 leading-relaxed [&_strong]:text-gray-900 [&_a]:text-[#7c3aed] [&_a]:font-bold [&_code]:px-1 [&_code]:bg-gray-100 [&_code]:rounded [&_code]:text-[10px] [&_code]:font-mono" dangerouslySetInnerHTML={{ __html: s }} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Token input */}
                        <div className="space-y-2 mb-4">
                            <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-gray-700">
                                {stepConfig.icon} {stepConfig.label}
                            </label>

                            {step === 1 ? (
                                <TokenInput
                                    value={githubToken}
                                    onChange={setGithubToken}
                                    placeholder="github_pat_..."
                                    show={showGithub}
                                    onToggleShow={() => setShowGithub(v => !v)}
                                />
                            ) : (
                                <TokenInput
                                    value={vercelToken}
                                    onChange={setVercelToken}
                                    placeholder="Cole o token da Vercel aqui..."
                                    show={showVercel}
                                    onToggleShow={() => setShowVercel(v => !v)}
                                />
                            )}

                            <p className="text-[10px] text-gray-400">{stepConfig.hint}</p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl mb-3">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                                <p className="text-xs text-red-600 font-semibold">{error}</p>
                            </div>
                        )}

                        {/* CTAs */}
                        <div className="space-y-2 mt-auto">
                            {step === 1 ? (
                                <button
                                    type="button"
                                    onClick={handleNextStep}
                                    disabled={validating}
                                    className="w-full py-3 rounded-2xl font-black text-sm bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70"
                                >
                                    {validating ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
                                    ) : (
                                        <>Próximo — Vercel <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={saving || success}
                                    className={`w-full py-3 rounded-2xl font-black text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 ${
                                        success
                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                                            : 'bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-lg shadow-purple-500/20'
                                    }`}
                                >
                                    {success ? (
                                        <><CheckCircle2 className="w-4 h-4" /> Configurado!</>
                                    ) : saving ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                                    ) : (
                                        'Salvar e Começar'
                                    )}
                                </button>
                            )}

                            {step === 2 && !success && (
                                <button
                                    type="button"
                                    onClick={() => { setStep(1); setError(''); }}
                                    className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
                                >
                                    ← Voltar ao GitHub
                                </button>
                            )}

                            {!success && (
                                <div className="flex flex-col items-center gap-0.5 pt-2 border-t border-gray-100">
                                    <button
                                        type="button"
                                        onClick={handleSkip}
                                        className="text-[11px] text-gray-400 hover:text-gray-500 transition-colors underline underline-offset-2"
                                    >
                                        Configurar depois
                                    </button>
                                    <p className="text-[9px] text-gray-300">
                                        Disponível em Configurações a qualquer momento
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
