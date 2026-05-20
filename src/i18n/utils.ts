/**
 * i18n utility functions.
 * Used by pages and components to get translations and detect locale.
 */
import { defaultLocale, locales, isValidLocale, localizedHref, type Locale } from './config';
import { translations } from './translations';
import type { TranslationKeys } from './translations/nl';

/**
 * Extract locale from a URL pathname.
 * /en/about/ → 'en'
 * /about/ → 'nl' (default)
 * /es/news/my-post/ → 'es'
 */
export function getLocaleFromUrl(url: URL | string): Locale {
  const pathname = typeof url === 'string' ? url : url.pathname;
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (first && isValidLocale(first)) {
    return first;
  }
  return defaultLocale;
}

/**
 * Get the path without locale prefix.
 * /en/about/ → /about/
 * /about/ → /about/
 */
export function getPathWithoutLocale(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const first = segments[0];
  if (first && isValidLocale(first) && first !== defaultLocale) {
    const rest = segments.slice(1).join('/');
    if (!rest) return '/';
    return '/' + rest + (pathname.endsWith('/') ? '/' : '');
  }
  return pathname;
}

/**
 * Get translation function for a locale.
 * Usage: const t = useTranslations('en');
 *        t.nav.home → 'Home'
 */
export function useTranslations(locale: Locale): TranslationKeys {
  return translations[locale] || translations[defaultLocale];
}

/**
 * Get navigation items for a locale, with correct hrefs.
 * Falls back to the default-locale URL for pages that are not translated,
 * so nav links never lead to a 404.
 */
export function getLocalizedNav(locale: Locale) {
  const t = useTranslations(locale);
  const href = (path: string) => localizedHref(path, locale);

  return {
    mainNav: [
      { label: t.nav.home, href: href('/') },
      { label: t.nav.about, href: href('/about/') },
      { label: t.nav.podcasts, href: href('/podcasts/') },
      { label: t.nav.theater, href: href('/tour/') },
      { label: t.nav.houseConcerts, href: href('/huiskamerconcerten/') },
      { label: t.nav.voiceover, href: href('/voiceover/') },
      { label: t.nav.music, href: href('/music/') },
      { label: t.nav.blog, href: href('/blog/') },
      { label: t.nav.contact, href: href('/contact/') },
      { label: t.nav.shop, href: href('/shop/') },
    ],
    footerNav: [
      { label: t.nav.about, href: href('/about/') },
      { label: t.nav.theater, href: href('/tour/') },
      { label: t.nav.houseConcerts, href: href('/huiskamerconcerten/') },
      { label: t.nav.music, href: href('/music/') },
      { label: t.nav.voiceover, href: href('/voiceover/') },
      { label: t.nav.podcasts, href: href('/podcasts/') },
      { label: t.nav.blog, href: href('/blog/') },
      { label: t.nav.contact, href: href('/contact/') },
    ],
  };
}

/**
 * Format a date according to locale.
 */
export function formatDate(dateStr: string | undefined, locale: Locale): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const localeMap: Record<Locale, string> = {
      nl: 'nl-NL',
      en: 'en-US',
      es: 'es-ES',
      de: 'de-DE',
      fr: 'fr-FR',
    };
    return d.toLocaleDateString(localeMap[locale], {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

/** Re-export for convenience */
export { defaultLocale, locales, type Locale } from './config';
export {
  localeNames,
  localeHtmlLang,
  localeOgTag,
  getLocalePrefix,
  localePath,
  localizedHref,
  pageExistsForLocale,
  getAlternateUrls,
} from './config';
