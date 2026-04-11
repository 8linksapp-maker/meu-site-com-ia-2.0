import { useState, useEffect } from 'react';
import { Rocket, ArrowRight, X, Sparkles, GraduationCap, Globe, MousePointer } from 'lucide-react';

/**
 * OnboardingGuide — guia contextual de primeiro uso.
 *
 * Aparece na página onde o usuário está e mostra dicas relevantes.
 * Persiste progresso no localStorage.
 *
 * Uso:
 *   <OnboardingGuide page="dashboard" hasTokens={true} hasSites={false} />
 *   <OnboardingGuide page="sites" />
 */

interface Props {
    page: 'dashboard' | 'sites';
    hasTokens?: boolean;
    hasSites?: boolean;
}

export default function OnboardingGuide({ page, hasTokens = false, hasSites = false }: Props) {
    const [dismissed, setDismissed] = useState(() => {
        if (typeof window === 'undefined') return true;
        return !!localStorage.getItem(`onboarding_${page}_dismissed`);
    });
    const [currentTip, setCurrentTip] = useState(0);

    function dismiss() {
        localStorage.setItem(`onboarding_${page}_dismissed`, 'true');
        setDismissed(true);
    }

    if (dismissed) return null;

    // ── DASHBOARD GUIDE ──
    if (page === 'dashboard') {

        return (
            <div className="bg-gradient-to-br from-[#7c3aed]/5 via-white to-blue-50 border border-[#7c3aed]/15 rounded-2xl p-6 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#7c3aed]/5 rounded-full -translate-y-1/2 translate-x-1/2" />

                <button onClick={dismiss} className="absolute top-3 right-3 text-gray-300 hover:text-gray-500 transition-colors p-1">
                    <X className="w-4 h-4" />
                </button>

                <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-[#7c3aed] rounded-xl flex items-center justify-center">
                            <Rocket className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-black text-gray-900 text-sm">Vamos criar seu primeiro site!</h3>
                            <p className="text-[10px] text-gray-400">Leva menos de 2 minutos — siga o guia abaixo</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                        {[
                            {
                                icon: <GraduationCap className="w-5 h-5" />,
                                title: 'Assistir aula (opcional)',
                                desc: 'Veja como funciona antes de criar',
                                action: 'Ver aulas',
                                href: '/aulas',
                                color: 'blue',
                                done: false,
                            },
                            {
                                icon: <MousePointer className="w-5 h-5" />,
                                title: 'Escolher template',
                                desc: 'Navegue e escolha o visual do seu site',
                                action: 'Escolher agora',
                                href: '/sites?onboarding=true',
                                color: 'purple',
                                done: false,
                                primary: true,
                            },
                            {
                                icon: <Globe className="w-5 h-5" />,
                                title: 'Site no ar!',
                                desc: 'Seu site estará online automaticamente',
                                action: null,
                                href: null,
                                color: 'green',
                                done: hasSites,
                            },
                        ].map((item, i) => (
                            <div
                                key={i}
                                className={`p-4 rounded-xl border transition-all ${
                                    item.primary
                                        ? 'bg-[#7c3aed]/5 border-[#7c3aed]/20 ring-2 ring-[#7c3aed]/10'
                                        : 'bg-white border-gray-100'
                                }`}
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                        item.color === 'purple' ? 'bg-[#7c3aed]/10 text-[#7c3aed]' :
                                        item.color === 'blue' ? 'bg-blue-50 text-blue-500' :
                                        'bg-green-50 text-green-500'
                                    }`}>
                                        {item.icon}
                                    </div>
                                    <span className="text-[10px] font-black text-gray-400 uppercase">Passo {i + 1}</span>
                                </div>
                                <h4 className="font-bold text-gray-800 text-sm">{item.title}</h4>
                                <p className="text-[11px] text-gray-400 mt-0.5 mb-3">{item.desc}</p>
                                {item.action && item.href && (
                                    <a
                                        href={item.href}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                            item.primary
                                                ? 'bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-md shadow-purple-500/20'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {item.action}
                                        <ArrowRight className="w-3 h-3" />
                                    </a>
                                )}
                                {item.done && (
                                    <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                                        Concluído
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // ── SITES PAGE GUIDE ──
    if (page === 'sites') {
        const tips = [
            {
                title: 'Escolha um template',
                desc: 'Navegue pelos templates abaixo. Cada um é um site completo com editor de conteúdo incluso. Clique em qualquer um para ver os detalhes.',
                icon: <Sparkles className="w-5 h-5 text-[#7c3aed]" />,
            },
            {
                title: 'Clique em "Criar site"',
                desc: 'Dentro do template, clique no botão roxo "Criar site". Você vai dar um nome pro repositório e criar uma senha pro painel admin.',
                icon: <MousePointer className="w-5 h-5 text-[#7c3aed]" />,
            },
            {
                title: 'Aguarde o deploy',
                desc: 'A plataforma cria tudo automaticamente: repositório no GitHub, projeto na Vercel, configurações. Em ~1 minuto seu site estará no ar!',
                icon: <Rocket className="w-5 h-5 text-[#7c3aed]" />,
            },
        ];

        return (
            <div className="bg-white border border-[#7c3aed]/15 rounded-2xl p-5 mb-4 relative shadow-sm">
                <button onClick={dismiss} className="absolute top-3 right-3 text-gray-300 hover:text-gray-500 transition-colors p-1">
                    <X className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-2 mb-4">
                    <div className="w-7 h-7 bg-[#7c3aed] rounded-lg flex items-center justify-center">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                    <h3 className="font-black text-gray-900 text-sm">Como criar seu site — passo a passo</h3>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-1">
                    {tips.map((tip, i) => (
                        <div
                            key={i}
                            className={`flex-1 min-w-[200px] p-3 rounded-xl border transition-all cursor-pointer ${
                                currentTip === i
                                    ? 'bg-[#7c3aed]/5 border-[#7c3aed]/20'
                                    : 'bg-gray-50 border-gray-100 hover:border-gray-200'
                            }`}
                            onClick={() => setCurrentTip(i)}
                        >
                            <div className="flex items-center gap-2 mb-1.5">
                                <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center ${
                                    currentTip === i
                                        ? 'bg-[#7c3aed] text-white'
                                        : 'bg-gray-200 text-gray-500'
                                }`}>
                                    {i + 1}
                                </span>
                                {tip.icon}
                            </div>
                            <h4 className="font-bold text-gray-800 text-xs">{tip.title}</h4>
                            {currentTip === i && (
                                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed animate-fade-in">
                                    {tip.desc}
                                </p>
                            )}
                        </div>
                    ))}
                </div>

                {/* Arrow pointing down to templates */}
                <div className="flex justify-center mt-3">
                    <div className="flex flex-col items-center gap-1 animate-bounce">
                        <span className="text-[10px] font-bold text-[#7c3aed]">Escolha abaixo</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>
                    </div>
                </div>

                <style>{`
                    @keyframes fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
                    .animate-fade-in { animation: fade-in 0.3s ease-out; }
                `}</style>
            </div>
        );
    }

    return null;
}
