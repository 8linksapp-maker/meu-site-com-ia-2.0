import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminSettings() {
    const [checkoutUrl, setCheckoutUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const { data, error } = await supabase.from('platform_settings').select('checkout_url').limit(1).single();
        if (data?.checkout_url) {
            setCheckoutUrl(data.checkout_url);
        } else if (error && error.code !== 'PGRST116') {
            console.error(error);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setStatus('Salvando...');

        try {
            const { error } = await supabase
                .from('platform_settings')
                .upsert({ id: 1, checkout_url: checkoutUrl });

            if (error) throw error;
            setStatus('Configurações salvas com sucesso!');
        } catch (err: any) {
            setStatus(`Erro do Supabase: ${err.message || 'Falha ao salvar'}`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">🔗 Checkout Global</h3>
            <p className="text-sm text-gray-500 mb-6">
                Todos os usuários inativos ou visitantes que clicarem no botão "Ativar Plano Agora" na vitrine serão redirecionados para este link de venda.
            </p>
            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">URL da Página de Vendas (Kiwify, Stripe, etc)</label>
                    <input
                        type="url"
                        value={checkoutUrl}
                        onChange={(e) => setCheckoutUrl(e.target.value)}
                        placeholder="https://pay.kiwify.com.br/..."
                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#7c3aed] focus:border-[#7c3aed]"
                        required
                    />
                </div>

                {status && (
                    <div className={`p-4 rounded-lg text-sm font-medium ${status.includes('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                        {status}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="mt-6 py-3 px-6 rounded-lg text-sm font-bold text-white bg-[#7c3aed] hover:bg-[#6d28d9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7c3aed] disabled:opacity-50 transition"
                >
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </form>
        </div>
    );
}
