import type { APIRoute } from 'astro';
import { supabaseAdmin, verifyAdmin } from '../../../lib/verifyAdmin';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
    try {
        await verifyAdmin(request);

        // Parsear query params
        const url = new URL(request.url);
        const prefix = url.searchParams.get('prefix') || '';

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

        // 3. Listar Arquivos com prefixo (pasta atual)
        const listFilesResponse = await fetch(`${apiUrl}/b2api/v2/b2_list_file_names`, {
            method: 'POST',
            headers: {
                'Authorization': authorizationToken,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bucketId,
                maxFileCount: 1000,
                prefix: prefix || undefined
            })
        });

        if (!listFilesResponse.ok) {
            const errData = await listFilesResponse.json();
            throw new Error(`Erro B2 List Files: ${errData.message || listFilesResponse.statusText}`);
        }

        const listData = await listFilesResponse.json();

        // 4. Extrair subpastas únicas do nível atual
        // Ex: se prefix="aulas/", extrai "aulas/intro/", "aulas/avancado/", etc.
        const subfolders = new Set<string>();
        const files: any[] = [];

        for (const file of listData.files || []) {
            const fileName = file.fileName;
            // Remove o prefixo atual do nome
            const relativePath = prefix ? fileName.slice(prefix.length) : fileName;

            // Se tem "/" no caminho restante, é uma subpasta
            if (relativePath.includes('/')) {
                const firstSegment = relativePath.split('/')[0];
                const subfolderPath = prefix + firstSegment + '/';
                subfolders.add(subfolderPath);
            }

            // Se não tem "/" ou é arquivo direto no nível atual
            if (!relativePath.includes('/')) {
                files.push({
                    name: fileName,
                    url: `${settings.b2_public_url_base}/${fileName}`,
                    size: file.contentLength,
                    type: file.contentType,
                    uploaded_at: file.uploadTimestamp,
                    isFolder: false,
                });
            }
        }

        // Converte Set para array de objetos de pasta
        const folders = Array.from(subfolders).map(folderPath => ({
            name: folderPath,
            // Extrai só o nome da pasta (último segmento antes do /)
            folderName: folderPath.slice(prefix.length).replace(/\/$/, ''),
            url: null,
            size: 0,
            type: 'folder',
            uploaded_at: 0,
            isFolder: true,
        }));

        // Ordena: pastas primeiro (alfabético), depois arquivos (alfabético)
        folders.sort((a, b) => a.folderName.localeCompare(b.folderName));
        files.sort((a, b) => a.name.localeCompare(b.name));

        return new Response(JSON.stringify({
            folders,
            files,
            currentPrefix: prefix,
        }), { status: 200 });

    } catch (err: any) {
        console.error('Error in b2-list:', err.message);
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
};
