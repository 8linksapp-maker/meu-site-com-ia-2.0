import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';

export default function ConfigSettings() {
    const [activeTab, setActiveTab] = useState<'acesso' | 'integracao'>('acesso');
    const [githubToken, setGithubToken] = useState('');
    const [vercelToken, setVercelToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [authStatus, setAuthStatus] = useState('');

    useEffect(() => {
        loadProfile();
        const searchParams = new URLSearchParams(window.location.search);
        const tab = searchParams.get('tab');
        if (tab === 'integracao' || tab === 'acesso') {
            setActiveTab(tab);
        }
    }, []);

    const loadProfile = async () => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (!user) return;

            setEmail(user.email || '');

            const { data, error } = await supabase
                .from('profiles')
                .select('github_token, vercel_token')
                .eq('id', user.id)
                .order('updated_at', { ascending: false })
                .limit(1);

            if (data && data.length > 0) {
                setGithubToken(data[0].github_token || '');
                setVercelToken(data[0].vercel_token || '');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateAccess = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthStatus('Atualizando a senha...');
        try {
            if (!newPassword) {
                setAuthStatus('Digite uma nova senha para atualizar.');
                setAuthLoading(false);
                return;
            }

            const { error } = await supabase.auth.updateUser({ password: newPassword });

            if (error) throw error;
            setAuthStatus('Sua senha foi atualizada com sucesso!');
            setNewPassword('');
        } catch (err: any) {
            setAuthStatus(`Erro: ${err.message}`);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleSaveTokens = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus('Salvando...');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não logado');

            // Usar .update() em vez de .upsert() para evitar erro de product_id null
            // Isso atualizará os tokens em todos os perfis/produtos do usuário simultaneamente
            const { error } = await supabase
                .from('profiles')
                .update({
                    github_token: githubToken,
                    vercel_token: vercelToken,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            if (error) throw error;
            setStatus('Tokens salvos com sucesso!');
        } catch (err: any) {
            setStatus(`Erro: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('acesso')}
                    className={`px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'acesso' ? 'text-[#7c3aed] border-b-2 border-[#7c3aed]' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Acesso
                </button>
                <button
                    onClick={() => setActiveTab('integracao')}
                    className={`px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'integracao' ? 'text-[#7c3aed] border-b-2 border-[#7c3aed]' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    Integração
                </button>
            </div>

            <div className="p-6">
                {activeTab === 'acesso' && (
                    <form className="text-left max-w-md space-y-4" onSubmit={handleUpdateAccess}>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Configurações de Acesso</h3>
                        <p className="text-sm text-gray-500 mb-6">Redefina a sua senha de acesso ao painel abaixo.</p>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">E-mail da Conta</label>
                            <input
                                type="email"
                                value={email}
                                disabled
                                className="mt-1 block w-full px-3 py-2 border border-gray-200 rounded-md shadow-sm sm:text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nova Senha (deixe em branco para não alterar)</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="********"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#7c3aed] focus:border-[#7c3aed] sm:text-sm"
                            />
                        </div>

                        {authStatus && (
                            <div className={`p-3 rounded-md text-sm ${authStatus.includes('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                {authStatus}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={authLoading}
                            className="mt-4 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-900 hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 transition"
                        >
                            {authLoading ? 'Atualizando...' : 'Atualizar Dados de Acesso'}
                        </button>
                    </form>
                )}

                {activeTab === 'integracao' && (
                    <form className="text-left max-w-md space-y-4" onSubmit={handleSaveTokens}>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Tokens de Integração</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Estes tokens são necessários para clonar o repositório no seu Github e realizar o deploy automático na Vercel.
                        </p>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Github Token (Personal Access Token)</label>
                            <input
                                type="password"
                                value={githubToken}
                                onChange={(e) => setGithubToken(e.target.value)}
                                placeholder="ghp_..."
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#7c3aed] focus:border-[#7c3aed] sm:text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Vercel Token</label>
                            <input
                                type="password"
                                value={vercelToken}
                                onChange={(e) => setVercelToken(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#7c3aed] focus:border-[#7c3aed] sm:text-sm"
                            />
                        </div>

                        {status && (
                            <div className={`p-3 rounded-md text-sm ${status.includes('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                {status}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-4 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#7c3aed] hover:bg-[#6d28d9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7c3aed] disabled:opacity-50"
                        >
                            {loading ? 'Salvando...' : 'Salvar Tokens'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
