import type { APIRoute } from 'astro';
import { supabaseAdmin, verifyAdmin } from '../../../lib/verifyAdmin';

export const prerender = false;

// Whisper aceita mp4 até 25MB — baixamos no máximo 24MB do vídeo
const MAX_DOWNLOAD_BYTES = 24 * 1024 * 1024;

export const POST: APIRoute = async ({ request }) => {
    try {
        await verifyAdmin(request);

        const { videoUrl } = await request.json();
        if (!videoUrl) throw new Error('URL do vídeo é obrigatória');

        // Buscar OpenAI key
        const { data: settings } = await supabaseAdmin
            .from('platform_settings')
            .select('openai_api_key')
            .eq('id', 1)
            .single();

        if (!settings?.openai_api_key) {
            throw new Error('OpenAI API key não configurada em Configurações.');
        }

        // 1. Baixar trecho do vídeo (primeiros 24MB)
        const videoRes = await fetch(videoUrl, {
            headers: { 'Range': `bytes=0-${MAX_DOWNLOAD_BYTES - 1}` },
        });

        if (!videoRes.ok && videoRes.status !== 206) {
            throw new Error(`Falha ao baixar vídeo: HTTP ${videoRes.status}`);
        }

        const videoBuffer = Buffer.from(await videoRes.arrayBuffer());

        // Detectar extensão a partir da URL
        const urlPath = new URL(videoUrl).pathname;
        const ext = urlPath.split('.').pop()?.toLowerCase() || 'mp4';
        const mimeMap: Record<string, string> = {
            mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
            mp3: 'audio/mpeg', m4a: 'audio/mp4', wav: 'audio/wav',
        };
        const mime = mimeMap[ext] || 'video/mp4';

        // 2. Transcrever com Whisper
        const whisperForm = new FormData();
        whisperForm.append('file', new Blob([videoBuffer], { type: mime }), `lesson.${ext}`);
        whisperForm.append('model', 'whisper-1');
        whisperForm.append('language', 'pt');
        whisperForm.append('response_format', 'text');

        const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.openai_api_key}` },
            body: whisperForm,
        });

        if (!whisperRes.ok) {
            const err = await whisperRes.json().catch(() => ({}));
            throw new Error(`Whisper falhou: ${err.error?.message || whisperRes.statusText}`);
        }

        const transcript = await whisperRes.text();

        if (!transcript || transcript.trim().length < 20) {
            throw new Error('Não foi possível transcrever o áudio. O vídeo pode estar sem áudio ou muito curto.');
        }

        // 3. Gerar título, descrição e highlights com GPT
        const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.openai_api_key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                temperature: 0.4,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: `Você é um assistente que cria metadados para aulas de cursos online.
A partir da transcrição de uma aula, gere:
- "title": título curto e descritivo (máx 80 caracteres), que deixe claro o tema da aula. NÃO use "Encontro", "Aula dia XX", datas ou números genéricos.
- "description": descrição de 1-2 frases resumindo o que o aluno vai aprender.
- "highlights": array com 3-6 pontos-chave abordados na aula (frases curtas e objetivas).

Responda APENAS com JSON válido no formato: { "title": "...", "description": "...", "highlights": ["...", "..."] }`
                    },
                    {
                        role: 'user',
                        content: `Transcrição da aula:\n\n${transcript.slice(0, 12000)}`
                    }
                ],
            }),
        });

        if (!gptRes.ok) {
            const err = await gptRes.json().catch(() => ({}));
            throw new Error(`GPT falhou: ${err.error?.message || gptRes.statusText}`);
        }

        const gptData = await gptRes.json();
        const content = JSON.parse(gptData.choices[0].message.content);

        return new Response(JSON.stringify({
            title: content.title || '',
            description: content.description || '',
            highlights: content.highlights || [],
            transcriptLength: transcript.length,
        }), { status: 200 });

    } catch (err: any) {
        console.error('analyze-lesson error:', err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
};
