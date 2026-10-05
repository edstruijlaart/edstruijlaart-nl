import { createClient } from '@sanity/client';

// Alleen server-side importeren (frontmatter van .astro en API-routes), nooit in een <script>
// of client-component: hier staan tokens in. Geen enkel token krijgt een PUBLIC_-prefix.

// Read-token voor een privé dataset (audit 5 okt 2026, #4). Zolang SANITY_READ_TOKEN niet
// gezet is, leest de site anoniem zoals voorheen; dat werkt alleen zolang de dataset publiek is.
const readToken = import.meta.env.SANITY_READ_TOKEN;

// Read-only client voor pagina data (CDN-cached)
export const sanityClient = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID || import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
  // Met een token ziet de API ook concepten (drafts.*); 'published' houdt het gedrag gelijk
  // aan anoniem lezen.
  ...(readToken ? { token: readToken, perspective: 'published' as const } : {}),
});

// Write client voor API endpoints (mutations)
export const sanityWriteClient = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID || import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.SANITY_DATASET || 'production',
  token: import.meta.env.SANITY_WRITE_TOKEN,
  apiVersion: '2024-01-01',
  useCdn: false,
});
