/**
 * Camada de dados cloud multi-tenant (SSR). Porta ÚNICA pro Supabase por site_id.
 * Consuma daqui — nunca chame Supabase/R2 direto nos componentes/pages.
 *
 *   import cms, { media } from '@/lib/cms';
 *   const posts = await cms.getPosts(siteId);
 *   const cfg   = await cms.getContent(siteId, 'siteConfig');
 */
import { SupabaseCmsDriver } from './driver-supabase';
import { createMediaDriver } from './media-r2';
import type { CmsDriver, MediaDriver } from './types';

export * from './types';
export { SupabaseCmsDriver } from './driver-supabase';
export { createMediaDriver, mediaPath } from './media-r2';

const cms: CmsDriver = new SupabaseCmsDriver();
export const media: MediaDriver = createMediaDriver();

export default cms;
