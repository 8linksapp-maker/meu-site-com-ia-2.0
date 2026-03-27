import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [mode, setMode] = useState<'login' | 'magic_link' | 'recovery'>('login');

    useEffect(() => {
        // Verifica se já existe uma sessão ao carregar
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                window.location.href = '/sites';
            }
        });

        // Escuta mudanças (ex: quando o link mágico é validado)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (session && event === 'SIGNED_IN') {
                window.location.href = '/sites';
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleAuth = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            if (mode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                window.location.href = '/sites';
            } else if (mode === 'magic_link') {
                const { error } = await supabase.auth.signInWithOtp({ email });
                if (error) throw error;
                setSuccess('Se o e-mail existir, enviamos o Magic Link de acesso na sua caixa de entrada!');
            } else if (mode === 'recovery') {
                const { error } = await supabase.auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/update-password`
                });
                if (error) throw error;
                setSuccess('Enviamos uma redefinição de Senha para sua caixa de entrada!');
            }
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-[#7c3aed]">
                    Meu Site Com IA
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Faça login para gerenciar seus sites e templates
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleAuth}>
                        {error && (
                            <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                                {error}
                            </div>
                        )}
                        {success && (
                            <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm">
                                {success}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <div className="mt-1">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#7c3aed] focus:border-[#7c3aed] sm:text-sm"
                                />
                            </div>
                        </div>

                        {mode === 'login' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Senha</label>
                                <div className="mt-1">
                                    <input
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#7c3aed] focus:border-[#7c3aed] sm:text-sm"
                                    />
                                </div>
                                <div className="mt-2 text-right">
                                    <button
                                        type="button"
                                        onClick={() => { setMode('recovery'); setSuccess(''); setError(''); }}
                                        className="text-sm font-medium text-[#7c3aed] hover:text-[#6d28d9] transition-colors"
                                    >
                                        Esqueci minha senha
                                    </button>
                                </div>
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#7c3aed] hover:bg-[#6d28d9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7c3aed] disabled:opacity-50 transition"
                            >
                                {loading ? 'Carregando...' : mode === 'login' ? 'Entrar' : mode === 'magic_link' ? 'Enviar Link de Acesso' : 'Enviar Redefinição de Senha'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6">
                        <div className="flex flex-col gap-3">
                            {mode !== 'login' && (
                                <button
                                    type="button"
                                    onClick={() => { setMode('login'); setSuccess(''); setError(''); }}
                                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition"
                                >
                                    Voltar para Login
                                </button>
                            )}

                            {mode === 'login' && (
                                <button
                                    type="button"
                                    onClick={() => { setMode('magic_link'); setSuccess(''); setError(''); }}
                                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-[#7c3aed] bg-white hover:bg-gray-50 transition"
                                >
                                    Entrar sem senha
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
