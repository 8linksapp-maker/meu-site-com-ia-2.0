import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Send, Ticket, ChevronDown, ChevronUp, MessageCircle, Upload, X, Loader2, ImageIcon } from 'lucide-react';

const supabase = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
);

interface SupportTicket {
    id: string;
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

interface UserSite {
    id: string;
    github_repo: string;
    github_owner: string;
}

const JUVENAL_AVATAR = 'https://bsebtmvautyhglmgmtaa.supabase.co/storage/v1/object/public/Public%20bucket/juvenal-avatar.png';

const GREETINGS = [
    'Fala, parceiro! Me conta o problema que eu resolvo.',
    'Chegou no lugar certo. Manda o bug que eu caco.',
    'Juvenal na area! O que quebrou hoje?',
    'Pode falar, eu nao mordo. So conserto.',
    'E ai, meu bom? Qual e o pepino da vez?',
    'Opa! Bora resolver esse trem rapidinho.',
    'Ta com problema? Relaxa, o Juvenal ta aqui.',
    'Manda a bronca que eu desenrolo!',
];

const CATEGORY_LABELS: Record<string, string> = {
    bug: 'Bug / Erro',
    duvida: 'Duvida',
    feature: 'Pedido de Feature',
    urgente: 'Urgente',
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    aberto: { label: 'Aberto', bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-400' },
    em_andamento: { label: 'Em Andamento', bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-400' },
    resolvido: { label: 'Resolvido', bg: 'bg-emerald-100', text: 'text-emerald-800', dot: 'bg-emerald-400' },
};

const AFTER_SUBMIT_MESSAGES = [
    'Recebido! Vou dar uma olhada e te aviso quando resolver.',
    'Anotado, parceiro! Ja to de olho nisso.',
    'Show! Vou analisar e te dou um retorno rapidao.',
    'Beleza! Pode ficar tranquilo, ja vou cuidar disso.',
];

export default function JuvenalSupport() {
    const [tab, setTab] = useState<'novo' | 'lista'>('novo');
    const [loading, setLoading] = useState(false);
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [sites, setSites] = useState<UserSite[]>([]);
    const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
    const [ticketMessages, setTicketMessages] = useState<Record<string, TicketMessage[]>>({});
    const [replyText, setReplyText] = useState<Record<string, string>>({});
    const [sendingReply, setSendingReply] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState('');
    const [error, setError] = useState('');

    // Form state
    const [subject, setSubject] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('bug');
    const [siteRepo, setSiteRepo] = useState('');
    const [screenshotUrl, setScreenshotUrl] = useState('');
    const [uploading, setUploading] = useState(false);
    const [screenshotPreview, setScreenshotPreview] = useState('');

    const greeting = useMemo(() => GREETINGS[Math.floor(Math.random() * GREETINGS.length)], []);

    useEffect(() => {
        loadSites();
        loadTickets();
    }, []);

    const getToken = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || '';
    };

    const loadSites = async () => {
        try {
            const token = await getToken();
            if (!token) return;
            const res = await fetch('/api/admin/my-sites', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setSites(data || []);
            }
        } catch {}
    };

    const loadTickets = async () => {
        try {
            const token = await getToken();
            if (!token) return;
            const res = await fetch('/api/support/tickets', {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setTickets(data || []);
            }
        } catch {}
    };

    const loadMessages = async (ticketId: string) => {
        try {
            const token = await getToken();
            const res = await fetch(`/api/support/tickets/${ticketId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setTicketMessages(prev => ({ ...prev, [ticketId]: data.messages || [] }));
            }
        } catch {}
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitSuccess('');
        setLoading(true);

        try {
            const token = await getToken();
            if (!token) {
                setError('Voce precisa estar logado.');
                return;
            }

            const res = await fetch('/api/support/tickets', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    subject,
                    description,
                    category,
                    site_repo: siteRepo,
                    screenshot_url: screenshotUrl,
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro ao enviar chamado');

            setSubmitSuccess(AFTER_SUBMIT_MESSAGES[Math.floor(Math.random() * AFTER_SUBMIT_MESSAGES.length)]);
            setSubject('');
            setDescription('');
            setCategory('bug');
            setSiteRepo('');
            setScreenshotUrl('');
            setScreenshotPreview('');
            loadTickets();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const toggleTicket = async (ticketId: string) => {
        if (expandedTicket === ticketId) {
            setExpandedTicket(null);
        } else {
            setExpandedTicket(ticketId);
            if (!ticketMessages[ticketId]) {
                await loadMessages(ticketId);
            }
        }
    };

    const sendReply = async (ticketId: string) => {
        const msg = replyText[ticketId]?.trim();
        if (!msg) return;
        setSendingReply(true);
        try {
            const token = await getToken();
            const res = await fetch('/api/support/messages', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ ticket_id: ticketId, message: msg }),
            });
            if (res.ok) {
                setReplyText(prev => ({ ...prev, [ticketId]: '' }));
                await loadMessages(ticketId);
            }
        } catch {}
        setSendingReply(false);
    };

    const statusBadge = (status: string) => {
        const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.aberto;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                {cfg.label}
            </span>
        );
    };

    return (
        <div className="max-w-3xl mx-auto">
            {/* Juvenal Header */}
            <div className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700 rounded-2xl p-6 mb-6 text-white shadow-lg shadow-purple-500/20">
                <div className="flex items-center gap-4">
                    <img src={JUVENAL_AVATAR} alt="Juvenal Amâncio" className="w-16 h-16 rounded-2xl shrink-0 shadow-lg object-cover" />
                    <div className="min-w-0">
                        <h1 className="text-xl font-black tracking-tight">Juvenal Amancio</h1>
                        <p className="text-violet-200 text-sm font-medium">Suporte Tecnico</p>
                        <p className="text-white/80 text-sm mt-1 italic">"{greeting}"</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
                <button
                    onClick={() => { setTab('novo'); setSubmitSuccess(''); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        tab === 'novo'
                            ? 'bg-white text-[#7c3aed] shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Send className="w-4 h-4" />
                    Abrir Chamado
                </button>
                <button
                    onClick={() => { setTab('lista'); setSubmitSuccess(''); loadTickets(); }}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all ${
                        tab === 'lista'
                            ? 'bg-white text-[#7c3aed] shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                    <Ticket className="w-4 h-4" />
                    Meus Chamados
                    {tickets.length > 0 && (
                        <span className="bg-[#7c3aed]/10 text-[#7c3aed] text-xs font-black px-1.5 py-0.5 rounded-full">
                            {tickets.length}
                        </span>
                    )}
                </button>
            </div>

            {/* TAB: Abrir Chamado */}
            {tab === 'novo' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    {submitSuccess ? (
                        <div className="p-8 text-center">
                            <img src={JUVENAL_AVATAR} alt="Juvenal" className="w-20 h-20 mx-auto mb-4 rounded-2xl shadow-lg object-cover" />
                            <p className="text-lg font-bold text-gray-800 mb-2">Chamado enviado!</p>
                            <p className="text-violet-600 font-medium italic">"{submitSuccess}"</p>
                            <p className="text-gray-500 text-sm mt-4">
                                Acompanhe o status na aba "Meus Chamados".
                            </p>
                            <button
                                onClick={() => setSubmitSuccess('')}
                                className="mt-6 px-6 py-2.5 bg-[#7c3aed] text-white rounded-xl text-sm font-bold hover:bg-[#6d28d9] transition-colors"
                            >
                                Abrir outro chamado
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Site */}
                            {sites.length > 0 && (
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                        Qual site?
                                    </label>
                                    <select
                                        value={siteRepo}
                                        onChange={e => setSiteRepo(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed] bg-white"
                                    >
                                        <option value="">Selecione o site (opcional)</option>
                                        {sites.map(s => (
                                            <option key={s.id} value={`${s.github_owner}/${s.github_repo}`}>
                                                {s.github_repo}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                    Categoria
                                </label>
                                <select
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed] bg-white"
                                >
                                    {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
                                        <option key={val} value={val}>{label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                    Assunto
                                </label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    required
                                    placeholder="Ex: Erro ao publicar post no blog"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed]"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                    Descricao do problema
                                </label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    required
                                    rows={5}
                                    placeholder="Descreva o que aconteceu, o que voce esperava e os passos pra reproduzir..."
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed] resize-none"
                                />
                            </div>

                            {/* Screenshot Upload */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                    Print do erro <span className="font-normal text-gray-400">(opcional)</span>
                                </label>
                                {screenshotPreview ? (
                                    <div className="relative inline-block">
                                        <img src={screenshotPreview} alt="Preview" className="max-h-40 rounded-xl border border-gray-200 shadow-sm" />
                                        <button
                                            type="button"
                                            onClick={() => { setScreenshotPreview(''); setScreenshotUrl(''); }}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ) : (
                                    <label className="group flex flex-col items-center justify-center py-6 border-2 border-dashed border-gray-300 hover:border-[#7c3aed] rounded-xl cursor-pointer transition-all hover:bg-purple-50/50">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            disabled={uploading}
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                setUploading(true);
                                                try {
                                                    setScreenshotPreview(URL.createObjectURL(file));
                                                    const token = await getToken();
                                                    const formData = new FormData();
                                                    formData.append('file', file);
                                                    const res = await fetch('/api/support/upload', {
                                                        method: 'POST',
                                                        headers: { 'Authorization': `Bearer ${token}` },
                                                        body: formData,
                                                    });
                                                    const data = await res.json();
                                                    if (!res.ok) throw new Error(data.error);
                                                    setScreenshotUrl(data.url);
                                                } catch (err: any) {
                                                    setError('Erro no upload: ' + err.message);
                                                    setScreenshotPreview('');
                                                } finally {
                                                    setUploading(false);
                                                }
                                            }}
                                        />
                                        {uploading ? (
                                            <Loader2 className="w-8 h-8 animate-spin text-[#7c3aed] mb-2" />
                                        ) : (
                                            <Upload className="w-8 h-8 text-gray-400 group-hover:text-[#7c3aed] mb-2 transition-colors" />
                                        )}
                                        <span className="text-sm text-gray-500 group-hover:text-[#7c3aed] font-medium transition-colors">
                                            {uploading ? 'Enviando...' : 'Clique pra enviar o print'}
                                        </span>
                                        <span className="text-xs text-gray-400 mt-1">PNG, JPG, WebP — max 5MB</span>
                                    </label>
                                )}
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !subject.trim() || !description.trim()}
                                className="w-full py-3 bg-[#7c3aed] text-white rounded-xl text-sm font-black hover:bg-[#6d28d9] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-purple-500/20 hover:shadow-lg hover:shadow-purple-500/30"
                            >
                                {loading ? 'Enviando...' : 'Enviar pro Juvenal'}
                            </button>
                        </form>
                    )}
                </div>
            )}

            {/* TAB: Meus Chamados */}
            {tab === 'lista' && (
                <div className="space-y-3">
                    {tickets.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                                <Ticket className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-gray-500 font-medium">Nenhum chamado ainda.</p>
                            <p className="text-gray-400 text-sm mt-1">Ta tudo certo por aqui!</p>
                        </div>
                    ) : (
                        tickets.map(ticket => {
                            const isExpanded = expandedTicket === ticket.id;
                            const messages = ticketMessages[ticket.id] || [];
                            return (
                                <div key={ticket.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    {/* Ticket header row */}
                                    <button
                                        onClick={() => toggleTicket(ticket.id)}
                                        className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50/50 transition-colors"
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                {statusBadge(ticket.status)}
                                                <span className="text-xs text-gray-400 font-medium">
                                                    {CATEGORY_LABELS[ticket.category] || ticket.category}
                                                </span>
                                            </div>
                                            <p className="text-sm font-bold text-gray-800 truncate">
                                                {ticket.subject}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {new Date(ticket.created_at).toLocaleDateString('pt-BR', {
                                                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                                {ticket.site_repo && <> &middot; {ticket.site_repo}</>}
                                            </p>
                                        </div>
                                        {isExpanded
                                            ? <ChevronUp className="w-5 h-5 text-gray-400 shrink-0" />
                                            : <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                                        }
                                    </button>

                                    {/* Expanded detail */}
                                    {isExpanded && (
                                        <div className="border-t border-gray-100">
                                            {/* Original description */}
                                            <div className="p-4 bg-gray-50/50">
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                                    Descricao
                                                </p>
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                                    {ticket.description}
                                                </p>
                                                {ticket.screenshot_url && (
                                                    <a href={ticket.screenshot_url} target="_blank" rel="noopener noreferrer" className="block mt-3">
                                                        <img src={ticket.screenshot_url} alt="Screenshot" className="max-h-48 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow" />
                                                    </a>
                                                )}
                                            </div>

                                            {/* Resolution note */}
                                            {ticket.status === 'resolvido' && ticket.resolved_note && (
                                                <div className="mx-4 mt-3 mb-1 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className="w-7 h-7 rounded-lg bg-emerald-200 flex items-center justify-center text-sm font-black text-emerald-800">
                                                            J
                                                        </div>
                                                        <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">
                                                            Juvenal resolveu
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-emerald-800 whitespace-pre-wrap">
                                                        {ticket.resolved_note}
                                                    </p>
                                                </div>
                                            )}

                                            {/* Messages thread */}
                                            {messages.length > 0 && (
                                                <div className="p-4 space-y-3">
                                                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                        Conversa
                                                    </p>
                                                    {messages.map(msg => (
                                                        <div
                                                            key={msg.id}
                                                            className={`p-3 rounded-xl text-sm ${
                                                                msg.author_type === 'juvenal'
                                                                    ? 'bg-violet-50 border border-violet-100'
                                                                    : 'bg-gray-50 border border-gray-100'
                                                            }`}
                                                        >
                                                            <div className="flex items-center gap-2 mb-1">
                                                                {msg.author_type === 'juvenal' ? (
                                                                    <img src={JUVENAL_AVATAR} alt="Juvenal" className="w-5 h-5 rounded-md object-cover" />
                                                                ) : (
                                                                    <div className="w-5 h-5 rounded-md bg-gray-200 flex items-center justify-center text-[10px] font-black text-gray-500">V</div>
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

                                            {/* Reply box (only if not resolved) */}
                                            {ticket.status !== 'resolvido' && (
                                                <div className="p-4 border-t border-gray-100">
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={replyText[ticket.id] || ''}
                                                            onChange={e => setReplyText(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                                                            placeholder="Escreva uma resposta..."
                                                            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed]"
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    sendReply(ticket.id);
                                                                }
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => sendReply(ticket.id)}
                                                            disabled={sendingReply || !replyText[ticket.id]?.trim()}
                                                            className="px-4 py-2.5 bg-[#7c3aed] text-white rounded-xl text-sm font-bold hover:bg-[#6d28d9] disabled:opacity-50 transition-colors shrink-0"
                                                        >
                                                            <MessageCircle className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            )}
        </div>
    );
}
