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

const updateTicketSchema = z.object({
    status: z.enum(['aberto', 'em_andamento', 'resolvido']).optional(),
    priority: z.number().min(0).max(3).optional(),
    resolved_note: z.string().max(2000).optional(),
});

// GET — single ticket with messages
export const GET: APIRoute = async ({ params, request }) => {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return new Response(JSON.stringify({ error: 'Nao autorizado' }), { status: 401 });
        }

        const ticketId = params.id;
        if (!ticketId) {
            return new Response(JSON.stringify({ error: 'ID obrigatorio' }), { status: 400 });
        }

        const admin = await isAdmin(user.id);

        // Fetch ticket
        const { data: ticket, error: ticketErr } = await supabaseAdmin
            .from('support_tickets')
            .select('*')
            .eq('id', ticketId)
            .single();

        if (ticketErr || !ticket) {
            return new Response(JSON.stringify({ error: 'Chamado nao encontrado' }), { status: 404 });
        }

        // Check ownership or admin
        if (!admin && ticket.user_id !== user.id) {
            return new Response(JSON.stringify({ error: 'Nao autorizado' }), { status: 403 });
        }

        // Fetch messages
        const { data: messages } = await supabaseAdmin
            .from('ticket_messages')
            .select('*')
            .eq('ticket_id', ticketId)
            .order('created_at', { ascending: true });

        return new Response(JSON.stringify({ ticket, messages: messages || [] }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
};

// PUT — update ticket (admin only, except users can update their own ticket's status to closed)
export const PUT: APIRoute = async ({ params, request }) => {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return new Response(JSON.stringify({ error: 'Nao autorizado' }), { status: 401 });
        }

        const admin = await isAdmin(user.id);
        if (!admin) {
            return new Response(JSON.stringify({ error: 'Apenas admins podem atualizar chamados' }), { status: 403 });
        }

        const ticketId = params.id;
        if (!ticketId) {
            return new Response(JSON.stringify({ error: 'ID obrigatorio' }), { status: 400 });
        }

        const rawBody = await request.json();
        const parsed = updateTicketSchema.safeParse(rawBody);
        if (!parsed.success) {
            const msg = parsed.error.issues.map(i => i.message).join('; ');
            return new Response(JSON.stringify({ error: msg }), { status: 400 });
        }

        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };

        if (parsed.data.status !== undefined) {
            updateData.status = parsed.data.status;
            if (parsed.data.status === 'resolvido') {
                updateData.resolved_at = new Date().toISOString();
            }
        }
        if (parsed.data.priority !== undefined) {
            updateData.priority = parsed.data.priority;
        }
        if (parsed.data.resolved_note !== undefined) {
            updateData.resolved_note = parsed.data.resolved_note;
        }

        const { data: ticket, error } = await supabaseAdmin
            .from('support_tickets')
            .update(updateData)
            .eq('id', ticketId)
            .select()
            .single();

        if (error) throw error;

        return new Response(JSON.stringify(ticket), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
};
