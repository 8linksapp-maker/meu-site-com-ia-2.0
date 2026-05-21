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
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Listing } from '../../lib/marketplace-types';
import { formatBRL } from '../../lib/marketplace';

interface FinanceData {
  revenue_month_cents: number;
  total_sales: number;
  recent_purchases: Array<{
    id: string;
    buyer_email: string;
    price_paid_cents: number;
    created_at: string;
    listing_title: string;
  }>;
}

const CATEGORIES = ['blog', 'loja', 'landing', 'portfolio', 'institucional', 'outro'];

export default function MarketplaceManager() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [finance, setFinance] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
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
      gallery.forEach((f) => fd.append('gallery', f));
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#7c3aed]/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#7c3aed]" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Receita este mês</p>
              <p className="text-xl font-black text-gray-900">{formatBRL(finance.revenue_month_cents)}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total de vendas</p>
              <p className="text-xl font-black text-gray-900">{finance.total_sales}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Listings ativos</p>
              <p className="text-xl font-black text-gray-900">
                {listings.filter((l) => l.status === 'published').length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header + Add */}
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">Listings</h2>
        <button
          onClick={() => { setShowUpload((v) => !v); setUploadError(''); setUploadSuccess(false); }}
          className="flex items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo listing
        </button>
      </div>

      {/* Upload Form */}
      {showUpload && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Novo Listing</h3>
            <button onClick={() => setShowUpload(false)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Título *</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed]"
                  placeholder="Walker Blog Pro"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Categoria *</label>
                <select
                  required
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed] bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Descrição *</label>
              <textarea
                required
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed] resize-none"
                placeholder="Descreva o template, o que está incluído, stack técnica..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Preço (centavos) — 0 = grátis</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={form.price_cents}
                  onChange={(e) => setForm((f) => ({ ...f, price_cents: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed]"
                  placeholder="2900"
                />
                {parseInt(form.price_cents) > 0 && (
                  <p className="text-xs text-gray-400 mt-1">{formatBRL(parseInt(form.price_cents))}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">GitHub / Demo URL</label>
                <input
                  type="url"
                  value={form.github_repo}
                  onChange={(e) => setForm((f) => ({ ...f, github_repo: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/30 focus:border-[#7c3aed]"
                  placeholder="https://github.com/..."
                />
              </div>
            </div>

            {/* File uploads */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Thumbnail * <span className="text-gray-400 font-normal">(JPG/PNG)</span></label>
                <input ref={thumbRef} type="file" accept="image/*" className="hidden" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => thumbRef.current?.click()} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-[#7c3aed]/40 rounded-xl py-3 text-sm text-gray-500 transition-colors">
                  <Upload className="w-4 h-4" />
                  {thumb ? thumb.name : 'Escolher imagem'}
                </button>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Galeria <span className="text-gray-400 font-normal">(múltiplas)</span></label>
                <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => setGallery(Array.from(e.target.files ?? []))} />
                <button type="button" onClick={() => galleryRef.current?.click()} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-[#7c3aed]/40 rounded-xl py-3 text-sm text-gray-500 transition-colors">
                  <Upload className="w-4 h-4" />
                  {gallery.length > 0 ? `${gallery.length} arquivo(s)` : 'Escolher imagens'}
                </button>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">ZIP * <span className="text-gray-400 font-normal">(.zip)</span></label>
                <input ref={zipRef} type="file" accept=".zip" className="hidden" onChange={(e) => setZip(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => zipRef.current?.click()} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-[#7c3aed]/40 rounded-xl py-3 text-sm text-gray-500 transition-colors">
                  <Upload className="w-4 h-4" />
                  {zip ? zip.name : 'Escolher ZIP'}
                </button>
              </div>
            </div>

            {uploadError && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{uploadError}</p>
            )}

            <button
              type="submit"
              disabled={uploading}
              className="flex items-center justify-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] disabled:opacity-60 text-white font-bold py-3 px-6 rounded-xl transition-colors text-sm"
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
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-semibold px-4 py-3 rounded-xl">
          ✓ Listing publicado com sucesso!
        </div>
      )}

      {/* Listings table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 h-16 animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ShoppingBag className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">Nenhum listing ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {listings.map((l) => (
            <div key={l.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                {/* Thumb */}
                <div className="w-14 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                  {l.thumbnail_url ? (
                    <img src={l.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{l.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                      {l.category}
                    </span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                      l.status === 'published' ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-700'
                    }`}>
                      {l.status}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-gray-900">
                      {l.price_cents === 0 ? 'Grátis' : formatBRL(l.price_cents)}
                    </p>
                    <p className="text-[10px] text-gray-400">preço</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-gray-900">{l.total_sales}</p>
                    <p className="text-[10px] text-gray-400">vendas</p>
                  </div>
                  {l.total_revenue_cents > 0 && (
                    <div className="text-center">
                      <p className="font-bold text-gray-900">{formatBRL(l.total_revenue_cents)}</p>
                      <p className="text-[10px] text-gray-400">receita</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <a
                    href={`/marketplace/${l.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-gray-400 hover:text-[#7c3aed] hover:bg-[#7c3aed]/5 rounded-lg transition-colors"
                    aria-label="Ver listing"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setExpandedId(expandedId === l.id ? null : l.id)}
                    className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    aria-label="Expandir"
                  >
                    {expandedId === l.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {expandedId === l.id && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3 text-sm text-gray-600 space-y-1">
                  <p><span className="font-semibold text-gray-700">Slug:</span> {l.slug}</p>
                  <p><span className="font-semibold text-gray-700">ZIP path:</span> {l.zip_storage_path ?? '—'}</p>
                  {l.github_repo && (
                    <p>
                      <span className="font-semibold text-gray-700">GitHub:</span>{' '}
                      <a href={l.github_repo} target="_blank" rel="noopener noreferrer" className="text-[#7c3aed] hover:underline">
                        {l.github_repo}
                      </a>
                    </p>
                  )}
                  <p><span className="font-semibold text-gray-700">Criado em:</span> {new Date(l.created_at).toLocaleString('pt-BR')}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
