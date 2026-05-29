import { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Plus,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Eye,
  Ticket,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Pagination from '../ui/admin/Pagination';
import type { Listing } from '../../lib/marketplace-types';
import { formatBRL } from '../../lib/marketplace';
import { MARKETPLACE_CATEGORIES } from '../../data/marketplace-categories';

interface FinanceData {
  month_revenue_cents: number;
  total_sales_count: number;
  avg_ticket_cents: number;
  recent_purchases: Array<{
    id: string;
    buyer_email: string;
    price_paid_cents: number;
    created_at: string;
    listing_title: string;
  }>;
}

const CATEGORIES = MARKETPLACE_CATEGORIES.map((c) => c.slug);

export default function MarketplaceManager() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [finance, setFinance] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const LISTINGS_PAGE_SIZE = 20;
  const [showUpload, setShowUpload] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Upload form
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'blog',
    price_cents: '0',
    github_repo: '',
  });
  const [thumb, setThumb] = useState<File | null>(null);
  const [gallery, setGallery] = useState<File[]>([]);
  const [zip, setZip] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const thumbRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const [listingsRes, financeRes] = await Promise.all([
      supabase.from('marketplace_listings').select('*').order('created_at', { ascending: false }),
      token
        ? fetch('/api/marketplace/admin-finance', { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
            r.ok ? r.json() : null
          )
        : Promise.resolve(null),
    ]);

    if (listingsRes.data) setListings(listingsRes.data as Listing[]);
    if (financeRes) setFinance(financeRes as FinanceData);
    setLoading(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thumb || !zip) {
      setUploadError('Thumbnail e ZIP são obrigatórios.');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('category', form.category);
      fd.append('price_cents', form.price_cents);
      fd.append('github_repo', form.github_repo);
      fd.append('thumbnail', thumb);
      gallery.forEach((f, i) => fd.append(`gallery_${i}`, f));
      fd.append('zip', zip);

      const res = await fetch('/api/marketplace/upload', {
        method: 'POST',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        body: fd,
      });

      if (!res.ok) {
        const d = await res.json();
        setUploadError(d.error ?? 'Erro no upload.');
        setUploading(false);
        return;
      }

      setUploadSuccess(true);
      setShowUpload(false);
      setForm({ title: '', description: '', category: 'blog', price_cents: '0', github_repo: '' });
      setThumb(null);
      setGallery([]);
      setZip(null);
      loadAll();
    } catch {
      setUploadError('Erro de conexão. Tente novamente.');
    }

    setUploading(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      {finance && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-cream-surface rounded-[12px] border border-borda-cafe p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-[10px] bg-coral-wash flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5 text-coral-terra" />
            </div>
            <div>
              <p className="text-xs text-cafe-cinza-quente font-medium">Receita este mês</p>
              <p className="text-xl font-semibold text-carvao-quente">{formatBRL(finance.month_revenue_cents)}</p>
            </div>
          </div>
          <div className="bg-cream-surface rounded-[12px] border border-borda-cafe p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-[10px] bg-[oklch(94%_0.020_145)] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 text-[oklch(40%_0.060_145)]" />
            </div>
            <div>
              <p className="text-xs text-cafe-cinza-quente font-medium">Vendas este mês</p>
              <p className="text-xl font-semibold text-carvao-quente">{finance.total_sales_count}</p>
            </div>
          </div>
          <div className="bg-cream-surface rounded-[12px] border border-borda-cafe p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-[10px] bg-mostarda-amber/20 flex items-center justify-center shrink-0">
              <Ticket className="w-5 h-5 text-[oklch(50%_0.110_50)]" />
            </div>
            <div>
              <p className="text-xs text-cafe-cinza-quente font-medium">Ticket médio</p>
              <p className="text-xl font-semibold text-carvao-quente">{formatBRL(finance.avg_ticket_cents)}</p>
            </div>
          </div>
          <div className="bg-cream-surface rounded-[12px] border border-borda-cafe p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-[10px] bg-[oklch(94%_0.030_220)] flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-[oklch(45%_0.110_220)]" />
            </div>
            <div>
              <p className="text-xs text-cafe-cinza-quente font-medium">Listings ativos</p>
              <p className="text-xl font-semibold text-carvao-quente">
                {listings.filter((l) => l.status === 'published').length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header + Add */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-carvao-quente">Listings</h2>
        <button
          onClick={() => { setShowUpload((v) => !v); setUploadError(''); setUploadSuccess(false); }}
          className="flex items-center gap-2 bg-coral-terra hover:bg-terracota-profundo text-white text-sm font-semibold px-4 py-2.5 rounded-[10px] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo listing
        </button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="bg-cream-surface rounded-[12px] border border-borda-cafe p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-carvao-quente">Novo Listing</h3>
            <button onClick={() => setShowUpload(false)} className="p-1.5 text-cafe-cinza-quente hover:bg-cream-elevated rounded-[8px]">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-cafe-medio mb-1">Título *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-borda-cafe rounded-[10px] focus:outline-none focus:border-coral-terra"
                  placeholder="Walker Blog Pro"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-cafe-medio mb-1">Categoria *</label>
                <select
                  required
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-borda-cafe rounded-[10px] focus:outline-none focus:border-coral-terra bg-cream-surface"
                >
                  {MARKETPLACE_CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-cafe-medio mb-1">Descrição *</label>
              <textarea
                required
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2.5 text-sm border border-borda-cafe rounded-[10px] focus:outline-none focus:border-coral-terra resize-none"
                placeholder="Descreva o template, o que está incluído, stack técnica..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-cafe-medio mb-1">Preço (centavos) — 0 = grátis</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.price_cents}
                  onChange={(e) => setForm((f) => ({ ...f, price_cents: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-borda-cafe rounded-[10px] focus:outline-none focus:border-coral-terra"
                  placeholder="2900"
                />
                {parseInt(form.price_cents) > 0 && (
                  <p className="text-xs text-cafe-cinza-quente mt-1">{formatBRL(parseInt(form.price_cents))}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-cafe-medio mb-1">GitHub / Demo URL</label>
                <input
                  type="url"
                  value={form.github_repo}
                  onChange={(e) => setForm((f) => ({ ...f, github_repo: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-borda-cafe rounded-[10px] focus:outline-none focus:border-coral-terra"
                  placeholder="https://github.com/..."
                />
              </div>
            </div>

            {/* File uploads */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-cafe-medio mb-1">Thumbnail * <span className="text-cafe-cinza-quente font-normal">(JPG/PNG)</span></label>
                <input ref={thumbRef} type="file" accept="image/*" className="hidden" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => thumbRef.current?.click()} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-borda-cafe hover:border-coral-terra/40 rounded-[10px] py-3 text-sm text-cafe-cinza-quente transition-colors">
                  <Upload className="w-4 h-4" />
                  {thumb ? thumb.name : 'Escolher imagem'}
                </button>
              </div>
              <div>
                <label className="block text-sm font-semibold text-cafe-medio mb-1">Galeria <span className="text-cafe-cinza-quente font-normal">(múltiplas)</span></label>
                <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => setGallery(Array.from(e.target.files ?? []))} />
                <button type="button" onClick={() => galleryRef.current?.click()} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-borda-cafe hover:border-coral-terra/40 rounded-[10px] py-3 text-sm text-cafe-cinza-quente transition-colors">
                  <Upload className="w-4 h-4" />
                  {gallery.length > 0 ? `${gallery.length} arquivo(s)` : 'Escolher imagens'}
                </button>
              </div>
              <div>
                <label className="block text-sm font-semibold text-cafe-medio mb-1">ZIP * <span className="text-cafe-cinza-quente font-normal">(.zip)</span></label>
                <input ref={zipRef} type="file" accept=".zip" className="hidden" onChange={(e) => setZip(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => zipRef.current?.click()} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-borda-cafe hover:border-coral-terra/40 rounded-[10px] py-3 text-sm text-cafe-cinza-quente transition-colors">
                  <Upload className="w-4 h-4" />
                  {zip ? zip.name : 'Escolher ZIP'}
                </button>
              </div>
            </div>

            {uploadError && (
              <p className="text-sm text-vermelho-tijolo bg-[oklch(94%_0.025_28)] px-3 py-2 rounded-[10px]">{uploadError}</p>
            )}

            <button
              type="submit"
              disabled={uploading}
              className="flex items-center justify-center gap-2 bg-coral-terra hover:bg-terracota-profundo disabled:opacity-60 text-white font-bold py-3 px-6 rounded-[10px] transition-colors text-sm"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Publicar listing
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {uploadSuccess && (
        <div className="bg-[oklch(94%_0.020_145)] border border-verde-oliva/40 text-[oklch(28%_0.060_145)] text-sm font-semibold px-4 py-3 rounded-[10px]">
          ✓ Listing publicado com sucesso!
        </div>
      )}

      {/* Listings table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-cream-surface rounded-[12px] border border-borda-cafe h-16 animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-cafe-cinza-quente">
          <ShoppingBag className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Nenhum listing ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {listings.slice((page - 1) * LISTINGS_PAGE_SIZE, page * LISTINGS_PAGE_SIZE).map((l) => (
            <div key={l.id} className="bg-cream-surface rounded-[12px] border border-borda-cafe overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                {/* Thumb */}
                <div className="w-14 h-10 rounded-[8px] bg-cream-elevated overflow-hidden shrink-0">
                  {l.thumbnail_url ? (
                    <img src={l.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-borda-cafe">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-carvao-quente text-sm truncate">{l.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-semibold text-cafe-cinza-quente bg-cream-elevated px-1.5 py-0.5 rounded-full">
                      {l.category}
                    </span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                      l.status === 'published' ? 'bg-[oklch(94%_0.020_145)] text-[oklch(40%_0.060_145)]' : 'bg-[oklch(94%_0.035_80)] text-[oklch(40%_0.110_80)]'
                    }`}>
                      {l.status}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-carvao-quente">
                      {l.price_cents === 0 ? 'Grátis' : formatBRL(l.price_cents)}
                    </p>
                    <p className="text-[10px] text-cafe-cinza-quente">preço</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-carvao-quente">{l.total_sales}</p>
                    <p className="text-[10px] text-cafe-cinza-quente">vendas</p>
                  </div>
                  {l.total_revenue_cents > 0 && (
                    <div className="text-center">
                      <p className="font-bold text-carvao-quente">{formatBRL(l.total_revenue_cents)}</p>
                      <p className="text-[10px] text-cafe-cinza-quente">receita</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`/marketplace/${l.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-cafe-cinza-quente hover:text-coral-terra hover:bg-coral-wash rounded-[8px] transition-colors"
                    aria-label="Ver listing"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                    className="p-2 text-cafe-cinza-quente hover:text-cafe-medio hover:bg-cream-elevated rounded-[8px] transition-colors"
                    aria-label="Expandir"
                  >
                    {expandedId === l.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {expandedId === l.id && (
                <div className="border-t border-borda-cafe px-4 pb-4 pt-3 text-sm text-gray-600 space-y-1">
                  <p><span className="font-semibold text-cafe-medio">Slug:</span> {l.slug}</p>
                  <p><span className="font-semibold text-cafe-medio">ZIP path:</span> {l.zip_storage_path ?? '—'}</p>
                  {l.github_repo && (
                    <p>
                      <span className="font-semibold text-cafe-medio">GitHub:</span>{' '}
                      <a href={l.github_repo} target="_blank" rel="noopener noreferrer" className="text-coral-terra hover:underline">
                        {l.github_repo}
                      </a>
                    </p>
                  )}
                  <p><span className="font-semibold text-cafe-medio">Criado em:</span> {new Date(l.created_at).toLocaleString('pt-BR')}</p>
                </div>
              )}
            </div>
          ))}
          <Pagination
            page={page}
            pageSize={LISTINGS_PAGE_SIZE}
            total={listings.length}
            onPageChange={setPage}
            label="listings"
          />
        </div>
      )}
    </div>
  );
}
