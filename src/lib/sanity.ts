import { createClient } from '@sanity/client';

// Read-only client voor pagina data (CDN-cached)
export const sanityClient = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID || import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
});

// Write client voor API endpoints (mutations)
export const sanityWriteClient = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID || import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.SANITY_DATASET || 'production',
  token: import.meta.env.SANITY_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
});
