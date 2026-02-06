#!/usr/bin/env node
/**
 * WordPress Content Scraper for edstruijlaart.nl
 * Scrapes all /news/ posts and the /huiskamerconcert/ page
 * Saves as markdown files in src/content/news/
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'https://www.edstruijlaart.nl';
const OUTPUT_DIR = join(import.meta.dirname, '..', 'src', 'content', 'news');
const HUISKAMER_DIR = join(import.meta.dirname, '..', 'src', 'content', 'pages');

// All 71 news post slugs from the sitemap
const NEWS_SLUGS = [
  'verras-jij-je-moeder-met-een-huiskamerconcert',
  'closer-than-skin-clubtour-succesvol-afgesloten-in-tivoli-de-helling',
  '4-optredens-op-record-store-day-2015',
  'edtv-vlog-mis-vanaf-nu-niks-meer',
  'download-gratis-livingroom-sessions-ep',
  'nieuwe-single-house-on-fire',
  'naprogramma-ed-sheeran-in-de-ziggo-dome',
  'closer-than-skin-binnen-op-19-in-de-album-top-100',
  'ed-struijlaart-closer-than-skin',
  'dwdd-en-evers-staat-op-terugkijken',
  'clubtour-closer-than-skin-vanaf-maart-door-nederland',
  'beluister-het-album-nu-al-op-spotify-in-track-by-track',
  'de-wereld-draait-door',
  'bestel-het-nieuwe-album-vooruit',
  'wereldrecord-huiskamerconcerten-tijdens-bas',
  'ed-covert-iedereen-is-van-de-wereld-bij-ekdom-in-de-ochtend',
  'tricks-up-my-sleeve-is-npo-radio-2-top-song',
  'nieuwe-single-live-bij-gerard-ekdom-op-radio-2',
  'data-clubtour-2016-bekend',
  'nieuwe-single-made-of-stars-duet-met-lisa-lois',
  '360-graden-video-made-of-stars',
  'nieuwe-single-gold',
  'nieuwe-single-like-december',
  '23-december-2017-eds-pre-x-mas-party',
  'nieuwe-single-make-it-on-your-own',
  'speel-samen-met-je-kind-in-de-clip-van-make-it-on-your-own',
  'giraff-remix-make-it-on-your-own',
  'videoclip-make-it-on-your-own-online',
  'nieuwe-single-guitar',
  'speeldata-gitaarmannen-van-clapton-tot-sheeran',
  'op-zoek-naar-huiskamers-ook-in-2019-doe-ik-huiskamerconcerten',
  'de-tijd-dat-alles-kon-en-mocht-bij-evers-staat-op',
  'reprise-gitaarmannen-van-clapton-tot-sheeran',
  'gitaarmannen-de-podcast',
  'topsong-nieuwe-single-what-i-like-about-you',
  'plezant-belgie-ontdekt-what-i-like-about-you',
  'dief-met-berouw',
  'nieuwe-single-next-to-me',
  'quarantaine-sessions',
  'nieuwe-single-alles-komt-weer-goed',
  'ed-doet-eerste-virtuele-theatertour-ooit-van-huis-uit',
  'ed-speelt-het-wilhelmus-vanaf-zijn-balkon-koningsdag-2020',
  'moederdag-aktie',
  'alles-op-rood-vanaf-het-najaar-in-het-theater',
  'nieuwe-single-voor-jou',
  'livestream-luistersessie-nieuwe-ep',
  'ep-alles-op-rood-vanaf-nu-te-bestellen',
  'online-kerstconcert-boeken',
  '20-december-eds-online-x-mas-party',
  '14-feb-de-grote-valentijns-stream',
  '15-maart-de-1-jaar-in-de-shit-stream',
  'moederdag-serenade-boek-zelf-de-tijd-die-je-uitkomt',
  'alles-op-rood-de-reboot',
  'ed-wordt-dj-op-radio-veronica',
  'online-nieuwjaarsborrel-verbindt',
  'ed-de-theaters-in-met-een-ode-aan-claptons-unplugged',
  'nieuwe-single-long-lost-friend',
  'huiskamerconcert-5-tips-voor-een-unieke-muzikale-ervaring',
  'op-pad-met-de-veronica-express',
  'move-on-nieuwe-single-ziet-het-daglicht',
  'de-troubadours-terug-naar-mijn-roots-in-leidschendam',
  'gitaarmannen-2-eric-clapton-unplugged',
  'waarom-eric-claptons-unplugged-legendarisch-is',
  'nieuwe-single-all-we-need',
  'all-we-need-live-in-premiere-bij-edwin-evers-op-538',
  'gitaarmannen-3-john-mayer-theatertour',
  'boek-nu-jouw-eigen-huiskamerconcert-met-ed-struijlaart',
  'gitaarmannen-3-john-mayer',
  '%e2%98%95-goedemorgen-nederland-en-hallo-john-mayer',
  'dit-huiskamerconcert-vergeet-ik-nooit-meer',
  'huiskamerconcerten-ed-struijlaart-2026',
];

// Simple HTML to text/markdown converter
function htmlToMarkdown(html) {
  if (!html) return '';

  let md = html;

  // Remove scripts and styles
  md = md.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  md = md.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Convert headings
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');

  // Convert links
  md = md.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

  // Convert images
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)');
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)');

  // Convert bold/italic
  md = md.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  md = md.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  md = md.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  md = md.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

  // Convert lists
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  md = md.replace(/<\/?[ou]l[^>]*>/gi, '\n');

  // Convert paragraphs and line breaks
  md = md.replace(/<br\s*\/?>/gi, '\n');
  md = md.replace(/<\/p>/gi, '\n\n');
  md = md.replace(/<p[^>]*>/gi, '');

  // Convert blockquotes
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '> $1\n\n');

  // Preserve iframes (YouTube, Spotify embeds)
  md = md.replace(/<iframe[^>]*src="([^"]*)"[^>]*><\/iframe>/gi, '\n[Embed: $1]\n');

  // Remove remaining HTML tags
  md = md.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  md = md.replace(/&amp;/g, '&');
  md = md.replace(/&lt;/g, '<');
  md = md.replace(/&gt;/g, '>');
  md = md.replace(/&quot;/g, '"');
  md = md.replace(/&#8217;/g, "'");
  md = md.replace(/&#8216;/g, "'");
  md = md.replace(/&#8220;/g, '"');
  md = md.replace(/&#8221;/g, '"');
  md = md.replace(/&#8211;/g, '–');
  md = md.replace(/&#8212;/g, '—');
  md = md.replace(/&#8230;/g, '…');
  md = md.replace(/&nbsp;/g, ' ');
  md = md.replace(/&#?\w+;/g, ''); // remaining entities

  // Clean up whitespace
  md = md.replace(/\n{3,}/g, '\n\n');
  md = md.trim();

  return md;
}

// Extract content from a news post page
function extractPostContent(html, slug) {
  const result = {
    title: '',
    date: '',
    content: '',
    excerpt: '',
    featuredImage: '',
    categories: [],
  };

  // Extract title from <title> tag or h1
  const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
  if (titleMatch) {
    result.title = titleMatch[1].replace(/\s*[–\-|].*$/, '').trim();
  }

  // Try og:title
  const ogTitle = html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i);
  if (ogTitle) {
    result.title = ogTitle[1].trim();
  }

  // Extract date from meta or published time
  const dateMatch = html.match(/<meta\s+property="article:published_time"\s+content="([^"]*)"/i);
  if (dateMatch) {
    result.date = dateMatch[1];
  }
  const modDateMatch = html.match(/<meta\s+property="article:modified_time"\s+content="([^"]*)"/i);

  // Extract featured image
  const ogImage = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i);
  if (ogImage) {
    result.featuredImage = ogImage[1];
  }

  // Extract description/excerpt
  const ogDesc = html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i);
  if (ogDesc) {
    result.excerpt = ogDesc[1].trim();
  }

  // Extract main content - try common WordPress content containers
  let contentHtml = '';

  // Try entry-content class
  const entryContent = html.match(/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?:<div|<footer|<nav|<section|<\/article)/i);
  if (entryContent) {
    contentHtml = entryContent[1];
  }

  // Try article body
  if (!contentHtml) {
    const articleBody = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (articleBody) {
      contentHtml = articleBody[1];
    }
  }

  // Try post-content
  if (!contentHtml) {
    const postContent = html.match(/<div[^>]*class="[^"]*post-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    if (postContent) {
      contentHtml = postContent[1];
    }
  }

  result.content = htmlToMarkdown(contentHtml);

  // If content is too short, use the excerpt/description
  if (result.content.length < 20 && result.excerpt) {
    result.content = result.excerpt;
  }

  return result;
}

// Fetch with retry
async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });
      if (res.ok) {
        return await res.text();
      }
      console.error(`  HTTP ${res.status} for ${url}`);
    } catch (e) {
      console.error(`  Attempt ${i + 1} failed for ${url}: ${e.message}`);
    }
    // Wait before retry
    await new Promise(r => setTimeout(r, 1000));
  }
  return null;
}

// Save post as markdown with frontmatter
function savePost(dir, slug, data) {
  // Clean slug for filename
  const cleanSlug = decodeURIComponent(slug).replace(/%/g, '');

  const frontmatter = [
    '---',
    `title: "${data.title.replace(/"/g, '\\"')}"`,
    `slug: "${cleanSlug}"`,
    `date: "${data.date}"`,
    data.featuredImage ? `featuredImage: "${data.featuredImage}"` : null,
    data.excerpt ? `excerpt: "${data.excerpt.replace(/"/g, '\\"')}"` : null,
    `originalUrl: "/news/${slug}/"`,
    '---',
  ].filter(Boolean).join('\n');

  const content = `${frontmatter}\n\n${data.content}\n`;

  const filePath = join(dir, `${cleanSlug}.md`);
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

// Main
async function main() {
  console.log('🚀 WordPress Content Scraper for edstruijlaart.nl');
  console.log(`📂 Output: ${OUTPUT_DIR}`);
  console.log(`📰 Posts to scrape: ${NEWS_SLUGS.length}\n`);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  mkdirSync(HUISKAMER_DIR, { recursive: true });

  let success = 0;
  let failed = 0;

  // Scrape news posts
  for (let i = 0; i < NEWS_SLUGS.length; i++) {
    const slug = NEWS_SLUGS[i];
    const url = `${BASE_URL}/news/${slug}/`;
    const displaySlug = decodeURIComponent(slug).substring(0, 50);
    process.stdout.write(`[${i + 1}/${NEWS_SLUGS.length}] ${displaySlug}... `);

    const html = await fetchWithRetry(url);
    if (!html) {
      console.log('❌ FAILED');
      failed++;
      continue;
    }

    const data = extractPostContent(html, slug);
    savePost(OUTPUT_DIR, slug, data);
    console.log(`✅ "${data.title}" (${data.content.length} chars)`);
    success++;

    // Be polite to the server
    await new Promise(r => setTimeout(r, 300));
  }

  // Scrape huiskamerconcert page
  console.log('\n📄 Scraping /huiskamerconcert/ page...');
  const hkHtml = await fetchWithRetry(`${BASE_URL}/huiskamerconcert/`);
  if (hkHtml) {
    const hkData = extractPostContent(hkHtml, 'huiskamerconcert');
    savePost(HUISKAMER_DIR, 'huiskamerconcert', hkData);
    console.log(`✅ Huiskamerconcert page saved (${hkData.content.length} chars)`);
  } else {
    console.log('❌ Failed to scrape huiskamerconcert page');
  }

  console.log(`\n🏁 Done! ${success} posts saved, ${failed} failed.`);
}

main().catch(console.error);
