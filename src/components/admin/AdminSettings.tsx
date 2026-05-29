import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DEFAULT_LESSON_PROMPT } from '../../lib/lessonPromptDefault';
import { CreditCard, HardDrive, Brain, Eye, EyeOff } from 'lucide-react';
import { PageHeader } from '../ui/admin';
import { Card, Banner, Field, Input, Textarea } from '../ui';

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
    const [showB2AppKey, setShowB2AppKey] = useState(false);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ tone: 'success' | 'error'; msg: string } | null>(null);

    useEffect(() => { loadSettings(); }, []);

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
        setStatus(null);

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
            setStatus({ tone: 'success', msg: 'Configurações salvas.' });
        } catch (err: unknown) {
            setStatus({ tone: 'error', msg: err instanceof Error ? err.message : 'Falha ao salvar.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl pb-8">
            <PageHeader
                title="Configurações"
                tagline="Variáveis globais da plataforma: checkout, vídeos, IA."
            />

            <form onSubmit={handleSave} className="space-y-5">

                {/* Checkout */}
                <Card padding="lg" className="space-y-4">
                    <div className="flex items-start gap-3 pb-3 border-b border-borda-cafe">
                        <div className="w-10 h-10 rounded-full bg-coral-wash flex items-center justify-center shrink-0">
                            <CreditCard className="w-5 h-5 text-coral-terra" />
                        </div>
                        <div>
                            <h2 className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                                Checkout global
                            </h2>
                            <p className="text-sm text-cafe-medio mt-0.5">
                                URL pra onde alunos sem assinatura são mandados ao clicar em "Ativar plano".
                            </p>
                        </div>
                    </div>

                    <Field label="URL da página de vendas" htmlFor="checkout-url" helper="Kiwify, Stripe Checkout, Hotmart, etc.">
                        <Input
                            id="checkout-url"
                            type="url"
                            value={checkoutUrl}
                            onChange={e => setCheckoutUrl(e.target.value)}
                            placeholder="https://pay.kiwify.com.br/..."
                            required
                        />
                    </Field>
                </Card>

                {/* Backblaze B2 */}
                <Card padding="lg" className="space-y-4">
                    <div className="flex items-start gap-3 pb-3 border-b border-borda-cafe">
                        <div className="w-10 h-10 rounded-full bg-coral-wash flex items-center justify-center shrink-0">
                            <HardDrive className="w-5 h-5 text-coral-terra" />
                        </div>
                        <div>
                            <h2 className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                                Backblaze B2 · vídeos
                            </h2>
                            <p className="text-sm text-cafe-medio mt-0.5">
                                Credenciais pra acessar/servir vídeos das aulas hospedados no Backblaze.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Key ID" htmlFor="b2-key">
                            <Input id="b2-key" type="text" value={b2KeyId} onChange={e => setB2KeyId(e.target.value)} placeholder="0058b7..." className="font-mono" />
                        </Field>
                        <Field label="Application Key" htmlFor="b2-app">
                            <Input
                                id="b2-app"
                                type={showB2AppKey ? 'text' : 'password'}
                                value={b2AppKey}
                                onChange={e => setB2AppKey(e.target.value)}
                                placeholder="Sua Application Key secreta"
                                className="font-mono"
                                rightAddon={
                                    <button
                                        type="button"
                                        onClick={() => setShowB2AppKey(s => !s)}
                                        aria-label={showB2AppKey ? 'Ocultar' : 'Mostrar'}
                                        className="px-2 text-cafe-cinza-quente hover:text-coral-terra transition-colors"
                                    >
                                        {showB2AppKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                }
                            />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Bucket Name" htmlFor="b2-bucket-name">
                            <Input id="b2-bucket-name" type="text" value={b2BucketName} onChange={e => setB2BucketName(e.target.value)} placeholder="curso-videos" className="font-mono" />
                        </Field>
                        <Field label="Bucket ID" htmlFor="b2-bucket-id">
                            <Input id="b2-bucket-id" type="text" value={b2BucketId} onChange={e => setB2BucketId(e.target.value)} placeholder="ID 31 dígitos" className="font-mono" />
                        </Field>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Region" htmlFor="b2-region">
                            <Input id="b2-region" type="text" value={b2Region} onChange={e => setB2Region(e.target.value)} placeholder="us-west-004" className="font-mono" />
                        </Field>
                        <Field label="Endpoint" htmlFor="b2-endpoint">
                            <Input id="b2-endpoint" type="text" value={b2Endpoint} onChange={e => setB2Endpoint(e.target.value)} placeholder="s3.us-west-004.backblazeb2.com" className="font-mono" />
                        </Field>
                    </div>

                    <Field label="Public URL Base" htmlFor="b2-public" optional>
                        <Input id="b2-public" type="text" value={b2PublicUrlBase} onChange={e => setB2PublicUrlBase(e.target.value)} placeholder="https://f004.backblazeb2.com/file" className="font-mono" />
                    </Field>
                </Card>

                {/* IA */}
                <Card padding="lg" className="space-y-4">
                    <div className="flex items-start gap-3 pb-3 border-b border-borda-cafe">
                        <div className="w-10 h-10 rounded-full bg-coral-wash flex items-center justify-center shrink-0">
                            <Brain className="w-5 h-5 text-coral-terra" />
                        </div>
                        <div>
                            <h2 className="font-display text-lg font-normal text-carvao-quente tracking-tight">
                                IA · análise de aulas
                            </h2>
                            <p className="text-sm text-cafe-medio mt-0.5">
                                Gera título, descrição e highlights automaticamente quando aula é adicionada. Recomendo <strong className="text-carvao-quente">Gemini 2.0 Flash</strong> (free tier 1500 req/dia, vídeo até 2GB).
                            </p>
                        </div>
                    </div>

                    <Field label="Provider" htmlFor="ai-provider">
                        <div className="flex gap-2">
                            {([
                                { value: 'gemini', label: 'Google Gemini', desc: 'Free tier · vídeo nativo' },
                                { value: 'openai', label: 'OpenAI Whisper', desc: 'Pago · só primeiros 24MB' },
                            ] as const).map(opt => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setAiProvider(opt.value)}
                                    className={`flex-1 p-3 border rounded-[10px] cursor-pointer transition-colors text-center ${
                                        aiProvider === opt.value
                                            ? 'border-coral-terra bg-coral-wash'
                                            : 'border-borda-cafe bg-cream-elevated hover:bg-coral-wash/50 hover:border-coral-terra/30'
                                    }`}
                                >
                                    <p className={`text-sm font-semibold ${aiProvider === opt.value ? 'text-terracota-profundo' : 'text-carvao-quente'}`}>{opt.label}</p>
                                    <p className="text-xs text-cafe-medio mt-0.5">{opt.desc}</p>
                                </button>
                            ))}
                        </div>
                    </Field>

                    <Field
                        label="Gemini API Key"
                        htmlFor="gemini-key"
                        helper="Pegue em aistudio.google.com/apikey (free tier)."
                    >
                        <Input
                            id="gemini-key"
                            type={showGeminiKey ? 'text' : 'password'}
                            value={geminiKey}
                            onChange={e => setGeminiKey(e.target.value)}
                            placeholder="AIza..."
                            className="font-mono"
                            rightAddon={
                                <button
                                    type="button"
                                    onClick={() => setShowGeminiKey(s => !s)}
                                    aria-label={showGeminiKey ? 'Ocultar' : 'Mostrar'}
                                    className="px-2 text-cafe-cinza-quente hover:text-coral-terra transition-colors"
                                >
                                    {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            }
                        />
                    </Field>

                    <Field
                        label="OpenAI API Key"
                        htmlFor="openai-key"
                        helper="Só preencher se for usar OpenAI como provider."
                        optional
                    >
                        <Input
                            id="openai-key"
                            type={showOpenaiKey ? 'text' : 'password'}
                            value={openaiKey}
                            onChange={e => setOpenaiKey(e.target.value)}
                            placeholder="sk-..."
                            className="font-mono"
                            rightAddon={
                                <button
                                    type="button"
                                    onClick={() => setShowOpenaiKey(s => !s)}
                                    aria-label={showOpenaiKey ? 'Ocultar' : 'Mostrar'}
                                    className="px-2 text-cafe-cinza-quente hover:text-coral-terra transition-colors"
                                >
                                    {showOpenaiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            }
                        />
                    </Field>

                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label htmlFor="lesson-prompt" className="text-sm font-semibold text-carvao-quente">
                                System prompt — geração de título/descrição/highlights
                            </label>
                            <div className="flex gap-3 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setLessonPrompt(DEFAULT_LESSON_PROMPT)}
                                    className="font-semibold text-coral-terra hover:text-terracota-profundo transition-colors"
                                >
                                    Usar padrão
                                </button>
                                {lessonPrompt && (
                                    <button
                                        type="button"
                                        onClick={() => setLessonPrompt('')}
                                        className="font-semibold text-cafe-cinza-quente hover:text-cafe-medio transition-colors"
                                    >
                                        Limpar
                                    </button>
                                )}
                            </div>
                        </div>
                        <Textarea
                            id="lesson-prompt"
                            value={lessonPrompt}
                            onChange={e => setLessonPrompt(e.target.value)}
                            placeholder={DEFAULT_LESSON_PROMPT}
                            rows={12}
                            className="font-mono text-xs leading-relaxed"
                        />
                        <p className="text-xs text-cafe-cinza-quente mt-1.5 tabular-nums">
                            {lessonPrompt
                                ? <>Custom · {lessonPrompt.length} chars</>
                                : <>Vazio = usa o padrão ({DEFAULT_LESSON_PROMPT.length} chars). Edite pra ajustar tom, exemplos, regras.</>
                            }
                        </p>
                    </div>
                </Card>

                {status && (
                    <Banner tone={status.tone}>{status.msg}</Banner>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-papel-craft px-6 py-3 rounded-[12px] font-semibold text-base transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed min-h-[48px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coral-terra"
                >
                    {loading ? 'Salvando…' : 'Salvar todas as alterações'}
                </button>
            </form>
        </div>
    );
}
