import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/verifyAdmin';
import { generateDownloadToken, tokenExpiry } from '../../../lib/marketplace';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get('token');
  if (!token) {
    return new Response(JSON.stringify({ error: 'token obrigatório' }), { status: 400 });
  }

  try {
    const { data: tokenRow, error: tokenErr } = await supabaseAdmin
      .from('marketplace_download_tokens')
      .select('id, purchase_id, expires_at')
      .eq('token', token)
      .single();

    if (tokenErr || !tokenRow) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 404 });
    }

    const isExpired = new Date(tokenRow.expires_at) < new Date();

    // Renova token expirado — acesso ilimitado
    let activeToken = token;
    if (isExpired) {
      const newToken = generateDownloadToken();
      await supabaseAdmin
        .from('marketplace_download_tokens')
        .update({ token: newToken, expires_at: tokenExpiry().toISOString() })
        .eq('id', tokenRow.id);
      activeToken = newToken;
    }

    // Resolve listing
    const { data: purchase } = await supabaseAdmin
      .from('marketplace_purchases')
      .select('listing_id, status')
      .eq('id', tokenRow.purchase_id)
      .single();

    if (!purchase || purchase.status !== 'paid') {
      return new Response(JSON.stringify({ error: 'Compra não autorizada' }), { status: 403 });
    }

    const { data: listing } = await supabaseAdmin
      .from('marketplace_listings')
      .select('zip_storage_path, github_repo')
      .eq('id', purchase.listing_id)
      .single();

    if (!listing?.zip_storage_path) {
      return new Response(JSON.stringify({ error: 'Arquivo não disponível' }), { status: 404 });
    }

    console.log('[download] acesso purchase_id:', tokenRow.purchase_id, 'token_renewed:', isExpired);

    const { data: signedData, error: signedErr } = await supabaseAdmin.storage
      .from('marketplace')
      .createSignedUrl(listing.zip_storage_path, 60);

    if (signedErr || !signedData?.signedUrl) {
      return new Response(JSON.stringify({ error: 'Erro ao gerar link de download' }), { status: 500 });
    }

    return new Response(null, {
      status: 302,
      headers: { Location: signedData.signedUrl },
    });
  } catch (err) {
    console.error('[download] erro:', err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 });
  }
};
