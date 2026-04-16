import type { APIRoute } from 'astro';
import { supabaseAdmin, verifyAdmin } from '../../../lib/verifyAdmin';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
    try {
        await verifyAdmin(request);

        // Buscar configurações do B2 no banco
        const { data: settings, error: settingsError } = await supabaseAdmin
            .from('platform_settings')
            .select('b2_key_id, b2_app_key, b2_bucket_id, b2_bucket_name, b2_public_url_base')
            .limit(1)
            .single();

        if (settingsError || !settings?.b2_key_id || !settings?.b2_app_key || !settings?.b2_bucket_name) {
            throw new Error('Configurações do Backblaze B2 incompletas.');
        }

        // 1. Autorizar Conta no B2
        const authHash = Buffer.from(`${settings.b2_key_id}:${settings.b2_app_key}`).toString('base64');
        const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
            headers: { 'Authorization': `Basic ${authHash}` }
        });

        if (!authResponse.ok) {
            const errData = await authResponse.json();
            console.error('B2 Auth Error:', errData);
            throw new Error(`Erro B2 Auth: ${errData.message || authResponse.statusText}`);
        }

        const authData = await authResponse.json();
        const { apiUrl, authorizationToken, accountId } = authData;

        // 2. Descobrir Bucket ID pelo Nome (se não estiver preenchido)
        let bucketId = settings.b2_bucket_id;
        if (!bucketId) {
            const listBucketsResp = await fetch(`${apiUrl}/b2api/v2/b2_list_buckets`, {
                method: 'POST',
                headers: { 'Authorization': authorizationToken, 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId, bucketName: settings.b2_bucket_name })
            });
            const lbData = await listBucketsResp.json();
            const bucket = lbData.buckets?.find((b: any) => b.bucketName === settings.b2_bucket_name);
            if (!bucket) throw new Error(`Bucket "${settings.b2_bucket_name}" não encontrado.`);
            bucketId = bucket.bucketId;
        }

        // 3. Obter URL de Upload
        const uploadUrlResponse = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
            method: 'POST',
            headers: {
                'Authorization': authorizationToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bucketId })
        });

        if (!uploadUrlResponse.ok) {
            const errData = await uploadUrlResponse.json();
            throw new Error(`Erro B2 Get Upload URL: ${errData.message || uploadUrlResponse.statusText}`);
        }

        const uploadData = await uploadUrlResponse.json();

        return new Response(JSON.stringify({
            uploadUrl: uploadData.uploadUrl,
            uploadAuthToken: uploadData.authorizationToken,
            publicUrlBase: settings.b2_public_url_base
        }), { status: 200 });

    } catch (err: any) {
        console.error('Error in b2-auth:', err.message);
        const msg = err.message || '';
        if (msg.includes('Token ausente') || msg.includes('Token inválido')) {
            return new Response(JSON.stringify({ error: 'Sessão expirada. Faça login novamente.' }), { status: 401 });
        }
        if (msg.includes('Não autorizado')) {
            return new Response(JSON.stringify({ error: 'Acesso restrito a administradores.' }), { status: 403 });
        }
        if (msg.includes('B2') || msg.includes('Bucket') || msg.includes('Backblaze')) {
            return new Response(JSON.stringify({ error: 'Erro ao conectar com o serviço de arquivos. Verifique as configurações do Backblaze B2.' }), { status: 500 });
        }
        return new Response(JSON.stringify({ error: 'Erro interno. Tente novamente.' }), { status: 500 });
    }
};
