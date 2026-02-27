// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

const BUILD_DATE = new Date();

// https://astro.build/config
export default defineConfig({
  site: 'https://edstruijlaart.nl',
  output: 'static',
  adapter: vercel(),

  // CSRF uitschakelen voor externe API calls (iOS Shortcuts bootleg upload, webhooks)
  security: {
    checkOrigin: false,
  },

  integrations: [
    sitemap({
      filter(page) {
        // Sluit redirect- en SSR-only routes uit
        return !page.includes('/shows/') && !page.includes('/live') && !page.includes('/api/');
      },
      serialize(item) {
        // Gebruik een vaste datum per build (niet new Date() per pagina zodat het stabiel is)
        item.lastmod = BUILD_DATE;
        return item;
      },
    }),
    react(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

});
