import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '../lib/supabase';

export default function TemplateDetails({ templateId }: { templateId: string }) {
    const [template, setTemplate] = useState<any>(null);
    const [categories, setCategories] = useState<any[]>([]);
    const [fetching, setFetching] = useState(true);

    // Auth & Deploy States
    const [hasTokens, setHasTokens] = useState<boolean | null>(null);
    const [isDeployMode, setIsDeployMode] = useState(false);
    const [repoName, setRepoName] = useState('');
    const [adminPassword, setAdminPassword] = useState('');

    // Progress States
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');
    const [deployedUrl, setDeployedUrl] = useState('');

    useEffect(() => {
        loadData();
    }, [templateId]);

    const loadData = async () => {
        setFetching(true);
        try {
            // Check Tokens
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('github_token, vercel_token')
                    .eq('id', session.user.id)
                    .single();

                setHasTokens(!!(profile?.github_token && profile?.vercel_token));
            } else {
                setHasTokens(false);
            }

            // Fetch Template
            const { data: templateData } = await supabase
                .from('templates')
                .select('*')
                .eq('id', templateId)
                .single();

            if (templateData) {
                setTemplate(templateData);

                // Fetch Categories
                if (templateData.category_ids && templateData.category_ids.length > 0) {
                    const { data: cats } = await supabase
                        .from('template_categories')
                        .select('*')
                        .in('id', templateData.category_ids);
                    if (cats) setCategories(cats);
                }
            }
        } catch (e) {
            console.error(e);
        }
        setFetching(false);
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
                throw new Error('Tokens não configurados! Vá para a Tela de Configurações primeiro.');
            }

            const res = await fetch('/api/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    templateRepo: template.repo,
                    newRepoName: repoName,
                    adminPassword,
                    githubToken: profile.github_token,
                    vercelToken: profile.vercel_token
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erro no deploy');

            setStatus('Repositório criado! Construindo Site na Vercel (Pode levar até 1 minuto)...');

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

    if (fetching) return <div className="p-12 text-center text-gray-500">Carregando Template...</div>;
    if (!template) return <div className="p-12 text-center text-red-500">Template não encontrado.</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex flex-col md:flex-row gap-8">
            {/* LADO ESQUERDO: VITRINE (DISPLAY 70%) */}
            <div className="flex-1 bg-[#1a1c23] rounded-2xl overflow-hidden shadow-2xl border border-gray-800 flex items-center justify-center p-8">
                {template.image_url ? (
                    <img
                        src={template.image_url}
                        alt={template.name}
                        className="w-full h-auto object-contain rounded-lg shadow-2xl border border-gray-700 max-h-[70vh]"
                    />
                ) : (
                    <div className="h-[60vh] w-full flex items-center justify-center bg-gray-800 rounded-lg">
                        <span className="text-4xl font-bold text-gray-500 text-center">{template.name}</span>
                    </div>
                )}
            </div>

            {/* LADO DIREITO: SIDEBAR DARK (AÇÃO 30%) */}
            <div className="w-full md:w-96 bg-[#1a1c23] border border-gray-800 rounded-2xl p-6 shadow-2xl text-gray-200 flex flex-col">
                <h1 className="text-2xl font-bold text-white mb-2">{template.name}</h1>
                <p className="text-gray-400 text-sm mb-6 pb-6 border-b border-gray-800 border-dashed">
                    por <span className="text-[#a78bfa] font-medium">Meu Site Com IA</span>
                </p>

                {categories.length > 0 && (
                    <div className="mb-6 flex flex-wrap gap-2">
                        {categories.map(c => (
                            <span key={c.id} className="text-xs font-semibold px-2.5 py-1 bg-white/5 text-gray-300 border border-white/10 rounded-full">
                                {c.name}
                            </span>
                        ))}
                    </div>
                )}

                <div className="mb-8">
                    {/* Botões de Ação Principais */}
                    {!isDeployMode ? (
                        <div className="space-y-3">
                            {hasTokens === false && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-xs mb-4">
                                    <strong>Aviso:</strong> Você precisa configurar seus Tokens na aba "Configurações" antes de instanciar sites automáticos.
                                </div>
                            )}

                            <a
                                href={`https://github.com/${template.repo}`}
                                target="_blank"
                                rel="noreferrer"
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition border border-white/10"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
                                Repositório Github
                            </a>

                            <button
                                onClick={() => setIsDeployMode(true)}
                                disabled={hasTokens === false}
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></svg>
                                Fazer Deploy Automático
                            </button>
                        </div>
                    ) : (
                        // FLUJO INLINE DE DEPLOY (Substitui o Pop Up Antigo)
                        <div className="bg-white/5 border border-white/10 rounded-xl p-5 animate-fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Configurar Site</h3>
                                <button
                                    onClick={() => { setIsDeployMode(false); setStatus(''); }}
                                    disabled={loading}
                                    className="text-gray-500 hover:text-white"
                                >
                                    ✕
                                </button>
                            </div>

                            <form onSubmit={handleDeploy} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Nome do Repositório (Alvo)</label>
                                    <input
                                        type="text"
                                        required
                                        disabled={loading}
                                        placeholder="ex: meu-site-oficial"
                                        value={repoName}
                                        onChange={(e) => setRepoName(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-black/40 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#a78bfa] transition disabled:opacity-50"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Senha de Administrador (Novo Paintel)</label>
                                    <input
                                        type="password"
                                        required
                                        disabled={loading}
                                        placeholder="**********"
                                        value={adminPassword}
                                        onChange={(e) => setAdminPassword(e.target.value)}
                                        className="w-full px-3 py-2.5 bg-black/40 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-[#a78bfa] transition disabled:opacity-50"
                                    />
                                </div>

                                {status && (
                                    <div className={`p-3 rounded-lg text-xs leading-relaxed ${status.includes('Erro') || status.includes('❌') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : status.includes('✅') ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-[#a78bfa]/10 text-[#a78bfa] border border-[#a78bfa]/20'}`}>
                                        <div className="font-semibold mb-1">{status}</div>
                                        {loading && (
                                            <div className="w-full bg-black/50 rounded-full h-1 mt-2 overflow-hidden relative">
                                                <div className="absolute top-0 bottom-0 left-0 bg-[#a78bfa] w-1/2 rounded-full animate-pulse"></div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {deployedUrl ? (
                                    <div className="mt-4 flex flex-col gap-2">
                                        <a
                                            href={`https://${deployedUrl}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="w-full flex justify-center py-2.5 px-4 rounded-lg text-sm font-bold text-black bg-[#22c55e] hover:bg-[#16a34a] transition shadow-[0_0_15px_rgba(34,197,94,0.4)]"
                                        >
                                            Abrir Site no Ar ↗
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsDeployMode(false);
                                                setRepoName('');
                                                setAdminPassword('');
                                                setStatus('');
                                                setDeployedUrl('');
                                            }}
                                            className="w-full flex justify-center py-2 px-4 rounded-lg text-xs font-medium text-gray-400 border border-gray-800 hover:bg-white/5 transition"
                                        >
                                            Criar Outro Novo
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-sm font-bold text-black bg-white hover:bg-gray-200 disabled:opacity-50 transition mt-2 truncate"
                                    >
                                        {loading ? 'Preparando...' : 'Iniciar Instalação Automática'}
                                    </button>
                                )}
                            </form>
                        </div>
                    )}
                </div>

                {/* Detalhes Adicionais (Bottom Sidebar) */}
                <div className="flex-1 border-t border-gray-800 pt-6">
                    <h4 className="text-white text-sm font-bold mb-4 uppercase tracking-wider">Características</h4>
                    <ul className="space-y-3 text-sm text-gray-400">
                        <li className="flex justify-between items-center">
                            <span>Licença</span>
                            <span className="text-white">Uso Vitalício</span>
                        </li>
                        <li className="flex justify-between items-center">
                            <span>Tecnologias</span>
                            <span className="text-white">Astro, React, Tailwind</span>
                        </li>
                        <li className="flex justify-between items-center">
                            <span>Painel CMS</span>
                            <span className="text-white">Integração Nativa</span>
                        </li>
                        <li className="flex justify-between items-center">
                            <span>Responsividade</span>
                            <span className="text-white">Mobile-First</span>
                        </li>
                        <li className="flex justify-between items-center">
                            <span>Deploy</span>
                            <span className="text-white">Automático (Vercel)</span>
                        </li>
                    </ul>

                    <p className="mt-8 text-xs text-gray-500 leading-relaxed text-justify">
                        {template.description || 'Nenhuma descrição fornecida para este repositório. O processo de deploy automatizado clonará este escopo diretamente para uma engine otimizada da Vercel atrelada ao seu GitHub.'}
                    </p>
                </div>
            </div>
            {/* INJECT ANIMATION IN LINE FOR COMPONENT PURPOSES */}
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
            `}</style>
        </div>
    );
}
