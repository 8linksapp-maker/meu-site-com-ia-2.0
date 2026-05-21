import { ImageIcon } from 'lucide-react';
import { formatBRL } from '../../lib/marketplace';
import { CATEGORY_LABELS } from '../../data/marketplace-categories';
import type { Listing } from '../../lib/marketplace-types';

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
            <ImageIcon className="w-10 h-10" strokeWidth={1} />
          </div>
        )}
        <div className="absolute top-2 right-2">
          {isFree ? (
            <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
              Grátis
            </span>
          ) : (
            <span className="bg-[#7c3aed] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
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
