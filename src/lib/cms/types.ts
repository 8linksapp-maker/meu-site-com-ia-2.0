import { z } from 'zod';

/**
 * Camada de dados multi-tenant do plano cloud (SSR).
 * Todo dado é lido/escrito por `site_id`. Este módulo é a ÚNICA porta
 * pro Supabase — Worker (runtime) e admin central consomem só isto.
 */

// ── Chaves de conteúdo singleton (site_content.key) ──────────────
// Espelham src/data/*.json do template. Genéricas (string) mas com um
// contrato conhecido pros callers tiparem o retorno.
export const KNOWN_CONTENT_KEYS = [
  'siteConfig',
  'home',
  'sobre',
  'contato',
  'menu',
  'categories',
  'authors',
] as const;

export type ContentKey = (typeof KNOWN_CONTENT_KEYS)[number] | (string & {});

// ── Site (tenant) ────────────────────────────────────────────────
export const siteSchema = z.object({
  id: z.string(),
  owner: z.string(),
  template: z.string(),
  subdomain: z.string().nullable(),
  status: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});
export type Site = z.infer<typeof siteSchema>;

// ── Conteúdo singleton (key/value JSON) ──────────────────────────
export const siteContentSchema = z.object({
  id: z.string(),
  site_id: z.string(),
  key: z.string(),
  data: z.unknown(),
  updated_at: z.coerce.date(),
});
export type SiteContent = z.infer<typeof siteContentSchema>;

// ── Post ─────────────────────────────────────────────────────────
export const sitePostSchema = z.object({
  id: z.string(),
  site_id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  body_md: z.string(),
  category: z.string().nullable(),
  author: z.string().nullable(),
  hero_image_path: z.string().nullable(),
  is_published: z.boolean(),
  published_at: z.coerce.date().nullable(),
  updated_at: z.coerce.date(),
  created_at: z.coerce.date(),
});
export type SitePost = z.infer<typeof sitePostSchema>;

// Input de escrita (admin) — sem colunas geradas pelo banco.
export const sitePostInputSchema = sitePostSchema
  .omit({ id: true, site_id: true, updated_at: true, created_at: true })
  .partial({
    description: true,
    category: true,
    author: true,
    hero_image_path: true,
    is_published: true,
    published_at: true,
  });
export type SitePostInput = z.infer<typeof sitePostInputSchema>;

// ── Driver de conteúdo ───────────────────────────────────────────
export interface CmsDriver {
  // leitura (runtime SSR — service role no server)
  getSite(siteId: string): Promise<Site | null>;
  getSiteBySubdomain(subdomain: string): Promise<Site | null>;
  getContent<T = unknown>(siteId: string, key: ContentKey): Promise<T | null>;
  getAllContent(siteId: string): Promise<Record<string, unknown>>;
  getPosts(siteId: string, opts?: { includeDrafts?: boolean; category?: string }): Promise<SitePost[]>;
  getPost(siteId: string, slug: string): Promise<SitePost | null>;

  // escrita (admin central)
  upsertSite(input: { owner: string; template: string; subdomain?: string; status?: string }): Promise<Site>;
  saveContent(siteId: string, key: ContentKey, data: unknown): Promise<void>;
  savePost(siteId: string, post: SitePostInput): Promise<SitePost>;
  savePosts(siteId: string, posts: SitePostInput[]): Promise<void>;
  deletePost(siteId: string, slug: string): Promise<void>;
}

// ── Driver de mídia (R2) ─────────────────────────────────────────
export interface MediaUpload {
  siteId: string;
  filename: string;          // nome-base do arquivo (ex: 'capa.jpg')
  contentType: string;       // MIME (ex: 'image/jpeg')
  body: Uint8Array | ArrayBuffer | Blob;
}

export interface MediaDriver {
  /** Grava no bucket R2 e retorna o path relativo persistido no banco. */
  uploadMedia(upload: MediaUpload): Promise<{ path: string }>;
  /** URL pública servível a partir do path (CDN do R2). */
  publicUrl(path: string): string;
  /** Remove um objeto do bucket. */
  deleteMedia(path: string): Promise<void>;
}
