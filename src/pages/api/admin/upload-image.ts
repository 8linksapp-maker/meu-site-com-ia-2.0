import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

export const prerender = false;

const supabaseAdmin = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL || '',
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } }
);

const verifyAdmin = async (request: Request) => {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) throw new Error('Token ausente');
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) throw new Error('Token inválido');
    const { data: profiles } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id);
    if (!profiles?.some(p => p.role === 'admin')) throw new Error('Não autorizado');
    return user;
};

export const POST: APIRoute = async ({ request }) => {
    try {
        await verifyAdmin(request);

        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const prefix = (formData.get('prefix') as string) || 'upload';

        if (!file) throw new Error('Nenhum arquivo enviado');

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
        const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
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
