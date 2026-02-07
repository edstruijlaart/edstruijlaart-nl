// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';

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
    sitemap(),
    react(),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  redirects: {
    '/photo': '/about',
    '/news': '/blog',
  },
});
