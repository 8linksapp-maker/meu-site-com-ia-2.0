import type { APIRoute } from 'astro';
import { supabaseAdmin, verifyAdmin } from '../../../lib/verifyAdmin';

export const prerender = false;

/**
 * Gera signed URL temporária para vídeo do Backblaze B2
 *
 * Query params:
 *  - fileUrl: URL pública do arquivo (ex: https://f005.backblazeb2.com/file/bucket/path.mp4)
 *  - expiresIn: segundos pra expirar (default: 3600 = 1 hora)
 *
 * Retorna:
 *  { signedUrl: string, expiresAt: number }
 */
export const GET: APIRoute = async ({ request }) => {
    try {
        // Não requer admin — qualquer usuário logado pode pegar signed URL
        // Mas só funciona se o bucket for privado (B2 não cobra por download interno)

        const url = new URL(request.url);
        const fileUrl = url.searchParams.get('fileUrl');
        const expiresIn = parseInt(url.searchParams.get('expiresIn') || '3600');

        if (!fileUrl) {
            return new Response(JSON.stringify({ error: 'fileUrl é obrigatório' }), { status: 400 });
        }

        // Extrair bucket e file path da URL
        // Ex: https://f005.backblazeb2.com/file/meu-site-com-ia/path/to/video.mp4
        const urlMatch = fileUrl.match(/https?:\/\/[^/]+\/file\/([^/]+)\/(.+)/);
        if (!urlMatch) {
            return new Response(JSON.stringify({ error: 'URL inválida' }), { status: 400 });
        }

        const bucketName = urlMatch[1];
        const filePath = urlMatch[2];

        // Buscar configurações do B2 no banco
        const { data: settings, error: settingsError } = await supabaseAdmin
            .from('platform_settings')
            .select('b2_key_id, b2_app_key, b2_bucket_name')
            .limit(1)
            .single();

        if (settingsError || !settings?.b2_key_id || !settings?.b2_app_key) {
            return new Response(JSON.stringify({ error: 'B2 não configurado' }), { status: 500 });
        }

        // 1. Autorizar Conta no B2
        const authHash = Buffer.from(`${settings.b2_key_id}:${settings.b2_app_key}`).toString('base64');
        const authResponse = await fetch('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
            headers: { 'Authorization': `Basic ${authHash}` }
        });

        if (!authResponse.ok) {
            const errData = await authResponse.json();
            console.error('B2 Auth Error:', errData);
            return new Response(JSON.stringify({ error: `Erro B2 Auth: ${errData.message}` }), { status: 500 });
        }

        const authData = await authResponse.json();
        const { apiUrl, authorizationToken, accountId, downloadUrl } = authData;

        // 2. Descobrir Bucket ID pelo Nome
        const listBucketsResp = await fetch(`${apiUrl}/b2api/v2/b2_list_buckets`, {
            method: 'POST',
            headers: { 'Authorization': authorizationToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId })
        });

        if (!listBucketsResp.ok) {
            return new Response(JSON.stringify({ error: 'Erro ao listar buckets' }), { status: 500 });
        }

        const lbData = await listBucketsResp.json();
        const bucket = lbData.buckets?.find((b: any) => b.bucketName === bucketName);

        if (!bucket) {
            return new Response(JSON.stringify({ error: `Bucket "${bucketName}" não encontrado` }), { status: 404 });
        }

        const bucketId = bucket.bucketId;
        const bucketType = bucket.bucketType;

        // Se o bucket já for público, retorna a URL original
        if (bucketType === 'allPublic') {
            return new Response(JSON.stringify({
                signedUrl: fileUrl,
                expiresAt: Date.now() + (expiresIn * 1000),
                isPublic: true
            }));
        }

        // 3. Gerar signed URL usando B2 Download Authorization
        // B2 permite criar tokens de download com expiração
        // https://www.backblaze.com/docs/cloud-storage-download-auth-tokens

        const expirationTime = Date.now() + (expiresIn * 1000);

        // Cria um token de download autorizado
        const authResp = await fetch(`${apiUrl}/b2api/v2/b2_get_download_authorization`, {
            method: 'POST',
            headers: {
                'Authorization': authorizationToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bucketId,
                fileNamePrefix: filePath,  // Autoriza só esse arquivo específico
                validDurationInSeconds: expiresIn
            })
        });

        if (!authResp.ok) {
            const errData = await authResp.json();
            console.error('B2 Download Auth Error:', errData);
            return new Response(JSON.stringify({ error: `Erro ao gerar token: ${errData.message}` }), { status: 500 });
        }

        const downloadAuthData = await authResp.json();
        const { authorizationToken: downloadToken } = downloadAuthData;

        // 4. Construir signed URL com token
        // Formato: https://fXXX.backblazeb2.com/file/bucketName/fileName?Authorization=TOKEN
        const signedUrl = `${downloadUrl}/file/${bucketName}/${filePath}?Authorization=${downloadToken}`;

        return new Response(JSON.stringify({
            signedUrl,
            expiresAt: expirationTime,
            isPublic: false
        }));

    } catch (err: any) {
        console.error('Error in b2-signed-url:', err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
