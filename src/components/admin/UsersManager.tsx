import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Search, UserCircle2 } from 'lucide-react';
import { PageHeader, DataTable, FormModal, StatusBadge } from '../ui/admin';
import Pagination from '../ui/admin/Pagination';
import type { Column } from '../ui/admin';
import { Field, Input } from '../ui';

interface UserAccess {
    course_id: string;
    product_name?: string;
    status?: string;
    period_end?: string | null;
}

interface AdminUser {
    id: string;
    email: string;
    role: string;
    github_token?: string;
    vercel_token?: string;
    accesses?: UserAccess[];
}

interface CourseLite {
    id: string;
    title: string;
}

function getInitials(email: string): string {
    return email.slice(0, 2).toUpperCase();
}

export default function UsersManager() {
    const [users, setUsers] = useState<AdminUser[]>([]);
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
    const [page, setPage] = useState(1);
    const USERS_PAGE_SIZE = 25;
    useEffect(() => { setPage(1); }, [searchQuery]);
    const [saving, setSaving] = useState(false);

    const [availableCourses, setAvailableCourses] = useState<CourseLite[]>([]);
    const [userCoursesData, setUserCoursesData] = useState<{ course_id: string; expires_at: string | null }[]>([]);

    useEffect(() => {
        fetchUsers();
        fetchCourses();
    }, []);

    async function fetchCourses() {
        const { data } = await supabase.from('courses').select('id, title');
        if (data) setAvailableCourses(data as CourseLite[]);
    }

    async function getAuthToken() {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || '';
    }

    async function fetchUsers() {
        setLoading(true);
        try {
            const token = await getAuthToken();
            const res = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Erro ao carregar usuarios');
            }
            const data = await res.json();
            setUsers(data || []);
        } catch (err: unknown) {
            console.error(err);
            alert(err instanceof Error ? err.message : 'Erro carregando usuarios');
        }
        setLoading(false);
    }

    async function handleSave(e: FormEvent) {
        e.preventDefault();
        setSaving(true);
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
                user_courses: userCoursesData,
            };

            const method = editId ? 'PUT' : 'POST';

            const res = await fetch('/api/admin/users', {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao salvar');

            setActionStatus('Salvo.');
            setTimeout(() => closeModal(), 800);
            fetchUsers();
        } catch (err: unknown) {
            setActionStatus('Erro: ' + (err instanceof Error ? err.message : 'falha'));
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(user: AdminUser) {
        if (!confirm('Excluir ' + user.email + ' permanentemente?')) return;
        try {
            const token = await getAuthToken();
            const res = await fetch('/api/admin/users', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ id: user.id }),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error || 'Erro ao deletar');
            }
            fetchUsers();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Erro ao deletar');
        }
    }

    function openModal(u?: AdminUser) {
        setActionStatus('');
        if (u) {
            setEditId(u.id);
            setEmail(u.email);
            setPassword('');
            setRole(u.role);
            setGithubToken(u.github_token || '');
            setVercelToken(u.vercel_token || '');

            const mappedCourses = (u.accesses || []).map(acc => ({
                course_id: acc.course_id,
                expires_at: acc.period_end ? new Date(acc.period_end).toISOString().split('T')[0] : null,
            }));
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
    }

    function closeModal() {
        setIsModalOpen(false);
        setActionStatus('');
    }

    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const paginatedUsers = filteredUsers.slice((page - 1) * USERS_PAGE_SIZE, page * USERS_PAGE_SIZE);

    const columns: Column<AdminUser>[] = [
        {
            key: 'user',
            header: 'Usuario',
            cell: (u) => (
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-coral-terra text-papel-craft text-sm font-semibold flex items-center justify-center shrink-0 tracking-wide">
                        {getInitials(u.email)}
                    </div>
                    <div className="min-w-0">
                        <p className="font-semibold text-carvao-quente truncate">{u.email}</p>
                        <p className="font-mono text-xs text-cafe-cinza-quente truncate">{u.id}</p>
                    </div>
                </div>
            ),
        },
        {
            key: 'role',
            header: 'Cargo',
            cell: (u) => (
                <StatusBadge tone={u.role === 'admin' ? 'active' : 'neutral'}>
                    {u.role || 'user'}
                </StatusBadge>
            ),
        },
        {
            key: 'integrations',
            header: 'Conexoes',
            cell: (u) => (
                <div className="flex items-center gap-2 text-xs">
                    <span className={u.github_token ? 'text-[oklch(40%_0.060_145)] font-semibold' : 'text-cafe-cinza-quente'}>
                        GitHub {u.github_token ? 'OK' : '-'}
                    </span>
                    <span className="text-cafe-cinza-quente">/</span>
                    <span className={u.vercel_token ? 'text-[oklch(40%_0.060_145)] font-semibold' : 'text-cafe-cinza-quente'}>
                        Vercel {u.vercel_token ? 'OK' : '-'}
                    </span>
                </div>
            ),
        },
        {
            key: 'access',
            header: 'Acessos',
            cell: (u) => {
                const accesses = u.accesses || [];
                if (accesses.length === 0) {
                    return <span className="text-xs text-cafe-cinza-quente italic">Sem acessos</span>;
                }
                return (
                    <span className="text-xs text-cafe-medio tabular-nums">
                        {accesses.length} {accesses.length === 1 ? 'produto' : 'produtos'}
                    </span>
                );
            },
        },
        {
            key: 'actions',
            header: '',
            align: 'right',
            cell: (u) => (
                <div className="inline-flex items-center gap-1 justify-end">
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openModal(u); }}
                        aria-label="Editar"
                        className="p-2 text-cafe-cinza-quente hover:text-coral-terra hover:bg-coral-wash rounded-md transition-colors"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDelete(u); }}
                        aria-label="Excluir"
                        className="p-2 text-cafe-cinza-quente hover:text-vermelho-tijolo hover:bg-[oklch(94%_0.025_28)] rounded-md transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Usuarios"
                tagline={users.length + ' alunos cadastrados.'}
                action={
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-cafe-cinza-quente absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="search"
                                placeholder="Buscar email..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-cream-surface border border-borda-cafe rounded-[10px] text-sm focus:border-coral-terra focus:outline-none min-h-[40px] min-w-[200px]"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => openModal()}
                            className="inline-flex items-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-4 py-2 rounded-[10px] font-semibold text-sm transition-colors min-h-[40px]"
                        >
                            <Plus className="w-4 h-4" />
                            Novo usuario
                        </button>
                    </div>
                }
            />

            <DataTable
                columns={columns}
                rows={paginatedUsers}
                rowKey={(u) => u.id}
                loading={loading}
                emptyState={
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-coral-wash flex items-center justify-center mx-auto mb-3">
                            <UserCircle2 className="w-6 h-6 text-coral-terra" />
                        </div>
                        <p className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                            {searchQuery ? 'Nenhum usuario com esse email.' : 'Nenhum usuario cadastrado.'}
                        </p>
                    </div>
                }
            />

            <Pagination
                page={page}
                pageSize={USERS_PAGE_SIZE}
                total={filteredUsers.length}
                onPageChange={setPage}
                label="usuários"
            />

            <FormModal
                open={isModalOpen}
                title={editId ? 'Editar usuario' : 'Novo usuario'}
                onClose={closeModal}
                onSubmit={handleSave}
                submitting={saving}
                submitLabel={editId ? 'Atualizar' : 'Criar usuario'}
                width="md"
            >
                <Field label="E-mail" htmlFor="user-email">
                    <Input
                        id="user-email"
                        type="email"
                        required
                        value={email}
                        disabled={!!editId}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="email@exemplo.com"
                    />
                </Field>

                <Field
                    label={editId ? 'Nova senha' : 'Senha inicial'}
                    htmlFor="user-pass"
                    helper={editId ? 'Deixe vazio pra manter a atual.' : 'Aluno usa pra logar.'}
                >
                    <Input
                        id="user-pass"
                        type="text"
                        required={!editId}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="senha"
                    />
                </Field>

                <Field label="Cargo" htmlFor="user-role">
                    <select
                        id="user-role"
                        value={role}
                        onChange={e => setRole(e.target.value)}
                        className="w-full bg-cream-surface text-carvao-quente text-base rounded-[12px] px-4 py-3 border border-borda-cafe focus:border-coral-terra focus:outline-none"
                    >
                        <option value="user">Aluno</option>
                        <option value="admin">Admin</option>
                    </select>
                </Field>

                <div className="space-y-3 pt-3 border-t border-borda-cafe">
                    <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em]">
                        Integracoes
                    </p>
                    <Field label="GitHub Token" htmlFor="gh-token" optional>
                        <Input
                            id="gh-token"
                            type="password"
                            value={githubToken}
                            onChange={e => setGithubToken(e.target.value)}
                            placeholder="ghp_..."
                            className="font-mono text-sm"
                        />
                    </Field>
                    <Field label="Vercel Token" htmlFor="vc-token" optional>
                        <Input
                            id="vc-token"
                            type="password"
                            value={vercelToken}
                            onChange={e => setVercelToken(e.target.value)}
                            placeholder="Vercel personal token"
                            className="font-mono text-sm"
                        />
                    </Field>
                </div>

                <div className="space-y-3 pt-3 border-t border-borda-cafe">
                    <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em]">
                        Liberacao de cursos
                    </p>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {availableCourses.length === 0 && (
                            <p className="text-xs text-cafe-cinza-quente italic">Nenhum curso cadastrado ainda.</p>
                        )}
                        {availableCourses.map(course => {
                            const isSelected = userCoursesData.some(c => c.course_id === course.id);
                            const currentConfig = userCoursesData.find(c => c.course_id === course.id);
                            return (
                                <div key={course.id} className="bg-cream-elevated border border-borda-cafe rounded-[10px] p-3 space-y-2">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={e => {
                                                if (e.target.checked) {
                                                    setUserCoursesData(prev => [...prev, { course_id: course.id, expires_at: null }]);
                                                } else {
                                                    setUserCoursesData(prev => prev.filter(c => c.course_id !== course.id));
                                                }
                                            }}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm font-semibold text-carvao-quente">{course.title}</span>
                                    </label>
                                    {isSelected && (
                                        <div className="pl-7">
                                            <label className="block text-xs text-cafe-cinza-quente mb-1">
                                                Expira em (vazio = sem expiracao):
                                            </label>
                                            <Input
                                                type="date"
                                                value={currentConfig?.expires_at || ''}
                                                onChange={e => {
                                                    setUserCoursesData(prev => prev.map(c =>
                                                        c.course_id === course.id ? { ...c, expires_at: e.target.value || null } : c
                                                    ));
                                                }}
                                                className="font-mono text-sm"
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {actionStatus && (
                    <div className={'text-sm font-semibold p-2 rounded text-center ' + (actionStatus.startsWith('Erro')
                        ? 'bg-[oklch(94%_0.025_28)] text-vermelho-tijolo'
                        : 'bg-[oklch(94%_0.020_145)] text-[oklch(40%_0.060_145)]')}>
                        {actionStatus}
                    </div>
                )}
            </FormModal>
        </div>
    );
}
