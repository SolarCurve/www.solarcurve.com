import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import rehypeExternalLinks from 'rehype-external-links';

export default defineConfig({
  site: 'https://www.solarcurve.com',
  markdown: {
    rehypePlugins: [
      // Any http(s) link that isn't solarcurve.com opens in a new tab and
      // gets rel="noopener" for tabnabbing safety. Internal /posts links are
      // untouched. Applies to every current and future post.
      [
        rehypeExternalLinks,
        {
          target: '_blank',
          rel: ['noopener'],
          protocols: ['http', 'https'],
        },
      ],
    ],
  },
  integrations: [
    mdx(),
    tailwind({ applyBaseStyles: false }),
    sitemap({ filter: (page) => !page.endsWith('/404/') }),
  ],
});
