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

  // i18n: we handelen meertalige routing zelf af via middleware + translation files.
  // Geen Astro i18n config nodig — dat genereert ongewenste redirects.
  // Locale pages leven in src/pages/en/, src/pages/es/, etc.

  // CSRF uitschakelen voor externe API calls (iOS Shortcuts bootleg upload, webhooks)
  security: {
    checkOrigin: false,
  },

  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'nl',
        locales: {
          nl: 'nl',
          en: 'en',
          es: 'es',
          de: 'de',
          fr: 'fr',
        },
      },
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
