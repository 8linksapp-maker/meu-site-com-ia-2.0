import type { SupabaseClient } from '@supabase/supabase-js';
import { getServiceClient } from './client';
import {
  siteSchema,
  sitePostSchema,
  sitePostInputSchema,
  type CmsDriver,
  type ContentKey,
  type Site,
  type SitePost,
  type SitePostInput,
} from './types';

/**
 * Driver Supabase multi-tenant. Espelha o padrão de "driver-por-site" da 8links:
 * toda query é filtrada por `site_id`. NÃO usa git (repoIo.ts morreu no Modelo 2).
 * Validação zod em todo dado que sai do banco — dado corrompido loga warning e é
 * descartado, nunca quebra o render do site.
 */
export class SupabaseCmsDriver implements CmsDriver {
  private db: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.db = client ?? getServiceClient();
  }

  // ── Sites ──────────────────────────────────────────────────────
  async getSite(siteId: string): Promise<Site | null> {
    const { data, error } = await this.db.from('sites').select('*').eq('id', siteId).maybeSingle();
    if (error) {
      console.warn(`[cms] getSite(${siteId}) falhou:`, error.message);
      return null;
    }
    return this.parseSite(data);
  }

  async getSiteBySubdomain(subdomain: string): Promise<Site | null> {
    const { data, error } = await this.db
      .from('sites')
      .select('*')
      .eq('subdomain', subdomain)
      .maybeSingle();
    if (error) {
      console.warn(`[cms] getSiteBySubdomain(${subdomain}) falhou:`, error.message);
      return null;
    }
    return this.parseSite(data);
  }

  async upsertSite(input: {
    owner: string;
    template: string;
    subdomain?: string;
    status?: string;
  }): Promise<Site> {
    const { data, error } = await this.db
      .from('sites')
      .upsert(
        {
          owner: input.owner,
          template: input.template,
          subdomain: input.subdomain ?? null,
          status: input.status ?? 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'subdomain' },
      )
      .select('*')
      .single();
    if (error) throw new Error(`[cms] upsertSite falhou: ${error.message}`);
    const site = this.parseSite(data);
    if (!site) throw new Error('[cms] upsertSite retornou linha inválida');
    return site;
  }

  // ── Conteúdo singleton ─────────────────────────────────────────
  async getContent<T = unknown>(siteId: string, key: ContentKey): Promise<T | null> {
    const { data, error } = await this.db
      .from('site_content')
      .select('data')
      .eq('site_id', siteId)
      .eq('key', key)
      .maybeSingle();
    if (error) {
      console.warn(`[cms] getContent(${siteId}, ${key}) falhou:`, error.message);
      return null;
    }
    return (data?.data as T) ?? null;
  }

  async getAllContent(siteId: string): Promise<Record<string, unknown>> {
    const { data, error } = await this.db
      .from('site_content')
      .select('key, data')
      .eq('site_id', siteId);
    if (error) {
      console.warn(`[cms] getAllContent(${siteId}) falhou:`, error.message);
      return {};
    }
    const out: Record<string, unknown> = {};
    for (const row of data ?? []) out[row.key as string] = row.data;
    return out;
  }

  async saveContent(siteId: string, key: ContentKey, data: unknown): Promise<void> {
    const { error } = await this.db.from('site_content').upsert(
      {
        site_id: siteId,
        key,
        data: data as never,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'site_id,key' },
    );
    if (error) throw new Error(`[cms] saveContent(${siteId}, ${key}) falhou: ${error.message}`);
  }

  // ── Posts ──────────────────────────────────────────────────────
  async getPosts(
    siteId: string,
    opts: { includeDrafts?: boolean; category?: string } = {},
  ): Promise<SitePost[]> {
    let q = this.db.from('site_posts').select('*').eq('site_id', siteId);
    if (!opts.includeDrafts) q = q.eq('is_published', true);
    if (opts.category) q = q.eq('category', opts.category);
    q = q.order('published_at', { ascending: false, nullsFirst: false });

    const { data, error } = await q;
    if (error) {
      console.warn(`[cms] getPosts(${siteId}) falhou:`, error.message);
      return [];
    }
    return this.parsePosts(data ?? [], siteId);
  }

  async getPost(siteId: string, slug: string): Promise<SitePost | null> {
    const { data, error } = await this.db
      .from('site_posts')
      .select('*')
      .eq('site_id', siteId)
      .eq('slug', slug)
      .maybeSingle();
    if (error) {
      console.warn(`[cms] getPost(${siteId}, ${slug}) falhou:`, error.message);
      return null;
    }
    if (!data) return null;
    const parsed = sitePostSchema.safeParse(data);
    if (!parsed.success) {
      console.warn(`[cms] getPost(${siteId}, ${slug}) shape inválido:`, parsed.error.message);
      return null;
    }
    return parsed.data;
  }

  async savePost(siteId: string, post: SitePostInput): Promise<SitePost> {
    const input = sitePostInputSchema.parse(post);
    const { data, error } = await this.db
      .from('site_posts')
      .upsert(
        {
          site_id: siteId,
          slug: input.slug,
          title: input.title,
          description: input.description ?? null,
          body_md: input.body_md,
          category: input.category ?? null,
          author: input.author ?? null,
          hero_image_path: input.hero_image_path ?? null,
          is_published: input.is_published ?? true,
          published_at:
            input.published_at instanceof Date
              ? input.published_at.toISOString()
              : (input.published_at ?? null),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'site_id,slug' },
      )
      .select('*')
      .single();
    if (error) throw new Error(`[cms] savePost(${siteId}, ${post.slug}) falhou: ${error.message}`);
    const parsed = sitePostSchema.parse(data);
    return parsed;
  }

  async savePosts(siteId: string, posts: SitePostInput[]): Promise<void> {
    const rows = posts.map((p) => {
      const input = sitePostInputSchema.parse(p);
      return {
        site_id: siteId,
        slug: input.slug,
        title: input.title,
        description: input.description ?? null,
        body_md: input.body_md,
        category: input.category ?? null,
        author: input.author ?? null,
        hero_image_path: input.hero_image_path ?? null,
        is_published: input.is_published ?? true,
        published_at:
          input.published_at instanceof Date
            ? input.published_at.toISOString()
            : (input.published_at ?? null),
        updated_at: new Date().toISOString(),
      };
    });
    const { error } = await this.db
      .from('site_posts')
      .upsert(rows, { onConflict: 'site_id,slug' });
    if (error) throw new Error(`[cms] savePosts(${siteId}) falhou: ${error.message}`);
  }

  async deletePost(siteId: string, slug: string): Promise<void> {
    const { error } = await this.db
      .from('site_posts')
      .delete()
      .eq('site_id', siteId)
      .eq('slug', slug);
    if (error) throw new Error(`[cms] deletePost(${siteId}, ${slug}) falhou: ${error.message}`);
  }

  // ── helpers ────────────────────────────────────────────────────
  private parseSite(data: unknown): Site | null {
    if (!data) return null;
    const parsed = siteSchema.safeParse(data);
    if (!parsed.success) {
      console.warn('[cms] site shape inválido:', parsed.error.message);
      return null;
    }
    return parsed.data;
  }

  private parsePosts(rows: unknown[], siteId: string): SitePost[] {
    const out: SitePost[] = [];
    for (const row of rows) {
      const parsed = sitePostSchema.safeParse(row);
      if (parsed.success) out.push(parsed.data);
      else console.warn(`[cms] post inválido descartado (site ${siteId}):`, parsed.error.message);
    }
    return out;
  }
}
