import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase SERVER-ONLY (service role) pra camada cms multi-tenant.
 * Bypassa RLS — nunca importe isto de código que roda no browser.
 * O runtime SSR do Worker e as rotas de admin central usam este client.
 */
let cached: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (cached) return cached;

  const env = (k: string): string =>
    ((import.meta as ImportMeta).env?.[k] as string | undefined) ?? process.env[k] ?? '';
  const url = env('PUBLIC_SUPABASE_URL');
  const key = env('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !key) {
    throw new Error(
      '[cms] PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios pra camada cms multi-tenant',
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
