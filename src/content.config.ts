import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const newsSchema = z.object({
  title: z.string(),
  slug: z.string(),
  date: z.string().optional().default(''),
  featuredImage: z.string().optional(),
  excerpt: z.string().optional(),
  originalUrl: z.string().optional(),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: newsSchema,
});

const newsEn = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news-en' }),
  schema: newsSchema,
});

const newsEs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news-es' }),
  schema: newsSchema,
});

const newsDe = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news-de' }),
  schema: newsSchema,
});

const newsFr = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news-fr' }),
  schema: newsSchema,
});

export const collections = {
  news,
  'news-en': newsEn,
  'news-es': newsEs,
  'news-de': newsDe,
  'news-fr': newsFr,
};
