-- Sistema de log de erros de deploy
-- Registra toda falha de criação/build de sites para suporte

create table if not exists public.deploy_errors (
    id uuid primary key default gen_random_uuid(),
    ref_code text unique not null, -- código curto tipo "ERR-A7K2F9" para o aluno mostrar ao suporte
    user_id uuid references auth.users(id) on delete set null,
    user_email text,
    stage text not null, -- 'github_repo' | 'vercel_project' | 'env_vars' | 'deploy_trigger' | 'build_failed'
    template_id text,
    template_name text,
    repo_name text,
    error_message text not null,
    error_code text,
    http_status int,
    build_log text,
    inspector_url text,
    vercel_deployment_id text,
    github_repo_url text,
    raw_response jsonb,
    resolved boolean default false,
    notes text,
    created_at timestamptz default now()
);

create index if not exists idx_deploy_errors_user on public.deploy_errors(user_id);
create index if not exists idx_deploy_errors_created on public.deploy_errors(created_at desc);
create index if not exists idx_deploy_errors_resolved on public.deploy_errors(resolved);
create index if not exists idx_deploy_errors_ref on public.deploy_errors(ref_code);

-- RLS: apenas admins podem ler; service_role (via API) escreve
alter table public.deploy_errors enable row level security;

create policy "admins can view all deploy errors"
    on public.deploy_errors for select
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );

create policy "admins can update deploy errors"
    on public.deploy_errors for update
    using (
        exists (
            select 1 from public.profiles
            where profiles.id = auth.uid()
            and profiles.role = 'admin'
        )
    );
