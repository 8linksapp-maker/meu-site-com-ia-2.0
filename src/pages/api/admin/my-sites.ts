import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

export const GET: APIRoute = async ({ request }) => {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.split('Bearer ')[1];
        if (!token) throw new Error('Token ausente');

        // Validar usuário de forma estrita
        const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);
        if (authError || !authData.user || !authData.user.id) {
            return new Response(JSON.stringify({ error: 'Sessão inválida ou expirada' }), { status: 401 });
        }

        const authenticatedUserId = authData.user.id;

        // Buscar sites do usuário via Admin (Ignora RLS)
        // Filtro estritamente vinculado ao ID do usuário autenticado
        const { data: sites, error: sitesError } = await supabaseAdmin
            .from('user_sites')
            .select('*')
            .eq('user_id', authenticatedUserId)
            .order('created_at', { ascending: false });

        if (sitesError) throw sitesError;

        // Filtro de segurança adicional no lado do servidor (JS)
        const safeSites = (sites || []).filter(s => s.user_id === authenticatedUserId);

        return new Response(JSON.stringify(safeSites), { status: 200 });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
};
