import rss from '@astrojs/rss';
import { getSortedPosts } from '../lib/posts';

export async function GET(context) {
  const posts = await getSortedPosts();

  return rss({
    title: "SolarCurve's House of Flamp",
    description:
      "SolarCurve's personal blog. Esports founder, tech company builder, solar power enthusiast, lifelong gamer. Flower Mound, TX.",
    site: context.site,
    // Keep the trailing slash so feed links match the canonical URLs exactly
    // and don't cost a redirect hop.
    trailingSlash: true,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: new Date(`${post.data.dateSort}T12:00:00Z`),
      categories: post.data.tags ?? [post.data.category],
      link: `/posts/${post.slug}/`,
    })),
    customData: '<language>en-us</language>',
  });
}
