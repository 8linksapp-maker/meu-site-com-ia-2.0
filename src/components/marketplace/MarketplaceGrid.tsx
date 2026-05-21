import { useState, useEffect } from 'react';
import { Search, ShoppingBag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Listing } from '../../lib/marketplace-types';
import ListingCard from './ListingCard';

const CATEGORIES = [
  { value: '', label: 'Todos' },
  { value: 'blog', label: 'Blog' },
  { value: 'loja', label: 'Loja' },
  { value: 'landing', label: 'Landing Page' },
  { value: 'portfolio', label: 'Portfólio' },
  { value: 'institucional', label: 'Institucional' },
];

const MOCK_LISTINGS: Listing[] = [
  {
    id: 'mock-1',
    seller_id: 'mock',
    slug: 'walker-blog-pro',
    title: 'Walker Blog Pro',
    description: 'Template de blog completo com editor visual, SEO automático, dark mode e muito mais. Perfeito para criadores de conteúdo.',
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
  },
  {
    id: 'mock-2',
    seller_id: 'mock',
    slug: 'fashion-store',
    title: 'Fashion Store',
    description: 'E-commerce moderno para lojas de moda. Catálogo de produtos, carrinho e checkout integrado com visual impactante.',
    category: 'loja',
    price_cents: 4700,
    thumbnail_url: '',
    gallery_urls: [],
    zip_storage_path: null,
    github_repo: null,
    status: 'published',
    total_sales: 38,
    total_revenue_cents: 178600,
    created_at: '2026-02-01T00:00:00Z',
    published_at: '2026-02-01T00:00:00Z',
  },
  {
    id: 'mock-3',
    seller_id: 'mock',
    slug: 'landing-agencia',
    title: 'Landing Agência',
    description: 'Landing page profissional para agências digitais. Alta conversão, animações suaves e design moderno.',
    category: 'landing',
    price_cents: 2900,
    thumbnail_url: '',
    gallery_urls: [],
    zip_storage_path: null,
    github_repo: null,
    status: 'published',
    total_sales: 67,
    total_revenue_cents: 194300,
    created_at: '2026-03-01T00:00:00Z',
    published_at: '2026-03-01T00:00:00Z',
  },
  {
    id: 'mock-4',
    seller_id: 'mock',
    slug: 'portfolio-criativo',
    title: 'Portfólio Criativo',
    description: 'Site de portfólio para designers e fotógrafos. Galeria de projetos, bio e formulário de contato.',
    category: 'portfolio',
    price_cents: 0,
    thumbnail_url: '',
    gallery_urls: [],
    zip_storage_path: null,
    github_repo: null,
    status: 'published',
    total_sales: 89,
    total_revenue_cents: 0,
    created_at: '2026-03-15T00:00:00Z',
    published_at: '2026-03-15T00:00:00Z',
  },
];

export default function MarketplaceGrid() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('marketplace_listings')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    setListings(!error && data && data.length > 0 ? (data as Listing[]) : MOCK_LISTINGS);
    setLoading(false);
  };

  const filtered = listings.filter((l) => {
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
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`shrink-0 text-xs font-semibold px-3 py-2 rounded-xl border transition-colors ${
                category === cat.value
                  ? 'bg-[#7c3aed] text-white border-[#7c3aed]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#7c3aed]/40 hover:text-[#7c3aed]'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {!loading && (
        <p className="text-xs text-gray-400">
          {filtered.length} template{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
              <div className="aspect-video bg-gray-100" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded" />
                <div className="h-3 bg-gray-100 rounded w-5/6" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShoppingBag className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-gray-500 font-semibold">Nenhum template encontrado</p>
          <p className="text-sm text-gray-400 mt-1">Tente outro filtro ou busca.</p>
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
