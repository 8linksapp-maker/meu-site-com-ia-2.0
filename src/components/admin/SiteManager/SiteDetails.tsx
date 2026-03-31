import React, { useState } from 'react';
import { ArrowLeft, Globe, LayoutDashboard, CheckCircle2, Calendar, FileCode, ExternalLink, Trash2, ShieldAlert, Cpu, Layers } from 'lucide-react';

interface UserSite {
    id: string;
    domain?: string;
    github_repo: string;
    created_at: string;
    template_id?: string;
}

interface SiteDetailsProps {
    site: UserSite;
    onBack: () => void;
}

export default function SiteDetails({ site, onBack }: SiteDetailsProps) {
    const [activeTab, setActiveTab] = useState('overview');
    const siteName = site.github_repo.split('/').pop() || 'meu-site';
    const siteUrl = site.domain || `${siteName}.vercel.app`;
    const createdAt = new Date(site.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });

    const tabs = [
        { id: 'overview', label: 'Visão Geral' },
        { id: 'deploys', label: 'Deploys' },
        { id: 'domains', label: 'Domínios' },
        { id: 'envs', label: 'Variáveis (ENV)' },
        { id: 'settings', label: 'Configurações' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
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
                        {/* Main Site Header Card */}
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

                        {/* Top Stats Cards */}
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

                        {/* Domains Section */}
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-gray-50 px-8">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    Domínios Conectados (Vercel)
                                </h3>
                            </div>
                            <div className="p-8">
                                <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-[#7c3aed]/20 transition-all">
                                    <div className="flex items-center gap-3">
                                        <Globe className="w-5 h-5 text-gray-400" />
                                        <code className="text-sm font-mono text-gray-600">{siteUrl}</code>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black rounded-lg">PRODUÇÃO</span>
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="space-y-6 animate-in fade-in duration-500 max-w-2xl">
                        <div className="bg-white p-8 rounded-3xl border border-red-100 shadow-sm">
                            <div className="flex items-start gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                                    <ShieldAlert className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-red-600">Zona de Perigo</h3>
                                    <p className="text-sm text-gray-500">Estas ações são permanentes e não podem ser desfeitas.</p>
                                </div>
                            </div>

                            <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100 mb-6 flex items-center gap-3">
                                <Trash2 className="w-4 h-4 text-red-500" />
                                <p className="text-xs text-red-800 font-medium">Ao excluir o site, removeremos o repositório no GitHub e o projeto na Vercel.</p>
                            </div>

                            <button className="w-full py-4 bg-red-600 text-white rounded-2xl font-black hover:bg-red-700 transition-all shadow-xl shadow-red-200 active:scale-95 flex items-center justify-center gap-2">
                                <Trash2 className="w-5 h-5" />
                                Excluir Site Permanentemente
                            </button>
                        </div>
                    </div>
                )}

                {activeTab !== 'overview' && activeTab !== 'settings' && (
                    <div className="bg-gray-50 rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
                        <Cpu className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-800">Em Desenvolvimento</h3>
                        <p className="text-sm text-gray-500">Esta aba está sendo integrada com a API da Vercel.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
