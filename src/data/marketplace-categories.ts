export const MARKETPLACE_CATEGORIES = [
  { slug: 'landing-page', label: 'Landing Page' },
  { slug: 'e-commerce', label: 'E-commerce' },
  { slug: 'blog', label: 'Blog' },
  { slug: 'portfolio', label: 'Portfolio' },
  { slug: 'dashboard', label: 'Dashboard' },
  { slug: 'outros', label: 'Outros' },
] as const;

export type CategorySlug = typeof MARKETPLACE_CATEGORIES[number]['slug'];

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  MARKETPLACE_CATEGORIES.map((c) => [c.slug, c.label])
);
