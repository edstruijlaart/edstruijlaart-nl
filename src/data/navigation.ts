export interface NavItem {
  label: string;
  href: string;
}

export const mainNav: NavItem[] = [
  { label: 'Home', href: '/' },
  { label: 'Over Ed', href: '/about/' },
  { label: 'Podcasts', href: '/podcasts/' },
  { label: 'Theater', href: '/tour/' },
  { label: 'Huiskamerconcerten', href: '/huiskamerconcerten/' },
  { label: 'Muziek', href: '/music/' },
  { label: 'Blog', href: '/blog/' },
  { label: 'Contact', href: '/contact/' },
  { label: 'Shop', href: '/shop/' },
];

export const footerNav: NavItem[] = [
  { label: 'Over Ed', href: '/about/' },
  { label: 'Theater', href: '/tour/' },
  { label: 'Huiskamerconcerten', href: '/huiskamerconcerten/' },
  { label: 'Muziek', href: '/music/' },
  { label: 'Podcasts', href: '/podcasts/' },
  { label: 'Blog', href: '/blog/' },
  { label: 'Contact', href: '/contact/' },
];
