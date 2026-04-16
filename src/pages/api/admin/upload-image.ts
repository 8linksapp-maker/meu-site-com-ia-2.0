import type { APIRoute } from 'astro';
import { createHash } from 'crypto';
import { supabaseAdmin, verifyAdmin } from '../../../lib/verifyAdmin';

export const prerender = false;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export const POST: APIRoute = async ({ request }) => {
    try {
        await verifyAdmin(request);

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const prefix = (formData.get('prefix') as string) || 'upload';

        if (!file) throw new Error('Nenhum arquivo enviado');

        if (!ALLOWED_TYPES.includes(file.type)) {
            throw new Error(`Tipo de arquivo não permitido: ${file.type}. Use JPEG, PNG, WebP, GIF ou SVG.`);
        }
        if (file.size > MAX_SIZE) {
            throw new Error(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). Máximo: 10 MB.`);
        }

        const { data: settings } = await supabaseAdmin
            .from('platform_settings')
            .select('b2_key_id, b2_app_key, b2_bucket_id, b2_bucket_name, b2_public_url_base')
            .eq('id', 1)
            .single();

        if (!settings?.b2_key_id) throw new Error('Backblaze B2 não configurado em Configurações.');

        // Auth B2
        const authHash = Buffer.from(`${settings.b2_key_id}:${settings.b2_app_key}`).toString('base64');
        const b2AuthRes = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
            headers: { 'Authorization': `Basic ${authHash}` }
        });
        if (!b2AuthRes.ok) throw new Error('Falha na autenticação B2');
        const { apiUrl, authorizationToken, accountId } = await b2AuthRes.json();

        // Resolve bucketId
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

        // Get upload URL
        const uploadUrlRes = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
            method: 'POST',
            headers: { 'Authorization': authorizationToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ bucketId }),
        });
        if (!uploadUrlRes.ok) throw new Error('Falha ao obter upload URL do B2');
        const { uploadUrl, authorizationToken: uploadToken } = await uploadUrlRes.json();

        // Upload
        const imgBuffer = Buffer.from(await file.arrayBuffer());
        const sha1 = createHash('sha1').update(imgBuffer).digest('hex');
        const MIME_TO_EXT: Record<string, string> = {
            'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
            'image/gif': 'gif', 'image/svg+xml': 'svg',
        };
        const ext = MIME_TO_EXT[file.type] || file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${prefix}-${Date.now()}.${ext}`;

        const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': uploadToken,
                'X-Bz-File-Name': encodeURIComponent(fileName),
                'Content-Type': file.type || 'image/jpeg',
                'X-Bz-Content-Sha1': sha1,
                'Content-Length': String(imgBuffer.length),
            },
            body: imgBuffer,
        });
        if (!uploadRes.ok) {
            const err = await uploadRes.json();
            throw new Error(err.message || 'Falha no upload para B2');
        }
        const uploadData = await uploadRes.json();

        const url = `${settings.b2_public_url_base}/${uploadData.fileName}`;
        return new Response(JSON.stringify({ url }), { status: 200 });

    } catch (err: any) {
        console.error('upload-image error:', err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
};
