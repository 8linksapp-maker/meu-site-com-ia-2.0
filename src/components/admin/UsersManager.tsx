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
    const [searchQuery, setSearchQuery] = useState('');
    const [actionStatus, setActionStatus] = useState('');

    const [availableCourses, setAvailableCourses] = useState<any[]>([]);
    const [userCoursesData, setUserCoursesData] = useState<{ course_id: string, expires_at: string | null }[]>([]);

    useEffect(() => {
        fetchUsers();
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            const { data, error } = await supabase.from('courses').select('id, title');
            if (!error && data) setAvailableCourses(data);
        } catch (err) {
            console.error('Erro ao buscar cursos', err);
        }
    };

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
                user_courses: userCoursesData
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
            setPassword('');
            setRole(u.role);
            setGithubToken(u.github_token);
            setVercelToken(u.vercel_token);

            const mappedCourses = u.accesses?.map((acc: any) => ({
                course_id: acc.course_id,
                expires_at: acc.period_end ? new Date(acc.period_end).toISOString().split('T')[0] : null
            })) || [];
            setUserCoursesData(mappedCourses);
        } else {
            setEditId(null);
            setEmail('');
            setPassword('');
            setRole('user');
            setGithubToken('');
            setVercelToken('');
            setUserCoursesData([]);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Gerenciar Usuários Completo</h3>
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
                            <th className="px-6 py-4 font-medium">Integrações & Produtos</th>
                            <th className="px-6 py-4 font-medium text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-4 text-center">Carregando usuários...</td></tr>
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
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {user.github_token ? <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 text-[10px]">Github ✅</span> : <span className="text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 text-[10px]">Github ❌</span>}
                                                    {user.vercel_token ? <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 text-[10px]">Vercel ✅</span> : <span className="text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 text-[10px]">Vercel ❌</span>}
                                                </div>
                                                <div className="flex flex-col gap-1">
                                                    {user.accesses && user.accesses.length > 0 ? (
                                                        user.accesses.map((acc: any, i: number) => (
                                                            <div key={i} className="flex flex-col bg-slate-50 p-1 rounded-lg border border-slate-100">
                                                                <span className="text-[10px] font-black text-slate-700 truncate max-w-[150px]">
                                                                    {acc.product_name || 'Produto'}
                                                                </span>
                                                                <span className="text-[9px] text-slate-500">
                                                                    {acc.status === 'active' ? 'Ativo' : 'Inativo'} | Exp: {acc.period_end ? new Date(acc.period_end).toLocaleDateString() : 'Sem data'}
                                                                </span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="text-[10px] text-gray-400 italic">Sem acessos registrados</span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-3">
                                            <button onClick={() => openModal(user)} className="text-blue-600 hover:underline">Editar</button>
                                            <button onClick={() => handleDelete(user.id, user.email)} className="text-red-500 hover:underline">Excluir</button>
                                        </td>
                                    </tr>
                                ))
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 relative">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            {editId ? 'Editar Usuário' : 'Criar Usuário'}
                        </h3>
                        <form onSubmit={handleSave} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <input type="email" required value={email} disabled={!!editId} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Senha</label>
                                <input type="text" required={!editId} value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cargo</label>
                                <select value={role} onChange={e => setRole(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                                    <option value="user">User</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                            <div className="pt-4 border-t">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Integrações</label>
                                <div className="space-y-2">
                                    <input type="password" placeholder="GitHub Token" value={githubToken} onChange={e => setGithubToken(e.target.value)} className="block w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm" />
                                    <input type="password" placeholder="Vercel Token" value={vercelToken} onChange={e => setVercelToken(e.target.value)} className="block w-full px-2 py-1.5 border border-gray-300 rounded-md text-sm" />
                                </div>
                            </div>
                            <div className="pt-4 border-t">
                                <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Liberação de Cursos</label>
                                <div className="space-y-3 max-h-48 overflow-y-auto pr-2 mb-4">
                                    {availableCourses.map(course => {
                                        const isSelected = userCoursesData.some(c => c.course_id === course.id);
                                        const currentConfig = userCoursesData.find(c => c.course_id === course.id);
                                        return (
                                            <div key={course.id} className="flex flex-col gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setUserCoursesData(prev => [...prev, { course_id: course.id, expires_at: null }]);
                                                            } else {
                                                                setUserCoursesData(prev => prev.filter(c => c.course_id !== course.id));
                                                            }
                                                        }}
                                                        className="w-4 h-4 text-[#7c3aed] border-gray-300 rounded focus:ring-[#7c3aed]"
                                                    />
                                                    <span className="text-sm font-medium text-gray-800">{course.title}</span>
                                                </div>
                                                {isSelected && (
                                                    <div className="pl-7">
                                                        <label className="block text-[10px] text-gray-500 mb-1">Expira em (opcional):</label>
                                                        <input
                                                            type="date"
                                                            value={currentConfig?.expires_at || ''}
                                                            onChange={(e) => {
                                                                setUserCoursesData(prev => prev.map(c =>
                                                                    c.course_id === course.id ? { ...c, expires_at: e.target.value || null } : c
                                                                ));
                                                            }}
                                                            className="block w-full px-2 py-1 text-xs border border-gray-300 rounded-md bg-white text-gray-700 font-mono"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                    {availableCourses.length === 0 && <span className="text-xs text-gray-500">Nenhum curso cadastrado ainda.</span>}
                                </div>
                            </div>

                            {actionStatus && <div className="text-xs p-2 bg-gray-50 rounded text-center font-bold text-[#7c3aed]">{actionStatus}</div>}
                            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
                                <button type="submit" className="px-4 py-2 text-sm bg-[#7c3aed] text-white rounded-md font-bold">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
