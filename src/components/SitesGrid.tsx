import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
    showOnlyFavorites?: boolean;
}

export default function SitesGrid({ showOnlyFavorites = false }: Props) {
    const [templates, setTemplates] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [fetchingTemplates, setFetchingTemplates] = useState(true);
    const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
    const [hasTokens, setHasTokens] = useState<boolean | null>(null);
    const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
    const [selectedFilterCategory, setSelectedFilterCategory] = useState<string | null>(null);
    const [checkoutUrl, setCheckoutUrl] = useState<string>('#');

    // Estado do Modal Envato-Style
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [isDeployMode, setIsDeployMode] = useState(false);
    const [repoName, setRepoName] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [deployedUrl, setDeployedUrl] = useState('');

    // Estado do Carrossel de Imagens
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Estado dos Relacionados
    const [visibleRelatedCount, setVisibleRelatedCount] = useState(4);
    const [loadingMoreRelated, setLoadingMoreRelated] = useState(false);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setFetchingTemplates(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('github_token, vercel_token, subscription_status')
                    .eq('id', session.user.id)
                    .single();

                if (profile?.github_token && profile?.vercel_token) {
                    setHasTokens(true);
                } else {
                    setHasTokens(false);
                }
                setSubscriptionStatus(profile?.subscription_status || 'inactive');

                // Carregar favoritos iniciais
                const { data: favs } = await supabase.from('user_favorites').select('template_id').eq('user_id', session.user.id);
                if (favs) setFavoriteIds(favs.map(f => f.template_id));
            }

            // Fetch categories for badges
            const { data: cats } = await supabase.from('template_categories').select('*');
            if (cats) setCategories(cats);

            // Fetch platform settings
            const { data: settings } = await supabase.from('platform_settings').select('checkout_url').limit(1).single();
            if (settings?.checkout_url) {
                setCheckoutUrl(settings.checkout_url);
            }

        } catch (e) {
            console.error(e);
        }

        const { data, error } = await supabase.from('templates').select('*').order('created_at', { ascending: false });
        if (data) {
            setTemplates(data);
        }
        setFetchingTemplates(false);
    };

    const toggleFavorite = async (templateId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const isFavorited = favoriteIds.includes(templateId);
        if (isFavorited) {
            setFavoriteIds(prev => prev.filter(id => id !== templateId));
            await supabase.from('user_favorites').delete().eq('user_id', session.user.id).eq('template_id', templateId);
        } else {
            setFavoriteIds(prev => [...prev, templateId]);
            await supabase.from('user_favorites').insert({ user_id: session.user.id, template_id: templateId });
        }
    };

    const handleDeploy = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus('Iniciando deploy...');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const { data: profile } = await supabase
                .from('profiles')
                .select('github_token, vercel_token')
                .eq('id', user.id)
                .single();

            if (!profile?.github_token || !profile?.vercel_token) {
                throw new Error('Tokens não configurados! Vá preenchê-los na Aba de Integração em Configurações.');
            }

            const res = await fetch('/api/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    templateRepo: selectedTemplate.repo,
                    templateId: selectedTemplate.id,
                    newRepoName: repoName,
                    adminPassword,
                    githubToken: profile.github_token,
                    vercelToken: profile.vercel_token
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro no deploy');

            setStatus('Repositório criado! Construindo Site na Vercel (Isso pode levar até 1 minuto)...');

            if (data.deploymentId) {
                const pollInterval = setInterval(async () => {
                    try {
                        const checkRes = await fetch('/api/check-deploy', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ deploymentId: data.deploymentId, vercelToken: profile.vercel_token })
                        });
                        const checkData = await checkRes.json();

                        if (checkData.readyState === 'READY') {
                            clearInterval(pollInterval);
                            setStatus('✅ Seu site está online!');
                            setDeployedUrl(checkData.url);
                            setLoading(false);
                        } else if (checkData.readyState === 'ERROR' || checkData.readyState === 'CANCELED') {
                            clearInterval(pollInterval);
                            setStatus('❌ Ocorreu um erro na compilação do código (Vercel).');
                            setLoading(false);
                        } else {
                            setStatus(`⏳ Construindo Site... (${checkData.readyState || 'BUILDING'})`);
                        }
                    } catch (err) {
                        console.error('Erro no polling', err);
                    }
                }, 4000);
            } else {
                setStatus('Deploy iniciado com sucesso!');
                setLoading(false);
            }
        } catch (err: any) {
            setStatus(`❌ Erro: ${err.message}`);
            setLoading(false);
        }
    };

    const handleOpenTemplate = (template: any) => {
        setSelectedTemplate(template);
        setIsDeployMode(false);
        setRepoName('');
        setAdminPassword('');
        setStatus('');
        setDeployedUrl('');
        setCurrentImageIndex(0); // Resetar carrossel ao abrir
        setVisibleRelatedCount(4);
        setLoadingMoreRelated(false);
    };

    if (fetchingTemplates || hasTokens === null || subscriptionStatus === null) {
        return <div className="text-gray-500 p-8 flex justify-center text-sm animate-pulse">Carregando dados da plataforma...</div>;
    }

    if (templates.length === 0) {
        return <div className="text-gray-500">Nenhum template disponível no momento.</div>;
    }

    const activeCategories = selectedTemplate?.category_ids
        ? categories.filter(c => selectedTemplate.category_ids.includes(c.id))
        : [];

    const carouselImages = selectedTemplate?.images || (
        selectedTemplate?.image_url
            // Adicionando imagens placeholder genéricas para testes caso o DB tenha só 1 por enquanto
            ? [selectedTemplate.image_url, "https://images.unsplash.com/photo-1498050108023-c5249f4df085?q=80&w=2072&auto=format&fit=crop", "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=2070&auto=format&fit=crop"]
            : []
    );

    const handlePrevImage = () => {
        setCurrentImageIndex((prev) => prev === 0 ? carouselImages.length - 1 : prev - 1);
    };

    const handleNextImage = () => {
        setCurrentImageIndex((prev) => prev === carouselImages.length - 1 ? 0 : prev + 1);
    };

    const relatedTemplatesBase = selectedTemplate?.category_ids
        ? templates.filter(t => t.id !== selectedTemplate.id && t.category_ids?.some((c: string) => selectedTemplate.category_ids.includes(c)))
        : [];

    const handleRelatedScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollLeft, scrollWidth, clientWidth } = e.currentTarget;
        if (scrollLeft + clientWidth >= scrollWidth - 20) {
            if (!loadingMoreRelated && visibleRelatedCount < relatedTemplatesBase.length) {
                setLoadingMoreRelated(true);
                setTimeout(() => {
                    setVisibleRelatedCount(prev => prev + 4);
                    setLoadingMoreRelated(false);
                }, 800); // tempo de espera falso pra mostrar a rolagem
            }
        }
    };

    if (hasTokens === false) {
        return (
            <div className="bg-white border border-gray-200 rounded-3xl p-10 text-left mx-auto shadow-sm max-w-4xl mt-10">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                    <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center text-3xl shadow-inner">⚠️</div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Integração Necessária</h2>
                        <p className="text-gray-500 mt-1">Configure seus Access Tokens para liberar a geração automática de sites.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <span className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs">1</span>
                            Token do GitHub (Armazenamento do Código)
                        </h4>
                        <p className="text-sm text-gray-600 mb-3 ml-8">
                            Nós criamos o repositório do site na sua própria conta do GitHub para que você tenha total controle do seu projeto.
                        </p>
                        <ul className="list-disc pl-12 text-sm text-gray-600 space-y-1.5">
                            <li>Acesse sua conta no GitHub e vá em <strong>Settings &gt; Developer Settings &gt; Personal Access Tokens (Tokens classic)</strong>.</li>
                            <li>Clique em <strong>Generate new token (classic)</strong>.</li>
                            <li>Dê um nome, não coloque data de expiração (No expiration), e marque apenas a caixa <code className="bg-gray-200 px-1 rounded">repo</code> (Full control of private repositories).</li>
                            <li>Gere e copie a chave que irá aparecer na tela verde.</li>
                        </ul>
                        <div className="ml-8 mt-4">
                            <a href="https://github.com/settings/tokens/new" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-sm transition">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
                                Gerar Token do GitHub
                            </a>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <span className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs">2</span>
                            Token da Vercel (Hospedagem do Site)
                        </h4>
                        <p className="text-sm text-gray-600 mb-3 ml-8">
                            A Vercel hospedará seu site gratuitamente, injetando as variáveis de ambiente e aplicando o certificado SSL (HTTPS).
                        </p>
                        <ul className="list-disc pl-12 text-sm text-gray-600 space-y-1.5">
                            <li>Crie uma conta na Vercel se não tiver, e vá em <strong>Account Settings &gt; Tokens</strong>.</li>
                            <li>Crie um novo token com o escopo padrão (Full Access).</li>
                            <li>Gere e copie a chave longa.</li>
                        </ul>
                        <div className="ml-8 mt-4">
                            <a href="https://vercel.com/account/tokens" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-black hover:bg-gray-800 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-sm transition">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M24 22.525H0l12-21.05 12 21.05z" /></svg>
                                Gerar Token da Vercel
                            </a>
                        </div>
                    </div>

                    <div className="bg-[#7c3aed]/5 p-6 rounded-2xl border border-[#7c3aed]/20 flex justify-between items-center shadow-sm">
                        <div>
                            <h4 className="font-bold text-[#7c3aed] mb-1 flex items-center gap-2">
                                <span className="w-6 h-6 bg-[#7c3aed] text-white rounded-full flex items-center justify-center text-xs shadow-md">3</span>
                                Salve as Chaves na Plataforma
                            </h4>
                            <p className="text-sm text-gray-600 ml-8 max-w-lg">
                                Após possuir as duas chaves copiadas nas etapas acima, acesse o menu <strong>"Integrações"</strong> na barra lateral esquerda aqui do painel e salve-as lá. Depois retorne para esta vitrine.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">

            {/* AVISOS GLOBAIS (APARECEM SE O USUÁRIO TIVER PENDÊNCIAS) */}
            {subscriptionStatus !== 'active' && (
                <div className="flex flex-col gap-4 mb-6">
                    <div className="bg-[#7c3aed]/5 border border-[#7c3aed]/20 rounded-2xl p-6 text-[#7c3aed] shadow-sm text-left flex items-start sm:items-center justify-between flex-col sm:flex-row gap-5">
                        <div>
                            <h3 className="text-lg font-extrabold mb-1 flex items-center gap-2 text-gray-900">💎 Desbloqueie a Criação Automática</h3>
                            <p className="text-sm text-gray-600">
                                Sua assinatura atual está inativa. Ative seu plano para ganhar acesso premium e clonar sites infinitos em segundos usando a Vercel.
                            </p>
                        </div>
                        <a href={checkoutUrl} target="_blank" rel="noreferrer" className="whitespace-nowrap shrink-0 bg-[#7c3aed] hover:bg-[#6d28d9] text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
                            Ativar Plano Agora
                        </a>
                    </div>
                </div>
            )}

            {/* BARRA DE FILTRO POR CATEGORIA */}
            <div className="flex gap-2 overflow-x-auto pb-4 mb-2 hide-scrollbar w-full">
                <button
                    onClick={() => setSelectedFilterCategory(null)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${selectedFilterCategory === null
                        ? 'bg-[#7c3aed] text-white shadow-md'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                        }`}
                >
                    Todos
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedFilterCategory(cat.id)}
                        className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${selectedFilterCategory === cat.id
                            ? 'bg-[#7c3aed] text-white shadow-md'
                            : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {/* GRID NORMAL DE TEMPLATES */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {(() => {
                    const filteredByCategory = selectedFilterCategory
                        ? templates.filter(t => t.category_ids?.includes(selectedFilterCategory))
                        : templates;

                    const displayed = showOnlyFavorites
                        ? filteredByCategory.filter(t => favoriteIds.includes(t.id))
                        : filteredByCategory;

                    if (displayed.length === 0 && showOnlyFavorites) {
                        return <div className="col-span-full py-16 text-center text-gray-500 bg-white rounded-2xl border border-dashed border-gray-200">Você ainda não favoritou nenhum template! ❤️</div>;
                    }

                    return displayed.map((template) => {
                        const cardCategories = template.category_ids
                            ? categories.filter(c => template.category_ids.includes(c.id))
                            : [];

                        return (
                            <div
                                key={template.id}
                                onClick={() => handleOpenTemplate(template)}
                                className="bg-white border text-left border-gray-200 rounded-xl overflow-hidden hover:shadow-xl hover:border-[#7c3aed]/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col group relative"
                            >
                                <div className="absolute top-3 right-3 z-10" title={favoriteIds.includes(template.id) ? "Remover dos Favoritos" : "Adicionar aos Favoritos"}>
                                    <button
                                        onClick={(e) => toggleFavorite(template.id, e)}
                                        className={`w-9 h-9 rounded-full flex items-center justify-center backdrop-blur-md shadow-sm transition-all duration-300 ${favoriteIds.includes(template.id) ? 'bg-rose-500 text-white hover:bg-rose-600 scale-110' : 'bg-white/90 hover:bg-white text-gray-400 hover:text-rose-500'}`}
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill={favoriteIds.includes(template.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                                    </button>
                                </div>
                                {template.image_url ? (
                                    <div className="h-48 w-full bg-gray-100 overflow-hidden relative">
                                        <img src={template.image_url} alt={template.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition"></div>
                                    </div>
                                ) : (
                                    <div className="h-48 bg-[#7c3aed]/10 flex items-center justify-center p-4 relative">
                                        <span className="text-2xl font-bold text-[#7c3aed] text-center">{template.name}</span>
                                    </div>
                                )}
                                <div className="p-5 flex-1 flex flex-col relative z-10 bg-white">
                                    {cardCategories.length > 0 && (
                                        <div className="flex flex-wrap justify-end gap-1.5 mb-2.5">
                                            {cardCategories.map(c => (
                                                <span key={c.id} className="px-2 py-1 text-[9px] font-bold uppercase tracking-widest rounded-md text-[#7c3aed] bg-[#7c3aed]/10 border border-[#7c3aed]/20">
                                                    {c.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{template.name}</h3>
                                    <p className="mt-1.5 text-sm text-gray-500 flex-1 line-clamp-2 mb-2">{template.description}</p>
                                    <span className="mt-auto pt-4 font-semibold text-sm flex items-center text-gray-500 group-hover:text-[#7c3aed] transition">
                                        Ver Detalhes
                                        <svg className="ml-1 w-4 h-4 opacity-0 group-hover:opacity-100 transform -translate-x-2 group-hover:translate-x-0 transition-all duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                    </span>
                                </div>
                            </div>
                        )
                    })
                })()}
            </div>

            {/* MODAL SLIDE-OVER DA DIREITA */}
            {selectedTemplate && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* OVERLAY BORRADO (Esquerda escurecida) */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                        onClick={() => setSelectedTemplate(null)}
                    ></div>

                    {/* PAINEL DESLIZANTE DA DIREITA */}
                    <div id="slide-over-panel" className="relative w-full max-w-[1380px] h-full bg-[#f8fafc] shadow-2xl flex flex-col overflow-y-auto pb-12 animate-slide-in-right">

                        {/* CLOSE BUTTON (TOP ROW) E ESQUERDA */}
                        <div className="pt-6 px-4 lg:px-8 w-full flex justify-start">
                            <button
                                onClick={() => setSelectedTemplate(null)}
                                className="p-2.5 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-100 hover:scale-105 text-gray-500 hover:text-gray-900 transition-all"
                            >
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>

                        {/* CONTENT */}
                        <div className="w-full mx-auto px-4 lg:px-8 py-4 flex flex-col">
                            {/* GRID COM ROw-START E ROW-SPAN */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-y-4 lg:gap-x-8 items-stretch">

                                {/* LEFT COLUMN: IMAGE DISPLAY (ROW 1) */}
                                <div className="lg:col-span-8 lg:row-start-1 bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-200 flex items-center justify-center p-2 lg:p-3 relative group w-full min-h-[340px] lg:min-h-[440px] max-h-[550px]">
                                    {carouselImages.length > 0 ? (
                                        <>
                                            <img src={carouselImages[currentImageIndex]} alt={selectedTemplate.name} className="w-full h-full object-cover rounded-2xl ring-1 ring-gray-100 transition-transform duration-700" />

                                            {/* CAROUSEL ARROWS */}
                                            {carouselImages.length > 1 && (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handlePrevImage(); }}
                                                        className="absolute left-6 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/90 hover:bg-white backdrop-blur-md shadow-lg border border-gray-100 text-gray-800 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-105 transition-all duration-300 z-10"
                                                    >
                                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleNextImage(); }}
                                                        className="absolute right-6 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/90 hover:bg-white backdrop-blur-md shadow-lg border border-gray-100 text-gray-800 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-105 transition-all duration-300 z-10"
                                                    >
                                                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                                                    </button>
                                                </>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-4xl font-bold text-gray-300">{selectedTemplate.name}</div>
                                    )}
                                </div>

                                {/* RIGHT COLUMN: SIDEBAR (ROW 1) */}
                                <div className="lg:col-span-4 lg:row-start-1 bg-white rounded-3xl shadow-xl shadow-[#7c3aed]/5 border border-[#7c3aed]/10 p-5 lg:p-6 flex flex-col h-full overflow-hidden max-h-[85vh] xl:max-h-[550px]">
                                    <h1 className="text-2xl font-extrabold text-gray-900 leading-tight tracking-tight line-clamp-2">{selectedTemplate.name}</h1>
                                    <p className="text-xs text-gray-500 mt-1 mb-2">
                                        por <span className="text-[#7c3aed] font-semibold">Meu Site Com IA</span>
                                    </p>

                                    {/* Tags */}
                                    {activeCategories.length > 0 && (
                                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                                            {activeCategories.map(c => (
                                                <span key={c.id} className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border border-[#7c3aed]/20 rounded-full text-[#7c3aed] bg-[#7c3aed]/5">
                                                    {c.name}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-5 space-y-2.5">
                                        {hasTokens === false && (
                                            <div className="bg-red-50 text-red-600 p-2.5 rounded-lg text-xs mb-3 border border-red-100">
                                                Configure os tokens primeiro.
                                            </div>
                                        )}
                                        {subscriptionStatus !== 'active' && hasTokens !== false && (
                                            <div className="bg-amber-50 text-amber-700 p-2.5 rounded-lg text-xs mb-3 border border-amber-200">
                                                Sua assinatura está inativa. <a href="#" className="font-bold underline hover:text-amber-900 transition">Assine agora</a> para criar sites ilimitados.
                                            </div>
                                        )}
                                        {subscriptionStatus !== 'active' ? (
                                            <button disabled className="w-full flex items-center justify-center gap-2 py-2.5 lg:py-3 px-4 border-2 border-gray-100 rounded-xl text-xs font-bold text-gray-400 bg-gray-50 cursor-not-allowed opacity-60">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                                                Prévia Cadastrada (Assine)
                                            </button>
                                        ) : (
                                            <a
                                                href={selectedTemplate.preview_url || `https://github.com/${selectedTemplate.repo}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="w-full flex items-center justify-center gap-2 py-2.5 lg:py-3 px-4 border-2 border-gray-200 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-300 transition"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                                                Prévia ao vivo
                                            </a>
                                        )}
                                        <button
                                            disabled={hasTokens === false || subscriptionStatus !== 'active'}
                                            onClick={() => setIsDeployMode(true)}
                                            className="w-full flex items-center justify-center gap-2 py-2.5 lg:py-3 px-4 rounded-xl bg-[#7c3aed] text-white hover:bg-[#6d28d9] font-bold text-xs shadow-[0_8px_20px_-6px_rgba(124,58,237,0.5)] hover:shadow-[0_12px_25px_-8px_rgba(124,58,237,0.6)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                        >
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                            {subscriptionStatus !== 'active' ? 'Bloqueado' : 'Criar site'}
                                        </button>
                                    </div>

                                    <div className="mt-5 border-t border-gray-100 pt-4">
                                        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Detalhes</h3>
                                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                            <div className="flex flex-col bg-gray-50/50 p-2 rounded-lg">
                                                <span className="font-medium text-[10px] text-gray-400">Documentação</span>
                                                <span className="font-semibold text-gray-900 mt-0.5">Inclusa</span>
                                            </div>
                                            <div className="flex flex-col bg-gray-50/50 p-2 rounded-lg">
                                                <span className="font-medium text-[10px] text-gray-400">Responsivo</span>
                                                <span className="font-semibold text-gray-900 mt-0.5">Sim</span>
                                            </div>
                                            <div className="flex flex-col p-2">
                                                <span className="font-medium text-[10px] text-gray-400">Engine CMS</span>
                                                <span className="font-semibold text-[#7c3aed] mt-0.5">Astro & React</span>
                                            </div>
                                            <div className="flex flex-col p-2">
                                                <span className="font-medium text-[10px] text-gray-400">Licença</span>
                                                <span className="font-bold text-green-600 mt-0.5">Vitalícia</span>
                                            </div>
                                        </div>
                                    </div>

                                    {selectedTemplate.description && (
                                        <div className="mt-4 pt-4 border-t border-gray-100 flex-1 overflow-hidden">
                                            <p className="text-xs text-gray-500 leading-relaxed text-left line-clamp-3">
                                                {selectedTemplate.description}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* THUMBNAILS (ROW 2 - COL 8) Ficam exatamente abaixp da imagem principal */}
                                <div className="lg:col-span-8 lg:row-start-2">
                                    {carouselImages.length > 1 && (
                                        <div className="flex gap-3 overflow-x-auto py-2 w-full max-w-full hide-scrollbar">
                                            {carouselImages.map((imgUrl: string, idx: number) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => setCurrentImageIndex(idx)}
                                                    className={`w-28 h-18 lg:w-36 lg:h-20 rounded-xl overflow-hidden border-2 cursor-pointer transition-all duration-300 flex-shrink-0 relative group
                                                    ${currentImageIndex === idx ? 'border-[#7c3aed] shadow-lg opacity-100 ring-4 ring-[#7c3aed]/10 scale-[1.02]' : 'border-gray-200 opacity-60 hover:opacity-100 hover:border-gray-300'}
                                                    `}
                                                >
                                                    <img src={imgUrl} className="w-full h-full object-cover" />
                                                    {currentImageIndex !== idx && <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* LINHA 3: TEMPLATES RELACIONADOS FULL WIDTH */}
                                <div className="lg:col-span-12 lg:row-start-3 border-t border-gray-100 pt-8 mt-4">
                                    <h2 className="text-xl font-bold text-gray-900 mb-6">Templates Relacionados</h2>

                                    {relatedTemplatesBase.length > 0 ? (
                                        <div
                                            className="flex gap-6 overflow-x-auto pb-6 snap-x hide-scrollbar"
                                            onScroll={handleRelatedScroll}
                                        >
                                            {relatedTemplatesBase.slice(0, visibleRelatedCount).map((template) => {
                                                const relCategories = template.category_ids
                                                    ? categories.filter(c => template.category_ids.includes(c.id))
                                                    : [];

                                                return (
                                                    <div
                                                        key={template.id}
                                                        className="snap-start w-[260px] lg:w-[calc(25%-18px)] flex-shrink-0 bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:shadow-[#7c3aed]/10 hover:border-[#7c3aed]/30 hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                                                        onClick={() => {
                                                            // Seleciona o novo template e faz "scroll top" invisível
                                                            handleOpenTemplate(template);
                                                            const rightPanel = document.getElementById("slide-over-panel");
                                                            if (rightPanel) rightPanel.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }}
                                                    >
                                                        <div className="h-36 bg-gray-100 w-full relative overflow-hidden">
                                                            {template.image_url ? (
                                                                <img src={template.image_url} alt={template.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center bg-[#7c3aed]/10 text-[#7c3aed] font-bold text-sm">{template.name}</div>
                                                            )}
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition"></div>
                                                        </div>
                                                        <div className="p-4 bg-white relative z-10 flex flex-col">
                                                            {relCategories.length > 0 && (
                                                                <div className="flex flex-wrap justify-end gap-1 mb-1.5">
                                                                    {relCategories.slice(0, 2).map(c => (
                                                                        <span key={c.id} className="px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded text-[#7c3aed] bg-[#7c3aed]/10 border border-[#7c3aed]/20">
                                                                            {c.name}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            <h3 className="font-bold text-sm text-gray-900 truncate">{template.name}</h3>
                                                            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{template.description}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })}

                                            {loadingMoreRelated && (
                                                <div className="w-[80px] flex-shrink-0 flex items-center justify-center snap-start">
                                                    <div className="w-6 h-6 border-2 border-[#7c3aed]/30 border-t-[#7c3aed] rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500">Nenhum template semelhante foi encontrado nesta categoria.</p>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL ANTIGO DE DEPLOY QUE FICA POR CIMA DE TUDO */}
            {isDeployMode && selectedTemplate && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative">
                        <button
                            onClick={() => {
                                if (!loading) {
                                    setIsDeployMode(false);
                                    setDeployedUrl('');
                                    setStatus('');
                                }
                            }}
                            disabled={loading}
                            className="absolute top-5 right-5 text-gray-400 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 w-8 h-8 rounded-full flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            ✕
                        </button>

                        <div className="mb-6">
                            <h3 className="text-2xl font-bold text-gray-900">
                                Criar site
                            </h3>
                            <p className="text-sm text-gray-500 mt-2">
                                Configurando instalação de: <span className="font-semibold text-[#7c3aed]">{selectedTemplate.name}</span>
                            </p>
                        </div>

                        <form onSubmit={handleDeploy} className="space-y-4 text-left">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome do Novo Site</label>
                                <input
                                    type="text"
                                    required
                                    disabled={loading}
                                    placeholder="ex: meu-novo-site"
                                    value={repoName}
                                    onChange={(e) => setRepoName(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent transition disabled:bg-gray-100"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Senha do Painel Admin</label>
                                <input
                                    type="password"
                                    required
                                    disabled={loading}
                                    placeholder="********"
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent transition disabled:bg-gray-100"
                                />
                            </div>

                            {status && (
                                <div className={`p-4 rounded-xl text-sm transition-all mt-6 ${status.includes('Erro') || status.includes('❌') ? 'bg-red-50 text-red-700 border border-red-100' : status.includes('✅') ? 'bg-green-50 text-green-700 border border-green-100 shadow-inner' : 'bg-[#7c3aed]/10 text-[#7c3aed] border border-[#7c3aed]/20 relative overflow-hidden'}`}>
                                    <div className="flex flex-col gap-2 relative z-10">
                                        <span className="font-bold">{status}</span>
                                        {loading && (
                                            <div className="w-full bg-white/50 rounded-full h-1.5 overflow-hidden relative">
                                                <div className="absolute top-0 bottom-0 left-0 bg-[#7c3aed] w-1/2 rounded-full animate-pulse-fast"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {deployedUrl ? (
                                <div className="mt-6 flex flex-col gap-3">
                                    <a
                                        href={`https://${deployedUrl}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="w-full flex justify-center py-3.5 px-4 rounded-xl shadow-md text-sm font-bold text-white bg-green-500 hover:bg-green-600 hover:-translate-y-0.5 transition-all"
                                    >
                                        Ver Site no Ar ↗
                                    </a>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedTemplate(null);
                                            setIsDeployMode(false);
                                            setRepoName('');
                                            setAdminPassword('');
                                            setStatus('');
                                            setDeployedUrl('');
                                        }}
                                        className="w-full flex justify-center py-3 px-4 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                                    >
                                        Fechar e Voltar ao Início
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-[#7c3aed] hover:bg-[#6d28d9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7c3aed] disabled:opacity-60 transition mt-6"
                                >
                                    {loading ? 'Carregando Mágica...' : 'Fazer Deploy Agora'}
                                </button>
                            )}
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes fade-in { 0% { opacity: 0; } 100% { opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
                @keyframes slide-in-right { 0% { transform: translateX(100%); opacity: 0; } 100% { transform: translateX(0); opacity: 1; } }
                .animate-slide-in-right { animation: slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes slide-fast { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
                .animate-pulse-fast { animation: slide-fast 1s infinite linear; }
                .hide-scrollbar::-webkit-scrollbar { display: none; }
                .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
        </div>
    );
}
