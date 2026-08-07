export const HOME_HERO_PRELOADS = [
  {
    href: '/apex-fashion-mobile-hero-512.webp',
    media: '(max-width: 767px)',
  },
  {
    href: '/hero/hero-mobile-1.webp',
    media: '(max-width: 767px)',
  },
  {
    href: '/hero/hero-bg-1.webp',
    media: '(min-width: 768px)',
  },
];

export const renderHomeHeroPreloads = (route) => {
  if (route !== '/') {
    return '';
  }

  return HOME_HERO_PRELOADS.map(
    ({ href, media }) =>
      `<link rel="preload" as="image" href="${href}" type="image/webp" media="${media}" fetchpriority="high" data-home-hero-preload="true" />`
  ).join('\n    ');
};
