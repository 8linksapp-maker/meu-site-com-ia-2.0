import type { APIRoute } from 'astro';
import { verifyAdmin, supabaseAdmin } from '../../../lib/verifyAdmin';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  try {
    await verifyAdmin(request);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Receita do mês
    const { data: monthPurchases } = await supabaseAdmin
      .from('marketplace_purchases')
      .select('price_paid_cents')
      .eq('status', 'paid')
      .gte('created_at', monthStart);

    const monthRevenueCents = (monthPurchases || []).reduce((acc, p) => acc + p.price_paid_cents, 0);
    const totalSalesCount = (monthPurchases || []).length;
    const avgTicketCents = totalSalesCount > 0 ? Math.round(monthRevenueCents / totalSalesCount) : 0;

    // Compras recentes (últimas 20)
    const { data: recentRaw } = await supabaseAdmin
      .from('marketplace_purchases')
      .select('id, buyer_email, listing_id, price_paid_cents, created_at, marketplace_listings(title)')
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(20);

    const recentPurchases = (recentRaw || []).map((p: any) => ({
      id: p.id,
      buyer_email: p.buyer_email,
      listing_title: p.marketplace_listings?.title || '',
      price_paid_cents: p.price_paid_cents,
      created_at: p.created_at,
    }));

    return new Response(JSON.stringify({
      month_revenue_cents: monthRevenueCents,
      total_sales_count: totalSalesCount,
      avg_ticket_cents: avgTicketCents,
      recent_purchases: recentPurchases,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno';
    if (msg.includes('Token') || msg.includes('autorizado')) {
      return new Response(JSON.stringify({ error: msg }), { status: 403 });
    }
    console.error('[admin-finance] erro:', msg);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 });
  }
};
