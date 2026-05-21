import type { APIRoute } from 'astro';
import { verifyAdmin, supabaseAdmin } from '../../../lib/verifyAdmin';
import { generateSlug } from '../../../lib/marketplace';

export const prerender = false;

const MAX_THUMB_BYTES = 2 * 1024 * 1024;   // 2MB
const MAX_GALLERY_BYTES = 2 * 1024 * 1024; // 2MB cada
const MAX_ZIP_BYTES = 50 * 1024 * 1024;    // 50MB
const MAX_GALLERY_FILES = 5;

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export const POST: APIRoute = async ({ request }) => {
  try {
    const user = await verifyAdmin(request);

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return new Response(JSON.stringify({ error: 'FormData inválido' }), { status: 400 });
    }

    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const category = formData.get('category') as string | null;
    const priceCentsRaw = formData.get('price_cents') as string | null;
    const githubRepo = formData.get('github_repo') as string | null;
    const thumbnail = formData.get('thumbnail') as File | null;
    const zipFile = formData.get('zip') as File | null;

    if (!title || !description || !category || priceCentsRaw === null) {
      return new Response(JSON.stringify({ error: 'title, description, category e price_cents obrigatórios' }), { status: 400 });
    }
    if (!thumbnail) {
      return new Response(JSON.stringify({ error: 'thumbnail obrigatória' }), { status: 400 });
    }
    if (!zipFile && !githubRepo) {
      return new Response(JSON.stringify({ error: 'zip ou github_repo obrigatório' }), { status: 400 });
    }

    const priceCents = parseInt(priceCentsRaw, 10);
    if (isNaN(priceCents) || priceCents < 0) {
      return new Response(JSON.stringify({ error: 'price_cents inválido' }), { status: 422 });
    }

    // Valida thumbnail
    if (!ALLOWED_IMAGE_TYPES.includes(thumbnail.type)) {
      return new Response(JSON.stringify({ error: 'thumbnail deve ser PNG, JPG ou WebP' }), { status: 422 });
    }
    if (thumbnail.size > MAX_THUMB_BYTES) {
      return new Response(JSON.stringify({ error: 'thumbnail maior que 2MB' }), { status: 422 });
    }

    // Valida gallery
    const galleryFiles: File[] = [];
    for (let i = 0; i < MAX_GALLERY_FILES; i++) {
      const f = formData.get(`gallery_${i}`) as File | null;
      if (!f) break;
      if (!ALLOWED_IMAGE_TYPES.includes(f.type)) {
        return new Response(JSON.stringify({ error: `gallery_${i}: tipo inválido` }), { status: 422 });
      }
      if (f.size > MAX_GALLERY_BYTES) {
        return new Response(JSON.stringify({ error: `gallery_${i}: maior que 2MB` }), { status: 422 });
      }
      galleryFiles.push(f);
    }

    // Valida zip se fornecido
    if (zipFile && zipFile.size > MAX_ZIP_BYTES) {
      return new Response(JSON.stringify({ error: 'zip maior que 50MB' }), { status: 422 });
    }

    // Gera ID + slug únicos
    const listingId = crypto.randomUUID();
    const baseSlug = generateSlug(title);
    const slug = `${baseSlug}-${listingId.slice(0, 8)}`;

    // Upload thumbnail
    const thumbExt = thumbnail.name.split('.').pop() || 'jpg';
    const thumbPath = `${listingId}/thumbnail.${thumbExt}`;
    const { error: thumbErr } = await supabaseAdmin.storage
      .from('marketplace')
      .upload(thumbPath, await thumbnail.arrayBuffer(), { contentType: thumbnail.type });
    if (thumbErr) throw new Error(`Thumbnail upload falhou: ${thumbErr.message}`);

    const { data: thumbUrlData } = supabaseAdmin.storage
      .from('marketplace')
      .getPublicUrl(thumbPath);

    // Upload gallery
    const galleryUrls: string[] = [];
    for (let i = 0; i < galleryFiles.length; i++) {
      const f = galleryFiles[i];
      const ext = f.name.split('.').pop() || 'jpg';
      const path = `${listingId}/gallery_${i}.${ext}`;
      await supabaseAdmin.storage
        .from('marketplace')
        .upload(path, await f.arrayBuffer(), { contentType: f.type });
      const { data: urlData } = supabaseAdmin.storage.from('marketplace').getPublicUrl(path);
      galleryUrls.push(urlData.publicUrl);
    }

    // Upload zip
    let zipStoragePath: string | null = null;
    if (zipFile) {
      zipStoragePath = `${listingId}/template.zip`;
      const { error: zipErr } = await supabaseAdmin.storage
        .from('marketplace')
        .upload(zipStoragePath, await zipFile.arrayBuffer(), { contentType: 'application/zip' });
      if (zipErr) throw new Error(`ZIP upload falhou: ${zipErr.message}`);
    }

    // Insere listing
    const { error: insertErr } = await supabaseAdmin.from('marketplace_listings').insert({
      id: listingId,
      seller_id: user.id,
      title,
      slug,
      description,
      category,
      price_cents: priceCents,
      thumbnail_url: thumbUrlData.publicUrl,
      gallery_urls: galleryUrls,
      zip_storage_path: zipStoragePath,
      github_repo: githubRepo || null,
      status: 'published',
    });

    if (insertErr) throw new Error(`Insert listing falhou: ${insertErr.message}`);

    return new Response(JSON.stringify({ listing_id: listingId, slug }), { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno';
    if (msg.includes('Token') || msg.includes('autorizado')) {
      return new Response(JSON.stringify({ error: msg }), { status: 403 });
    }
    console.error('[upload] erro:', msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};
