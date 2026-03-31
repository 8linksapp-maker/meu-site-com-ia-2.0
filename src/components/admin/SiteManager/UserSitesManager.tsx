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
    const [hasUpsell, setHasUpsell] = useState<boolean | null>(null);
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

            // 1. Verificar acesso ao Upsell no perfil
            const { data: profile } = await supabase.from('profiles')
                .select('has_upsell_sites, role')
                .eq('id', user.id)
                .single();

            // Administradores sempre têm acesso por padrão para teste
            setHasUpsell(profile?.has_upsell_sites || profile?.role === 'admin' || false);

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
    if (hasUpsell === false) {
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
                                    // Usando s-shot.com que é extremamente estável para sites públicos
                                    const screenshotUrl = `https://mini.s-shot.com/1280x800/400/png/?https://${siteDomain}`;

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

                                                    // Fallback para Microlink (Backup)
                                                    img.src = `https://api.microlink.io/?url=https://${siteDomain}&screenshot=true&embed=screenshot.url`;

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
                                <h3 className="text-lg font-bold text-gray-900 truncate mb-1" title={site.github_repo}>
                                    {site.github_repo.split('/').pop()}
                                </h3>
                                <p className="text-xs text-gray-400 font-mono mb-6 truncate">
                                    {site.domain || `${site.github_repo.split('/').pop()}.vercel.app`}
                                </p>

                                <div className="grid grid-cols-1 gap-2 mt-auto">
                                    {/* Botão de Ver Site */}
                                    <a
                                        href={site.domain ? `https://${site.domain}` : `https://${site.github_repo.split('/').pop()}.vercel.app`}
                                        target="_blank"
                                        className="flex items-center justify-center gap-2 py-2.5 bg-gray-50 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-100 transition"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Ver Site
                                    </a>

                                    {/* Botão Admin (CMS) */}
                                    <a
                                        href={site.domain ? `https://${site.domain}/admin` : `https://${site.github_repo.split('/').pop()}.vercel.app/admin`}
                                        target="_blank"
                                        className="flex items-center justify-center gap-2 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-100 transition"
                                    >
                                        <LayoutDashboard className="w-4 h-4" />
                                        Painel Admin (CMS)
                                    </a>

                                    {/* Botão Gerenciar Pro (Vercel) */}
                                    <button
                                        onClick={() => setSelectedSite(site)}
                                        className="flex items-center justify-center gap-2 py-2.5 bg-purple-50 text-[#7c3aed] rounded-xl text-sm font-bold hover:bg-purple-100 transition border border-purple-100"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Gerenciar (Vercel)
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
