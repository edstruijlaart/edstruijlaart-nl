/**
 * Astro Middleware — Locale detection & redirect.
 *
 * Logic:
 * 1. Skip API routes, static assets, and bot requests (Googlebot must see ALL locales)
 * 2. If user already has a `lang` cookie, respect that choice
 * 3. If visiting root path without locale prefix, detect locale from Vercel's geo header
 * 4. Redirect to the appropriate locale version
 *
 * SEO-safe: bots are NEVER redirected so Google can crawl all language versions.
 */
import { defineMiddleware } from 'astro:middleware';
import { getLocaleForCountry, isValidLocale, defaultLocale, type Locale } from './i18n/config';
import { getLocaleFromUrl } from './i18n/utils';

/** User-Agent patterns for search engine bots — never redirect these */
const BOT_PATTERNS = /bot|crawl|spider|slurp|googlebot|bingbot|yandex|baidu|duckduck|semrush|ahrefs|mj12bot|dotbot|petalbot|bytespider/i;

/** Paths that should never be redirected */
const SKIP_PATTERNS = /^\/(api|_astro|_image|images|favicon|robots|sitemap|og-image|apple-touch)/;

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request } = context;
  const pathname = url.pathname;

  // 0. Skip during prerendering/build — no geo headers available
  if (context.isPrerendered || !request.headers.get('user-agent')) {
    return next();
  }

  // 1. Skip static assets, API routes
  if (SKIP_PATTERNS.test(pathname)) {
    return next();
  }

  // 2. Skip bots — they must be able to crawl ALL language versions
  const userAgent = request.headers.get('user-agent') || '';
  if (BOT_PATTERNS.test(userAgent)) {
    return next();
  }

  // 3. If URL already has a valid locale prefix, just continue
  const currentLocale = getLocaleFromUrl(url);
  if (currentLocale !== defaultLocale) {
    // User is on /en/, /es/, etc. — serve normally
    return next();
  }

  // 4. For default locale paths: check if user should be redirected
  //    Only redirect if:
  //    - There's no `lang` cookie set (first visit)
  //    - OR cookie says a non-default locale
  const cookieLang = getCookieValue(request.headers.get('cookie'), 'lang');

  if (cookieLang && isValidLocale(cookieLang)) {
    if (cookieLang !== defaultLocale) {
      // User previously chose a different language — redirect
      return redirectToLocale(url, cookieLang);
    }
    // Cookie says Dutch — serve default, no redirect
    return next();
  }

  // 5. No cookie — detect from geo (Vercel's x-vercel-ip-country header)
  const country = request.headers.get('x-vercel-ip-country') || '';
  const detectedLocale = getLocaleForCountry(country);

  if (detectedLocale !== defaultLocale) {
    // Set cookie so we don't redirect every time, then redirect
    const response = redirectToLocale(url, detectedLocale);
    response.headers.set('Set-Cookie', `lang=${detectedLocale}; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`);
    return response;
  }

  // Default: serve Dutch
  return next();
});

function redirectToLocale(url: URL, locale: Locale): Response {
  const newUrl = new URL(`/${locale}${url.pathname}${url.search}`, url.origin);
  return new Response(null, {
    status: 302,
    headers: {
      Location: newUrl.toString(),
    },
  });
}

function getCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
