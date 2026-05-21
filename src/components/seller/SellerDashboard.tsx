import { useState, useEffect } from 'react';
import { DollarSign, ShoppingBag, LayoutGrid, ArrowRight, Sparkles, Zap, Users, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Listing } from '../../lib/marketplace-types';
import { formatBRL } from '../../lib/marketplace';

interface Stats {
  totalListings: number;
  monthRevenueCents: number;
  monthSales: number;
}

const COMING_SOON = [
  { icon: DollarSign, title: 'Repasse mensal via PIX', desc: 'Receba automaticamente toda virada do mês, sem burocracia.' },
  { icon: Users, title: 'Upload pelos seus alunos', desc: 'Alunos vendem templates no marketplace e você aprova.' },
  { icon: Zap, title: 'Comissão 80/20 transparente', desc: '80% pra você, 20% de plataforma. Sem surpresas.' },
  { icon: BarChart3, title: 'Analytics de visualização', desc: 'Impressões, cliques, conversão — tudo em tempo real.' },
];

export default function SellerDashboard() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [notAuthenticated, setNotAuthenticated] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setNotAuthenticated(true);
      setLoading(false);
      return;
    }

    const [listingsRes, financeRes] = await Promise.all([
      supabase
        .from('marketplace_listings')
        .select('*')
        .eq('seller_id', session.user.id)
        .order('created_at', { ascending: false }),
      fetch('/api/marketplace/admin-finance', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);

    const myListings = (listingsRes.data as Listing[]) ?? [];
    setListings(myListings);

    if (financeRes) {
      setStats({
        totalListings: myListings.length,
        monthRevenueCents: financeRes.month_revenue_cents ?? 0,
        monthSales: financeRes.total_sales_count ?? 0,
      });
    } else {
      const totalRev = myListings.reduce((acc, l) => acc + l.total_revenue_cents, 0);
      const totalSales = myListings.reduce((acc, l) => acc + l.total_sales, 0);
      setStats({ totalListings: myListings.length, monthRevenueCents: totalRev, monthSales: totalSales });
    }

    setLoading(false);
  };

  if (notAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
        <Sparkles className="w-10 h-10 text-[#7c3aed] mb-4" />
        <h2 className="text-xl font-bold text-gray-900">Painel do Vendedor</h2>
        <p className="text-sm text-gray-500 mt-2">Faça login para acessar seus templates e receita.</p>
        <a
          href="/"
          className="mt-5 inline-flex items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-semibold text-sm px-5 py-3 rounded-xl transition-colors"
        >
          Entrar
          <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Painel do Vendedor</h1>
        <p className="text-sm text-gray-500 mt-1">Seus templates e receita no marketplace.</p>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 h-24 animate-pulse" />
          ))}
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-[#7c3aed]" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Receita este mês</p>
              <p className="text-xl font-black text-gray-900">{formatBRL(stats.monthRevenueCents)}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Vendas este mês</p>
              <p className="text-xl font-black text-gray-900">{stats.monthSales}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <LayoutGrid className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Templates publicados</p>
              <p className="text-xl font-black text-gray-900">{stats.totalListings}</p>
            </div>
          </div>
        </div>
      )}

      {/* Listings */}
      {!loading && listings.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <LayoutGrid className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          <p className="font-semibold text-gray-700 text-sm">Nenhum template publicado ainda</p>
          <p className="text-xs text-gray-400 mt-1">Use o painel admin para adicionar o primeiro listing.</p>
          <a
            href="/admin/marketplace"
            className="mt-4 inline-flex items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            Ir para Admin
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      )}

      {!loading && listings.length > 0 && (
        <div>
          <h2 className="font-bold text-gray-900 mb-3">Meus Templates</h2>
          <div className="space-y-2">
            {listings.map((l) => (
              <div key={l.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4">
                <div className="w-14 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                  {l.thumbnail_url ? (
                    <img src={l.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <LayoutGrid className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{l.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {l.total_sales} venda{l.total_sales !== 1 ? 's' : ''} · {l.price_cents === 0 ? 'Grátis' : formatBRL(l.price_cents)}
                  </p>
                </div>
                <a
                  href={`/marketplace/${l.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-xs font-semibold text-[#7c3aed] hover:underline flex items-center gap-1"
                >
                  Ver
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Coming Soon V2 */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-bold text-gray-900">Em breve</h2>
          <span className="text-[10px] font-black bg-[#7c3aed] text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
            Marketplace V2
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {COMING_SOON.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-white rounded-2xl border border-gray-200 p-5 flex gap-4 opacity-80"
            >
              <div className="w-9 h-9 rounded-xl bg-[#7c3aed]/8 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#7c3aed]/60" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-700 text-sm">{title}</p>
                  <span className="text-[9px] font-black bg-[#7c3aed]/10 text-[#7c3aed] px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                    V2
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
