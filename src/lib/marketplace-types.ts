export interface Listing {
  id: string;
  seller_id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  price_cents: number;
  thumbnail_url: string;
  gallery_urls: string[];
  zip_storage_path: string | null;
  github_repo: string | null;
  status: string;
  total_sales: number;
  total_revenue_cents: number;
  created_at: string;
  published_at: string;
  updated_at?: string;
}

export interface Purchase {
  id: string;
  buyer_id: string | null;
  buyer_email: string;
  listing_id: string;
  price_paid_cents: number;
  stripe_payment_id: string | null;
  status: 'pending' | 'paid' | 'refunded';
  created_at: string;
  marketplace_listings?: Pick<Listing, 'id' | 'slug' | 'title' | 'thumbnail_url' | 'category'>;
}
