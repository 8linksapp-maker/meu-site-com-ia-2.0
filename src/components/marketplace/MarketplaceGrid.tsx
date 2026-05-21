import { useState } from 'react';
import { Search, ShoppingBag } from 'lucide-react';
import { MARKETPLACE_CATEGORIES, CATEGORY_LABELS } from '../../data/marketplace-categories';
import type { Listing } from '../../lib/marketplace-types';
import ListingCard from './ListingCard';

interface Props {
  initialListings: Listing[];
}

export default function MarketplaceGrid({ initialListings }: Props) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const filtered = initialListings.filter((l) => {
    const matchCat = !category || l.category === category;
    const matchSearch =
      !search ||
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar templates..."
            className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed] transition-colors"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-1 px-1">
          <button
            onClick={() => setCategory('')}
            className={`shrink-0 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${
              category === ''
                ? 'bg-[#7c3aed] text-white border-[#7c3aed]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#7c3aed]/40 hover:text-[#7c3aed]'
            }`}
          >
            Todos
          </button>
          {MARKETPLACE_CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => setCategory(cat.slug)}
              className={`shrink-0 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${
                category === cat.slug
                  ? 'bg-[#7c3aed] text-white border-[#7c3aed]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#7c3aed]/40 hover:text-[#7c3aed]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-gray-400">
        {filtered.length} template{filtered.length !== 1 ? 's' : ''}
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShoppingBag className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-gray-500 font-semibold">
            {initialListings.length === 0 ? 'Nenhum template disponível ainda.' : 'Nenhum template encontrado'}
          </p>
          {(search || category) && (
            <button
              onClick={() => { setSearch(''); setCategory(''); }}
              className="mt-3 text-sm text-[#7c3aed] font-semibold hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
