import { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  CreditCard,
  ExternalLink,
  ImageIcon,
  Users,
  Clock,
  FileArchive,
} from 'lucide-react';
import { CATEGORY_LABELS } from '../../data/marketplace-categories';
import type { Listing } from '../../lib/marketplace-types';
import { formatBRL } from '../../lib/marketplace';
import CheckoutModal from './CheckoutModal';

interface Props {
  listing: Listing;
}

export default function ListingDetail({ listing }: Props) {
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [showCheckout, setShowCheckout] = useState(false);

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
                    <ImageIcon className="w-14 h-14" strokeWidth={1} />
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
                      className={`shrink-0 w-16 h-10 rounded-lg overflow-hidden border-2 transition-all ${
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
                  Download imediato por e-mail
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
