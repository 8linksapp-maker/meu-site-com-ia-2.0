import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Zap, LayoutGrid, Code2, ArrowRight, Loader2, Mail, Lock, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

type Mode = 'login' | 'magic_link' | 'recovery';

// ── BRANDING PANEL (esquerda) ────────────────────────────────────────
function BrandPanel() {
    const features = [
        { icon: Zap, text: 'Publique em minutos, sem escrever código' },
        { icon: LayoutGrid, text: 'Dezenas de templates prontos para deploy' },
        { icon: Code2, text: 'Conecta com GitHub e Vercel automaticamente' },
    ];

    return (
        <div className="relative hidden lg:flex flex-col justify-between bg-gray-950 p-12 overflow-hidden">
            {/* Aurora orbs */}
            <div className="absolute top-[-80px] right-[-80px] w-[420px] h-[420px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.28) 0%, transparent 70%)' }} />
            <div className="absolute bottom-[-60px] left-[-60px] w-[340px] h-[340px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)' }} />
            <div className="absolute top-[45%] left-[30%] w-[200px] h-[200px] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)' }} />

            {/* Dot grid */}
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '22px 22px' }} />

            {/* Content */}
            <div className="relative z-10">
                {/* Logo */}
                <div className="flex items-center gap-3 mb-16">
                    <div className="w-9 h-9 rounded-xl bg-[#7c3aed] flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <Zap className="w-5 h-5 text-white fill-white" />
                    </div>
                    <span className="text-white font-black text-lg">Meu Site Com IA</span>
                </div>

                {/* Headline */}
                <div className="space-y-4 mb-12">
                    <p className="text-[11px] font-black text-[#7c3aed] uppercase tracking-[0.2em]">
                        Plataforma de Sites com IA
                    </p>
                    <h1 className="text-4xl font-black text-white leading-[1.1] tracking-tight">
                        Crie sites<br />
                        <span style={{ background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            profissionais
                        </span><br />
                        com IA.
                    </h1>
                    <p className="text-gray-400 text-base leading-relaxed max-w-xs">
                        Escolha um template, dê um nome e publique. Sem código, sem servidor, sem complicação.
                    </p>
                </div>

                {/* Feature bullets */}
                <div className="space-y-4">
                    {features.map(({ icon: Icon, text }, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center shrink-0">
                                <Icon className="w-4 h-4 text-[#a78bfa]" />
                            </div>
                            <p className="text-gray-300 text-sm">{text}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tech badges */}
            <div className="relative z-10">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest font-bold mb-3">Powered by</p>
                <div className="flex items-center gap-4">
                    {[
                        { label: 'GitHub', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg> },
                        { label: 'Vercel', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M24 22.525H0l12-21.05 12 21.05z"/></svg> },
                        { label: 'Astro', icon: <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M8.358 20.162c-1.186-1.07-1.532-3.316-1.038-4.944.856 1.026 2.043 1.352 3.272 1.535 1.897.275 3.76.17 5.522-.678.202-.098.388-.223.607-.35.104.343.13.689.094 1.04-.18 1.713-1.476 3.032-3.18 3.33-1.06.187-2.083.028-2.879-.42a3.64 3.64 0 01-2.398.487zm1.534-3.425a.852.852 0 00-.765.971c.08.51.554.858 1.06.778a.852.852 0 00.764-.97c-.079-.51-.553-.858-1.059-.779zm5.008-8.162c.356 1.112.086 2.155-.57 3.04l-.002.003c-.654.88-1.64 1.44-2.72 1.595-1.08.155-2.18-.11-3.038-.734-.857-.626-1.363-1.55-1.42-2.597-.056-1.046.34-2.038 1.088-2.744a3.92 3.92 0 012.64-1.054c1.44 0 2.68.77 3.274 1.921.137.264.224.546.262.836l.437-.437c.29-.29.76-.29 1.05 0s.29.76 0 1.05l-.435.434c-.004.196-.027.39-.072.581z"/></svg> },
                    ].map(({ label, icon }) => (
                        <div key={label} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-400 transition-colors">
                            {icon}
                            <span className="text-xs font-semibold">{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────
export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [mode, setMode] = useState<Mode>('login');

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) window.location.href = '/dashboard';
        });
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session && event === 'SIGNED_IN') window.location.href = '/dashboard';
        });
        return () => subscription.unsubscribe();
    }, []);

    const switchMode = (m: Mode) => { setMode(m); setError(''); setSuccess(''); };

    const handleAuth = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                window.location.href = '/dashboard';
            } else if (mode === 'magic_link') {
                const { error } = await supabase.auth.signInWithOtp({ email });
                if (error) throw error;
                setSuccess('Link enviado! Verifique sua caixa de entrada.');
            } else if (mode === 'recovery') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/update-password`,
                });
                if (error) throw error;
                setSuccess('E-mail de redefinição enviado! Verifique sua caixa de entrada.');
            }
        } catch (err: any) {
            const msg = err.message || '';
            if (msg.includes('Invalid login credentials')) setError('E-mail ou senha incorretos.');
            else if (msg.includes('Email not confirmed')) setError('Confirme seu e-mail antes de entrar.');
            else setError(msg || 'Ocorreu um erro. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const titles: Record<Mode, string> = {
        login: 'Bem-vindo de volta',
        magic_link: 'Entrar sem senha',
        recovery: 'Recuperar senha',
    };

    const subtitles: Record<Mode, string> = {
        login: 'Entre na sua conta para acessar a plataforma.',
        magic_link: 'Enviaremos um link de acesso direto para seu e-mail.',
        recovery: 'Informe seu e-mail e enviaremos um link para redefinir sua senha.',
    };

    const ctaLabels: Record<Mode, string> = {
        login: 'Entrar na Plataforma',
        magic_link: 'Enviar Link de Acesso',
        recovery: 'Enviar Link de Redefinição',
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2">

            {/* ── LEFT: Branding ── */}
            <BrandPanel />

            {/* ── RIGHT: Form ── */}
            <div className="flex flex-col min-h-screen lg:min-h-0">

                {/* Mobile logo bar */}
                <div className="lg:hidden flex items-center gap-2.5 px-6 py-5 bg-gray-950 border-b border-white/5">
                    <div className="w-7 h-7 rounded-lg bg-[#7c3aed] flex items-center justify-center">
                        <Zap className="w-4 h-4 text-white fill-white" />
                    </div>
                    <span className="text-white font-black text-base">Meu Site Com IA</span>
                </div>

                {/* Form area */}
                <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
                    <div className="w-full max-w-sm">

                        {/* Heading */}
                        <div className="mb-8">
                            <h2 className="text-2xl font-black text-gray-900">{titles[mode]}</h2>
                            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{subtitles[mode]}</p>
                        </div>

                        {/* Alerts */}
                        {error && (
                            <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-100 rounded-2xl mb-5">
                                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700 font-medium">{error}</p>
                            </div>
                        )}
                        {success && (
                            <div className="flex items-start gap-2.5 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl mb-5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                <p className="text-sm text-emerald-700 font-medium">{success}</p>
                            </div>
                        )}

                        <form onSubmit={handleAuth} className="space-y-4">

                            {/* Email */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">E-mail</label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="seu@email.com"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/25 focus:border-[#7c3aed] transition"
                                    />
                                </div>
                            </div>

                            {/* Password (login only) */}
                            {mode === 'login' && (
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Senha</label>
                                        <button
                                            type="button"
                                            onClick={() => switchMode('recovery')}
                                            className="text-[11px] font-bold text-[#7c3aed] hover:underline"
                                        >
                                            Esqueci minha senha
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            required
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-10 pr-11 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/25 focus:border-[#7c3aed] transition"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(v => !v)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="relative w-full py-3.5 rounded-2xl font-black text-sm text-white overflow-hidden transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20"
                                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
                            >
                                {/* Shimmer */}
                                <span className="absolute inset-0 pointer-events-none"
                                    style={{ background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)', animation: 'shimmerSlide 3s ease-in-out infinite' }} />
                                {loading
                                    ? <><Loader2 className="w-4 h-4 animate-spin relative z-10" /><span className="relative z-10">Aguarde...</span></>
                                    : <><span className="relative z-10">{ctaLabels[mode]}</span><ArrowRight className="w-4 h-4 relative z-10" /></>
                                }
                            </button>
                        </form>

                        {/* Divider + alt actions */}
                        <div className="mt-6 space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-gray-100" />
                                <span className="text-[11px] text-gray-400 font-medium">ou</span>
                                <div className="flex-1 h-px bg-gray-100" />
                            </div>

                            {mode === 'login' && (
                                <button
                                    type="button"
                                    onClick={() => switchMode('magic_link')}
                                    className="w-full py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2"
                                >
                                    <Mail className="w-4 h-4 text-[#7c3aed]" />
                                    Entrar sem senha
                                </button>
                            )}

                            {mode !== 'login' && (
                                <button
                                    type="button"
                                    onClick={() => switchMode('login')}
                                    className="w-full py-3 rounded-2xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-all"
                                >
                                    ← Voltar para o login
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="lg:hidden px-6 py-4 text-center bg-gray-50 border-t border-gray-100">
                    <p className="text-[11px] text-gray-400">
                        Powered by GitHub · Vercel · Astro
                    </p>
                </div>
            </div>

            {/* Shimmer animation */}
            <style>{`
                @keyframes shimmerSlide {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
            `}</style>
        </div>
    );
}
