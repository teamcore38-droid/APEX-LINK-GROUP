export const HOME_HERO_MOBILE_MEDIA = '(max-width: 767px)';
export const HOME_HERO_DESKTOP_MEDIA = '(min-width: 768px)';

export const HOME_HERO_BACKGROUND_IMAGES = Array.from(
  { length: 5 },
  (_, index) => `/hero/hero-bg-${index + 1}.webp`
);

export const HOME_MOBILE_HERO_BACKGROUND_IMAGES = Array.from(
  { length: 5 },
  (_, index) => `/hero/hero-mobile-${index + 1}.webp`
);

export const HOME_MOBILE_HERO_MARK = '/apex-fashion-mobile-hero-512.webp';

export const HOME_HERO_PRELOADS = [
  {
    href: HOME_MOBILE_HERO_MARK,
    media: HOME_HERO_MOBILE_MEDIA,
  },
  {
    href: HOME_MOBILE_HERO_BACKGROUND_IMAGES[0],
    media: HOME_HERO_MOBILE_MEDIA,
  },
  {
    href: HOME_HERO_BACKGROUND_IMAGES[0],
    media: HOME_HERO_DESKTOP_MEDIA,
  },
];
