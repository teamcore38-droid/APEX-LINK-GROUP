import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  HOME_HERO_BACKGROUND_IMAGES,
  HOME_HERO_DESKTOP_MEDIA,
  HOME_HERO_MOBILE_MEDIA,
  HOME_HERO_PRELOADS,
  HOME_MOBILE_HERO_BACKGROUND_IMAGES,
  HOME_MOBILE_HERO_MARK,
} from '../src/utils/homeHeroAssets.js';

const homePageSource = await readFile(
  new URL('../src/pages/HomePage.jsx', import.meta.url),
  'utf8'
);

const pictureMarkup = [...homePageSource.matchAll(/<picture[\s\S]*?<\/picture>/g)].map(
  ([markup]) => markup
);
const responsiveBackgroundMarkup = pictureMarkup[0] || '';
const mobileHeroMarkMarkup = pictureMarkup.find((markup) => (
  markup.includes('HOME_MOBILE_HERO_MARK')
)) || '';
const mobileHeroMarkImageMarkup = mobileHeroMarkMarkup.match(/<img[\s\S]*?\/>/)?.[0] || '';

test('Home uses one native responsive picture for mutually exclusive hero backgrounds', () => {
  assert.notEqual(responsiveBackgroundMarkup, '');
  assert.equal((responsiveBackgroundMarkup.match(/<img\b/g) || []).length, 1);
  assert.match(responsiveBackgroundMarkup, /media=\{HOME_HERO_DESKTOP_MEDIA\}/);
  assert.match(responsiveBackgroundMarkup, /srcSet=\{heroBackgroundImages\[/);
  assert.match(responsiveBackgroundMarkup, /media=\{HOME_HERO_MOBILE_MEDIA\}/);
  assert.match(responsiveBackgroundMarkup, /srcSet=\{mobileHeroBackgroundImages\[/);
  assert.match(responsiveBackgroundMarkup, /src=\{mobileHeroBackgroundImages\[/);
});

test('responsive background selection no longer relies on CSS-hidden duplicate images', () => {
  assert.equal((homePageSource.match(/className="hero-bg-crossfade/g) || []).length, 1);
  assert.doesNotMatch(responsiveBackgroundMarkup, /md:hidden/);
  assert.doesNotMatch(responsiveBackgroundMarkup, /hidden[^"']+md:block/);
  assert.doesNotMatch(homePageSource, /mobileHeroBackgroundRef|desktopHeroBackgroundRef/);
});

test('Home preload URLs and media exactly match the first responsive hero resources', () => {
  assert.deepEqual(HOME_HERO_PRELOADS, [
    { href: HOME_MOBILE_HERO_MARK, media: HOME_HERO_MOBILE_MEDIA },
    { href: HOME_MOBILE_HERO_BACKGROUND_IMAGES[0], media: HOME_HERO_MOBILE_MEDIA },
    { href: HOME_HERO_BACKGROUND_IMAGES[0], media: HOME_HERO_DESKTOP_MEDIA },
  ]);
});

test('the separate hero mark remains a high-priority mobile-only picture candidate', () => {
  assert.equal(HOME_MOBILE_HERO_MARK, '/apex-fashion-mobile-hero-512.webp');
  assert.notEqual(mobileHeroMarkMarkup, '');
  assert.match(mobileHeroMarkMarkup, /media=\{HOME_HERO_MOBILE_MEDIA\}/);
  assert.match(mobileHeroMarkMarkup, /srcSet=\{HOME_MOBILE_HERO_MARK\}/);
  assert.match(mobileHeroMarkImageMarkup, /fetchPriority="high"/);
  assert.match(mobileHeroMarkImageMarkup, /width="512"/);
  assert.match(mobileHeroMarkImageMarkup, /height="512"/);
  assert.match(mobileHeroMarkImageMarkup, /className="[^"]+md:hidden"/);
  assert.doesNotMatch(responsiveBackgroundMarkup, /HOME_MOBILE_HERO_MARK/);
});

test('desktop resource selection has no unconditional mobile hero mark URL', () => {
  assert.doesNotMatch(mobileHeroMarkMarkup, /media=\{HOME_HERO_DESKTOP_MEDIA\}/);
  assert.doesNotMatch(mobileHeroMarkImageMarkup, /\bsrc(?:Set)?=/);
});
