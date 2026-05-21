import { useState, useEffect } from 'react';
import { CheckCircle, Download, ShoppingBag, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Purchase } from '../../lib/marketplace-types';
import { formatBRL } from '../../lib/marketplace';

interface Props {
  showSuccess?: boolean;
}

export default function BuyerLibrary({ showSuccess = false }: Props) {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('marketplace_purchases')
      .select('*, marketplace_listings(id, slug, title, thumbnail_url, category)')
      .eq('status', 'paid')
      .order('created_at', { ascending: false });

    setPurchases((data as Purchase[]) ?? []);
    setLoading(false);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Meus Downloads</h1>
        <p className="text-sm text-gray-500 mt-1">Templates que você adquiriu.</p>
      </div>

      {/* Success banner */}
      {showSuccess && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-emerald-900 text-sm">Compra realizada!</p>
            <p className="text-xs text-emerald-700 mt-0.5">
              O link de download foi enviado para o seu e-mail. Ele fica ativo por 7 dias.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-4 animate-pulse">
              <div className="w-20 h-14 bg-gray-100 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-1/2" />
                <div className="h-3 bg-gray-100 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : purchases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShoppingBag className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-gray-500 font-semibold">Nenhuma compra ainda</p>
          <p className="text-sm text-gray-400 mt-1">Explore o marketplace e adquira seu primeiro template.</p>
          <a
            href="/marketplace"
            className="mt-4 inline-flex items-center gap-2 bg-[#7c3aed] text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-[#6d28d9] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Ver Marketplace
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {purchases.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4"
            >
              {/* Thumbnail */}
              <div className="w-20 h-14 bg-gray-100 rounded-xl overflow-hidden shrink-0">
                {p.marketplace_listings?.thumbnail_url ? (
                  <img
                    src={p.marketplace_listings.thumbnail_url}
                    alt={p.marketplace_listings.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <Download className="w-5 h-5" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 text-sm truncate">
                  {p.marketplace_listings?.title ?? 'Template'}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {p.price_paid_cents === 0 ? 'Gratuito' : formatBRL(p.price_paid_cents)} ·{' '}
                  {new Date(p.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>

              {/* Download CTA */}
              <a
                href={`/marketplace/${p.marketplace_listings?.slug}`}
                className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-[#7c3aed] hover:underline"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
