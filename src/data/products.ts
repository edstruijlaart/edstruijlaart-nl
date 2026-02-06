import type { ImageMetadata } from 'astro';

// Product images
import cdCover from '../assets/shop/gitaarmannen-3-cd-cover.png';
import gm2Poster from '../assets/theater/gitaarmannen-2-bg.png';
import plectrum088 from '../assets/shop/plectrum-088.png';
import plectrum1mm from '../assets/shop/plectrum-1mm.png';

export interface Product {
  slug: string;
  name: string;
  description: string;
  price: number; // in euros
  category: 'video' | 'audio' | 'cd' | 'merchandise' | 'bundle';
  image?: ImageMetadata; // Astro Image import
  badge?: string; // e.g. "Nieuw", "Populair", "Bundel"
  details?: string[];
  digital?: boolean;
  // SumUp Payment Link URL — Ed vult deze in vanuit SumUp dashboard
  buyUrl?: string;
  bundleIncludes?: string[];
  available: boolean;
  // Verzendinfo label voor op de card
  shippingNote?: string;
}

export const products: Product[] = [
  // ─── Video registraties ───
  {
    slug: 'gitaarmannen-3-video',
    name: 'Gitaarmannen 3: John Mayer — Video registratie',
    description: 'De volledige video-opname van de theatershow Gitaarmannen 3: John Mayer. Professioneel opgenomen met meerdere camera\'s.',
    price: 9.99,
    category: 'video',
    image: cdCover,
    badge: 'Populair',
    digital: true,
    buyUrl: 'https://ed-struijlaart.sumupstore.com/product/gitaarmannen-3-john-mayer-videoregistratie',
    details: [
      'Full HD video registratie',
      'Volledige theatershow (~2 uur)',
      'Direct te bekijken na betaling',
      'Link wordt per email verstuurd',
    ],
    shippingNote: 'Direct per email',
    available: true,
  },

  // ─── Audio ───
  {
    slug: 'clapton-unplugged-audio',
    name: 'Gitaarmannen 2: Clapton Unplugged — Audio',
    description: 'De live audio-opname van de theatershow Gitaarmannen 2: Eric Clapton Unplugged.',
    price: 9.99,
    category: 'audio',
    image: gm2Poster,
    digital: true,
    buyUrl: 'https://ed-struijlaart.sumupstore.com/product/gitaarmannen-2-eric-clapton-unplugged',
    details: [
      'Hoge kwaliteit audio (MP3/FLAC)',
      'Volledige theatershow',
      'Download link per email',
    ],
    shippingNote: 'Direct per email',
    available: true,
  },

  // ─── CD + Video bundel ───
  {
    slug: 'gitaarmannen-3-cd',
    name: 'Gitaarmannen 3: John Mayer — CD',
    description: 'De live-opname van Gitaarmannen 3: John Mayer op CD. Inclusief gratis toegang tot de video registratie.',
    price: 14.99,
    category: 'bundle',
    image: cdCover,
    badge: 'CD + Video',
    buyUrl: 'https://ed-struijlaart.sumupstore.com/product/gitaarmannen-3-john-mayer-cd-videoregistratie',
    details: [
      'Fysieke CD met live-opname',
      'Gratis video registratie inbegrepen',
      'Verzending binnen Nederland',
    ],
    bundleIncludes: [
      'CD: Gitaarmannen 3 live-opname',
      'Video: Gitaarmannen 3 registratie (digitaal)',
    ],
    shippingNote: 'Verzendkosten via checkout',
    available: true,
  },

  // ─── Merchandise ───
  {
    slug: 'gitaarmannen-plectrums-088',
    name: 'Gitaarmannen Plectrums — 0.88mm (10 stuks)',
    description: 'Set van 10 Dunlop plectrums met het Gitaarmannen de Podcast logo. Dikte: 0.88mm.',
    price: 9.99,
    category: 'merchandise',
    image: plectrum088,
    buyUrl: 'https://ed-struijlaart.sumupstore.com/product/gitaarmannen-plectrums-0-88mm-10-stuks',
    details: [
      '10 stuks per set',
      'Dunlop plectrums',
      'Dikte: 0.88mm',
      'Gitaarmannen de Podcast logo',
    ],
    shippingNote: 'Verzendkosten via checkout',
    available: true,
  },
  {
    slug: 'gitaarmannen-plectrums-100',
    name: 'Gitaarmannen Plectrums — 1.0mm (10 stuks)',
    description: 'Set van 10 Dunlop plectrums met het Gitaarmannen de Podcast logo. Dikte: 1.0mm.',
    price: 9.99,
    category: 'merchandise',
    image: plectrum1mm,
    buyUrl: 'https://ed-struijlaart.sumupstore.com/product/gitaarmannen-plectrums-1-0mm-10-stuks',
    details: [
      '10 stuks per set',
      'Dunlop plectrums',
      'Dikte: 1.0mm',
      'Gitaarmannen de Podcast logo',
    ],
    shippingNote: 'Verzendkosten via checkout',
    available: true,
  },
];
