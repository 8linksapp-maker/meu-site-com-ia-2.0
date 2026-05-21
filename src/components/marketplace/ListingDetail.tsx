import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  CreditCard,
  ExternalLink,
  Users,
  Clock,
  FileArchive,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Listing } from '../../lib/marketplace-types';
import { formatBRL } from '../../lib/marketplace';
import CheckoutModal from './CheckoutModal';

interface Props {
  slug: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  blog: 'Blog',
  loja: 'Loja',
  landing: 'Landing Page',
  portfolio: 'Portfólio',
  institucional: 'Institucional',
  outro: 'Outro',
};

const MOCK: Listing = {
  id: 'mock-1',
  seller_id: 'mock',
  slug: 'walker-blog-pro',
  title: 'Walker Blog Pro',
  description:
    'Template de blog completo com editor visual, SEO automático, dark mode e muito mais.\n\nO que está incluído:\n• Editor visual drag & drop\n• SEO automático (meta tags, OG, JSON-LD)\n• Dark mode nativo\n• RSS feed gerado automaticamente\n• Analytics integrado\n• Suporte a múltiplos autores\n\nStack: Astro 5 + React + Tailwind + Supabase\n\nRequisitos: conta GitHub + Vercel (Hobby funciona) + Supabase gratuito.',
  category: 'blog',
  price_cents: 0,
  thumbnail_url: '',
  gallery_urls: [],
  zip_storage_path: null,
  github_repo: null,
  status: 'published',
  total_sales: 142,
  total_revenue_cents: 0,
  created_at: '2026-01-01T00:00:00Z',
  published_at: '2026-01-01T00:00:00Z',
};

export default function ListingDetail({ slug }: Props) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    load();
  }, [slug]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'published')
      .single();

    setListing(!error && data ? (data as Listing) : MOCK);
    setGalleryIdx(0);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="animate-pulse max-w-5xl space-y-6">
        <div className="h-4 bg-gray-100 rounded w-24" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="aspect-video bg-gray-100 rounded-2xl" />
            <div className="bg-gray-100 rounded-2xl h-48" />
          </div>
          <div className="bg-gray-100 rounded-2xl h-64" />
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Template não encontrado.</p>
        <a href="/marketplace" className="text-sm text-[#7c3aed] mt-2 inline-block hover:underline">
          ← Voltar ao Marketplace
        </a>
      </div>
    );
  }

  const allImages = [
    ...(listing.thumbnail_url ? [listing.thumbnail_url] : []),
    ...(listing.gallery_urls ?? []),
  ];
  const isFree = listing.price_cents === 0;

  const prevImg = () => setGalleryIdx((i) => (i - 1 + allImages.length) % allImages.length);
  const nextImg = () => setGalleryIdx((i) => (i + 1) % allImages.length);

  return (
    <>
      <div className="max-w-5xl space-y-6">
        {/* Breadcrumb */}
        <a
          href="/marketplace"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#7c3aed] transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Marketplace
        </a>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Gallery + Description */}
          <div className="lg:col-span-2 space-y-5">
            {/* Gallery */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="relative aspect-video bg-gray-100">
                {allImages.length > 0 ? (
                  <img
                    src={allImages[galleryIdx]}
                    alt={`${listing.title} — imagem ${galleryIdx + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                {allImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImg}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-md transition-colors"
                      aria-label="Imagem anterior"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-700" />
                    </button>
                    <button
                      onClick={nextImg}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-1.5 shadow-md transition-colors"
                      aria-label="Próxima imagem"
                    >
                      <ChevronRight className="w-4 h-4 text-gray-700" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {allImages.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setGalleryIdx(i)}
                          className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            i === galleryIdx ? 'bg-white' : 'bg-white/50'
                          }`}
                          aria-label={`Imagem ${i + 1}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnail strip */}
              {allImages.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {allImages.map((url, i) => (
                    <button
                      key={i}
                      onClick={() => setGalleryIdx(i)}
                      className={`shrink-0 w-16 h-10 rounded-lg overflow-hidden border-2 transition-colors ${
                        i === galleryIdx ? 'border-[#7c3aed]' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-bold text-gray-900 mb-4 text-base">Sobre este template</h2>
              <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {listing.description}
              </div>
            </div>
          </div>

          {/* Purchase Card */}
          <div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-6 space-y-5">
              <div>
                <span className="inline-block text-[10px] font-black text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-wide mb-2">
                  {CATEGORY_LABELS[listing.category] ?? listing.category}
                </span>
                <h1 className="text-lg font-bold text-gray-900 leading-snug">{listing.title}</h1>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`text-2xl font-black ${isFree ? 'text-emerald-600' : 'text-[#7c3aed]'}`}>
                    {isFree ? 'Grátis' : formatBRL(listing.price_cents)}
                  </span>
                  {listing.total_sales > 0 && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Users className="w-3.5 h-3.5" />
                      {listing.total_sales} downloads
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowCheckout(true)}
                className="w-full flex items-center justify-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] active:scale-[0.98] text-white font-bold py-3.5 rounded-xl transition-all text-sm shadow-md shadow-purple-500/20"
              >
                {isFree ? (
                  <>
                    <Download className="w-4 h-4" />
                    Baixar Grátis
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Comprar agora
                  </>
                )}
              </button>

              {listing.github_repo && (
                <a
                  href={listing.github_repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Ver demo ao vivo
                </a>
              )}

              {/* Trust signals */}
              <div className="space-y-2 pt-2 border-t border-gray-100 text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <FileArchive className="w-3.5 h-3.5 shrink-0" />
                  ZIP com todo o código-fonte
                </div>
                <div className="flex items-center gap-2">
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  Download via /api/marketplace/download
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  Link válido por 7 dias (renovável)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCheckout && (
        <CheckoutModal listing={listing} onClose={() => setShowCheckout(false)} />
      )}
    </>
  );
}
