import { HOME_HERO_PRELOADS } from '../src/utils/homeHeroAssets.js';

export { HOME_HERO_PRELOADS };

export const renderHomeHeroPreloads = (route) => {
  if (route !== '/') {
    return '';
  }

  return HOME_HERO_PRELOADS.map(
    ({ href, media }) =>
      `<link rel="preload" as="image" href="${href}" type="image/webp" media="${media}" fetchpriority="high" data-home-hero-preload="true" />`
  ).join('\n    ');
};
