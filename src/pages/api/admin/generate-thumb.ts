import type { APIRoute } from 'astro';
import { createHash } from 'crypto';
import { supabaseAdmin, verifyAdmin } from '../../../lib/verifyAdmin';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        await verifyAdmin(request);

        const { title, type } = await request.json() as { title: string; type?: string };
        if (!title) throw new Error('Título obrigatório');

        // Buscar chaves
        const { data: settings } = await supabaseAdmin
            .from('platform_settings')
            .select('openai_api_key, b2_key_id, b2_app_key, b2_bucket_id, b2_bucket_name, b2_public_url_base')
            .eq('id', 1)
            .single();

        if (!settings?.openai_api_key) throw new Error('OpenAI API key não configurada em Configurações.');
        if (!settings?.b2_key_id)      throw new Error('Backblaze B2 não configurado em Configurações.');

        // ── 1. Gerar imagem com DALL-E 3 ──────────────────────────
        const typeLabel = type === 'module' ? 'módulo do curso' : type === 'live' ? 'aula ao vivo' : 'aula gravada';
        const prompt = `Thumbnail minimalista para ${typeLabel} sobre "${title}". Ilustração digital flat design, paleta roxo (#7c3aed) e branco, formas geométricas limpas, estilo profissional de curso online. Sem texto, sem letras, sem números. Proporção 16:9.`;

        const dalleRes = await fetch('https://api.openai.com/v1/images/generations', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.openai_api_key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'dall-e-3',
                prompt,
                n: 1,
                size: '1792x1024',
                quality: 'standard',
                response_format: 'url',
            }),
        });

        if (!dalleRes.ok) {
            const err = await dalleRes.json();
            throw new Error(err.error?.message || 'Falha na geração de imagem');
        }

        const dalleData = await dalleRes.json();
        const imageUrl: string = dalleData.data[0].url;

        // ── 2. Baixar imagem ───────────────────────────────────────
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) throw new Error('Falha ao baixar imagem gerada');
        const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
        const sha1 = createHash('sha1').update(imgBuffer).digest('hex');
        const fileName = `ai-thumb-${Date.now()}.jpg`;

        // ── 3. Auth B2 ─────────────────────────────────────────────
        const authHash = Buffer.from(`${settings.b2_key_id}:${settings.b2_app_key}`).toString('base64');
        const b2AuthRes = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
            headers: { 'Authorization': `Basic ${authHash}` }
        });
        if (!b2AuthRes.ok) throw new Error('Falha na autenticação B2');
        const { apiUrl, authorizationToken, accountId } = await b2AuthRes.json();

        // Resolver bucketId
        let bucketId = settings.b2_bucket_id;
        if (!bucketId) {
            const listRes = await fetch(`${apiUrl}/b2api/v2/b2_list_buckets`, {
                method: 'POST',
                headers: { 'Authorization': authorizationToken, 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId, bucketName: settings.b2_bucket_name }),
            });
            const listData = await listRes.json();
            bucketId = listData.buckets?.[0]?.bucketId;
            if (!bucketId) throw new Error('Bucket B2 não encontrado');
        }

        // ── 4. Obter upload URL ────────────────────────────────────
        const uploadUrlRes = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
            method: 'POST',
            headers: { 'Authorization': authorizationToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ bucketId }),
        });
        if (!uploadUrlRes.ok) throw new Error('Falha ao obter upload URL do B2');
        const { uploadUrl, authorizationToken: uploadToken } = await uploadUrlRes.json();

        // ── 5. Upload para B2 ──────────────────────────────────────
        const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': uploadToken,
                'X-Bz-File-Name': encodeURIComponent(fileName),
                'Content-Type': 'image/jpeg',
                'X-Bz-Content-Sha1': sha1,
                'Content-Length': String(imgBuffer.length),
            },
            body: imgBuffer,
        });
        if (!uploadRes.ok) throw new Error('Falha no upload para B2');
        const uploadData = await uploadRes.json();

        const finalUrl = `${settings.b2_public_url_base}/${uploadData.fileName}`;
        return new Response(JSON.stringify({ url: finalUrl }), { status: 200 });

    } catch (err: any) {
        console.error('generate-thumb error:', err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
};
