import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminSettings() {
    const [checkoutUrl, setCheckoutUrl] = useState('');
    const [b2KeyId, setB2KeyId] = useState('');
    const [b2AppKey, setB2AppKey] = useState('');
    const [b2BucketId, setB2BucketId] = useState('');
    const [b2BucketName, setB2BucketName] = useState('');
    const [b2Endpoint, setB2Endpoint] = useState('');
    const [b2PublicUrlBase, setB2PublicUrlBase] = useState('');
    const [b2Region, setB2Region] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState('');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        const { data, error } = await supabase.from('platform_settings').select('*').limit(1).single();
        if (data) {
            setCheckoutUrl(data.checkout_url || '');
            setB2KeyId(data.b2_key_id || '');
            setB2AppKey(data.b2_app_key || '');
            setB2BucketId(data.b2_bucket_id || '');
            setB2BucketName(data.b2_bucket_name || '');
            setB2Endpoint(data.b2_endpoint || '');
            setB2PublicUrlBase(data.b2_public_url_base || '');
            setB2Region(data.b2_region || '');
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
                .upsert({
                    id: 1,
                    checkout_url: checkoutUrl.trim(),
                    b2_key_id: b2KeyId.trim(),
                    b2_app_key: b2AppKey.trim(),
                    b2_bucket_id: b2BucketId.trim(),
                    b2_bucket_name: b2BucketName.trim(),
                    b2_endpoint: b2Endpoint.trim(),
                    b2_public_url_base: b2PublicUrlBase.trim(),
                    b2_region: b2Region.trim(),
                });

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
        <div className="flex flex-col gap-6 max-w-2xl">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
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

                    <div className="pt-8 border-t border-gray-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">📹 Backblaze B2 (Vídeos)</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Credenciais necessárias para acessar e servir os vídeos das aulas hospedados no Backblaze.
                        </p>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">B2 Key ID</label>
                                    <input
                                        type="text"
                                        value={b2KeyId}
                                        onChange={(e) => setB2KeyId(e.target.value)}
                                        placeholder="Ex: 0058b7..."
                                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#7c3aed] focus:border-[#7c3aed]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">B2 Application Key</label>
                                    <input
                                        type="password"
                                        value={b2AppKey}
                                        onChange={(e) => setB2AppKey(e.target.value)}
                                        placeholder="Sua Application Key secreta"
                                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#7c3aed] focus:border-[#7c3aed]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">B2 Bucket Name</label>
                                    <input
                                        type="text"
                                        value={b2BucketName}
                                        onChange={(e) => setB2BucketName(e.target.value)}
                                        placeholder="Ex: curso-videos"
                                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#7c3aed] focus:border-[#7c3aed]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">B2 Bucket ID</label>
                                    <input
                                        type="text"
                                        value={b2BucketId}
                                        onChange={(e) => setB2BucketId(e.target.value)}
                                        placeholder="ID do balde (31 dígitos)"
                                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#7c3aed] focus:border-[#7c3aed]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">B2 Region</label>
                                    <input
                                        type="text"
                                        value={b2Region}
                                        onChange={(e) => setB2Region(e.target.value)}
                                        placeholder="Ex: us-west-004"
                                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#7c3aed] focus:border-[#7c3aed]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">B2 Endpoint</label>
                                    <input
                                        type="text"
                                        value={b2Endpoint}
                                        onChange={(e) => setB2Endpoint(e.target.value)}
                                        placeholder="Ex: s3.us-west-004.backblazeb2.com"
                                        className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#7c3aed] focus:border-[#7c3aed]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">B2 Public URL Base</label>
                                <input
                                    type="text"
                                    value={b2PublicUrlBase}
                                    onChange={(e) => setB2PublicUrlBase(e.target.value)}
                                    placeholder="Ex: https://f004.backblazeb2.com/file"
                                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#7c3aed] focus:border-[#7c3aed]"
                                />
                            </div>
                        </div>
                    </div>

                    {status && (
                        <div className={`p-4 rounded-lg text-sm font-medium ${status.includes('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                            {status}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-6 py-3 px-6 rounded-lg text-sm font-bold text-white bg-[#7c3aed] hover:bg-[#6d28d9] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7c3aed] disabled:opacity-50 transition w-full"
                    >
                        {loading ? 'Salvando...' : 'Salvar Todas as Alterações'}
                    </button>
                </form>
            </div>
        </div>
    );
}
