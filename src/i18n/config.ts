/**
 * i18n Configuration
 * Locale definitions, country mapping for geo-detection, and locale metadata.
 */

export const defaultLocale = 'nl' as const;
export const locales = ['nl', 'en', 'es', 'de', 'fr'] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  nl: 'Nederlands',
  en: 'English',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
};

/** ISO 639-1 lang codes for <html lang=""> */
export const localeHtmlLang: Record<Locale, string> = {
  nl: 'nl',
  en: 'en',
  es: 'es',
  de: 'de',
  fr: 'fr',
};

/** OG locale codes */
export const localeOgTag: Record<Locale, string> = {
  nl: 'nl_NL',
  en: 'en_US',
  es: 'es_ES',
  de: 'de_DE',
  fr: 'fr_FR',
};

/**
 * Country code → locale mapping for geo-detection.
 * Based on Vercel's x-vercel-ip-country header (ISO 3166-1 alpha-2).
 * Countries not listed default to 'en'.
 */
export const countryToLocale: Record<string, Locale> = {
  // Dutch
  NL: 'nl',
  BE: 'nl', // Belgium — could be FR, but Ed's audience is mostly Dutch-speaking
  CW: 'nl', // Curacao
  SR: 'nl', // Suriname
  SX: 'nl', // Sint Maarten
  BQ: 'nl', // Bonaire, Sint Eustatius and Saba
  AW: 'nl', // Aruba

  // German
  DE: 'de',
  AT: 'de',
  CH: 'de', // Switzerland — multilingual, but German is most common
  LI: 'de', // Liechtenstein

  // French
  FR: 'fr',
  MC: 'fr', // Monaco
  LU: 'fr', // Luxembourg
  SN: 'fr', // Senegal
  CI: 'fr', // Ivory Coast
  CM: 'fr', // Cameroon
  BF: 'fr', // Burkina Faso
  ML: 'fr', // Mali
  NE: 'fr', // Niger
  TD: 'fr', // Chad
  GN: 'fr', // Guinea
  BJ: 'fr', // Benin
  TG: 'fr', // Togo
  CF: 'fr', // Central African Republic
  CG: 'fr', // Congo
  CD: 'fr', // DR Congo
  GA: 'fr', // Gabon
  HT: 'fr', // Haiti
  MG: 'fr', // Madagascar

  // Spanish
  ES: 'es',
  MX: 'es',
  AR: 'es',
  CO: 'es',
  CL: 'es',
  PE: 'es',
  VE: 'es',
  EC: 'es',
  GT: 'es',
  CU: 'es',
  BO: 'es',
  DO: 'es',
  HN: 'es',
  PY: 'es',
  SV: 'es',
  NI: 'es',
  CR: 'es',
  PA: 'es',
  UY: 'es',
  PR: 'es',
  GQ: 'es', // Equatorial Guinea
};

/** Get locale for a country code, defaults to 'en' */
export function getLocaleForCountry(countryCode: string): Locale {
  return countryToLocale[countryCode?.toUpperCase()] || 'en';
}

/** Check if a string is a valid locale */
export function isValidLocale(str: string): str is Locale {
  return (locales as readonly string[]).includes(str);
}

/** Get URL prefix for a locale (empty string for default) */
export function getLocalePrefix(locale: Locale): string {
  return locale === defaultLocale ? '' : `/${locale}`;
}

/** Build a localized path */
export function localePath(path: string, locale: Locale): string {
  const prefix = getLocalePrefix(locale);
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${prefix}${cleanPath}`;
}

/** Get all alternate URLs for a path (for hreflang tags) */
export function getAlternateUrls(path: string, site: string): { locale: Locale; href: string }[] {
  const base = site.endsWith('/') ? site.slice(0, -1) : site;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return locales.map(locale => ({
    locale,
    href: `${base}${localePath(cleanPath, locale)}`,
  }));
}
