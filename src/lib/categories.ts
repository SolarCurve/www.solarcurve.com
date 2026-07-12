// Shared category display maps — single source of truth for
// PostCard.astro, posts/[slug].astro, and the category pages.

export type Category = 'solar' | 'gaming' | 'crypto' | 'tech' | 'personal';

export const categoryLabels: Record<Category, string> = {
  solar:    'Solar journey',
  gaming:   'Gaming',
  crypto:   'Crypto',
  tech:     'Tech',
  personal: 'Personal',
};

export const categoryColors: Record<Category, string> = {
  solar:    'category-solar',
  gaming:   'category-gaming',
  crypto:   'category-crypto',
  tech:     'category-tech',
  personal: 'category-personal',
};
