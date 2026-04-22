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

const messageSchema = z.object({
    ticket_id: z.string().uuid('ID de chamado invalido'),
    message: z.string().min(1, 'Mensagem obrigatoria').max(5000),
});

// POST — add message to ticket
export const POST: APIRoute = async ({ request }) => {
    try {
        const user = await getAuthUser(request);
        if (!user) {
            return new Response(JSON.stringify({ error: 'Nao autorizado' }), { status: 401 });
        }

        const rawBody = await request.json();
        const parsed = messageSchema.safeParse(rawBody);
        if (!parsed.success) {
            const msg = parsed.error.issues.map(i => i.message).join('; ');
            return new Response(JSON.stringify({ error: msg }), { status: 400 });
        }

        const { ticket_id, message } = parsed.data;
        const admin = await isAdmin(user.id);

        // Check ticket exists and user owns it (or is admin)
        const { data: ticket, error: ticketErr } = await supabaseAdmin
            .from('support_tickets')
            .select('id, user_id')
            .eq('id', ticket_id)
            .single();

        if (ticketErr || !ticket) {
            return new Response(JSON.stringify({ error: 'Chamado nao encontrado' }), { status: 404 });
        }

        if (!admin && ticket.user_id !== user.id) {
            return new Response(JSON.stringify({ error: 'Nao autorizado' }), { status: 403 });
        }

        // Determine author info
        const authorType = admin ? 'juvenal' : 'aluno';
        const authorName = admin ? 'Juvenal Amancio' : (user.email?.split('@')[0] || 'Aluno');

        const { data: newMsg, error } = await supabaseAdmin
            .from('ticket_messages')
            .insert({
                ticket_id,
                author_type: authorType,
                author_name: authorName,
                message,
            })
            .select()
            .single();

        if (error) throw error;

        // If admin replied, update ticket status to em_andamento if it was aberto
        if (admin) {
            await supabaseAdmin
                .from('support_tickets')
                .update({ status: 'em_andamento', updated_at: new Date().toISOString() })
                .eq('id', ticket_id)
                .eq('status', 'aberto');
        }

        return new Response(JSON.stringify(newMsg), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
};
