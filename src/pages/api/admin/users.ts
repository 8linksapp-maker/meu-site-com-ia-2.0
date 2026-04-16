import type { APIRoute } from 'astro';
import { z } from 'zod';
import { supabaseAdmin, verifyAdmin } from '../../../lib/verifyAdmin';

export const prerender = false;

const courseSchema = z.object({
    course_id: z.string().min(1),
    expires_at: z.string().nullable().optional(),
});

const createUserSchema = z.object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
    role: z.enum(['admin', 'user']).optional(),
    github_token: z.string().max(500).optional(),
    vercel_token: z.string().max(500).optional(),
    user_courses: z.array(courseSchema).optional(),
});

const updateUserSchema = z.object({
    id: z.string().uuid('ID de usuário inválido'),
    email: z.string().email('Email inválido').optional(),
    password: z.string().min(6).optional(),
    role: z.enum(['admin', 'user']).optional(),
    github_token: z.string().max(500).optional(),
    vercel_token: z.string().max(500).optional(),
    user_courses: z.array(courseSchema).optional(),
});

const deleteUserSchema = z.object({
    id: z.string().uuid('ID de usuário inválido'),
});


export const GET: APIRoute = async ({ request }) => {
    try {
        await verifyAdmin(request);

        const { data: profiles, error: profError } = await supabaseAdmin.from('profiles').select('*');
        if (profError) throw profError;

        let users: any[] = [];
        const chunkSize = 25;
        for (let i = 0; i < profiles.length; i += chunkSize) {
            const chunk = profiles.slice(i, i + chunkSize);
            const promises = chunk.map(p =>
                supabaseAdmin.auth.admin.getUserById(p.id)
                    .then(res => res.data?.user)
                    .catch(() => null)
            );
            const results = await Promise.all(promises);
            users.push(...results.filter(Boolean));
        }

        const { data: ucData, error: ucErr } = await supabaseAdmin
            .from('user_courses')
            .select('user_id, expires_at, course_id, courses(title)');
        if (ucErr) throw ucErr;

        const mergedUsers = users.map(authUser => {
            const userProfiles = profiles.filter(p => p.id === authUser.id);
            const userAccesses = ucData?.filter(uc => uc.user_id === authUser.id) || [];

            // Consolidamos as permissões: se qualquer registro for admin, o usuário tem.
            const isAdmin = userProfiles.some(p => p.role === 'admin');

            return {
                id: authUser.id,
                email: authUser.email,
                created_at: authUser.created_at,
                role: isAdmin ? 'admin' : 'user',
                // Tokens mascarados — admin vê só se existe, não o valor real
                github_token: (() => {
                    const t = userProfiles.find(p => p.github_token)?.github_token;
                    return t ? `***${t.slice(-4)}` : '';
                })(),
                vercel_token: (() => {
                    const t = userProfiles.find(p => p.vercel_token)?.vercel_token;
                    return t ? `***${t.slice(-4)}` : '';
                })(),
                // Lista de acessos
                accesses: userAccesses.map(uc => ({
                    course_id: uc.course_id,
                    product_id: uc.course_id,
                    product_name: (uc.courses as any)?.title || (Array.isArray(uc.courses) ? (uc.courses[0] as any)?.title : 'Curso Desconhecido'),
                    status: (uc.expires_at && new Date(uc.expires_at).getTime() < Date.now()) ? 'expired' : 'active',
                    period_end: uc.expires_at
                }))
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
        const rawBody = await request.json();
        const parsed = createUserSchema.safeParse(rawBody);
        if (!parsed.success) {
            return new Response(JSON.stringify({ error: parsed.error.issues.map(i => i.message).join('; ') }), { status: 400 });
        }
        const { email, password, role, github_token, vercel_token, user_courses } = parsed.data;

        const { data: currUser, error: currErr } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true
        });
        if (currErr) throw currErr;

        let nextStatus = 'inactive';
        let nextPeriodEnd: string | null = null;

        if (user_courses && Array.isArray(user_courses) && user_courses.length > 0) {
            nextStatus = 'active';
            const hasLifetime = user_courses.some(c => !c.expires_at);
            if (!hasLifetime) {
                const maxDate = Math.max(...user_courses.map(c => new Date(c.expires_at).getTime()));
                nextPeriodEnd = new Date(maxDate).toISOString();
            }
        }

        const { error: profError } = await supabaseAdmin.from('profiles').insert({
            id: currUser.user.id,
            product_id: 'main_product', // Valor padrão para criação manual
            product_name: 'Acesso Manual',
            role: role || 'user',
            github_token,
            vercel_token,
            subscription_status: nextStatus,
            subscription_period_end: nextPeriodEnd
        });

        if (profError) {
            // Reverter se o perfil falhar
            await supabaseAdmin.auth.admin.deleteUser(currUser.user.id);
            throw profError;
        }

        // Se mandou os cursos:
        if (user_courses && Array.isArray(user_courses) && user_courses.length > 0) {
            const coursePayload = user_courses.map(c => ({
                user_id: currUser.user.id,
                course_id: c.course_id,
                expires_at: c.expires_at || null
            }));
            await supabaseAdmin.from('user_courses').insert(coursePayload);
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
};

export const PUT: APIRoute = async ({ request }) => {
    try {
        await verifyAdmin(request);
        const rawBody = await request.json();
        const parsed = updateUserSchema.safeParse(rawBody);
        if (!parsed.success) {
            return new Response(JSON.stringify({ error: parsed.error.issues.map(i => i.message).join('; ') }), { status: 400 });
        }
        const { id, email, password, role, github_token, vercel_token, user_courses } = parsed.data;

        // Atualiza email/senha no painel Auth principal se tiverem sido mudados/preenchidos
        let updatePayload: any = {};
        if (email) updatePayload.email = email;
        if (password) updatePayload.password = password;

        if (Object.keys(updatePayload).length > 0) {
            const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, updatePayload);
            if (authErr) throw authErr;
        }

        // Atualiza tabela de perfis — ignora tokens mascarados (***) para não sobrescrever o real
        const profileUpdate: Record<string, any> = { role };
        if (github_token && !github_token.startsWith('***')) profileUpdate.github_token = github_token;
        if (vercel_token && !vercel_token.startsWith('***')) profileUpdate.vercel_token = vercel_token;

        const { error: profErr } = await supabaseAdmin.from('profiles')
            .update(profileUpdate)
            .eq('id', id)
            .eq('product_id', 'main_product');

        if (profErr) throw profErr;

        // Limpa e reinstala os grants
        if (user_courses !== undefined && Array.isArray(user_courses)) {
            await supabaseAdmin.from('user_courses').delete().eq('user_id', id);

            if (user_courses.length > 0) {
                const coursePayload = user_courses.map(c => ({
                    user_id: id,
                    course_id: c.course_id,
                    expires_at: c.expires_at ? new Date(c.expires_at).toISOString() : null
                }));
                await supabaseAdmin.from('user_courses').insert(coursePayload);
            }

            // Sincroniza a validade do Platform App usando a trava mais abrangente dos cursos dados
            let nextStatus = user_courses.length > 0 ? 'active' : 'inactive';
            let nextPeriodEnd: string | null = null;
            if (user_courses.length > 0) {
                const hasLifetime = user_courses.some(c => !c.expires_at);
                if (!hasLifetime) {
                    const maxDate = Math.max(...user_courses.map(c => new Date(c.expires_at).getTime()));
                    nextPeriodEnd = new Date(maxDate).toISOString();
                }
            }
            const { error: syncErr } = await supabaseAdmin.from('profiles')
                .update({ subscription_status: nextStatus, subscription_period_end: nextPeriodEnd })
                .eq('id', id).eq('product_id', 'main_product');
            if (syncErr) throw syncErr;
        }

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
};

export const DELETE: APIRoute = async ({ request }) => {
    try {
        await verifyAdmin(request);
        const rawBody = await request.json();
        const parsed = deleteUserSchema.safeParse(rawBody);
        if (!parsed.success) {
            return new Response(JSON.stringify({ error: parsed.error.issues.map(i => i.message).join('; ') }), { status: 400 });
        }
        const { id } = parsed.data;

        // Deletar o perfil manualmente, algumas setups de DB têm trigger CASCADE, as vezes não.
        await supabaseAdmin.from('profiles').delete().eq('id', id);

        const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
};
