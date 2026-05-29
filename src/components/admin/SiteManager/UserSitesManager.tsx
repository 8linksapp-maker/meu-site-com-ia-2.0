import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ExternalLink, Globe, ArrowRight, Plus, LayoutDashboard, Loader2 } from 'lucide-react';
import SalesPage from './SalesPage';
import { Section, EmptyState, Card } from '../../ui';

interface UserSite {
    id: string;
    domain?: string;
    github_repo: string;
    created_at: string;
    template_id?: string;
    vercel_project_id?: string;
}

export default function UserSitesManager() {
    const [sites, setSites] = useState<UserSite[]>([]);
    const [hasAccess, setHasAccess] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchUserData(); }, []);

    const fetchUserData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: profileRecords } = await supabase.from('profiles')
                .select('*')
                .eq('id', user.id);

            const hasActiveSubscription = profileRecords?.some(p => {
                const isPaid = p.subscription_status === 'active';
                const notExpired = !p.subscription_period_end || new Date(p.subscription_period_end) > new Date();
                return isPaid && notExpired;
            });

            const isAdmin = profileRecords?.some(p => p.role === 'admin');
            setHasAccess(hasActiveSubscription || isAdmin || false);

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

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 gap-3">
                <Loader2 className="w-7 h-7 animate-spin text-coral-terra" />
                <p className="text-cafe-medio text-sm">Carregando sua carteira…</p>
            </div>
        );
    }

    if (hasAccess === false) {
        return <SalesPage />;
    }

    const totalSites = sites.length;
    const tagline = totalSites === 0
        ? 'Sua carteira ainda está vazia. Hora de publicar o primeiro.'
        : totalSites === 1
            ? '1 site no ar. Próximo passo: editar conteúdo ou criar mais.'
            : `${totalSites} sites no ar. Gerencie cada um e crie o próximo.`;

    return (
        <div className="space-y-6 pb-8">
            <Section
                title="Sua carteira"
                tagline={tagline}
                action={
                    <a
                        href="/sites"
                        className="inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-5 py-2.5 rounded-[12px] font-semibold text-sm transition-colors active:scale-[0.98] whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra min-h-[44px]"
                    >
                        <Plus className="w-4 h-4" />
                        Criar novo site
                    </a>
                }
            >
                {sites.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {sites.map((site) => {
                            const name = site.github_repo?.split('/').pop() || site.github_repo;
                            const domain = site.domain || `${name}.vercel.app`;
                            const screenshotUrl = `https://api.microlink.io/?url=https://${domain}&screenshot=true&meta=false&embed=screenshot.url`;
                            const createdAt = new Date(site.created_at);
                            const daysAgo = Math.max(1, Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)));

                            return (
                                <Card key={site.id} padding="sm" interactive className="!p-0 overflow-hidden flex flex-col">
                                    {/* Screenshot */}
                                    <a
                                        href={`/meus-sites/${site.id}`}
                                        className="block h-36 bg-cream-elevated relative overflow-hidden border-b border-borda-cafe focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-coral-terra"
                                        aria-label={`Gerenciar ${name}`}
                                    >
                                        <img
                                            src={screenshotUrl}
                                            alt={`Captura de tela de ${name}`}
                                            loading="lazy"
                                            className="w-full h-full object-cover object-top"
                                            onError={(e) => {
                                                const img = e.currentTarget as HTMLImageElement;
                                                img.src = `https://image.thum.io/get/width/400/crop/800/https://${domain}`;
                                                img.onerror = () => { img.style.display = 'none'; };
                                            }}
                                        />
                                        <span className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 bg-verde-oliva text-papel-craft text-xs font-semibold rounded-full uppercase tracking-wide">
                                            <span className="w-1.5 h-1.5 rounded-full bg-papel-craft" />
                                            Online
                                        </span>
                                    </a>

                                    {/* Conteúdo */}
                                    <div className="p-4 flex-1 flex flex-col">
                                        <a
                                            href={`/meus-sites/${site.id}`}
                                            className="font-display text-lg font-normal text-carvao-quente tracking-tight truncate hover:text-coral-terra transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra rounded-sm"
                                            title={name}
                                        >
                                            {name}
                                        </a>
                                        <p className="font-mono text-xs text-cafe-cinza-quente truncate mt-0.5">
                                            {domain}
                                        </p>
                                        <p className="text-xs text-cafe-cinza-quente mt-2 tabular-nums">
                                            No ar há {daysAgo} {daysAgo === 1 ? 'dia' : 'dias'}
                                        </p>

                                        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-borda-cafe">
                                            <a
                                                href={`https://${domain}/admin`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-3 py-2 rounded-[10px] font-semibold text-xs transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra min-h-[40px]"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <LayoutDashboard className="w-3.5 h-3.5" />
                                                Editar
                                            </a>
                                            <a
                                                href={`/meus-sites/${site.id}`}
                                                className="flex-1 inline-flex items-center justify-center gap-1.5 bg-cream-elevated hover:bg-coral-wash text-carvao-quente hover:text-terracota-profundo border border-borda-cafe px-3 py-2 rounded-[10px] font-semibold text-xs transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra min-h-[40px]"
                                            >
                                                Configurar
                                            </a>
                                            <a
                                                href={`https://${domain}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center justify-center w-10 h-10 text-cafe-cinza-quente hover:text-coral-terra hover:bg-coral-wash rounded-[10px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra"
                                                onClick={(e) => e.stopPropagation()}
                                                title="Abrir site em nova aba"
                                                aria-label="Abrir site em nova aba"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}

                        {/* + Criar novo */}
                        <a
                            href="/sites"
                            className="bg-transparent rounded-[12px] border border-dashed border-borda-cafe hover:border-coral-terra hover:bg-cream-elevated transition-colors flex flex-col items-center justify-center gap-3 p-6 group min-h-[300px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra"
                        >
                            <div className="w-12 h-12 rounded-full border border-borda-cafe group-hover:border-coral-terra group-hover:bg-coral-wash flex items-center justify-center transition-colors">
                                <Plus className="w-5 h-5 text-cafe-cinza-quente group-hover:text-coral-terra transition-colors" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-cafe-medio group-hover:text-coral-terra transition-colors">
                                    Criar novo site
                                </p>
                                <p className="text-xs text-cafe-cinza-quente mt-1">Pronto em 2 minutos</p>
                            </div>
                        </a>
                    </div>
                ) : (
                    <EmptyState
                        icon={Globe}
                        title="Hora de publicar seu primeiro site"
                        description="Sua carteira de sites começa com o primeiro. Escolha um template, dá um nome e publica em menos de 2 minutos."
                        action={
                            <a
                                href="/sites"
                                className="inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-6 py-3 rounded-[12px] font-semibold text-base transition-colors active:scale-[0.98] min-h-[44px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra"
                            >
                                Escolher um template
                                <ArrowRight className="w-4 h-4" />
                            </a>
                        }
                    />
                )}
            </Section>
        </div>
    );
}
