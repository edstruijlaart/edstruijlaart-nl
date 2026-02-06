export interface Album {
  slug: string;
  title: string;
  year: string;
  description: string;
  image: string;
}

export const albums: Album[] = [
  {
    slug: 'closer-than-skin',
    title: 'Closer Than Skin',
    year: '2019',
    description: 'Het debuutalbum van Ed Struijlaart. Tien persoonlijke songs over liefde, verlies en alles daartussen.',
    image: 'closer-than-skin.jpg',
  },
  {
    slug: 'head-heart-hands',
    title: 'Head, Heart & Hands',
    year: '2017',
    description: 'De EP die alles in gang zette. Vijf tracks die de basis legden voor Ed als solo-artiest.',
    image: 'head-heart-hands.jpg',
  },
  {
    slug: 'what-i-like-about-you',
    title: 'What I Like About You',
    year: '2023',
    description: 'Single.',
    image: 'closer-than-skin.jpg',
  },
];
