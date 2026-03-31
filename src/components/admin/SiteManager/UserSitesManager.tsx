import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ExternalLink, Settings, LayoutDashboard, Globe, ShieldAlert, ArrowRight, Loader2, Plus } from 'lucide-react';
import SalesPage from './SalesPage';
import SiteDetails from './SiteDetails';

interface UserSite {
    id: string;
    domain?: string;
    github_repo: string;
    created_at: string;
    template_id?: string;
    vercel_project_id?: string; // ID do projeto na Vercel
}

export default function UserSitesManager() {
    const [sites, setSites] = useState<UserSite[]>([]);
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedSite, setSelectedSite] = useState<UserSite | null>(null);

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Verificar todos os acessos/produtos do usuário no perfil (Modelo Multi-Acesso)
            const { data: profileRecords } = await supabase.from('profiles')
                .select('*')
                .eq('id', user.id);

            // Verifica se existe algum registro que dê acesso ao Upsell de Sites
            // Verifica se existe algum registro que dê acesso (qualquer assinatura ativa)
            const hasActiveSubscription = profileRecords?.some(p => {
                const isPaid = p.subscription_status === 'active';
                const notExpired = !p.subscription_period_end || new Date(p.subscription_period_end) > new Date();

                return isPaid && notExpired;
            });

            // Se for admin, tem acesso por padrão
            const isAdmin = profileRecords?.some(p => p.role === 'admin');

            setHasAccess(hasActiveSubscription || isAdmin || false);

            // 2. Buscar sites do usuário via API segura (Para contornar RLS em sites antigos)
            const token = (await supabase.auth.getSession()).data.session?.access_token;
            const res = await fetch('/api/admin/my-sites', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const userSites = await res.json();

            if (res.ok && userSites) {
                setSites(userSites);
            } else if (!res.ok) {
                console.error('Erro na API de sites:', userSites.error);
            }
        } catch (err) {
            console.error('Erro ao carregar dados:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-[#7c3aed]" />
            <p className="text-gray-500 font-medium">Carregando seus sites...</p>
        </div>
    );

    // Se o usuário selecionou um site para gerenciar (Tela Pro Estilo Vercel)
    if (selectedSite) {
        return <SiteDetails site={selectedSite} onBack={() => setSelectedSite(null)} />;
    }

    // Se o usuário NÃO tem o Upsell (Mostra Página de Vendas)
    if (hasAccess === false) {
        return <SalesPage />;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-900">Gerenciar Meus Sites</h2>
                    <p className="text-sm text-gray-500 font-medium mt-1">Controle seus deploys, domínios e configurações avançadas.</p>
                </div>
                <a href="/sites" className="flex items-center gap-2 bg-[#7c3aed] text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-[#6d28d9] transition shadow-lg shadow-purple-500/20 active:scale-95">
                    <Plus className="w-5 h-5" />
                    Criar Novo Site
                </a>
            </div>

            {sites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {sites.map((site) => (
                        <div key={site.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-[#7c3aed]/20 transition-all group overflow-hidden flex flex-col h-full">
                            {/* Preview/Header do Card */}
                            <div className="h-40 bg-slate-50 relative border-b border-gray-50 overflow-hidden group/img">
                                {(() => {
                                    const siteDomain = site.domain || `${site.github_repo.split('/').pop()}.vercel.app`;
                                    // Usando Microlink que é muito estável e suporta HTTPS sem problemas
                                    const screenshotUrl = `https://api.microlink.io/?url=https://${siteDomain}&screenshot=true&meta=false&embed=screenshot.url`;

                                    return (
                                        <>
                                            {/* Imagem Real do Site via Screenshot Service */}
                                            <img
                                                src={screenshotUrl}
                                                alt={site.github_repo}
                                                className="w-full h-full object-cover object-top transition-transform duration-700 group-hover/img:scale-110"
                                                loading="lazy"
                                                onLoad={(e) => {
                                                    const parent = (e.currentTarget as HTMLImageElement).parentElement;
                                                    if (parent) {
                                                        const placeholder = parent.querySelector('.screenshot-placeholder');
                                                        if (placeholder) placeholder.classList.add('hidden');
                                                    }
                                                }}
                                                onError={(e) => {
                                                    console.warn(`[PREVIEW] Falha no primeiro serviço para: ${siteDomain}. Tentando fallback...`);
                                                    const img = e.currentTarget as HTMLImageElement;

                                                    // Fallback para thum.io (Backup)
                                                    img.src = `https://image.thum.io/get/width/400/crop/800/https://${siteDomain}`;

                                                    img.onerror = () => {
                                                        img.style.display = 'none';
                                                        const parent = img.parentElement;
                                                        if (parent) {
                                                            const placeholder = parent.querySelector('.screenshot-placeholder');
                                                            if (placeholder) {
                                                                placeholder.classList.remove('hidden');
                                                                // Remove animação de pulse pois falhou mesmo
                                                                const pulseIcon = placeholder.querySelector('.animate-pulse');
                                                                if (pulseIcon) pulseIcon.classList.remove('animate-pulse');
                                                            }
                                                        }
                                                    };
                                                }}
                                            />

                                            {/* Loader/Placeholder visível durante o carregamento */}
                                            <div className="screenshot-placeholder absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 z-[1]">
                                                <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-300 animate-pulse">
                                                    <Globe className="w-6 h-6" />
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-bold mt-2 tracking-widest uppercase">Capturando...</span>
                                            </div>

                                            {/* Overlay Gradiente */}
                                            <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-black/20 to-transparent pointer-events-none z-[2]"></div>
                                        </>
                                    );
                                })()}

                                <div className="absolute top-4 right-4 z-[3]">
                                    <span className="px-2.5 py-1 bg-emerald-500/90 text-white backdrop-blur-sm text-[10px] font-black rounded-full border border-emerald-400 shadow-lg">NO AR</span>
                                </div>
                            </div>

                            <div className="p-6 flex-1 flex flex-col">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <h3 className="text-lg font-bold text-gray-900 truncate" title={site.github_repo}>
                                        {site.github_repo.split('/').pop()}
                                    </h3>
                                    <a
                                        href={site.domain ? `https://${site.domain}` : `https://${site.github_repo}.vercel.app`}
                                        target="_blank"
                                        className="p-1.5 text-gray-400 hover:text-[#7c3aed] hover:bg-purple-50 rounded-lg transition-colors shrink-0"
                                        title="Ver Site"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                    </a>
                                </div>
                                <p className="text-xs text-gray-400 font-mono mb-6 truncate">
                                    {site.domain || `${site.github_repo.split('/').pop()}.vercel.app`}
                                </p>

                                <div className="grid grid-cols-2 gap-2 mt-auto">
                                    {/* Botão Admin (CMS) */}
                                    <a
                                        href={site.domain ? `https://${site.domain}/admin` : `https://${site.github_repo.split('/').pop()}.vercel.app/admin`}
                                        target="_blank"
                                        className="flex items-center justify-center gap-1.5 py-2 bg-blue-50/50 text-blue-600 rounded-xl text-[12px] font-bold hover:bg-blue-100 transition"
                                    >
                                        <LayoutDashboard className="w-3.5 h-3.5" />
                                        Painel CMS
                                    </a>

                                    {/* Botão Gerenciar Pro (Vercel) */}
                                    <button
                                        onClick={() => setSelectedSite(site)}
                                        className="flex items-center justify-center gap-1.5 py-2 bg-purple-50/30 text-[#7c3aed] rounded-xl text-[12px] font-bold hover:bg-purple-100 transition border border-purple-100/50"
                                    >
                                        <Settings className="w-3.5 h-3.5" />
                                        Gerenciar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-gray-300 shadow-sm">
                        <Globe className="w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-800">Nenhum site encontrado</h3>
                        <p className="text-gray-500 text-sm max-w-sm mt-1">Você ainda não criou nenhum site a partir da nossa aplicação. Seus sites ativos aparecerão aqui.</p>
                    </div>
                    <a href="/sites" className="mt-4 flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-[#7c3aed] transition shadow-xl active:scale-95">
                        Começar Agora
                        <ArrowRight className="w-5 h-5" />
                    </a>
                </div>
            )}
        </div>
    );
}
