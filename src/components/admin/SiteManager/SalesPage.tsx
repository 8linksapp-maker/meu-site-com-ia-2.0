import React from 'react';
import { Rocket, Globe, Zap, Shield, ChevronRight, BarChart3, Database } from 'lucide-react';

export default function SalesPage() {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-700">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold mb-6 border border-purple-200">
                <Zap className="w-3.5 h-3.5 fill-purple-700" />
                FUNCIONALIDADE PRO
            </div>

            {/* Hero Text */}
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight mb-4">
                Assuma o Controle Total do <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7c3aed] to-blue-600">Seu Ecossistema Digital</span>
            </h1>
            <p className="text-gray-500 max-w-2xl text-lg mb-10 leading-relaxed font-medium">
                Gerencie todos os seus sites de um único lugar. Controle domínios, acompanhe builds da Vercel e gerencie variáveis de ambiente sem nunca sair do seu painel.
            </p>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full mb-12 text-left">
                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-purple-500/5 group hover:border-[#7c3aed]/30 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-[#7c3aed] mb-6 group-hover:scale-110 transition-transform">
                        <BarChart3 className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Status em Tempo Real</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">Acompanhe cada build e deploy da Vercel diretamente do seu dashboard. Saiba na hora se o seu site está no ar.</p>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-blue-500/5 group hover:border-blue-300/30 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                        <Database className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Variáveis de Ambiente</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">Gerencie chaves de API, segredos e tokens com segurança. Edite as ENVs e dispare o deploy com um clique.</p>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl shadow-emerald-500/5 group hover:border-emerald-300/30 transition-all">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                        <Shield className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Domínios Customizados</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">Conecte seus próprios domínios profissionais. Verifique o status do DNS e gerencie o roteamento de forma simplificada.</p>
                </div>
            </div>

            {/* CTA Button */}
            <div className="flex flex-col items-center gap-4">
                <button className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center gap-3 hover:bg-[#7c3aed] hover:scale-105 transition-all shadow-2xl shadow-[#7c3aed]/20 active:scale-95 group">
                    <Rocket className="w-5 h-5 text-purple-400 group-hover:text-white" />
                    Fazer Upgrade para o Plano Pro
                    <ChevronRight className="w-5 h-5" />
                </button>
                <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">Acesso Vitalício Disponível</span>
            </div>
        </div>
    );
}
