import nl from './nl';
import en from './en';
import es from './es';
import de from './de';
import fr from './fr';
import type { Locale } from '../config';
import type { TranslationKeys } from './nl';

// Cast needed because nl uses `as const` (readonly literals), while TranslationKeys widens to string
export const translations = { nl, en, es, de, fr } as Record<Locale, TranslationKeys>;

export type { TranslationKeys } from './nl';
