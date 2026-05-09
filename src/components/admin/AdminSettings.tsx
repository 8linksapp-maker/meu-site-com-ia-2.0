import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DEFAULT_LESSON_PROMPT } from '../../lib/lessonPromptDefault';

export default function AdminSettings() {
    const [checkoutUrl, setCheckoutUrl] = useState('');
    const [b2KeyId, setB2KeyId] = useState('');
    const [b2AppKey, setB2AppKey] = useState('');
    const [b2BucketId, setB2BucketId] = useState('');
    const [b2BucketName, setB2BucketName] = useState('');
    const [b2Endpoint, setB2Endpoint] = useState('');
    const [b2PublicUrlBase, setB2PublicUrlBase] = useState('');
    const [b2Region, setB2Region] = useState('');
    const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>('gemini');
    const [geminiKey, setGeminiKey] = useState('');
    const [openaiKey, setOpenaiKey] = useState('');
    const [lessonPrompt, setLessonPrompt] = useState('');
    const [showGeminiKey, setShowGeminiKey] = useState(false);
    const [showOpenaiKey, setShowOpenaiKey] = useState(false);
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
            setAiProvider((data.ai_provider as 'gemini' | 'openai') || 'gemini');
            setGeminiKey(data.gemini_api_key || '');
            setOpenaiKey(data.openai_api_key || '');
            setLessonPrompt(data.lesson_ai_prompt || '');
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
                    ai_provider: aiProvider,
                    gemini_api_key: geminiKey.trim(),
                    openai_api_key: openaiKey.trim(),
                    lesson_ai_prompt: lessonPrompt.trim() || null,
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

                    <div className="pt-8 border-t border-gray-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">🧠 IA — Análise de aulas</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Usado pra gerar título, descrição e highlights automaticamente quando uma aula é adicionada/upada. Recomendo <strong>Gemini 2.0 Flash</strong> (free tier 1500 req/dia, vídeo inteiro até 2GB).
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Provider</label>
                                <div className="flex gap-2">
                                    {([
                                        { value: 'gemini', label: 'Google Gemini', desc: 'Free tier · vídeo nativo' },
                                        { value: 'openai', label: 'OpenAI Whisper', desc: 'Pago · só primeiros 24MB' },
                                    ] as const).map(opt => (
                                        <label key={opt.value} className={`flex-1 p-3 border rounded-lg cursor-pointer transition-all text-center ${aiProvider === opt.value ? 'border-[#7c3aed] bg-[#7c3aed]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                                            <input type="radio" name="aiProvider" value={opt.value} checked={aiProvider === opt.value} onChange={() => setAiProvider(opt.value)} className="hidden" />
                                            <p className="text-sm font-bold text-gray-800">{opt.label}</p>
                                            <p className="text-xs text-gray-500">{opt.desc}</p>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Gemini API Key</label>
                                <div className="relative">
                                    <input
                                        type={showGeminiKey ? 'text' : 'password'}
                                        value={geminiKey}
                                        onChange={(e) => setGeminiKey(e.target.value)}
                                        placeholder="AIza..."
                                        className="block w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#7c3aed] focus:border-[#7c3aed] font-mono"
                                    />
                                    <button type="button" onClick={() => setShowGeminiKey(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 hover:text-gray-800">{showGeminiKey ? 'OCULTAR' : 'VER'}</button>
                                </div>
                                <p className="text-[11px] text-gray-400 mt-1">Pegue em <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="text-[#7c3aed] underline">aistudio.google.com/apikey</a> (free tier)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">OpenAI API Key</label>
                                <div className="relative">
                                    <input
                                        type={showOpenaiKey ? 'text' : 'password'}
                                        value={openaiKey}
                                        onChange={(e) => setOpenaiKey(e.target.value)}
                                        placeholder="sk-..."
                                        className="block w-full px-4 py-3 pr-20 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#7c3aed] focus:border-[#7c3aed] font-mono"
                                    />
                                    <button type="button" onClick={() => setShowOpenaiKey(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500 hover:text-gray-800">{showOpenaiKey ? 'OCULTAR' : 'VER'}</button>
                                </div>
                                <p className="text-[11px] text-gray-400 mt-1">Só preencher se for usar OpenAI como provider</p>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-sm font-semibold text-gray-700">System prompt — geração de título/descrição/highlights</label>
                                    <div className="flex gap-3 text-xs">
                                        <button
                                            type="button"
                                            onClick={() => setLessonPrompt(DEFAULT_LESSON_PROMPT)}
                                            className="font-bold text-[#7c3aed] hover:underline"
                                        >
                                            Usar padrão
                                        </button>
                                        {lessonPrompt && (
                                            <button
                                                type="button"
                                                onClick={() => setLessonPrompt('')}
                                                className="font-bold text-gray-500 hover:text-gray-800 hover:underline"
                                            >
                                                Limpar (volta pro padrão automático)
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <textarea
                                    value={lessonPrompt}
                                    onChange={(e) => setLessonPrompt(e.target.value)}
                                    placeholder={DEFAULT_LESSON_PROMPT}
                                    rows={14}
                                    className="block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-[#7c3aed] focus:border-[#7c3aed] font-mono text-xs leading-relaxed resize-y"
                                />
                                <p className="text-[11px] text-gray-400 mt-1">
                                    {lessonPrompt
                                        ? <>Custom · {lessonPrompt.length} chars</>
                                        : <>Vazio = usa o padrão acima ({DEFAULT_LESSON_PROMPT.length} chars). Edite pra ajustar tom, exemplos, regras.</>
                                    }
                                </p>
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
