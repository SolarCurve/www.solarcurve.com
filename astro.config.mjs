import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.solarcurve.com',
  integrations: [
    mdx(),
    tailwind({ applyBaseStyles: false }),
    sitemap({ filter: (page) => !page.endsWith('/404/') }),
  ],
});
