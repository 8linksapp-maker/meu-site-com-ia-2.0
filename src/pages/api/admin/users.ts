import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Cliente Supabase que contorna RLS e manipula a API do servidor (Admin API)
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

// Helper para validar quem está chamando a API
const verifyAdmin = async (request: Request) => {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.split('Bearer ')[1];
    if (!token) throw new Error('Token ausente');

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error('Token inválido');

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') throw new Error('Não autorizado');

    return user;
};

export const GET: APIRoute = async ({ request }) => {
    try {
        if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY ausente no .env');
        await verifyAdmin(request);

        // Lista usuários do Auth e junta com as informações do profiles
        const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        if (authError) throw authError;

        const { data: profiles, error: profError } = await supabaseAdmin.from('profiles').select('*');
        if (profError) throw profError;

        const mergedUsers = users.map(authUser => {
            const profile = profiles.find(p => p.id === authUser.id) || {};
            return {
                id: authUser.id,
                email: authUser.email,
                created_at: authUser.created_at,
                role: profile.role || 'user',
                github_token: profile.github_token || '',
                vercel_token: profile.vercel_token || ''
            };
        });

        return new Response(JSON.stringify(mergedUsers), { status: 200 });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
};

export const POST: APIRoute = async ({ request }) => {
    try {
        await verifyAdmin(request);
        const { email, password, role, github_token, vercel_token } = await request.json();

        const { data: currUser, error: currErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });
        if (currErr) throw currErr;

        const { error: profError } = await supabaseAdmin.from('profiles').insert({
            id: currUser.user.id,
            role: role || 'user',
            github_token,
            vercel_token
        });

        if (profError) {
            // Reverter se o perfil falhar
            await supabaseAdmin.auth.admin.deleteUser(currUser.user.id);
            throw profError;
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
};

export const PUT: APIRoute = async ({ request }) => {
    try {
        await verifyAdmin(request);
        const { id, email, password, role, github_token, vercel_token } = await request.json();

        // Atualiza email/senha no painel Auth principal se tiverem sido mudados/preenchidos
        let updatePayload: any = {};
        if (email) updatePayload.email = email;
        if (password) updatePayload.password = password;

        if (Object.keys(updatePayload).length > 0) {
            const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, updatePayload);
            if (authErr) throw authErr;
        }

        // Atualiza tabela de perfis
        const { error: profErr } = await supabaseAdmin.from('profiles')
            .update({ role, github_token, vercel_token })
            .eq('id', id);

        if (profErr) throw profErr;

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
};

export const DELETE: APIRoute = async ({ request }) => {
    try {
        await verifyAdmin(request);
        const { id } = await request.json();

        // Deletar o perfil manualmente, algumas setups de DB têm trigger CASCADE, as vezes não.
        await supabaseAdmin.from('profiles').delete().eq('id', id);

        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
};
