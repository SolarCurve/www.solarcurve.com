// Shared post fetching — single source of truth for the newest-first sort
// used by index, blog, gaming, and solar pages.
import { getCollection } from 'astro:content';
import type { Category } from './categories';

export async function getSortedPosts(category?: Category) {
  const posts = await getCollection(
    'posts',
    ({ data }) => !data.draft && (!category || data.category === category)
  );
  return posts.sort(
    (a, b) => new Date(b.data.dateSort).getTime() - new Date(a.data.dateSort).getTime()
  );
}
