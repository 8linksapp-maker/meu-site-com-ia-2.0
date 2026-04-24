import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const supabaseAdmin = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export const POST: APIRoute = async ({ request }) => {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Sessão inválida' }), { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) {
            return new Response(JSON.stringify({ error: 'Nenhum arquivo enviado' }), { status: 400 });
        }

        // Validate file type
        const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
        if (!allowed.includes(file.type)) {
            return new Response(JSON.stringify({ error: 'Tipo de arquivo não permitido. Use PNG, JPG, WebP ou GIF.' }), { status: 400 });
        }

        // Max 5MB
        if (file.size > 5 * 1024 * 1024) {
            return new Response(JSON.stringify({ error: 'Arquivo muito grande. Máximo 5MB.' }), { status: 400 });
        }

        const ext = file.name.split('.').pop() || 'png';
        const fileName = `${user.id}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabaseAdmin.storage
            .from('support-screenshots')
            .upload(fileName, file, { contentType: file.type, upsert: false });

        if (uploadError) {
            return new Response(JSON.stringify({ error: 'Erro no upload: ' + uploadError.message }), { status: 500 });
        }

        const { data: urlData } = supabaseAdmin.storage
            .from('support-screenshots')
            .getPublicUrl(fileName);

        return new Response(JSON.stringify({ url: urlData.publicUrl }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};
