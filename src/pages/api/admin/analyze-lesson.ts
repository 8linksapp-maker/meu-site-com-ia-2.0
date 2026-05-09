import type { APIRoute } from 'astro';
import { supabaseAdmin, verifyAdmin } from '../../../lib/verifyAdmin';
import { DEFAULT_LESSON_PROMPT } from '../../../lib/lessonPromptDefault';

export const prerender = false;
// Aumenta timeout pra 300s (5 min) — vídeo de 1h pode levar ~30s upload + ~60s processing + ~30s gen.
export const maxDuration = 300;

const RESPONSE_SCHEMA = {
    type: 'object',
    properties: {
        title: { type: 'string', description: 'Título no padrão gerúndio + entregável, máx 65 chars' },
        description: { type: 'string', description: '1-2 frases sobre o que aluno aprende na prática' },
        highlights: { type: 'array', items: { type: 'string' }, description: '3-6 pontos-chave, ação concreta cada um' },
    },
    required: ['title', 'description', 'highlights'],
};

const GEMINI_MODEL = 'gemini-2.0-flash';

async function analyzeWithGemini(videoUrl: string, apiKey: string, systemPrompt: string) {
    // 1. Baixar vídeo do B2 inteiro
    const videoRes = await fetch(videoUrl);
    if (!videoRes.ok) throw new Error(`Falha ao baixar vídeo do B2: HTTP ${videoRes.status}`);
    const buffer = Buffer.from(await videoRes.arrayBuffer());
    const numBytes = buffer.length;
    const urlPath = new URL(videoUrl).pathname;
    const ext = urlPath.split('.').pop()?.toLowerCase() || 'mp4';
    const mimeMap: Record<string, string> = {
        mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
        mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav',
    };
    const mimeType = mimeMap[ext] || 'video/mp4';

    // 2. Files API resumable upload — start
    const startRes = await fetch('https://generativelanguage.googleapis.com/upload/v1beta/files', {
        method: 'POST',
        headers: {
            'x-goog-api-key': apiKey,
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': String(numBytes),
            'X-Goog-Upload-Header-Content-Type': mimeType,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: { display_name: urlPath.split('/').pop() || 'lesson.mp4' } }),
    });
    if (!startRes.ok) {
        const txt = await startRes.text();
        throw new Error(`Gemini Files start falhou (${startRes.status}): ${txt.slice(0, 200)}`);
    }
    const uploadUrl = startRes.headers.get('x-goog-upload-url');
    if (!uploadUrl) throw new Error('Gemini Files API não retornou upload_url');

    // 3. Files API resumable upload — finalize
    const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'Content-Length': String(numBytes),
            'X-Goog-Upload-Offset': '0',
            'X-Goog-Upload-Command': 'upload, finalize',
        },
        body: buffer,
    });
    if (!uploadRes.ok) {
        const txt = await uploadRes.text();
        throw new Error(`Gemini Files upload falhou (${uploadRes.status}): ${txt.slice(0, 200)}`);
    }
    const fileInfo = await uploadRes.json();
    const fileUri: string = fileInfo?.file?.uri;
    const fileName: string = fileInfo?.file?.name;
    if (!fileUri) throw new Error('Gemini Files API não retornou file.uri');

    // 4. Aguardar processing (file.state === ACTIVE). Vídeos longos podem levar 30-90s.
    let state = fileInfo?.file?.state || 'PROCESSING';
    let attempts = 0;
    while (state === 'PROCESSING' && attempts < 60) {
        await new Promise(r => setTimeout(r, 3000));
        const stat = await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}`, {
            headers: { 'x-goog-api-key': apiKey },
        });
        if (stat.ok) {
            const info = await stat.json();
            state = info.state || 'PROCESSING';
        }
        attempts++;
    }
    if (state !== 'ACTIVE') {
        throw new Error(`Gemini Files processing terminou em estado ${state} após ${attempts * 3}s`);
    }

    // 5. generateContent
    const genRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
        method: 'POST',
        headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            contents: [{
                parts: [
                    { file_data: { mime_type: mimeType, file_uri: fileUri } },
                    { text: 'Analise o conteúdo prático desta aula e gere o título, descrição e highlights conforme as regras do system prompt.' },
                ],
            }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
                temperature: 0.4,
                responseMimeType: 'application/json',
                responseSchema: RESPONSE_SCHEMA,
            },
        }),
    });
    if (!genRes.ok) {
        const txt = await genRes.text();
        throw new Error(`Gemini generateContent falhou (${genRes.status}): ${txt.slice(0, 300)}`);
    }
    const genData = await genRes.json();
    const text = genData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Gemini não retornou conteúdo');
    const parsed = JSON.parse(text);

    return { title: parsed.title || '', description: parsed.description || '', highlights: parsed.highlights || [] };
}

async function analyzeWithOpenAI(videoUrl: string, apiKey: string, systemPrompt: string) {
    // Fallback legacy — limitado aos primeiros 24MB. Mantido só pra compat.
    const MAX_DOWNLOAD_BYTES = 24 * 1024 * 1024;
    const videoRes = await fetch(videoUrl, { headers: { Range: `bytes=0-${MAX_DOWNLOAD_BYTES - 1}` } });
    if (!videoRes.ok && videoRes.status !== 206) throw new Error(`Falha ao baixar vídeo: HTTP ${videoRes.status}`);
    const videoBuffer = Buffer.from(await videoRes.arrayBuffer());
    const ext = new URL(videoUrl).pathname.split('.').pop()?.toLowerCase() || 'mp4';
    const mimeMap: Record<string, string> = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav' };
    const mime = mimeMap[ext] || 'video/mp4';

    const whisperForm = new FormData();
    whisperForm.append('file', new Blob([videoBuffer], { type: mime }), `lesson.${ext}`);
    whisperForm.append('model', 'whisper-1');
    whisperForm.append('language', 'pt');
    whisperForm.append('response_format', 'text');
    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: whisperForm,
    });
    if (!whisperRes.ok) {
        const err = await whisperRes.json().catch(() => ({}));
        throw new Error(`Whisper falhou: ${err.error?.message || whisperRes.statusText}`);
    }
    const transcript = await whisperRes.text();
    if (!transcript || transcript.trim().length < 20) throw new Error('Transcrição vazia/curta');

    const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.4,
            response_format: { type: 'json_object' },
            messages: [
                { role: 'system', content: systemPrompt + '\n\nResponda APENAS JSON válido: { "title": "...", "description": "...", "highlights": [...] }' },
                { role: 'user', content: `Transcrição da aula:\n\n${transcript.slice(0, 12000)}` },
            ],
        }),
    });
    if (!gptRes.ok) {
        const err = await gptRes.json().catch(() => ({}));
        throw new Error(`GPT falhou: ${err.error?.message || gptRes.statusText}`);
    }
    const gptData = await gptRes.json();
    const content = JSON.parse(gptData.choices[0].message.content);
    return { title: content.title || '', description: content.description || '', highlights: content.highlights || [] };
}

export const POST: APIRoute = async ({ request }) => {
    try {
        await verifyAdmin(request);

        const { videoUrl } = await request.json();
        if (!videoUrl) throw new Error('URL do vídeo é obrigatória');

        const { data: settings } = await supabaseAdmin
            .from('platform_settings')
            .select('ai_provider, gemini_api_key, openai_api_key, lesson_ai_prompt')
            .eq('id', 1)
            .single();

        const provider = settings?.ai_provider || 'gemini';
        if (provider === 'gemini' && !settings?.gemini_api_key) throw new Error('Gemini API key não configurada em Configurações.');
        if (provider === 'openai' && !settings?.openai_api_key) throw new Error('OpenAI API key não configurada em Configurações.');

        const systemPrompt = (settings?.lesson_ai_prompt && settings.lesson_ai_prompt.trim()) || DEFAULT_LESSON_PROMPT;

        const result = provider === 'openai'
            ? await analyzeWithOpenAI(videoUrl, settings!.openai_api_key, systemPrompt)
            : await analyzeWithGemini(videoUrl, settings!.gemini_api_key, systemPrompt);

        return new Response(JSON.stringify({ ...result, provider }), { status: 200 });
    } catch (err: any) {
        console.error('analyze-lesson error:', err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
};
