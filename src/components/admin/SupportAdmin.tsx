import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Send, ArrowLeft, Search, RefreshCw } from 'lucide-react';

const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

interface SupportTicket {
    id: string;
    user_id: string;
    user_email: string;
    user_name: string;
    subject: string;
    description: string;
    category: string;
    status: string;
    priority: number;
    site_repo: string;
    screenshot_url: string;
    resolved_note: string;
    resolved_at: string | null;
    created_at: string;
    updated_at: string;
}

interface TicketMessage {
    id: string;
    ticket_id: string;
    author_type: string;
    author_name: string;
    message: string;
    created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
    bug: 'Bug / Erro',
    duvida: 'Duvida',
    feature: 'Feature',
    urgente: 'Urgente',
};

const CATEGORY_COLORS: Record<string, string> = {
    bug: 'bg-red-100 text-red-700',
    duvida: 'bg-blue-100 text-blue-700',
    feature: 'bg-purple-100 text-purple-700',
    urgente: 'bg-orange-100 text-orange-700',
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    aberto: { label: 'Aberto', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-400' },
    em_andamento: { label: 'Em Andamento', bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-400' },
    resolvido: { label: 'Resolvido', bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-400' },
};

const PRIORITY_LABELS = ['Normal', 'Baixa', 'Media', 'Alta'];
const PRIORITY_COLORS = [
    'bg-gray-100 text-gray-600',
    'bg-blue-100 text-blue-700',
    'bg-yellow-100 text-yellow-700',
    'bg-red-100 text-red-700',
];

export default function SupportAdmin() {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [statusFilter, setStatusFilter] = useState('todos');
    const [categoryFilter, setCategoryFilter] = useState('todos');
    const [search, setSearch] = useState('');

    // Detail view
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<TicketMessage[]>([]);
    const [replyText, setReplyText] = useState('');
    const [sendingReply, setSendingReply] = useState(false);

    // Resolve modal
    const [showResolve, setShowResolve] = useState(false);
    const [resolveNote, setResolveNote] = useState('');
    const [resolving, setResolving] = useState(false);

    useEffect(() => { loadTickets(); }, [statusFilter]);

    const getToken = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || '';
    };

    const loadTickets = async () => {
        setLoading(true);
        setError('');
        try {
            const token = await getToken();
            if (!token) { setError('Sessao expirada.'); return; }

            const url = statusFilter !== 'todos'
                ? `/api/support/tickets?status=${statusFilter}`
                : '/api/support/tickets';

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Erro ${res.status}`);
            setTickets(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const openTicket = async (ticket: SupportTicket) => {
        setSelectedTicket(ticket);
        setReplyText('');
        setShowResolve(false);
        setResolveNote('');
        try {
            const token = await getToken();
            const res = await fetch(`/api/support/tickets/${ticket.id}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setMessages(data.messages || []);
                // Refresh ticket data
                if (data.ticket) setSelectedTicket(data.ticket);
            }
        } catch {}
    };

    const sendReply = async () => {
        if (!replyText.trim() || !selectedTicket) return;
        setSendingReply(true);
        try {
            const token = await getToken();
            const res = await fetch('/api/support/messages', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ticket_id: selectedTicket.id,
                    message: replyText.trim(),
                }),
            });
            if (res.ok) {
                setReplyText('');
                await openTicket(selectedTicket);
                loadTickets();
            }
        } catch {}
        setSendingReply(false);
    };

    const updateTicket = async (updates: Record<string, any>) => {
        if (!selectedTicket) return;
        try {
            const token = await getToken();
            const res = await fetch(`/api/support/tickets/${selectedTicket.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates),
            });
            if (res.ok) {
                const updated = await res.json();
                setSelectedTicket(updated);
                loadTickets();
            }
        } catch {}
    };

    const resolveTicket = async () => {
        setResolving(true);
        await updateTicket({
            status: 'resolvido',
            resolved_note: resolveNote.trim(),
        });
        setShowResolve(false);
        setResolveNote('');
        setResolving(false);
    };

    // Filter tickets
    const filtered = tickets.filter(t => {
        if (categoryFilter !== 'todos' && t.category !== categoryFilter) return false;
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            t.user_email.toLowerCase().includes(q) ||
            t.subject.toLowerCase().includes(q) ||
            t.site_repo.toLowerCase().includes(q) ||
            (t.user_name || '').toLowerCase().includes(q)
        );
    });

    // Stats
    const stats = {
        abertos: tickets.filter(t => t.status === 'aberto').length,
        andamento: tickets.filter(t => t.status === 'em_andamento').length,
        resolvidosHoje: tickets.filter(t => {
            if (t.status !== 'resolvido' || !t.resolved_at) return false;
            const today = new Date().toDateString();
            return new Date(t.resolved_at).toDateString() === today;
        }).length,
        total: tickets.length,
    };

    const statusBadge = (status: string) => {
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.aberto;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
            </span>
        );
    };

    // ==== DETAIL VIEW ====
    if (selectedTicket) {
        return (
            <div>
                <button
                    onClick={() => setSelectedTicket(null)}
                    className="flex items-center gap-2 text-sm font-bold text-violet-600 hover:text-violet-800 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Voltar aos chamados
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Ticket info + messages */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Ticket header */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="min-w-0">
                                    <h2 className="text-lg font-bold text-gray-900">{selectedTicket.subject}</h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {selectedTicket.user_email}
                                        {selectedTicket.site_repo && <> &middot; <span className="font-mono text-xs">{selectedTicket.site_repo}</span></>}
                                    </p>
                                </div>
                                {statusBadge(selectedTicket.status)}
                            </div>

                            <div className="flex gap-2 flex-wrap mb-4">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${CATEGORY_COLORS[selectedTicket.category] || 'bg-gray-100 text-gray-700'}`}>
                                    {CATEGORY_LABELS[selectedTicket.category] || selectedTicket.category}
                                </span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${PRIORITY_COLORS[selectedTicket.priority] || PRIORITY_COLORS[0]}`}>
                                    P{selectedTicket.priority}: {PRIORITY_LABELS[selectedTicket.priority] || 'Normal'}
                                </span>
                                <span className="text-xs text-gray-400">
                                    {new Date(selectedTicket.created_at).toLocaleDateString('pt-BR', {
                                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                    })}
                                </span>
                            </div>

                            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">
                                {selectedTicket.description}
                            </div>

                            {selectedTicket.screenshot_url && (
                                <a
                                    href={selectedTicket.screenshot_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block mt-3 text-xs font-bold text-violet-600 hover:underline"
                                >
                                    Ver screenshot
                                </a>
                            )}
                        </div>

                        {/* Resolution note */}
                        {selectedTicket.status === 'resolvido' && selectedTicket.resolved_note && (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-7 h-7 rounded-lg bg-emerald-200 flex items-center justify-center text-sm font-black text-emerald-800">J</div>
                                    <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">Resolucao do Juvenal</span>
                                    {selectedTicket.resolved_at && (
                                        <span className="text-xs text-emerald-600">
                                            {new Date(selectedTicket.resolved_at).toLocaleDateString('pt-BR', {
                                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-emerald-800 whitespace-pre-wrap">{selectedTicket.resolved_note}</p>
                            </div>
                        )}

                        {/* Messages */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h3 className="text-sm font-black text-gray-600 uppercase tracking-wider mb-4">
                                Conversa ({messages.length})
                            </h3>

                            {messages.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-4">Nenhuma mensagem ainda.</p>
                            ) : (
                                <div className="space-y-3 mb-4">
                                    {messages.map(msg => (
                                        <div
                                            key={msg.id}
                                            className={`p-3 rounded-xl text-sm ${
                                                msg.author_type === 'juvenal'
                                                    ? 'bg-violet-50 border border-violet-100 ml-4'
                                                    : 'bg-gray-50 border border-gray-100 mr-4'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                {msg.author_type === 'juvenal' ? (
                                                    <div className="w-5 h-5 rounded-md bg-violet-200 flex items-center justify-center text-[10px] font-black text-violet-700">J</div>
                                                ) : (
                                                    <div className="w-5 h-5 rounded-md bg-gray-200 flex items-center justify-center text-[10px] font-black text-gray-500">A</div>
                                                )}
                                                <span className="text-xs font-bold text-gray-600">{msg.author_name}</span>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(msg.created_at).toLocaleDateString('pt-BR', {
                                                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                                    })}
                                                </span>
                                            </div>
                                            <p className="text-gray-700 whitespace-pre-wrap">{msg.message}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Reply as Juvenal */}
                            {selectedTicket.status !== 'resolvido' && (
                                <div className="border-t border-gray-100 pt-4">
                                    <p className="text-xs font-bold text-violet-600 mb-2">Responder como Juvenal:</p>
                                    <div className="flex gap-2">
                                        <textarea
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                            placeholder="Fala pro aluno o que ta acontecendo..."
                                            rows={3}
                                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 resize-none"
                                        />
                                    </div>
                                    <div className="flex justify-end mt-2">
                                        <button
                                            onClick={sendReply}
                                            disabled={sendingReply || !replyText.trim()}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 disabled:opacity-50 transition-colors"
                                        >
                                            <Send className="w-4 h-4" />
                                            {sendingReply ? 'Enviando...' : 'Enviar'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Actions sidebar */}
                    <div className="space-y-4">
                        {/* Status actions */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h3 className="text-sm font-black text-gray-600 uppercase tracking-wider mb-4">Acoes</h3>

                            {/* Change status */}
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-500 mb-1.5">Status</label>
                                <select
                                    value={selectedTicket.status}
                                    onChange={e => updateTicket({ status: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                                >
                                    <option value="aberto">Aberto</option>
                                    <option value="em_andamento">Em Andamento</option>
                                    <option value="resolvido">Resolvido</option>
                                </select>
                            </div>

                            {/* Priority */}
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-gray-500 mb-1.5">Prioridade</label>
                                <select
                                    value={selectedTicket.priority}
                                    onChange={e => updateTicket({ priority: parseInt(e.target.value) })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                                >
                                    <option value={0}>0 - Normal</option>
                                    <option value={1}>1 - Baixa</option>
                                    <option value={2}>2 - Media</option>
                                    <option value={3}>3 - Alta</option>
                                </select>
                            </div>

                            {/* Resolve button */}
                            {selectedTicket.status !== 'resolvido' && (
                                <>
                                    {!showResolve ? (
                                        <button
                                            onClick={() => setShowResolve(true)}
                                            className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
                                        >
                                            Marcar como Resolvido
                                        </button>
                                    ) : (
                                        <div className="space-y-3">
                                            <textarea
                                                value={resolveNote}
                                                onChange={e => setResolveNote(e.target.value)}
                                                placeholder="O que foi feito pra resolver? (o aluno vai ver isso)"
                                                rows={4}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500 resize-none"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={resolveTicket}
                                                    disabled={resolving}
                                                    className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                                                >
                                                    {resolving ? 'Salvando...' : 'Confirmar'}
                                                </button>
                                                <button
                                                    onClick={() => { setShowResolve(false); setResolveNote(''); }}
                                                    className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
                                                >
                                                    Cancelar
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Ticket info card */}
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h3 className="text-sm font-black text-gray-600 uppercase tracking-wider mb-3">Info</h3>
                            <div className="space-y-2 text-sm">
                                <div>
                                    <span className="text-gray-400 text-xs font-bold">Aluno:</span>
                                    <p className="text-gray-700 font-medium">{selectedTicket.user_name || selectedTicket.user_email}</p>
                                </div>
                                <div>
                                    <span className="text-gray-400 text-xs font-bold">Email:</span>
                                    <p className="text-gray-700 font-mono text-xs">{selectedTicket.user_email}</p>
                                </div>
                                {selectedTicket.site_repo && (
                                    <div>
                                        <span className="text-gray-400 text-xs font-bold">Site:</span>
                                        <p className="text-gray-700 font-mono text-xs">{selectedTicket.site_repo}</p>
                                    </div>
                                )}
                                <div>
                                    <span className="text-gray-400 text-xs font-bold">Criado:</span>
                                    <p className="text-gray-700 text-xs">
                                        {new Date(selectedTicket.created_at).toLocaleDateString('pt-BR', {
                                            day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                        })}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-gray-400 text-xs font-bold">ID:</span>
                                    <p className="text-gray-500 font-mono text-[10px] break-all">{selectedTicket.id}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ==== LIST VIEW ====
    return (
        <div>
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {[
                    { label: 'Abertos', value: stats.abertos, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
                    { label: 'Em Andamento', value: stats.andamento, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
                    { label: 'Resolvidos Hoje', value: stats.resolvidosHoje, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
                    { label: 'Total', value: stats.total, color: 'text-gray-700', bg: 'bg-white border-gray-200' },
                ].map(s => (
                    <div key={s.label} className={`${s.bg} border rounded-xl p-4`}>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{s.label}</p>
                        <p className={`text-2xl font-black mt-1 ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4 items-center">
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por email, assunto ou site..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-violet-500"
                    />
                </div>
                <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-violet-500 bg-white"
                >
                    <option value="todos">Todos os Status</option>
                    <option value="aberto">Aberto</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="resolvido">Resolvido</option>
                </select>
                <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-violet-500 bg-white"
                >
                    <option value="todos">Todas as Categorias</option>
                    <option value="bug">Bug / Erro</option>
                    <option value="duvida">Duvida</option>
                    <option value="feature">Feature</option>
                    <option value="urgente">Urgente</option>
                </select>
                <button
                    onClick={loadTickets}
                    className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-violet-600 transition-colors"
                    title="Recarregar"
                >
                    <RefreshCw className="w-4 h-4" />
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
                    Carregando chamados...
                </div>
            ) : filtered.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
                    Nenhum chamado encontrado.
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th className="text-left py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-wider">Aluno</th>
                                    <th className="text-left py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-wider">Assunto</th>
                                    <th className="text-left py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-wider">Cat.</th>
                                    <th className="text-left py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="text-left py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-wider">Prio.</th>
                                    <th className="text-left py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-wider">Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(ticket => (
                                    <tr
                                        key={ticket.id}
                                        onClick={() => openTicket(ticket)}
                                        className="border-b border-gray-50 hover:bg-violet-50/30 cursor-pointer transition-colors"
                                    >
                                        <td className="py-3 px-4">
                                            <p className="font-medium text-gray-800 truncate max-w-[160px]">{ticket.user_email}</p>
                                            {ticket.site_repo && (
                                                <p className="text-[10px] text-gray-400 font-mono truncate max-w-[160px]">{ticket.site_repo}</p>
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            <p className="font-medium text-gray-800 truncate max-w-[250px]">{ticket.subject}</p>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${CATEGORY_COLORS[ticket.category] || 'bg-gray-100 text-gray-700'}`}>
                                                {CATEGORY_LABELS[ticket.category] || ticket.category}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            {statusBadge(ticket.status)}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS[0]}`}>
                                                P{ticket.priority}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">
                                            {new Date(ticket.created_at).toLocaleDateString('pt-BR', {
                                                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
