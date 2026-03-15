export interface Single {
  title: string;
  spotifyId: string;
  year: number;
  featured?: boolean;
  localArtwork?: string;
  story?: string;
  featuring?: string;
}

export interface Album {
  slug: string;
  title: string;
  year: number;
  producer: string;
  label?: string;
  description: string;
  tracks: string[];
  localArtwork: string;
  spotifyId: string;
}

export const platinumSingle = {
  title: 'Make It On Your Own',
  spotifyId: '6g3h5Me9cAPMZVlGWZbXlN',
  year: 2018,
  streams: '26M+',
  localArtwork: 'make-it-on-your-own.png',
  story:
    'Geschreven voor dochter Lizzy. Een lied over loslaten en vertrouwen dat het goed komt. Kwam op de playlist van NPO Radio 1, 2 en 5 en groeide uit tot een platina hit met meer dan 26 miljoen streams op Spotify.',
};

export const featuredSingles: Single[] = [
  {
    title: 'Same Heart',
    spotifyId: '0eSP9vw73vQzohA5tIOyOf',
    year: 2024,
    featured: true,
    localArtwork: 'same-heart.png',
    story:
      'Een liedje over verbinding, over mensen die hetzelfde voelen ondanks alle verschillen.',
  },
  {
    title: 'I Could Be Wrong',
    spotifyId: '1PkvInIcaxRagzStMGVAi5',
    year: 2024,
    featured: true,
    story:
      'Soms weet je het even niet meer. Dit nummer gaat over twijfel, kwetsbaarheid, en toch doorgaan.',
  },
];

export const albums: Album[] = [
  {
    slug: 'head-heart-hands',
    title: 'Head, Heart & Hands',
    year: 2012,
    producer: 'Huub Reijnders',
    description:
      'In 2010 gaf Ed zijn baan en alles op om vol voor de muziek te gaan. Zijn droom najagen. Dit debuutalbum is het resultaat: twaalf songs over dat moment van alles loslaten en opnieuw beginnen. Opgenomen met producer Huub Reijnders.',
    tracks: [
      'Head, Heart and Hands',
      'Woman (Stuck in the Middle)',
      'Iron Lady',
      'Deeper in Love',
      'Face Down',
      'All I Know',
      'Let Me Lose from My Body',
      'So Not You, So Not Me',
      'Dream About the Sunlight',
      'Anything',
      'Soulseeker',
      'Putting Out the Light',
    ],
    localArtwork: 'head-heart-hands.jpg',
    spotifyId: '027fn1H1Fh6aATZawAf0tj',
  },
  {
    slug: 'closer-than-skin',
    title: 'Closer Than Skin',
    year: 2014,
    producer: 'Carey Willetts',
    label: 'GreyTown Recordings',
    description:
      'Voor zijn tweede album trok Ed naar Londen om te werken met producer Carey Willetts, bekend van zijn werk met Athlete en Dermot Kennedy. Elf songs opgenomen met Londense muzikanten. Een plaat die verder gaat dan het debuut, met meer durf en experiment.',
    tracks: [
      'Never',
      'Heart of Stone',
      'Hotel Bar',
      'Carry You Home',
      'FOMO',
      'Home',
      'House on Fire',
      'Time Is on Our Side',
      'The Way It Is',
      'Revelation Radio',
      'Closer Than Skin',
    ],
    localArtwork: 'closer-than-skin.jpg',
    spotifyId: '2fOJISt1f9PwTgv7ult06w',
  },
];

// Alle singles, chronologisch van nieuw naar oud (volgorde playlist)
export const allSingles: Single[] = [
  { title: 'Same Heart', spotifyId: '0eSP9vw73vQzohA5tIOyOf', year: 2024 },
  { title: 'I Could Be Wrong', spotifyId: '1PkvInIcaxRagzStMGVAi5', year: 2024 },
  { title: 'All We Need', spotifyId: '6M7IyHyAWnRIVIjqcnjhAO', year: 2024 },
  { title: 'Move On', spotifyId: '5rSlV6fa4MoMC5SW9GD7sk', year: 2024 },
  { title: 'Long Lost Friend', spotifyId: '24T46JXfdsD3prLYBMGp8p', year: 2023 },
  { title: 'Mooi Geweest', spotifyId: '5o2faEX74VH3rc1gKB6nx1', year: 2023, featuring: 'De Troubadours' },
  { title: 'Alles Op Rood', spotifyId: '640Tv4ivHkJFITjTxy30tl', year: 2023 },
  { title: 'Voor Jou', spotifyId: '5JYgVBXWzZGIL28gts9WxV', year: 2023 },
  { title: 'Alles Komt Weer Goed', spotifyId: '2ypLSKiaBw8ahLM6iRdugA', year: 2022 },
  { title: 'Next to Me', spotifyId: '3ouwgDCOXNorYiPg1JkMzv', year: 2022 },
  { title: 'What I Like About You', spotifyId: '6u1Y6oD4yR4cczJQXVq6xd', year: 2023 },
  { title: 'De Tijd Dat Alles Kon en Mocht', spotifyId: '2TAVf0KuusUEo4r8j7QU9z', year: 2021 },
  { title: 'Guitar', spotifyId: '0ft0sUVi6HTWQ8kcx5xrsd', year: 2018 },
  { title: 'Top Of The World', spotifyId: '53scBCTmHWDMVPDawdr2Qh', year: 2019, featuring: 'Giraff' },
  { title: 'Make It On Your Own (Giraff Remix)', spotifyId: '49e19YXr4Zn1RbUnFw9nJ4', year: 2019, featuring: 'Giraff' },
  { title: 'Make It On Your Own', spotifyId: '6g3h5Me9cAPMZVlGWZbXlN', year: 2018 },
  { title: 'Like December (Xmas Edit)', spotifyId: '6hNVQv4zDLjgvlKdZlOk4S', year: 2017 },
  { title: 'Gold', spotifyId: '0SOP22uTOajgHTjpENEsk1', year: 2016 },
  { title: 'Made of Stars', spotifyId: '4tclBV6YdW8ImSvryUbhoN', year: 2016, featuring: 'Lisa Lois' },
  { title: 'Tricks up My Sleeve', spotifyId: '6YfLbTV5KsX1maQsuwI473', year: 2015 },
  { title: 'House on Fire', spotifyId: '0K0qjhBnNctS7T1YWBDbjd', year: 2014 },
  { title: 'Heart of Stone', spotifyId: '1m6hugwLGWKV7mdpIpGy00', year: 2014 },
  { title: 'Never', spotifyId: '61RaAOAhn7HIhsXLzT5uzy', year: 2014 },
  { title: 'Viva La Vida (Live @ GIEL)', spotifyId: '2IznLcZBM7V9Erq2DpdeQK', year: 2013, featuring: 'Dario Fo' },
  { title: 'Deeper In Love', spotifyId: '1JM6yM2paVvezcFEvxfpkM', year: 2012 },
  { title: 'Anything', spotifyId: '2lGN0nWWY9JKZ2vg57fcwu', year: 2012 },
  { title: 'Woman (Stuck In The Middle)', spotifyId: '25O4U7Zva0U8YrEjnugpbG', year: 2012 },
  { title: 'So Not You, So Not Me', spotifyId: '2HDuuJsxJTQOCgcdGkpxx8', year: 2012 },
  { title: 'Face Down', spotifyId: '2xdr4q1IcqdjmuZNDSyKsS', year: 2012 },
];

export const spotifyPlaylistId = '5ZoRiQK1FP8OXrKRuPp56J';
