#!/usr/bin/env node
/**
 * WordPress Content Scraper v2 for edstruijlaart.nl
 * Uses a more robust content extraction approach
 * Fetches full page HTML and extracts article content
 */

import { writeFileSync, mkdirSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'https://www.edstruijlaart.nl';
const OUTPUT_DIR = join(import.meta.dirname, '..', 'src', 'content', 'news');

// Read existing files to get slugs that need content
const existingFiles = readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.md'));

console.log(`🔍 Found ${existingFiles.length} existing post files`);
console.log('📥 Re-fetching content for posts with 0 chars body...\n');

let updated = 0;
let skipped = 0;
let failed = 0;

for (let i = 0; i < existingFiles.length; i++) {
  const filename = existingFiles[i];
  const filePath = join(OUTPUT_DIR, filename);
  const existing = readFileSync(filePath, 'utf-8');

  // Parse frontmatter
  const fmMatch = existing.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!fmMatch) {
    console.log(`⚠️ [${i + 1}] ${filename} — no frontmatter, skipping`);
    skipped++;
    continue;
  }

  const frontmatter = fmMatch[1];
  const body = fmMatch[2].trim();

  // Extract slug from frontmatter
  const slugMatch = frontmatter.match(/slug: "([^"]*)"/);
  const originalUrlMatch = frontmatter.match(/originalUrl: "([^"]*)"/);

  if (!slugMatch) {
    console.log(`⚠️ [${i + 1}] ${filename} — no slug found, skipping`);
    skipped++;
    continue;
  }

  const slug = slugMatch[1];
  const url = originalUrlMatch
    ? `${BASE_URL}${originalUrlMatch[1]}`
    : `${BASE_URL}/news/${encodeURIComponent(slug)}/`;

  // Only re-fetch if body is empty or very short
  if (body.length > 50) {
    skipped++;
    continue;
  }

  const displayName = slug.substring(0, 50);
  process.stdout.write(`[${i + 1}/${existingFiles.length}] ${displayName}... `);

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!res.ok) {
      console.log(`❌ HTTP ${res.status}`);
      failed++;
      continue;
    }

    const html = await res.text();

    // Strategy 1: Look for article content between specific markers
    let content = '';

    // Try to find the main content area — WordPress themes vary
    // Common patterns: .entry-content, .post-content, article .content, etc.

    // Method A: Everything between entry-content divs
    const patterns = [
      // Flavor theme
      /<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<(?:div|footer|nav|section|aside)/i,
      // Generic article
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      // Post body
      /<div[^>]*class="[^"]*post-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      // Content area
      /<div[^>]*class="[^"]*content-area[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      // Single post content
      /<div[^>]*class="[^"]*single-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      // WordPress block content
      /<div[^>]*class="[^"]*wp-block[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match && match[1] && match[1].length > content.length) {
        content = match[1];
      }
    }

    // Method B: If nothing found, try to get all <p> tags from inside <main> or <article>
    if (content.length < 50) {
      const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
      const searchIn = mainMatch ? mainMatch[1] : html;

      const paragraphs = [];
      const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
      let pMatch;
      while ((pMatch = pRegex.exec(searchIn)) !== null) {
        const pText = pMatch[1]
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#8217;/g, "'")
          .replace(/&#8216;/g, "'")
          .replace(/&#8220;/g, '"')
          .replace(/&#8221;/g, '"')
          .replace(/&#8211;/g, '–')
          .replace(/&#8212;/g, '—')
          .replace(/&#8230;/g, '…')
          .replace(/&#?\w+;/g, '')
          .trim();

        // Filter out navigation, footer, sidebar text
        if (
          pText.length > 20 &&
          !pText.includes('Cookie') &&
          !pText.includes('copyright') &&
          !pText.includes('Volg Ed') &&
          !pText.includes('menu') &&
          !pText.startsWith('©')
        ) {
          paragraphs.push(pText);
        }
      }

      if (paragraphs.length > 0) {
        content = paragraphs.join('\n\n');
      }
    }

    // Convert remaining HTML to text if needed
    if (content.includes('<')) {
      content = content
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
        .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
        .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
        .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<p[^>]*>/gi, '')
        .replace(/<\/?[ou]l[^>]*>/gi, '\n')
        .replace(/<iframe[^>]*src="([^"]*)"[^>]*><\/iframe>/gi, '\n[Embed: $1]\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#8217;/g, "'")
        .replace(/&#8216;/g, "'")
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&#8211;/g, '–')
        .replace(/&#8212;/g, '—')
        .replace(/&#8230;/g, '…')
        .replace(/&#?\w+;/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    if (content.length > 30) {
      // Write updated file with content
      const updatedFile = `---\n${frontmatter}\n---\n\n${content}\n`;
      writeFileSync(filePath, updatedFile, 'utf-8');
      console.log(`✅ ${content.length} chars`);
      updated++;
    } else {
      // Keep excerpt from frontmatter as fallback
      const excerptMatch = frontmatter.match(/excerpt: "([^"]*)"/);
      if (excerptMatch && excerptMatch[1].length > 20) {
        const updatedFile = `---\n${frontmatter}\n---\n\n${excerptMatch[1]}\n`;
        writeFileSync(filePath, updatedFile, 'utf-8');
        console.log(`📝 excerpt only (${excerptMatch[1].length} chars)`);
        updated++;
      } else {
        console.log(`⚠️ no content found`);
        failed++;
      }
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 400));
  } catch (e) {
    console.log(`❌ ${e.message}`);
    failed++;
  }
}

console.log(`\n🏁 Done! Updated: ${updated}, Skipped: ${skipped}, Failed: ${failed}`);
