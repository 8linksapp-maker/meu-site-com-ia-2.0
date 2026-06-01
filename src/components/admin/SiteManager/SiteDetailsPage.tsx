import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import {
    ArrowLeft, Globe, LayoutDashboard, ExternalLink, Trash2,
    RefreshCw, Plus, AlertCircle, CheckCircle, Copy,
    Edit2, X, Eye, EyeOff, Calendar, ChevronDown, ChevronUp,
    Loader2, Terminal, Check, ShieldAlert
} from 'lucide-react';
import { Tabs, Banner, Field, Input, Card } from '../../ui';
import type { TabItem } from '../../ui';

interface UserSite {
    id: string;
    domain?: string;
    github_repo: string;
    created_at: string;
    template_id?: string;
    vercel_project_id?: string;
}

interface Deploy {
    uid?: string;
    name?: string;
    url?: string;
    readyState?: string;
    createdAt: number;
}

interface VercelDomain {
    name: string;
    verified?: boolean;
    configured?: boolean;
}

interface VercelEnv {
    id: string;
    key: string;
    value?: string;
    target?: string[];
}

interface SiteDetailsPageProps {
    siteId: string;
}

type TabId = 'overview' | 'domain' | 'settings';
type Toast = { tone: 'success' | 'error' | 'info'; msg: string } | null;

export default function SiteDetailsPage({ siteId }: SiteDetailsPageProps) {
    // ── Site loading ──
    const [site, setSite] = useState<UserSite | null>(null);
    const [siteLoading, setSiteLoading] = useState(true);
    const [siteError, setSiteError] = useState<string | null>(null);

    // ── UI state ──
    const [activeTab, setActiveTab] = useState<TabId>('overview');
    const [toast, setToast] = useState<Toast>(null);
    const [showTechnical, setShowTechnical] = useState(false);

    // ── Domain/Deploy/Env state ──
    const [domains, setDomains] = useState<VercelDomain[]>([]);
    const [deploys, setDeploys] = useState<Deploy[]>([]);
    const [envs, setEnvs] = useState<VercelEnv[]>([]);
    const [tabLoading, setTabLoading] = useState(false);

    // ── Domain form ──
    const [newDomain, setNewDomain] = useState('');
    const [isAddingDomain, setIsAddingDomain] = useState(false);
    const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);
    const [dnsMethod, setDnsMethod] = useState<Record<string, 'records' | 'vercel'>>({});
    const [showDnsConfig, setShowDnsConfig] = useState<Record<string, boolean>>({});

    // ── Env form / modal ──
    const [isAddingEnv, setIsAddingEnv] = useState(false);
    const [newEnv, setNewEnv] = useState<{ key: string; value: string; target: string[] }>({
        key: '', value: '', target: ['production', 'preview', 'development']
    });
    const [showEnvValues, setShowEnvValues] = useState<Record<string, boolean>>({});
    const [editingEnv, setEditingEnv] = useState<{ id: string; key: string; value: string; target?: string[] } | null>(null);

    // ── Delete confirm ──
    const [deleteInput, setDeleteInput] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [deleteDone, setDeleteDone] = useState<{ orphanRepo: string } | null>(null);

    const vercelProjectId = site?.vercel_project_id || site?.github_repo?.split('/').pop() || 'meu-site';
    const siteName = site?.github_repo?.split('/').pop() || 'meu-site';
    const siteUrl = site?.domain || `${siteName}.vercel.app`;

    const showToast = (msg: string, tone: 'success' | 'error' | 'info' = 'success') => {
        setToast({ tone, msg });
        setTimeout(() => setToast(null), 4000);
    };

    // Extrai mensagem de erro da API cobrindo os 2 formatos:
    // { error: "texto" } (auth/validação nossa) e { error: { message } } (erro repassado da Vercel).
    const extractApiError = (body: unknown, fallback: string): string => {
        const err = (body as { error?: unknown })?.error;
        if (typeof err === 'string') return err;
        if (err && typeof err === 'object' && typeof (err as { message?: unknown }).message === 'string') {
            return (err as { message: string }).message;
        }
        return fallback;
    };

    // ── Carregar site por ID ──
    useEffect(() => {
        loadSite();
    }, [siteId]);

    const loadSite = async () => {
        setSiteLoading(true);
        setSiteError(null);
        try {
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            const res = await fetch('/api/admin/my-sites', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const allSites = (await res.json()) as UserSite[];
            if (!res.ok) {
                throw new Error('Não conseguimos carregar seus sites.');
            }
            const found = allSites?.find?.(s => s.id === siteId);
            if (!found) {
                setSiteError('Esse site não foi encontrado na sua carteira.');
            } else {
                setSite(found);
            }
        } catch (err: unknown) {
            setSiteError(err instanceof Error ? err.message : 'Algo deu errado carregando o site.');
        } finally {
            setSiteLoading(false);
        }
    };

    // ── Fetch dados de cada tab ──
    const fetchTabData = async (type: 'domains' | 'deploys' | 'envs') => {
        if (!site) return;
        setTabLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/vercel-proxy?projectId=${vercelProjectId}&type=${type}`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                showToast(extractApiError(data, 'Não conseguimos carregar esses dados.'), 'error');
            } else {
                if (type === 'domains') setDomains(data.domains || []);
                if (type === 'deploys') setDeploys(data.deployments || []);
                if (type === 'envs') setEnvs(data.envs || []);
            }
        } catch (err) {
            console.error(`Erro ao buscar ${type}:`, err);
        }
        setTabLoading(false);
    };

    // Carrega último deploy no overview (1x)
    useEffect(() => {
        if (site && activeTab === 'overview' && deploys.length === 0) {
            fetchTabData('deploys');
        }
        if (site && activeTab === 'domain') {
            fetchTabData('domains');
        }
        // ENVs só carregam quando user abrir "Opções técnicas"
    }, [site, activeTab]);

    useEffect(() => {
        if (showTechnical && site && envs.length === 0) {
            fetchTabData('envs');
        }
    }, [showTechnical, site]);

    // Auto-expand DNS config pra domínios não-vercel não verificados
    useEffect(() => {
        if (activeTab === 'domain' && domains.length > 0) {
            const unconfigured = domains.filter(d => !d.name.endsWith('.vercel.app') && (!d.verified || !d.configured));
            if (unconfigured.length > 0) {
                const newState: Record<string, boolean> = {};
                unconfigured.forEach(d => {
                    newState[d.name] = true;
                    if (!dnsMethod[d.name]) {
                        setDnsMethod(prev => ({ ...prev, [d.name]: 'records' }));
                    }
                });
                setShowDnsConfig(prev => ({ ...prev, ...newState }));
            }
        }
    }, [domains, activeTab]);

    // ── Handlers domínios ──
    const handleAddDomain = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDomain) return;
        setIsAddingDomain(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/vercel-proxy?projectId=${vercelProjectId}&type=add-domain`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newDomain })
            });
            if (res.ok) {
                const addedDomain = newDomain.toLowerCase().trim();
                setNewDomain('');
                showToast('Domínio adicionado. Configure os DNS abaixo.', 'info');
                fetchTabData('domains');
                setTimeout(() => {
                    setShowDnsConfig(prev => ({ ...prev, [addedDomain]: true }));
                    setDnsMethod(prev => ({ ...prev, [addedDomain]: 'records' }));
                }, 500);
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(extractApiError(err, 'Erro ao adicionar domínio.'), 'error');
            }
        } catch {
            showToast('Falha na conexão.', 'error');
        }
        setIsAddingDomain(false);
    };

    const handleRemoveDomain = async (domain: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/vercel-proxy?projectId=${vercelProjectId}&domain=${domain}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            if (res.ok) {
                showToast(`Domínio ${domain} removido.`);
                fetchTabData('domains');
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(extractApiError(err, 'Erro ao remover domínio.'), 'error');
            }
        } catch {
            showToast('Erro ao remover.', 'error');
        }
    };

    const handleVerifyDomain = async (domain: string) => {
        setVerifyingDomain(domain);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`/api/admin/vercel-proxy?projectId=${vercelProjectId}&type=verify-domain&domain=${domain}`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            showToast('Verificação disparada. Aguarde alguns instantes…', 'info');
            fetchTabData('domains');
        } catch {
            showToast('Erro ao verificar.', 'error');
        }
        setVerifyingDomain(null);
    };

    // ── Handlers ENVs ──
    const handleAddEnv = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEnv.key || !newEnv.value) return;
        setIsAddingEnv(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/vercel-proxy?projectId=${vercelProjectId}&type=add-env`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ key: newEnv.key, value: newEnv.value, type: 'encrypted', target: newEnv.target })
            });
            if (res.ok) {
                setNewEnv({ key: '', value: '', target: ['production', 'preview', 'development'] });
                showToast('Variável adicionada.');
                fetchTabData('envs');
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(extractApiError(err, 'Erro ao adicionar variável.'), 'error');
            }
        } catch {
            showToast('Erro de conexão.', 'error');
        }
        setIsAddingEnv(false);
    };

    const handleDeleteEnv = async (envId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/vercel-proxy?projectId=${vercelProjectId}&envId=${envId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            if (res.ok) {
                showToast('Variável removida.');
                fetchTabData('envs');
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(extractApiError(err, 'Erro ao remover variável.'), 'error');
            }
        } catch {
            showToast('Erro ao remover variável.', 'error');
        }
    };

    const handleUpdateEnv = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEnv) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/vercel-proxy?projectId=${vercelProjectId}&envId=${editingEnv.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ value: editingEnv.value || undefined, target: editingEnv.target })
            });
            if (res.ok) {
                showToast('Variável atualizada.');
                setEditingEnv(null);
                fetchTabData('envs');
            } else {
                const err = await res.json().catch(() => ({}));
                showToast(extractApiError(err, 'Erro ao atualizar.'), 'error');
            }
        } catch {
            showToast('Erro de conexão.', 'error');
        }
    };

    // ── Handler delete site ──
    const handleDeleteSite = async () => {
        if (deleteInput !== siteName) {
            showToast('O nome digitado não bate.', 'error');
            return;
        }
        setDeleting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/vercel-proxy?projectId=${vercelProjectId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok && data.success) {
                // Site saiu da Vercel e da carteira. Se o repo GitHub ficou órfão
                // (githubDeleted === false), não redireciona: o usuário precisa ler
                // o nome do repo pra apagar manualmente — toast efêmero não daria tempo.
                if (data.githubDeleted === false && data.orphanRepo) {
                    setDeleteDone({ orphanRepo: data.orphanRepo });
                } else {
                    showToast('Site excluído.', 'success');
                    setTimeout(() => { window.location.href = '/meus-sites'; }, 1200);
                }
            } else {
                // 502 (site segue no ar), 500, 401/403/409 — backend manda { error: "texto" }.
                showToast(extractApiError(data, 'Erro ao excluir site.'), 'error');
            }
        } catch {
            showToast('Falha crítica na conexão.', 'error');
        }
        setDeleting(false);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast('Copiado.', 'info');
    };

    // ── Loading / error ──
    if (siteLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-coral-terra" />
                <p className="text-cafe-medio text-sm">Carregando seu site…</p>
            </div>
        );
    }

    if (siteError || !site) {
        return (
            <div className="max-w-2xl mx-auto pt-8">
                <Banner tone="error" title="Site não encontrado">
                    {siteError ?? 'Esse site não está mais disponível.'}
                </Banner>
                <a
                    href="/meus-sites"
                    className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-coral-terra hover:text-terracota-profundo transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Voltar para minha carteira
                </a>
            </div>
        );
    }

    // ── Conclusão: site excluído mas repo GitHub ficou órfão ──
    if (deleteDone) {
        return (
            <div className="max-w-2xl mx-auto pt-8 space-y-5">
                <Banner tone="warning" title="Site excluído, mas o repositório no GitHub ficou">
                    Removemos o site da Vercel e da sua carteira. Só o repositório{' '}
                    <span className="font-mono text-sm">{deleteDone.orphanRepo}</span> não pôde ser apagado
                    automaticamente, provavelmente porque seu token do GitHub não tem permissão pra apagar
                    repositórios. Se quiser, apague ele manualmente:
                </Banner>
                <div className="flex flex-col sm:flex-row gap-3">
                    <a
                        href={`https://github.com/${deleteDone.orphanRepo}/settings`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 bg-cream-elevated hover:bg-coral-wash text-carvao-quente hover:text-terracota-profundo border border-borda-cafe px-5 py-3 rounded-[12px] font-semibold text-sm transition-colors active:scale-[0.98] min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Abrir repositório no GitHub
                    </a>
                    <a
                        href="/meus-sites"
                        className="inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-6 py-3 rounded-[12px] font-semibold text-sm transition-colors active:scale-[0.98] min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra"
                    >
                        Voltar para minha carteira
                    </a>
                </div>
            </div>
        );
    }

    // ── Dados derivados ──
    const createdAt = new Date(site.created_at);
    const daysAgo = Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    const createdAtPretty = createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
    const lastDeploy = deploys[0];
    const lastDeployDate = lastDeploy?.createdAt ? new Date(lastDeploy.createdAt) : null;
    const lastDeployDaysAgo = lastDeployDate
        ? Math.max(0, Math.floor((Date.now() - lastDeployDate.getTime()) / (1000 * 60 * 60 * 24)))
        : null;
    const hasCustomDomain = !!site.domain && !site.domain.endsWith('.vercel.app');

    const tabs: TabItem[] = [
        { id: 'overview', label: 'Visão geral' },
        { id: 'domain', label: 'Domínio próprio', badge: !hasCustomDomain ? '!' : undefined },
        { id: 'settings', label: 'Configurações' },
    ];

    // ── Toast ──
    const toastNode = toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100]">
            <div
                role={toast.tone === 'error' ? 'alert' : 'status'}
                className={`flex items-center gap-3 px-5 py-3 rounded-[12px] shadow-[0_10px_25px_-5px_rgba(80,40,20,0.20)] border ${
                    toast.tone === 'success'
                        ? 'bg-[oklch(94%_0.025_145)] border-verde-oliva/40 text-[oklch(28%_0.060_145)]'
                        : toast.tone === 'error'
                            ? 'bg-[oklch(94%_0.025_28)] border-vermelho-tijolo/40 text-[oklch(28%_0.080_28)]'
                            : 'bg-cream-elevated border-borda-cafe text-carvao-quente'
                }`}
            >
                {toast.tone === 'success' && <Check className="w-4 h-4" />}
                {toast.tone === 'error' && <AlertCircle className="w-4 h-4" />}
                <span className="text-sm font-semibold">{toast.msg}</span>
                <button
                    onClick={() => setToast(null)}
                    className="ml-1 opacity-60 hover:opacity-100 transition"
                    aria-label="Fechar"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 pb-8">
            {toastNode}

            {/* ── Breadcrumb ─────────────────────────────────────── */}
            <a
                href="/meus-sites"
                className="inline-flex items-center gap-2 text-sm font-semibold text-cafe-medio hover:text-coral-terra transition-colors group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                Voltar para minha carteira
            </a>

            {/* ── Header persistente ─────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-borda-cafe pb-4">
                <div className="min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="font-display text-3xl md:text-[2rem] font-normal text-carvao-quente tracking-tight truncate">
                            {siteName}
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-verde-oliva text-papel-craft text-xs font-semibold rounded-full uppercase tracking-wide shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-papel-craft" />
                            Online
                        </span>
                    </div>
                    <a
                        href={`https://${siteUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 font-mono text-sm text-cafe-cinza-quente hover:text-coral-terra transition-colors"
                    >
                        {siteUrl}
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                </div>

                {/* CTA persistente — Job #1 dessa page */}
                <a
                    href={`https://${siteUrl}/admin`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-6 py-3 rounded-[12px] font-semibold text-base transition-colors active:scale-[0.98] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra min-h-[44px]"
                >
                    <LayoutDashboard className="w-4 h-4" />
                    Editar conteúdo
                </a>
            </div>

            {/* ── Tabs ───────────────────────────────────────────── */}
            <Tabs items={tabs} activeId={activeTab} onChange={(id) => setActiveTab(id as TabId)} />

            {/* ── VISÃO GERAL ────────────────────────────────────── */}
            {activeTab === 'overview' && (
                <div className="space-y-5">
                    {/* 3 cards honestos */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card padding="md">
                            <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em] mb-2">
                                Último deploy
                            </p>
                            {lastDeployDaysAgo !== null ? (
                                <p className="font-display text-2xl font-normal text-carvao-quente tracking-tight tabular-nums">
                                    {lastDeployDaysAgo === 0 ? 'Hoje' : `há ${lastDeployDaysAgo} ${lastDeployDaysAgo === 1 ? 'dia' : 'dias'}`}
                                </p>
                            ) : (
                                <p className="font-display text-2xl font-normal text-cafe-cinza-quente tracking-tight">
                                    {tabLoading ? 'Carregando…' : '—'}
                                </p>
                            )}
                            {lastDeploy?.readyState && (
                                <p className="text-xs text-cafe-medio mt-1">
                                    {lastDeploy.readyState === 'READY' ? 'Publicado com sucesso' : `Estado: ${lastDeploy.readyState}`}
                                </p>
                            )}
                        </Card>

                        <Card padding="md">
                            <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em] mb-2">
                                No ar há
                            </p>
                            <p className="font-display text-2xl font-normal text-carvao-quente tracking-tight tabular-nums">
                                {daysAgo} {daysAgo === 1 ? 'dia' : 'dias'}
                            </p>
                            <p className="text-xs text-cafe-medio mt-1 inline-flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Desde {createdAtPretty}
                            </p>
                        </Card>

                        <Card padding="md">
                            <p className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em] mb-2">
                                Domínio
                            </p>
                            {hasCustomDomain ? (
                                <>
                                    <p className="font-display text-2xl font-normal text-carvao-quente tracking-tight truncate">
                                        {site.domain}
                                    </p>
                                    <p className="text-xs text-cafe-medio mt-1 inline-flex items-center gap-1">
                                        <Check className="w-3 h-3 text-verde-oliva" />
                                        Próprio configurado
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="font-display text-2xl font-normal text-cafe-cinza-quente tracking-tight italic">
                                        Padrão da Vercel
                                    </p>
                                    <button
                                        onClick={() => setActiveTab('domain')}
                                        className="text-xs text-coral-terra hover:text-terracota-profundo font-semibold mt-1 inline-flex items-center gap-1 transition-colors"
                                    >
                                        Configurar próprio →
                                    </button>
                                </>
                            )}
                        </Card>
                    </div>

                    {/* Próximos passos */}
                    {!hasCustomDomain && (
                        <Banner tone="info" title="Próximo passo: domínio próprio">
                            Seu site já tá no ar com endereço da Vercel. Pra ficar profissional (ex: <span className="font-mono">{siteName}.com.br</span>), configure um domínio seu na aba ao lado.
                        </Banner>
                    )}
                </div>
            )}

            {/* ── DOMÍNIO PRÓPRIO ────────────────────────────────── */}
            {activeTab === 'domain' && (
                <div className="space-y-6">
                    <Banner tone="info">
                        Pra usar um endereço seu (ex: <span className="font-mono">seusite.com.br</span>), compre um domínio em <a href="https://registro.br" target="_blank" rel="noopener noreferrer" className="font-semibold text-coral-terra hover:text-terracota-profundo underline">registro.br</a> ou similar, cole abaixo e configure o DNS.
                    </Banner>

                    <Card padding="lg">
                        <form onSubmit={handleAddDomain} className="space-y-4">
                            <Field label="Adicionar domínio próprio" htmlFor="new-domain">
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <Input
                                        id="new-domain"
                                        type="text"
                                        placeholder="exemplo.com.br"
                                        value={newDomain}
                                        onChange={e => setNewDomain(e.target.value)}
                                    />
                                    <button
                                        disabled={isAddingDomain || !newDomain}
                                        type="submit"
                                        className="inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-5 py-3 rounded-[12px] font-semibold text-sm transition-colors active:scale-[0.98] whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed shrink-0 min-h-[44px]"
                                    >
                                        {isAddingDomain ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                        Adicionar
                                    </button>
                                </div>
                            </Field>
                        </form>
                    </Card>

                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em]">
                            Domínios deste site
                        </h3>

                        {tabLoading && domains.length === 0 ? (
                            <div className="py-8 text-center">
                                <Loader2 className="w-5 h-5 animate-spin text-coral-terra mx-auto" />
                            </div>
                        ) : domains.length === 0 ? (
                            <Card padding="md">
                                <p className="text-sm text-cafe-cinza-quente italic">Nenhum domínio personalizado ainda.</p>
                            </Card>
                        ) : (
                            domains.map((dom, i) => {
                                const isVercelDomain = dom.name.endsWith('.vercel.app');
                                const isVerified = isVercelDomain || (dom.verified && dom.configured);
                                return (
                                    <Card key={i} padding="md" className="!p-0 overflow-hidden">
                                        <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                            <div className="space-y-2 min-w-0">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="font-mono text-sm font-semibold text-carvao-quente truncate">{dom.name}</span>
                                                    <a href={`https://${dom.name}`} target="_blank" rel="noopener noreferrer" className="text-cafe-cinza-quente hover:text-coral-terra transition-colors shrink-0">
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {isVerified ? (
                                                        <span className="px-2 py-0.5 bg-verde-oliva text-papel-craft text-xs font-semibold rounded-full uppercase tracking-wide inline-flex items-center gap-1">
                                                            <CheckCircle className="w-3 h-3" /> Verificado
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 bg-mostarda-amber text-carvao-quente text-xs font-semibold rounded-full uppercase tracking-wide inline-flex items-center gap-1">
                                                            <AlertCircle className="w-3 h-3" /> Falta configurar DNS
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {!isVercelDomain && (
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    {!isVerified && (
                                                        <button
                                                            onClick={() => handleVerifyDomain(dom.name)}
                                                            className="px-3 py-2 border border-borda-cafe rounded-[8px] text-xs font-semibold text-cafe-medio hover:bg-coral-wash hover:text-terracota-profundo transition-colors flex items-center gap-1.5 min-h-[36px]"
                                                        >
                                                            <RefreshCw className={`w-3.5 h-3.5 ${verifyingDomain === dom.name ? 'animate-spin' : ''}`} /> Verificar
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setShowDnsConfig(prev => ({ ...prev, [dom.name]: !prev[dom.name] }))}
                                                        className="px-3 py-2 border border-borda-cafe rounded-[8px] text-xs font-semibold text-cafe-medio hover:bg-coral-wash hover:text-terracota-profundo transition-colors flex items-center gap-1.5 min-h-[36px]"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" /> {showDnsConfig[dom.name] ? 'Ocultar DNS' : 'Configurar DNS'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveDomain(dom.name)}
                                                        className="px-3 py-2 bg-[oklch(94%_0.025_28)] text-vermelho-tijolo border border-vermelho-tijolo/30 rounded-[8px] text-xs font-semibold hover:bg-vermelho-tijolo hover:text-papel-craft transition-colors flex items-center gap-1.5 min-h-[36px]"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" /> Remover
                                                    </button>
                                                </div>
                                            )}
                                            {isVercelDomain && (
                                                <span className="text-xs text-cafe-cinza-quente italic">Endereço padrão da Vercel</span>
                                            )}
                                        </div>

                                        {showDnsConfig[dom.name] && !isVercelDomain && (
                                            <div className="border-t border-borda-cafe p-5 bg-cream-elevated/40 space-y-4">
                                                <div className="flex gap-1 border-b border-borda-cafe">
                                                    <button
                                                        onClick={() => setDnsMethod(prev => ({ ...prev, [dom.name]: 'records' }))}
                                                        className={`px-4 py-2 text-xs font-semibold transition-colors relative ${
                                                            dnsMethod[dom.name] !== 'vercel' ? 'text-coral-terra' : 'text-cafe-cinza-quente hover:text-cafe-medio'
                                                        }`}
                                                    >
                                                        DNS Records
                                                        {dnsMethod[dom.name] !== 'vercel' && (
                                                            <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-coral-terra" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => setDnsMethod(prev => ({ ...prev, [dom.name]: 'vercel' }))}
                                                        className={`px-4 py-2 text-xs font-semibold transition-colors relative ${
                                                            dnsMethod[dom.name] === 'vercel' ? 'text-coral-terra' : 'text-cafe-cinza-quente hover:text-cafe-medio'
                                                        }`}
                                                    >
                                                        Vercel DNS
                                                        {dnsMethod[dom.name] === 'vercel' && (
                                                            <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-coral-terra" />
                                                        )}
                                                    </button>
                                                </div>

                                                {dnsMethod[dom.name] === 'vercel' ? (
                                                    <div className="space-y-3">
                                                        <p className="text-xs text-cafe-medio leading-relaxed">
                                                            Aponte os nameservers do seu domínio (no painel da registro.br ou onde você comprou) para os endereços abaixo.
                                                        </p>
                                                        {['ns1.vercel-dns.com', 'ns2.vercel-dns.com'].map((ns) => (
                                                            <div key={ns} className="flex items-center justify-between bg-cream-surface px-4 py-3 rounded-[8px] border border-borda-cafe">
                                                                <code className="font-mono text-sm font-semibold text-carvao-quente">{ns}</code>
                                                                <button onClick={() => copyToClipboard(ns)} className="p-2 text-cafe-cinza-quente hover:text-coral-terra transition-colors rounded">
                                                                    <Copy className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                        <p className="text-xs text-cafe-cinza-quente">A mudança de nameservers pode levar algumas horas pra propagar.</p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3">
                                                        <p className="text-xs text-cafe-medio leading-relaxed">
                                                            Adicione esse registro CNAME no painel DNS do seu domínio (registro.br, GoDaddy, etc.).
                                                        </p>
                                                        <div className="bg-cream-surface border border-borda-cafe rounded-[8px] overflow-hidden">
                                                            <table className="w-full text-sm">
                                                                <thead className="bg-cream-elevated text-xs font-bold text-cafe-cinza-quente uppercase tracking-wide">
                                                                    <tr>
                                                                        <th className="text-left px-4 py-3">Tipo</th>
                                                                        <th className="text-left px-4 py-3">Nome</th>
                                                                        <th className="text-left px-4 py-3">Valor</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    <tr className="border-t border-borda-cafe">
                                                                        <td className="px-4 py-3 font-mono text-sm font-semibold text-carvao-quente">CNAME</td>
                                                                        <td className="px-4 py-3 font-mono text-sm text-carvao-quente">
                                                                            <div className="inline-flex items-center gap-2">
                                                                                {dom.name.includes('.') ? dom.name.split('.')[0] : '@'}
                                                                                <button onClick={() => copyToClipboard(dom.name.split('.')[0])} className="text-cafe-cinza-quente hover:text-coral-terra">
                                                                                    <Copy className="w-3 h-3" />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-4 py-3 font-mono text-sm text-carvao-quente">
                                                                            <div className="inline-flex items-center gap-2">
                                                                                cname.vercel-dns.com.
                                                                                <button onClick={() => copyToClipboard('cname.vercel-dns.com.')} className="text-cafe-cinza-quente hover:text-coral-terra">
                                                                                    <Copy className="w-3 h-3" />
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        <p className="text-xs text-cafe-cinza-quente">Pode levar de minutos a algumas horas pra propagar.</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </Card>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* ── CONFIGURAÇÕES ─────────────────────────────────── */}
            {activeTab === 'settings' && (
                <div className="space-y-5 max-w-2xl">
                    {/* Toggle Opções técnicas */}
                    <Card padding="md">
                        <button
                            type="button"
                            onClick={() => setShowTechnical(s => !s)}
                            aria-expanded={showTechnical}
                            className="w-full flex items-center justify-between text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra rounded-md"
                        >
                            <div>
                                <p className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                                    Opções técnicas
                                </p>
                                <p className="text-xs text-cafe-medio mt-1">
                                    Histórico de deploys e variáveis de ambiente. Pra quem mexe com código.
                                </p>
                            </div>
                            {showTechnical ? <ChevronUp className="w-5 h-5 text-cafe-medio shrink-0" /> : <ChevronDown className="w-5 h-5 text-cafe-medio shrink-0" />}
                        </button>

                        {showTechnical && (
                            <div className="mt-6 pt-6 border-t border-borda-cafe space-y-8">
                                {/* Deploys */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em]">
                                        Histórico de deploys
                                    </h4>
                                    <div className="bg-cream-surface border border-borda-cafe rounded-[8px] overflow-hidden">
                                        {tabLoading && deploys.length === 0 ? (
                                            <div className="p-6 text-center text-cafe-cinza-quente italic text-sm">Carregando…</div>
                                        ) : deploys.length === 0 ? (
                                            <div className="p-6 text-center text-cafe-cinza-quente italic text-sm">Nenhum deploy recente.</div>
                                        ) : (
                                            deploys.slice(0, 10).map((dep, i) => (
                                                <div key={dep.uid ?? i} className={`flex items-center justify-between gap-3 p-4 ${i > 0 ? 'border-t border-borda-cafe' : ''}`}>
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <Terminal className="w-4 h-4 text-cafe-cinza-quente shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="font-mono text-xs font-semibold text-carvao-quente truncate">{dep.name ?? '—'}</p>
                                                            <p className="text-xs text-cafe-cinza-quente tabular-nums">
                                                                {dep.createdAt ? new Date(dep.createdAt).toLocaleString('pt-BR') : '—'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className={`px-2 py-0.5 text-xs font-semibold rounded uppercase tracking-wide ${
                                                            dep.readyState === 'READY'
                                                                ? 'bg-[oklch(94%_0.025_145)] text-[oklch(40%_0.060_145)]'
                                                                : 'bg-mostarda-amber/30 text-[oklch(40%_0.110_80)]'
                                                        }`}>
                                                            {dep.readyState || 'pending'}
                                                        </span>
                                                        {dep.url && (
                                                            <a href={`https://${dep.url}`} target="_blank" rel="noopener noreferrer" className="text-cafe-cinza-quente hover:text-coral-terra transition-colors">
                                                                <ExternalLink className="w-3.5 h-3.5" />
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* ENVs */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-cafe-cinza-quente uppercase tracking-[0.12em]">
                                        Variáveis de ambiente
                                    </h4>

                                    <form onSubmit={handleAddEnv} className="bg-cream-surface border border-borda-cafe rounded-[8px] p-4 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <Field label="Nome (KEY)" htmlFor="env-key">
                                                <Input
                                                    id="env-key"
                                                    type="text"
                                                    value={newEnv.key}
                                                    onChange={e => setNewEnv({ ...newEnv, key: e.target.value })}
                                                    placeholder="API_SECRET_KEY"
                                                    className="font-mono text-sm"
                                                />
                                            </Field>
                                            <Field label="Valor" htmlFor="env-value">
                                                <Input
                                                    id="env-value"
                                                    type="password"
                                                    value={newEnv.value}
                                                    onChange={e => setNewEnv({ ...newEnv, value: e.target.value })}
                                                    placeholder="••••••"
                                                />
                                            </Field>
                                        </div>
                                        <Field label="Ambientes" htmlFor="env-target">
                                            <select
                                                id="env-target"
                                                value={newEnv.target.join(',')}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    setNewEnv({
                                                        ...newEnv,
                                                        target: val === 'production,preview,development'
                                                            ? ['production', 'preview', 'development']
                                                            : [val]
                                                    });
                                                }}
                                                className="w-full bg-cream-surface text-carvao-quente text-base rounded-[12px] px-4 py-3 border border-borda-cafe focus:border-coral-terra focus:outline-none"
                                            >
                                                <option value="production,preview,development">Todos (Produção, Prévia, Dev)</option>
                                                <option value="production">Só Produção</option>
                                                <option value="preview">Só Prévia</option>
                                                <option value="development">Só Desenvolvimento</option>
                                            </select>
                                        </Field>
                                        <div className="flex justify-end">
                                            <button
                                                type="submit"
                                                disabled={isAddingEnv || !newEnv.key || !newEnv.value}
                                                className="inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-4 py-2.5 rounded-[10px] font-semibold text-sm transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed min-h-[40px]"
                                            >
                                                {isAddingEnv ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                                Adicionar
                                            </button>
                                        </div>
                                    </form>

                                    <div className="bg-cream-surface border border-borda-cafe rounded-[8px] overflow-hidden">
                                        {tabLoading && envs.length === 0 ? (
                                            <div className="p-6 text-center text-cafe-cinza-quente italic text-sm">Carregando…</div>
                                        ) : envs.length === 0 ? (
                                            <div className="p-6 text-center text-cafe-cinza-quente italic text-sm">Nenhuma variável configurada.</div>
                                        ) : (
                                            envs.map((env, i) => (
                                                <div key={env.id} className={`flex items-center justify-between gap-3 p-3 ${i > 0 ? 'border-t border-borda-cafe' : ''}`}>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-mono text-xs font-semibold text-carvao-quente truncate">{env.key}</p>
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {(env.target ?? []).map(t => (
                                                                <span key={t} className="px-1.5 py-0.5 bg-cream-elevated text-cafe-cinza-quente text-xs font-semibold rounded uppercase tracking-wide">
                                                                    {t === 'production' ? 'prod' : t === 'preview' ? 'prévia' : 'dev'}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="font-mono text-xs text-cafe-cinza-quente max-w-[100px] truncate">
                                                            {showEnvValues[env.id] ? (env.value || '—') : '••••••'}
                                                        </span>
                                                        <button
                                                            onClick={() => setShowEnvValues(prev => ({ ...prev, [env.id]: !prev[env.id] }))}
                                                            className="p-1.5 text-cafe-cinza-quente hover:text-coral-terra transition-colors"
                                                            aria-label={showEnvValues[env.id] ? 'Ocultar valor' : 'Mostrar valor'}
                                                        >
                                                            {showEnvValues[env.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingEnv({ id: env.id, key: env.key, value: '', target: env.target })}
                                                            className="p-1.5 text-cafe-cinza-quente hover:text-coral-terra transition-colors"
                                                            aria-label="Editar variável"
                                                        >
                                                            <Edit2 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteEnv(env.id)}
                                                            className="p-1.5 text-cafe-cinza-quente hover:text-vermelho-tijolo transition-colors"
                                                            aria-label="Remover variável"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>

                    {/* Zona de perigo */}
                    <Card padding="md" className="!border-vermelho-tijolo/40">
                        <div className="flex items-start gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-[oklch(94%_0.025_28)] flex items-center justify-center shrink-0">
                                <ShieldAlert className="w-5 h-5 text-vermelho-tijolo" />
                            </div>
                            <div>
                                <p className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                                    Zona de perigo
                                </p>
                                <p className="text-xs text-cafe-medio mt-1">
                                    Excluir o site é permanente. Remove o repositório no GitHub, o projeto na Vercel e todo o conteúdo publicado.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Field label={`Digite "${siteName}" pra confirmar`} htmlFor="delete-confirm">
                                <Input
                                    id="delete-confirm"
                                    type="text"
                                    placeholder={siteName}
                                    value={deleteInput}
                                    onChange={e => setDeleteInput(e.target.value)}
                                />
                            </Field>
                            <button
                                onClick={handleDeleteSite}
                                disabled={deleting || deleteInput !== siteName}
                                className="w-full inline-flex items-center justify-center gap-2 bg-vermelho-tijolo hover:bg-[oklch(40%_0.130_28)] text-papel-craft px-5 py-3 rounded-[12px] font-semibold text-sm transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed min-h-[44px]"
                            >
                                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                Excluir site permanentemente
                            </button>
                        </div>
                    </Card>
                </div>
            )}

            {/* ── Modal editar ENV ─────────────────────────────── */}
            {editingEnv && (
                <div
                    className="fixed inset-0 bg-carvao-quente/40 z-[60] flex items-center justify-center p-4"
                    onClick={() => setEditingEnv(null)}
                >
                    <div
                        className="bg-cream-surface w-full max-w-md rounded-[12px] shadow-[0_12px_32px_-12px_rgba(80,40,20,0.20)] border border-borda-cafe"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 space-y-5">
                            <div className="flex justify-between items-center">
                                <h3 className="font-display text-xl font-normal text-carvao-quente tracking-tight">
                                    Editar variável
                                </h3>
                                <button
                                    onClick={() => setEditingEnv(null)}
                                    className="p-2 text-cafe-cinza-quente hover:text-coral-terra transition-colors rounded-md"
                                    aria-label="Fechar"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleUpdateEnv} className="space-y-4">
                                <Field label="Nome (KEY)" htmlFor="edit-env-key">
                                    <Input
                                        id="edit-env-key"
                                        type="text"
                                        value={editingEnv.key}
                                        disabled
                                        className="font-mono text-sm"
                                    />
                                </Field>
                                <Field
                                    label="Novo valor"
                                    htmlFor="edit-env-value"
                                    helper="Deixe vazio pra manter o valor atual."
                                >
                                    <Input
                                        id="edit-env-value"
                                        type="password"
                                        value={editingEnv.value}
                                        onChange={e => setEditingEnv({ ...editingEnv, value: e.target.value })}
                                        placeholder="••••••"
                                    />
                                </Field>
                                <Field label="Ambientes" htmlFor="edit-env-target">
                                    <select
                                        id="edit-env-target"
                                        value={(editingEnv.target ?? []).join(',')}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setEditingEnv({
                                                ...editingEnv,
                                                target: val === 'production,preview,development'
                                                    ? ['production', 'preview', 'development']
                                                    : [val]
                                            });
                                        }}
                                        className="w-full bg-cream-surface text-carvao-quente text-base rounded-[12px] px-4 py-3 border border-borda-cafe focus:border-coral-terra focus:outline-none"
                                    >
                                        <option value="production,preview,development">Todos (Produção, Prévia, Dev)</option>
                                        <option value="production">Só Produção</option>
                                        <option value="preview">Só Prévia</option>
                                        <option value="development">Só Desenvolvimento</option>
                                    </select>
                                </Field>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setEditingEnv(null)}
                                        className="flex-1 inline-flex items-center justify-center gap-2 bg-cream-elevated hover:bg-coral-wash text-carvao-quente hover:text-terracota-profundo border border-borda-cafe px-5 py-2.5 rounded-[12px] font-semibold text-sm transition-colors active:scale-[0.98] min-h-[44px]"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-5 py-2.5 rounded-[12px] font-semibold text-sm transition-colors active:scale-[0.98] min-h-[44px]"
                                    >
                                        Atualizar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
