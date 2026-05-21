import type { APIRoute } from 'astro';
import { stripe, STRIPE_WEBHOOK_SECRET } from '../../../lib/stripe';
import { supabaseAdmin } from '../../../lib/verifyAdmin';
import { resend } from '../../../lib/resend';
import { generateDownloadToken, tokenExpiry } from '../../../lib/marketplace';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return new Response(JSON.stringify({ error: 'Assinatura ausente' }), { status: 400 });
  }

  let event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook] assinatura inválida:', err instanceof Error ? err.message : err);
    return new Response(JSON.stringify({ error: 'Assinatura inválida' }), { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  try {
    const session = event.data.object;
    const sessionId = session.id;

    // Idempotência: verifica se purchase já foi processada
    const { data: purchase } = await supabaseAdmin
      .from('marketplace_purchases')
      .select('id, status, buyer_email, listing_id, price_paid_cents')
      .eq('stripe_payment_id', sessionId)
      .single();

    if (!purchase) {
      console.warn('[webhook] purchase não encontrada para session:', sessionId);
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    if (purchase.status === 'paid') {
      // Idempotente — já processado
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Atualiza purchase para paid
    await supabaseAdmin
      .from('marketplace_purchases')
      .update({ status: 'paid' })
      .eq('id', purchase.id);

    // Gera download token
    const token = generateDownloadToken();
    await supabaseAdmin.from('marketplace_download_tokens').insert({
      purchase_id: purchase.id,
      token,
      expires_at: tokenExpiry().toISOString(),
    });

    // Atualiza contadores do listing
    const { data: listing } = await supabaseAdmin
      .from('marketplace_listings')
      .select('total_sales, total_revenue_cents')
      .eq('id', purchase.listing_id)
      .single();

    if (listing) {
      await supabaseAdmin
        .from('marketplace_listings')
        .update({
          total_sales: (listing.total_sales || 0) + 1,
          total_revenue_cents: (listing.total_revenue_cents || 0) + purchase.price_paid_cents,
        })
        .eq('id', purchase.listing_id);
    }

    // Dispara email de confirmação
    const siteUrl = import.meta.env.SITE_URL || 'https://meusitecomia.com.br';
    const fromEmail = import.meta.env.RESEND_FROM_EMAIL || 'noreply@meusitecomia.com.br';

    const { data: listingData } = await supabaseAdmin
      .from('marketplace_listings')
      .select('title')
      .eq('id', purchase.listing_id)
      .single();

    await resend.emails.send({
      from: fromEmail,
      to: purchase.buyer_email,
      subject: `Compra confirmada: ${listingData?.title || 'Template'}`,
      html: `
        <p>Sua compra do template <strong>${listingData?.title || 'Template'}</strong> foi confirmada.</p>
        <p><a href="${siteUrl}/buyer/library">Acessar minha biblioteca</a></p>
        <p>O acesso já está vinculado ao seu email — não precisa guardar nenhum código.</p>
        <p>Dúvidas? Responda este email.</p>
      `,
    });

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error('[webhook] erro interno:', err instanceof Error ? err.message : err);
    // Retorna 200 mesmo em erro interno — Stripe não deve retentar por erro nosso
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }
};
