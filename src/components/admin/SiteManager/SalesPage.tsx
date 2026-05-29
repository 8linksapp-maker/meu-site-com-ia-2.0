import React from 'react';
import { Rocket, Zap, Shield, ChevronRight, BarChart3, Database } from 'lucide-react';

export default function SalesPage() {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-coral-wash text-coral-terra text-xs font-bold mb-6 border border-coral-terra/30 uppercase tracking-wide">
                <Zap className="w-3.5 h-3.5 fill-coral-terra" />
                Funcionalidade Pro
            </div>

            {/* Hero Text */}
            <h1 className="font-display text-4xl md:text-5xl font-normal text-carvao-quente leading-tight mb-4 tracking-tight">
                Assuma o controle total do <br />
                <span className="text-coral-terra">seu ecossistema digital</span>
            </h1>
            <p className="text-cafe-medio max-w-2xl text-lg mb-10 leading-relaxed">
                Gerencie todos os seus sites de um único lugar. Controle domínios, acompanhe builds da Vercel e gerencie variáveis de ambiente sem nunca sair do seu painel.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl w-full mb-12 text-left">
                <FeatureCard
                    icon={BarChart3}
                    iconBg="bg-coral-wash"
                    iconColor="text-coral-terra"
                    title="Status em tempo real"
                    description="Acompanhe cada build e deploy da Vercel direto do seu dashboard. Saiba na hora se o site tá no ar."
                />
                <FeatureCard
                    icon={Database}
                    iconBg="bg-[oklch(94%_0.030_220)]"
                    iconColor="text-[oklch(45%_0.110_220)]"
                    title="Variáveis de ambiente"
                    description="Gerencie chaves de API, segredos e tokens com segurança. Edite as ENVs e dispare o deploy com um clique."
                />
                <FeatureCard
                    icon={Shield}
                    iconBg="bg-[oklch(94%_0.020_145)]"
                    iconColor="text-[oklch(40%_0.060_145)]"
                    title="Domínios customizados"
                    description="Conecte seus próprios domínios profissionais. Verifique status do DNS e gerencie o roteamento de forma simples."
                />
            </div>

            {/* CTA Button */}
            <div className="flex flex-col items-center gap-4">
                <button className="px-8 py-4 bg-coral-terra hover:bg-terracota-profundo text-papel-craft rounded-[12px] font-semibold flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_10px_25px_-5px_rgba(80,40,20,0.25)] group min-h-[56px]">
                    <Rocket className="w-5 h-5" />
                    Fazer upgrade pro Plano Pro
                    <ChevronRight className="w-5 h-5" />
                </button>
                <span className="text-xs text-cafe-cinza-quente font-semibold uppercase tracking-[0.12em]">Acesso vitalício disponível</span>
            </div>
        </div>
    );
}

function FeatureCard({
    icon: Icon, iconBg, iconColor, title, description,
}: {
    icon: React.ElementType;
    iconBg: string;
    iconColor: string;
    title: string;
    description: string;
}) {
    return (
        <div
            className="bg-cream-surface p-7 rounded-[12px] border border-borda-cafe transition-all group hover:border-coral-terra/30"
            style={{ boxShadow: '0 1px 2px 0 rgba(80, 40, 20, 0.04)' }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 16px -4px rgba(80, 40, 20, 0.10)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(80, 40, 20, 0.04)')}
        >
            <div className={`w-12 h-12 rounded-[10px] ${iconBg} flex items-center justify-center ${iconColor} mb-5 group-hover:scale-105 transition-transform`}>
                <Icon className="w-6 h-6" />
            </div>
            <h3 className="font-display text-lg font-normal text-carvao-quente mb-2 tracking-tight">{title}</h3>
            <p className="text-sm text-cafe-medio leading-relaxed">{description}</p>
        </div>
    );
}
