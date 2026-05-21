import type { APIRoute } from 'astro';
import { stripe } from '../../../lib/stripe';
import { supabaseAdmin, verifyAdmin } from '../../../lib/verifyAdmin';
import { generateDownloadToken, tokenExpiry } from '../../../lib/marketplace';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => null);
    if (!body || !body.listing_id || !body.buyer_email) {
      return new Response(JSON.stringify({ error: 'listing_id e buyer_email obrigatórios' }), { status: 400 });
    }

    const { listing_id, buyer_email } = body as { listing_id: string; buyer_email: string };

    // Resolve buyer_id se autenticado
    let buyer_id: string | null = null;
    try {
      const user = await verifyAdmin(request);
      buyer_id = user.id;
    } catch {
      // Visitante não autenticado — ok
    }
    // Se não é admin, tenta resolver pelo token de auth do aluno
    if (!buyer_id) {
      const token = request.headers.get('Authorization')?.split('Bearer ')[1];
      if (token) {
        const { data: { user } } = await supabaseAdmin.auth.getUser(token);
        if (user) buyer_id = user.id;
      }
    }

    const { data: listing, error: listingErr } = await supabaseAdmin
      .from('marketplace_listings')
      .select('id, title, price_cents, status')
      .eq('id', listing_id)
      .single();

    if (listingErr || !listing) {
      return new Response(JSON.stringify({ error: 'Listing não encontrado' }), { status: 404 });
    }
    if (listing.status !== 'published') {
      return new Response(JSON.stringify({ error: 'Listing indisponível' }), { status: 409 });
    }

    const siteUrl = import.meta.env.SITE_URL || 'http://localhost:4321';

    // Produto gratuito: insere compra direto + gera token
    if (listing.price_cents === 0) {
      const { data: purchase, error: purchaseErr } = await supabaseAdmin
        .from('marketplace_purchases')
        .insert({
          buyer_id,
          buyer_email,
          listing_id,
          price_paid_cents: 0,
          status: 'paid',
        })
        .select('id')
        .single();

      if (purchaseErr || !purchase) {
        return new Response(JSON.stringify({ error: 'Erro ao registrar compra' }), { status: 500 });
      }

      const token = generateDownloadToken();
      await supabaseAdmin.from('marketplace_download_tokens').insert({
        purchase_id: purchase.id,
        token,
        expires_at: tokenExpiry().toISOString(),
      });

      return new Response(JSON.stringify({ url: `${siteUrl}/buyer/library` }), { status: 200 });
    }

    // Produto pago: cria Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'brl',
          unit_amount: listing.price_cents,
          product_data: { name: listing.title },
        },
        quantity: 1,
      }],
      customer_email: buyer_email,
      metadata: {
        listing_id,
        ...(buyer_id ? { buyer_id } : {}),
      },
      success_url: `${siteUrl}/buyer/library?ok=1`,
      cancel_url: `${siteUrl}/marketplace/${listing_id}?cancel=1`,
    });

    // Insere purchase pendente
    await supabaseAdmin.from('marketplace_purchases').insert({
      buyer_id,
      buyer_email,
      listing_id,
      price_paid_cents: listing.price_cents,
      stripe_payment_id: session.payment_intent as string,
      status: 'pending',
    });

    return new Response(JSON.stringify({ url: session.url }), { status: 200 });
  } catch (err) {
    console.error('[checkout] erro:', err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 });
  }
};
