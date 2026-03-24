import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';

export default function UpdatePassword() {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        // Verifica na montagem se há um hash de sessão do email
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setError('Parce que o seu link de recuperação é inválido ou já expirou. Volte e solicite um novo!');
            }
        });

        // Supabase escuta o hash dinâmico da URL (type=recovery) para injetar a sessão
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'PASSWORD_RECOVERY') {
                setError('');
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleUpdate = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            setSuccess('Senha atualizada com sucesso! Redirecionando...');
            setTimeout(() => {
                window.location.href = '/sites';
            }, 2500);
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro ao redefinir a senha');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-[#7c3aed]">
                    Definir Nova Senha
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Insira a sua nova senha privativa de acesso ao painel
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form className="space-y-6" onSubmit={handleUpdate}>
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
                            <label className="block text-sm font-medium text-gray-700">Nova Senha</label>
                            <div className="mt-1">
                                <input
                                    type="password"
                                    required
                                    placeholder="********"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#7c3aed] focus:border-[#7c3aed] sm:text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading || !!error}
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#7c3aed] hover:bg-[#6d28d9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7c3aed] disabled:opacity-50 transition"
                            >
                                {loading ? 'Carregando...' : 'Salvar Senha e Entrar'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 flex justify-center">
                        <a href="/" className="text-sm font-medium text-gray-500 hover:text-gray-700">
                            Voltar para o Login
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
