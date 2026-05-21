import { formatBRL } from '../../lib/marketplace';
import type { Listing } from '../../lib/marketplace-types';

const CATEGORY_LABELS: Record<string, string> = {
  blog: 'Blog',
  loja: 'Loja',
  landing: 'Landing Page',
  portfolio: 'Portfólio',
  institucional: 'Institucional',
  outro: 'Outro',
};

interface Props {
  listing: Listing;
}

export default function ListingCard({ listing }: Props) {
  const isFree = listing.price_cents === 0;

  return (
    <a
      href={`/marketplace/${listing.slug}`}
      className="group bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:shadow-purple-500/10 hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-100 overflow-hidden">
        {listing.thumbnail_url ? (
          <img
            src={listing.thumbnail_url}
            alt={listing.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        <div className="absolute top-2 right-2">
          {isFree ? (
            <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide">
              Grátis
            </span>
          ) : (
            <span className="bg-[#7c3aed] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
              {formatBRL(listing.price_cents)}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col gap-2">
        <h3 className="font-semibold text-gray-900 text-sm leading-snug group-hover:text-[#7c3aed] transition-colors line-clamp-2">
          {listing.title}
        </h3>
        <p className="text-gray-500 text-xs leading-relaxed line-clamp-2 flex-1">
          {listing.description}
        </p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {CATEGORY_LABELS[listing.category] ?? listing.category}
          </span>
          {listing.total_sales > 0 && (
            <span className="text-[10px] text-gray-400">
              {listing.total_sales} download{listing.total_sales !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
