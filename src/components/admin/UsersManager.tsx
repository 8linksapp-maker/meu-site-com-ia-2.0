import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';

export default function UsersManager() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');
    const [githubToken, setGithubToken] = useState('');
    const [vercelToken, setVercelToken] = useState('');
    const [hasUpsellSites, setHasUpsellSites] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [actionStatus, setActionStatus] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const getAuthToken = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || '';
    };

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const token = await getAuthToken();
            const res = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Erro ao carregar usuários');
            }
            const data = await res.json();
            setUsers(data || []);
        } catch (err: any) {
            console.error(err);
            alert(err.message);
        }
        setLoading(false);
    };

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();
        setActionStatus('Processando...');

        try {
            const token = await getAuthToken();
            const payload = {
                id: editId,
                email,
                password: password || undefined,
                role,
                github_token: githubToken,
                vercel_token: vercelToken,
                has_upsell_sites: hasUpsellSites
            };

            const method = editId ? 'PUT' : 'POST';

            const res = await fetch('/api/admin/users', {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao salvar');

            setActionStatus('Sucesso!');
            setTimeout(() => {
                closeModal();
            }, 1000);
            fetchUsers();
        } catch (err: any) {
            setActionStatus('Erro: ' + err.message);
        }
    };

    const handleDelete = async (id: string, userEmail: string) => {
        if (!confirm(`TEM CERTEZA? A conta de Auth e o Perfil de ${userEmail} serão DELETADOS permanentemente!`)) return;

        try {
            const token = await getAuthToken();
            const res = await fetch('/api/admin/users', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ id })
            });

            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Erro ao deletar');
            }

            fetchUsers();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const openModal = (u?: any) => {
        setActionStatus('');
        if (u) {
            setEditId(u.id);
            setEmail(u.email);
            setPassword(''); // Mantém em branco, só envia se quiser alterar
            setRole(u.role);
            setGithubToken(u.github_token);
            setVercelToken(u.vercel_token);
            setHasUpsellSites(u.has_upsell_sites || false);
        } else {
            setEditId(null);
            setEmail('');
            setPassword('');
            setRole('user');
            setGithubToken('');
            setVercelToken('');
            setHasUpsellSites(false);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Gerenciar Usuários Completo (Auth + Profiles)</h3>
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar por email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-[#7c3aed] focus:border-[#7c3aed] outline-none"
                        />
                        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="px-4 py-2 bg-[#7c3aed] text-white text-sm font-medium rounded-md hover:bg-[#6d28d9] transition"
                    >
                        Adicionar Novo
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-600">
                        <tr>
                            <th className="px-6 py-4 font-medium">Email</th>
                            <th className="px-6 py-4 font-medium">Cargo (Role)</th>
                            <th className="px-6 py-4 font-medium">Integrações Salvas</th>
                            <th className="px-6 py-4 font-medium text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-4 text-center">Carregando usuários do Auth...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-4 text-center">Nenhum usuário encontrado.</td></tr>
                        ) : (
                            users
                                .filter(u => u.email.toLowerCase().includes(searchQuery.toLowerCase()))
                                .map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-900 font-medium">
                                            {user.email}
                                            <div className="text-gray-400 font-mono text-xs font-normal mt-1">{user.id}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-[#7c3aed]/10 text-[#7c3aed]' : 'bg-gray-100 text-gray-600'}`}>
                                                {user.role || 'user'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {user.github_token ? 'Github ✅' : 'Github ❌'} <br />
                                            {user.vercel_token ? 'Vercel ✅' : 'Vercel ❌'} <br />
                                            {user.has_upsell_sites ? 'Upsell Sites ✅' : 'Upsell Sites ❌'}
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-3">
                                            <button
                                                onClick={() => openModal(user)}
                                                className="text-blue-600 hover:underline"
                                            >
                                                Editar Completo
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id, user.email)}
                                                className="text-red-500 hover:underline"
                                            >
                                                Excluir (Auth)
                                            </button>
                                        </td>
                                    </tr>
                                ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 relative max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            {editId ? 'Editar Conta (Auth + Profile)' : 'Criar Nova Conta'}
                        </h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    disabled={!!editId} // Não trocar email após criado pra evitar erro complexo
                                    onChange={e => setEmail(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#7c3aed] focus:border-[#7c3aed] sm:text-sm disabled:bg-gray-100"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    Senha {editId && <span className="text-xs text-blue-600 font-normal">(Deixe vazio para não trocar)</span>}
                                </label>
                                <input
                                    type="text"
                                    required={!editId}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#7c3aed] focus:border-[#7c3aed] sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cargo (Role)</label>
                                <select
                                    value={role}
                                    onChange={e => setRole(e.target.value)}
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#7c3aed] focus:border-[#7c3aed] sm:text-sm"
                                >
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div className="pt-4 border-t border-gray-200">
                                <h4 className="text-sm font-medium text-gray-900 mb-2">Tokens (Opcional)</h4>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600">Github</label>
                                    <input type="password" value={githubToken} onChange={e => setGithubToken(e.target.value)} className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md text-sm mb-2" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-600">Vercel</label>
                                    <input type="password" value={vercelToken} onChange={e => setVercelToken(e.target.value)} className="mt-1 block w-full px-2 py-1 border border-gray-300 rounded-md text-sm" />
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="has_upsell"
                                        checked={hasUpsellSites}
                                        onChange={e => setHasUpsellSites(e.target.checked)}
                                        className="rounded border-gray-300 text-[#7c3aed] focus:ring-[#7c3aed]"
                                    />
                                    <label htmlFor="has_upsell" className="text-sm font-bold text-gray-700">Liberar Gerenciador Pro (Sites)</label>
                                </div>
                            </div>

                            {actionStatus && (
                                <div className={`p-2 text-sm rounded ${actionStatus.includes('Erro') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                    {actionStatus}
                                </div>
                            )}

                            <div className="flex gap-3 justify-end mt-6">
                                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
                                <button type="submit" className="px-4 py-2 text-sm bg-[#7c3aed] text-white rounded-md">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
