import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, CheckCircle2, AlertCircle, Loader2, Zap } from 'lucide-react';

export default function UpdatePassword() {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setError('expired');
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'PASSWORD_RECOVERY') {
                setError('');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleUpdate = async (e: FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            setError('A senha precisa ter pelo menos 6 caracteres.');
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            setSuccess('Senha criada com sucesso! Entrando na plataforma...');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Erro ao definir a senha. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    const isExpired = error === 'expired';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4">
            <div className="mx-auto w-full max-w-md">

                {/* Logo */}
                <div className="flex items-center justify-center gap-2.5 mb-8">
                    <div className="w-9 h-9 rounded-xl bg-[#7c3aed] flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <Zap className="w-5 h-5 text-white fill-white" />
                    </div>
                    <span className="text-gray-900 font-black text-lg">Meu Site Com IA</span>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] px-8 py-6 text-center">
                        <h2 className="text-white font-black text-xl">
                            {isExpired ? 'Link expirado' : 'Crie sua senha de acesso'}
                        </h2>
                        <p className="text-white/70 text-sm mt-1">
                            {isExpired
                                ? 'O link de acesso não é mais válido.'
                                : 'Defina uma senha para entrar na plataforma sempre que quiser.'}
                        </p>
                    </div>

                    <div className="p-8">

                        {isExpired ? (
                            <div className="space-y-4">
                                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-bold text-amber-800 mb-1">Seu link expirou ou já foi usado</p>
                                        <p className="text-xs text-amber-600">Solicite um novo link de acesso na tela de login usando a opção "Primeiro acesso".</p>
                                    </div>
                                </div>
                                <a
                                    href="/"
                                    className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#7c3aed] hover:bg-[#6d28d9] transition shadow-lg shadow-purple-500/20"
                                >
                                    Ir para o Login
                                </a>
                            </div>
                        ) : (
                            <form className="space-y-5" onSubmit={handleUpdate}>
                                {error && error !== 'expired' && (
                                    <div className="flex items-start gap-2.5 p-4 bg-red-50 border border-red-100 rounded-xl">
                                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                                        <p className="text-sm text-red-700 font-medium">{error}</p>
                                    </div>
                                )}
                                {success && (
                                    <div className="flex items-start gap-2.5 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                        <p className="text-sm text-emerald-700 font-medium">{success}</p>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Crie sua senha</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                                        <input
                                            type="password"
                                            required
                                            minLength={6}
                                            placeholder="Mínimo 6 caracteres"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/25 focus:border-[#7c3aed] transition"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400">Essa senha será usada para acessar a plataforma.</p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !!success}
                                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-black text-white bg-[#7c3aed] hover:bg-[#6d28d9] transition shadow-lg shadow-purple-500/20 disabled:opacity-60"
                                >
                                    {loading ? (
                                        <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                                    ) : success ? (
                                        <><CheckCircle2 className="w-4 h-4" /> Entrando...</>
                                    ) : (
                                        'Criar Senha e Entrar'
                                    )}
                                </button>
                            </form>
                        )}

                        {!isExpired && (
                            <div className="mt-6 text-center">
                                <a href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline">
                                    Voltar para o Login
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
