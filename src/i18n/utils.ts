/**
 * i18n utility functions.
 * Used by pages and components to get translations and detect locale.
 */
import { defaultLocale, locales, isValidLocale, type Locale } from './config';
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
    return '/' + segments.slice(1).join('/') + (pathname.endsWith('/') ? '/' : '');
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
 */
export function getLocalizedNav(locale: Locale) {
  const t = useTranslations(locale);
  const prefix = locale === defaultLocale ? '' : `/${locale}`;

  return {
    mainNav: [
      { label: t.nav.home, href: `${prefix}/` },
      { label: t.nav.about, href: `${prefix}/about/` },
      { label: t.nav.podcasts, href: `${prefix}/podcasts/` },
      { label: t.nav.theater, href: `${prefix}/tour/` },
      { label: t.nav.houseConcerts, href: `${prefix}/huiskamerconcerten/` },
      { label: t.nav.voiceover, href: `${prefix}/voiceover/` },
      { label: t.nav.music, href: `${prefix}/music/` },
      { label: t.nav.blog, href: `${prefix}/blog/` },
      { label: t.nav.contact, href: `${prefix}/contact/` },
      { label: t.nav.shop, href: `${prefix}/shop/` },
    ],
    footerNav: [
      { label: t.nav.about, href: `${prefix}/about/` },
      { label: t.nav.theater, href: `${prefix}/tour/` },
      { label: t.nav.houseConcerts, href: `${prefix}/huiskamerconcerten/` },
      { label: t.nav.music, href: `${prefix}/music/` },
      { label: t.nav.voiceover, href: `${prefix}/voiceover/` },
      { label: t.nav.podcasts, href: `${prefix}/podcasts/` },
      { label: t.nav.blog, href: `${prefix}/blog/` },
      { label: t.nav.contact, href: `${prefix}/contact/` },
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
  getAlternateUrls,
} from './config';
