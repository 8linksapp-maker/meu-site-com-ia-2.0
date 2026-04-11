import React, { useState, useEffect } from 'react';
import { ArrowLeft, Globe, LayoutDashboard, CheckCircle2, Calendar, FileCode, ExternalLink, Trash2, ShieldAlert, Cpu, RefreshCw, Edit, Plus, AlertCircle, CheckCircle, Info, Copy, Terminal, Edit2, X, Check, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface UserSite {
    id: string;
    domain?: string;
    github_repo: string;
    created_at: string;
    template_id?: string;
    vercel_project_id?: string;
}

interface SiteDetailsProps {
    site: UserSite;
    onBack: () => void;
}

export default function SiteDetails({ site, onBack }: SiteDetailsProps) {
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(false);
    const [domains, setDomains] = useState<any[]>([]);
    const [deploys, setDeploys] = useState<any[]>([]);
    const [envs, setEnvs] = useState<any[]>([]);
    const [newDomain, setNewDomain] = useState('');
    const [isAddingDomain, setIsAddingDomain] = useState(false);
    const [verifyingDomain, setVerifyingDomain] = useState<string | null>(null);
    const [isAddingEnv, setIsAddingEnv] = useState(false);
    const [newEnv, setNewEnv] = useState({ key: '', value: '', target: ['production', 'preview', 'development'] });
    const [showEnvValues, setShowEnvValues] = useState<Record<string, boolean>>({});
    const [editingEnv, setEditingEnv] = useState<any | null>(null);

    // UI Local State
    const [dnsMethod, setDnsMethod] = useState<Record<string, 'records' | 'vercel'>>({});
    const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteInput, setDeleteInput] = useState('');

    const siteId = site.vercel_project_id || site.github_repo.split('/').pop() || 'meu-site';
    const siteName = site.github_repo.split('/').pop() || 'meu-site';
    const siteUrl = site.domain || `${siteName}.vercel.app`;

    const createdAt = new Date(site.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const fetchData = async (type: string) => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/vercel-proxy?projectId=${siteId}&type=${type}`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            const data = await res.json();

            if (type === 'domains') setDomains(data.domains || []);
            if (type === 'deploys') setDeploys(data.deployments || []);
            if (type === 'envs') setEnvs(data.envs || []);
        } catch (err) {
            console.error(`Erro ao buscar ${type}:`, err);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (activeTab !== 'overview' && activeTab !== 'settings') {
            fetchData(activeTab);
        }
    }, [activeTab]);

    const handleAddDomain = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDomain) return;
        setIsAddingDomain(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/vercel-proxy?projectId=${siteId}&type=add-domain`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: newDomain })
            });
            if (res.ok) {
                setNewDomain('');
                showToast('Domínio adicionado com sucesso!');
                fetchData('domains');
            } else {
                const err = await res.json();
                showToast(err.error?.message || 'Erro ao adicionar domínio', 'error');
            }
        } catch (err) {
            showToast('Falha na conexão', 'error');
        }
        setIsAddingDomain(false);
    };

    const handleRemoveDomain = async (domain: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/vercel-proxy?projectId=${siteId}&domain=${domain}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            if (res.ok) {
                showToast(`Domínio ${domain} removido.`);
                fetchData('domains');
            }
        } catch (err) {
            showToast('Erro ao remover', 'error');
        }
    };

    const handleVerifyDomain = async (domain: string) => {
        setVerifyingDomain(domain);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch(`/api/admin/vercel-proxy?projectId=${siteId}&type=verify-domain&domain=${domain}`, {
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            showToast('Verificação disparada. Aguarde alguns instantes...');
            fetchData('domains');
        } catch (err) {
            showToast('Erro ao verificar', 'error');
        }
        setVerifyingDomain(null);
    };

    const handleAddEnv = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEnv.key || !newEnv.value) return;
        setIsAddingEnv(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/vercel-proxy?projectId=${siteId}&type=add-env`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    key: newEnv.key,
                    value: newEnv.value,
                    type: 'encrypted',
                    target: newEnv.target
                })
            });
            if (res.ok) {
                setNewEnv({ key: '', value: '', target: ['production', 'preview', 'development'] });
                showToast('Variável adicionada!');
                fetchData('envs');
            } else {
                const err = await res.json();
                showToast(err.error?.message || 'Erro ao adicionar ENV', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        }
        setIsAddingEnv(false);
    };

    const handleDeleteEnv = async (envId: string) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/vercel-proxy?projectId=${siteId}&envId=${envId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });
            if (res.ok) {
                showToast('Variável removida.');
                fetchData('envs');
            }
        } catch (err) {
            showToast('Erro ao remover ENV', 'error');
        }
    };

    const handleUpdateEnv = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEnv) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/vercel-proxy?projectId=${siteId}&envId=${editingEnv.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${session?.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    value: editingEnv.value || undefined,
                    target: editingEnv.target
                })
            });
            if (res.ok) {
                showToast('Variável atualizada!');
                setEditingEnv(null);
                fetchData('envs');
            } else {
                const err = await res.json();
                showToast(err.error?.message || 'Erro ao atualizar ENV', 'error');
            }
        } catch (err) {
            showToast('Erro de conexão', 'error');
        }
    };

    const toggleEnvValue = (id: string) => {
        setShowEnvValues(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleDeleteSite = async () => {
        if (deleteInput !== siteName) {
            showToast('Confirmação incorreta', 'error');
            return;
        }

        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/admin/vercel-proxy?projectId=${siteId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session?.access_token}` }
            });

            if (res.ok) {
                showToast('Site excluído permanentemente!', 'success');
                setTimeout(onBack, 1500);
            } else {
                const err = await res.json();
                showToast(err.error || 'Erro ao excluir site', 'error');
            }
        } catch (err) {
            showToast('Falha crítica na conexão', 'error');
        }
        setLoading(false);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast('Copiado para a área de transferência!', 'info');
    };

    const tabs = [
        { id: 'overview', label: 'Visão Geral' },
        { id: 'deploys', label: 'Deploys' },
        { id: 'domains', label: 'Domínios' },
        { id: 'envs', label: 'Variáveis (ENV)' },
        { id: 'settings', label: 'Configurações' },
    ];

    const toggleDnsMethod = (domain: string, method: 'records' | 'vercel') => {
        setDnsMethod(prev => ({ ...prev, [domain]: method }));
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500 pb-20 relative">

            {/* TOAST SYSTEM */}
            {notification && (
                <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-10 duration-300">
                    <div className={`px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-md ${notification.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' :
                        notification.type === 'error' ? 'bg-red-500/90 border-red-400 text-white' :
                            'bg-blue-600/90 border-blue-400 text-white'
                        }`}>
                        {notification.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
                        {notification.type === 'error' && <AlertCircle className="w-5 h-5" />}
                        {notification.type === 'info' && <Info className="w-5 h-5" />}
                        <span className="font-bold text-sm">{notification.message}</span>
                        <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-50">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Breadcrumb */}
            <button
                onClick={onBack}
                className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-[#7c3aed] transition-colors group"
            >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Voltar para Meus Sites
            </button>

            {/* Header / Tabs */}
            <div className="space-y-6">
                <div className="flex flex-wrap gap-2 border-b border-gray-100">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-3 text-sm font-bold transition-all relative ${activeTab === tab.id
                                ? 'text-[#7c3aed]'
                                : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {tab.label}
                            {activeTab === tab.id && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7c3aed] rounded-full" />
                            )}
                        </button>
                    ))}
                </div>

                {/* VISÃO GERAL */}
                {activeTab === 'overview' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div className="flex items-center gap-5">
                                <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
                                    <Globe className="w-8 h-8" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-black text-gray-900">{siteName}</h1>
                                    <a
                                        href={`https://${siteUrl}`}
                                        target="_blank"
                                        className="text-[#7c3aed] text-sm font-bold flex items-center gap-1.5 hover:underline decoration-2 underline-offset-4"
                                    >
                                        {siteUrl}
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            </div>
                            <a
                                href={`https://${siteUrl}/admin`}
                                target="_blank"
                                className="flex items-center gap-3 px-6 py-3 bg-gray-900 text-white rounded-2xl font-bold hover:bg-[#7c3aed] transition-all shadow-xl shadow-gray-200 active:scale-95 group"
                            >
                                <LayoutDashboard className="w-5 h-5 text-purple-400 group-hover:text-white" />
                                Acessar Painel CMS
                            </a>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status do Deploy</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="text-lg font-bold text-gray-800">Pronto no Ar</span>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Framework Utilizado</span>
                                <div className="flex items-center gap-2">
                                    <FileCode className="w-5 h-5 text-blue-500" />
                                    <span className="text-lg font-bold text-gray-800">Astro v5.0</span>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data de Criação</span>
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-gray-400" />
                                    <span className="text-lg font-bold text-gray-800">{createdAt}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* DOMÍNIOS */}
                {activeTab === 'domains' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                            <div className="mb-8">
                                <h3 className="text-xl font-bold text-gray-900">Gerenciar Domínios</h3>
                                <p className="text-sm text-gray-500 mt-1">Adicione domínios personalizados para este projeto.</p>
                            </div>

                            <form onSubmit={handleAddDomain} className="flex flex-col md:flex-row gap-4 mb-10">
                                <input
                                    type="text"
                                    placeholder="Ex: meudominio.com.br"
                                    value={newDomain}
                                    onChange={e => setNewDomain(e.target.value)}
                                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#7c3aed] focus:bg-white transition-all outline-none"
                                />
                                <div className="flex gap-2">
                                    <select className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 outline-none">
                                        <option>Ir para Produção</option>
                                    </select>
                                    <button
                                        disabled={isAddingDomain}
                                        type="submit"
                                        className="px-8 py-3 bg-[#7c3aed] text-white rounded-xl font-bold text-sm hover:bg-[#6d28d9] transition-all shadow-lg shadow-purple-100 flex items-center gap-2"
                                    >
                                        {isAddingDomain ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                        Adicionar Domínio
                                    </button>
                                </div>
                            </form>

                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">DOMÍNIOS ATIVOS</h4>

                                {loading ? (
                                    <div className="py-10 text-center text-gray-400 font-medium italic">Buscando domínios...</div>
                                ) : domains.length === 0 ? (
                                    <div className="py-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl text-center text-gray-400 font-medium">Nenhum domínio customizado encontrado.</div>
                                ) : (
                                    domains.map((dom, i) => (
                                        <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:border-[#7c3aed]/20 transition-all">
                                            <div className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <h5 className="font-bold text-gray-900">{dom.name}</h5>
                                                        <a href={`https://${dom.name}`} target="_blank" className="text-gray-400 hover:text-[#7c3aed]"><ExternalLink className="w-3.5 h-3.5" /></a>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2">
                                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-black rounded">TARGET: PRODUÇÃO</span>
                                                        {dom.verified ? (
                                                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded flex items-center gap-1">
                                                                <CheckCircle className="w-3 h-3" /> VERIFICADO
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-[10px] font-black rounded flex items-center gap-1">
                                                                <AlertCircle className="w-3 h-3" /> CONFIGURAÇÃO PENDENTE
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {!dom.verified && (
                                                        <button
                                                            onClick={() => handleVerifyDomain(dom.name)}
                                                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-1.5"
                                                        >
                                                            <RefreshCw className={`w-3.5 h-3.5 ${verifyingDomain === dom.name ? 'animate-spin' : ''}`} /> Refresh DNS
                                                        </button>
                                                    )}
                                                    <button className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-1.5">
                                                        <Edit2 className="w-3.5 h-3.5" /> Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleRemoveDomain(dom.name)}
                                                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-all flex items-center gap-1.5"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" /> Remover
                                                    </button>
                                                </div>
                                            </div>

                                            {!dom.verified && (
                                                <div className="px-6 pb-6">
                                                    <div className="bg-[#f8faff] rounded-xl border border-blue-100 overflow-hidden">
                                                        <div className="flex border-b border-blue-50">
                                                            <button
                                                                onClick={() => toggleDnsMethod(dom.name, 'records')}
                                                                className={`px-4 py-2.5 text-xs font-bold transition-all ${dnsMethod[dom.name] !== 'vercel' ? 'text-blue-700 bg-white border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                                                                DNS Records
                                                            </button>
                                                            <button
                                                                onClick={() => toggleDnsMethod(dom.name, 'vercel')}
                                                                className={`px-4 py-2.5 text-xs font-bold transition-all ${dnsMethod[dom.name] === 'vercel' ? 'text-blue-700 bg-white border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
                                                                Vercel DNS
                                                            </button>
                                                        </div>
                                                        <div className="p-6 space-y-4">
                                                            {dnsMethod[dom.name] === 'vercel' ? (
                                                                <div className="space-y-4">
                                                                    <div className="p-4 bg-white/50 rounded-xl border border-blue-50/50">
                                                                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                                            Atualize os nameservers do seu domínio para ativar o Vercel DNS.
                                                                        </p>
                                                                    </div>
                                                                    <div className="space-y-3">
                                                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Nameservers</h4>
                                                                        <div className="grid grid-cols-1 gap-3">
                                                                            {['ns1.vercel-dns.com', 'ns2.vercel-dns.com'].map((ns, i) => (
                                                                                <div key={i} className="bg-white p-4 rounded-xl border border-blue-100/50 flex items-center justify-between group/ns hover:border-blue-200 transition-all">
                                                                                    <code className="text-xs font-bold text-slate-700">{ns}</code>
                                                                                    <button onClick={() => copyToClipboard(ns)} className="p-2 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover/ns:opacity-100">
                                                                                        <Copy className="w-3.5 h-3.5 text-blue-400" />
                                                                                    </button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                    <div className="px-1">
                                                                        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                                                            Pode levar algum tempo para as alterações de nameservers serem aplicadas.
                                                                            <a href="https://vercel.com/docs/concepts/projects/domains/working-with-dns" target="_blank" className="text-[#7c3aed] font-bold hover:underline">Saiba Mais <ExternalLink className="w-3 h-3 inline" /></a>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="space-y-6">
                                                                    <div className="p-4 bg-white/50 rounded-xl border border-blue-50/50">
                                                                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                                            Os registros DNS no seu provedor devem corresponder aos seguintes registros para verificar e conectar seu domínio à Vercel.
                                                                        </p>
                                                                    </div>
                                                                    <div className="bg-white rounded-xl border border-blue-100/50 overflow-hidden">
                                                                        <table className="w-full text-[11px] text-left">
                                                                            <thead className="bg-slate-50/50 text-slate-400 uppercase font-black">
                                                                                <tr>
                                                                                    <th className="px-6 py-4">Tipo</th>
                                                                                    <th className="px-6 py-4">Nome</th>
                                                                                    <th className="px-6 py-4">Valor</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-blue-50/50 font-medium text-slate-600">
                                                                                <tr className="hover:bg-blue-50/20 transition-colors">
                                                                                    <td className="px-6 py-4 font-bold text-slate-900 uppercase">CNAME</td>
                                                                                    <td className="px-6 py-4">
                                                                                        <div className="flex items-center gap-2">
                                                                                            {dom.name.includes('.') ? dom.name.split('.')[0] : '@'}
                                                                                            <button onClick={() => copyToClipboard(dom.name.split('.')[0])} className="p-1 hover:bg-blue-50 rounded transition-colors">
                                                                                                <Copy className="w-3 h-3 text-blue-300" />
                                                                                            </button>
                                                                                        </div>
                                                                                    </td>
                                                                                    <td className="px-6 py-4 font-mono text-slate-500">
                                                                                        <div className="flex items-center justify-between">
                                                                                            <span>cname.vercel-dns.com.</span>
                                                                                            <button onClick={() => copyToClipboard('cname.vercel-dns.com.')} className="p-1 hover:bg-blue-50 rounded transition-colors">
                                                                                                <Copy className="w-3 h-3 text-blue-300" />
                                                                                            </button>
                                                                                        </div>
                                                                                    </td>
                                                                                </tr>
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                    <div className="px-1">
                                                                        <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                                                            Pode levar algum tempo para os registros DNS serem aplicados.
                                                                            <a href="https://vercel.com/docs/concepts/get-started/assign-domain" target="_blank" className="text-[#7c3aed] font-bold hover:underline">Saiba Mais <ExternalLink className="w-3 h-3 inline" /></a>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* DEPLOYS */}
                {activeTab === 'deploys' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-50">
                                <h3 className="font-bold text-gray-900">Histórico de Deploys</h3>
                            </div>
                            <div className="divide-y divide-gray-50">
                                {loading ? (
                                    <div className="p-12 text-center text-gray-400 italic">Carregando deploys...</div>
                                ) : deploys.length === 0 ? (
                                    <div className="p-12 text-center text-gray-400 italic">Nenhum deploy recente.</div>
                                ) : deploys.map((dep, idx) => (
                                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-all group/dep">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${dep.readyState === 'READY' ? 'bg-emerald-50 text-emerald-500 group-hover/dep:bg-emerald-500 group-hover/dep:text-white' : 'bg-amber-50 text-amber-500 group-hover/dep:bg-amber-500 group-hover/dep:text-white'}`}>
                                                <Terminal className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{dep.name}</p>
                                                <p className="text-xs text-gray-400">{new Date(dep.createdAt).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 text-[10px] font-black rounded ${dep.readyState === 'READY' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                {dep.readyState || 'PENDING'}
                                            </span>
                                            <a href={`https://${dep.url}`} target="_blank" className="p-2 text-gray-400 hover:text-[#7c3aed] transition-colors"><ExternalLink className="w-4 h-4" /></a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ENVS */}
                {activeTab === 'envs' && (
                    <div className="space-y-6 animate-in fade-in duration-500">
                        {/* Formulário de Criação */}
                        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                            <div className="mb-6">
                                <h3 className="text-lg font-bold text-gray-900">Variáveis de Ambiente (Environment)</h3>
                                <p className="text-sm text-gray-400">Adicione tokens, chaves de API e URLs secretas que seu projeto consome.</p>
                            </div>

                            <form onSubmit={handleAddEnv} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Nome da Variável (Key)</label>
                                        <input
                                            type="text"
                                            value={newEnv.key}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEnv({ ...newEnv, key: e.target.value })}
                                            placeholder="Ex: API_SECRET_KEY"
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all outline-none text-sm font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Valor (Value)</label>
                                        <input
                                            type="password"
                                            value={newEnv.value}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewEnv({ ...newEnv, value: e.target.value })}
                                            placeholder="••••••••••••"
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all outline-none text-sm font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Ambientes Alvo (Target)</label>
                                    <select
                                        className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all outline-none text-sm font-medium appearance-none"
                                        value={newEnv.target.join(',')}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                            const val = e.target.value;
                                            if (val === 'production,preview,development') {
                                                setNewEnv({ ...newEnv, target: ['production', 'preview', 'development'] });
                                            } else {
                                                setNewEnv({ ...newEnv, target: [val] });
                                            }
                                        }}
                                    >
                                        <option value="production,preview,development">Todas as opções (Produção, Prévia, Desenvolvimento)</option>
                                        <option value="production">Produção</option>
                                        <option value="preview">Prévia</option>
                                        <option value="development">Desenvolvimento</option>
                                    </select>
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isAddingEnv}
                                        className="px-8 py-3.5 bg-[#1e293b] text-white rounded-2xl font-bold text-sm hover:bg-[#0f172a] transition-all shadow-lg flex items-center gap-2"
                                    >
                                        {isAddingEnv ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                        Salvar Variável
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Lista de Variáveis Salvas */}
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/30">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">VARIÁVEIS SALVAS</h3>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">CHAVE (KEY)</th>
                                            <th className="px-6 py-4">AMBIENTES</th>
                                            <th className="px-6 py-4 text-center">VALOR</th>
                                            <th className="px-6 py-4 text-right">AÇÕES</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {loading ? (
                                            <tr><td colSpan={4} className="p-12 text-center text-gray-400 italic">Buscando variáveis...</td></tr>
                                        ) : envs.length === 0 ? (
                                            <tr><td colSpan={4} className="p-12 text-center text-gray-400 italic">Nenhuma variável configurada.</td></tr>
                                        ) : envs.map((env, i) => (
                                            <tr key={i} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="px-6 py-4">
                                                    <span className="text-sm font-bold text-gray-900 font-mono tracking-tight">{env.key}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {(env.target || []).map((t: string) => (
                                                            <span key={t} className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded uppercase tracking-tighter">
                                                                {t === 'production' ? 'PRODUÇÃO' : t === 'preview' ? 'PRÉVIA' : 'DESENVOLVIMENTO'}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <span
                                                            onClick={() => showEnvValues[env.id] && env.value && copyToClipboard(env.value)}
                                                            className={`text-xs text-gray-400 font-mono max-w-[120px] truncate transition-all ${showEnvValues[env.id] && env.value ? 'cursor-copy hover:text-[#7c3aed] active:scale-95' : ''}`}
                                                            title={showEnvValues[env.id] && env.value ? 'Clique para copiar' : ''}
                                                        >
                                                            {showEnvValues[env.id] ? (env.value || 'Secret Value') : '••••••••••••'}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleEnvValue(env.id)}
                                                            className="p-1.5 text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0"
                                                        >
                                                            {showEnvValues[env.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setEditingEnv({ id: env.id, key: env.key, value: '', target: env.target })}
                                                            className="p-2 text-gray-300 hover:text-[#7c3aed] transition-colors"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteEnv(env.id)}
                                                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* MODAL DE EDIÇÃO DE ENV */}
                {editingEnv && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-8 space-y-6">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-bold text-gray-900">Editar Variável</h3>
                                    <button onClick={() => setEditingEnv(null)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
                                </div>

                                <form onSubmit={handleUpdateEnv} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Nome da Variável (Key)</label>
                                        <input
                                            type="text"
                                            disabled
                                            value={editingEnv.key}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-gray-400 cursor-not-allowed outline-none text-sm font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Novo Valor da Variável</label>
                                        <input
                                            type="password"
                                            placeholder="Deixe em branco para manter o segredo atual."
                                            value={editingEnv.value}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingEnv({ ...editingEnv, value: e.target.value })}
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all outline-none text-sm font-medium"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Ambientes Alvo (Target)</label>
                                        <select
                                            className="w-full px-5 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed] transition-all outline-none text-sm font-medium"
                                            value={(editingEnv.target || []).join(',')}
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                                const val = e.target.value;
                                                if (val === 'production,preview,development') {
                                                    setEditingEnv({ ...editingEnv, target: ['production', 'preview', 'development'] });
                                                } else {
                                                    setEditingEnv({ ...editingEnv, target: [val] });
                                                }
                                            }}
                                        >
                                            <option value="production,preview,development">Todas as opções (Produção, Prévia, Desenvolvimento)</option>
                                            <option value="production">Produção</option>
                                            <option value="preview">Prévia</option>
                                            <option value="development">Desenvolvimento</option>
                                        </select>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setEditingEnv(null)}
                                            className="flex-1 px-6 py-4 bg-gray-50 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-100 transition-all"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-6 py-4 bg-[#7c3aed] text-white rounded-2xl font-bold text-sm hover:bg-[#6d28d9] transition-all shadow-lg shadow-purple-100"
                                        >
                                            Atualizar
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {/* SETTINGS (ZONA DE PERIGO) */}
                {activeTab === 'settings' && (
                    <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl">
                        <div className="bg-white p-8 rounded-3xl border border-red-100 shadow-sm">
                            <div className="flex items-start gap-4 mb-8">
                                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                                    <ShieldAlert className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-red-600">Zona de Perigo</h3>
                                    <p className="text-sm text-gray-500">Estas ações são permanentes e não podem ser desfeitas.</p>
                                </div>
                            </div>

                            <div className="p-6 bg-red-50 rounded-2xl border border-red-100 mb-8 flex items-center gap-4 text-left">
                                <Trash2 className="w-5 h-5 text-red-500 flex-shrink-0" />
                                <p className="text-xs text-red-800 font-bold leading-relaxed">
                                    Ao excluir o site, removeremos o repositório no GitHub, o projeto na Vercel e o registro no banco de dados.
                                    <br /><br />
                                    <strong>Atenção:</strong> Digite o nome do projeto para confirmar.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder={`Digite "${siteName}" para confirmar`}
                                    value={deleteInput}
                                    onChange={e => setDeleteInput(e.target.value)}
                                    className="w-full px-4 py-4 bg-gray-50 border border-red-100 rounded-2xl text-sm focus:ring-2 focus:ring-red-500 outline-none font-bold"
                                />
                                <button
                                    onClick={handleDeleteSite}
                                    disabled={loading || deleteInput !== siteName}
                                    className="w-full py-5 bg-red-600 text-white rounded-[24px] font-black hover:bg-red-700 transition-all shadow-2xl shadow-red-100 active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-30"
                                >
                                    {loading ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Trash2 className="w-6 h-6" />}
                                    Excluir Site Permanentemente
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
