import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    slug: z.string(),
    date: z.string().optional().default(''),
    featuredImage: z.string().optional(),
    excerpt: z.string().optional(),
    originalUrl: z.string().optional(),
  }),
});

export const collections = { news };
