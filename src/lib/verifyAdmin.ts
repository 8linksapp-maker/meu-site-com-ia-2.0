import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

export async function verifyAdmin(request: Request) {
    const token = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!token) throw new Error('Token ausente');

    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) throw new Error('Token inválido');

    const { data: profiles } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id);
    if (!profiles?.some(p => p.role === 'admin')) throw new Error('Não autorizado');

    return user;
}
