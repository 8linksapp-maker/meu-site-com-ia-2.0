import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TutorialBlockBySlug } from './ui/TutorialBlock';
import { Eye, EyeOff, CheckCircle2, Loader2, AlertCircle, ArrowRight, Check } from 'lucide-react';

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
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => { checkTokens(); }, []);

    async function checkTokens() {
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

    function handleNextStep() {
        setError('');
        if (!githubToken.trim()) {
            setError('Cole o token do GitHub para continuar.');
            return;
        }
        if (!githubToken.startsWith('github_pat_') && !githubToken.startsWith('ghp_')) {
            setError('Token inválido. Deve começar com github_pat_ ou ghp_');
            return;
        }
        setStep(2);
    }

    async function handleSave() {
        setError('');
        if (!vercelToken.trim()) {
            setError('Cole o token da Vercel para continuar.');
            return;
        }
        setSaving(true);

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
            setError(`Erro ao salvar: ${err.message}`);
            setSaving(false);
            return;
        }

        // Verifica se realmente salvou
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

            <div className="relative w-full max-w-xl my-auto bg-white rounded-[28px] shadow-2xl overflow-hidden">

                {/* ── HEADER ── */}
                <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 px-7 pt-7 pb-6">
                    {/* Dot pattern */}
                    <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '18px 18px' }} />

                    <div className="relative flex items-start justify-between gap-4 mb-5">
                        <div>
                            <p className="text-[10px] font-black text-[#7c3aed] uppercase tracking-[0.18em] mb-1">
                                Configuração Inicial — 1 vez só
                            </p>
                            <h2 className="text-white font-black text-xl leading-tight">
                                {step === 1 ? 'Conecte seu GitHub' : 'Conecte sua Vercel'}
                            </h2>
                            <p className="text-gray-500 text-xs mt-1.5 leading-relaxed max-w-sm">
                                {step === 1
                                    ? 'Siga o vídeo abaixo para criar seu token do GitHub com as permissões certas.'
                                    : 'Agora crie o token da Vercel. Leva menos de 1 minuto.'}
                            </p>
                        </div>
                        <div className="shrink-0 pt-0.5">
                            <Stepper step={step} />
                        </div>
                    </div>
                </div>

                {/* ── BODY ── */}
                <div className="px-7 py-6 space-y-5">

                    {/* Tutorial Block */}
                    <TutorialBlockBySlug slug={step === 1 ? 'github-token' : 'vercel-token'} />

                    {/* Token input */}
                    <div className="space-y-2">
                        <label className={`flex items-center gap-2 text-xs font-black uppercase tracking-wide ${
                            step === 1 ? 'text-gray-700' : 'text-gray-700'
                        }`}>
                            {step === 1
                                ? <><GithubIcon className="w-3.5 h-3.5 text-gray-600" /> Token do GitHub</>
                                : <><VercelIcon className="w-3.5 h-3.5 text-gray-600" /> Token da Vercel</>
                            }
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

                        {step === 1 && (
                            <p className="text-[10px] text-gray-400">
                                Permissões necessárias:{' '}
                                <span className="font-mono text-gray-600">Contents, Metadata, Administration</span>
                            </p>
                        )}
                        {step === 2 && (
                            <p className="text-[10px] text-gray-400">
                                Scope: <span className="font-mono text-gray-600">Full Account</span> — Sem expiração
                            </p>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                            <p className="text-xs text-red-600 font-semibold">{error}</p>
                        </div>
                    )}

                    {/* CTA */}
                    {step === 1 ? (
                        <button
                            type="button"
                            onClick={handleNextStep}
                            className="w-full py-3.5 rounded-2xl font-black text-sm bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            Próximo — Conectar Vercel
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving || success}
                            className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 ${
                                success
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                                    : 'bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-lg shadow-purple-500/20'
                            }`}
                        >
                            {success ? (
                                <><CheckCircle2 className="w-4 h-4" /> Configurado! Abrindo plataforma...</>
                            ) : saving ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                            ) : (
                                'Salvar e Começar a Usar'
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
                </div>
            </div>
        </div>
    );
}
