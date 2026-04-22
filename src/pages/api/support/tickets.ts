import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

export const prerender = false;

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function getAuthUser(request: Request) {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) return null;
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;
    return user;
}

async function isAdmin(userId: string) {
    const { data: profiles } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId);
    return profiles?.some(p => p.role === 'admin') || false;
}

const createTicketSchema = z.object({
    subject: z.string().min(1, 'Assunto obrigatório').max(200),
    description: z.string().min(1, 'Descrição obrigatória').max(5000),
    category: z.enum(['bug', 'duvida', 'feature', 'urgente']).default('bug'),
    site_repo: z.string().max(200).optional().default(''),
    screenshot_url: z.string().max(1000).optional().default(''),
});

// GET — list tickets
export const GET: APIRoute = async ({ request }) => {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
        }

        const url = new URL(request.url);
        const statusFilter = url.searchParams.get('status');
        const admin = await isAdmin(user.id);

        let query = supabaseAdmin
            .from('support_tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (!admin) {
            query = query.eq('user_id', user.id);
        }

        if (statusFilter && statusFilter !== 'todos') {
            query = query.eq('status', statusFilter);
        }

        const { data: tickets, error } = await query;
        if (error) throw error;

        return new Response(JSON.stringify(tickets || []), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
};

// POST — create new ticket
export const POST: APIRoute = async ({ request }) => {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401 });
        }

        const rawBody = await request.json();
        const parsed = createTicketSchema.safeParse(rawBody);
        if (!parsed.success) {
            const msg = parsed.error.issues.map(i => i.message).join('; ');
            return new Response(JSON.stringify({ error: msg }), { status: 400 });
        }

        const { subject, description, category, site_repo, screenshot_url } = parsed.data;

        // Get user name from profiles
        const { data: profileData } = await supabaseAdmin
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .limit(1);
        const userName = profileData?.[0]?.full_name || user.email?.split('@')[0] || '';

        const { data: ticket, error } = await supabaseAdmin
            .from('support_tickets')
            .insert({
                user_id: user.id,
                user_email: user.email || '',
                user_name: userName,
                site_repo,
                category,
                subject,
                description,
                screenshot_url,
                status: 'aberto',
                priority: category === 'urgente' ? 2 : 0,
            })
            .select()
            .single();

        if (error) throw error;

        return new Response(JSON.stringify(ticket), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
};
