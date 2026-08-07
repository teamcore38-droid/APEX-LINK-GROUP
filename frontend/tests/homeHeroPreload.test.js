import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  HOME_HERO_PRELOADS,
  renderHomeHeroPreloads,
} from '../scripts/homeHeroPreloads.mjs';

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const sharedHtml = await readSource('../index.html');
const homePageSource = await readSource('../src/pages/HomePage.jsx');
const productsPageSource = await readSource('../src/pages/ProductsPage.jsx');
const productCardSource = await readSource('../src/components/Product.jsx');
const seoGeneratorSource = await readSource('../scripts/generateSeoPages.mjs');
const frontendVercelConfig = JSON.parse(await readSource('../vercel.json'));
const rootVercelConfig = JSON.parse(await readSource('../../vercel.json'));

const HERO_ASSET_URLS = [
  '/apex-fashion-mobile-hero-512.webp',
  '/hero/hero-mobile-1.webp',
  '/hero/hero-bg-1.webp',
];

test('the shared application shell contains no Home hero preload declarations', () => {
  assert.doesNotMatch(sharedHtml, /<link[^>]+rel=["']preload["'][^>]+(?:hero-bg|hero-mobile|mobile-hero)/i);
  HERO_ASSET_URLS.forEach((url) => {
    assert.doesNotMatch(sharedHtml, new RegExp(`rel=["']preload["'][^>]+${url.replaceAll('/', '\\/')}`));
  });
});

test('Home receives the existing hero assets as media-scoped high-priority preloads', () => {
  const markup = renderHomeHeroPreloads('/');

  assert.equal(HOME_HERO_PRELOADS.length, 3);
  HERO_ASSET_URLS.forEach((url) => assert.match(markup, new RegExp(url.replaceAll('/', '\\/'))));
  assert.equal((markup.match(/media="\(max-width: 767px\)"/g) || []).length, 2);
  assert.equal((markup.match(/media="\(min-width: 768px\)"/g) || []).length, 1);
  assert.equal((markup.match(/fetchpriority="high"/g) || []).length, 3);
});

test('Shop and other non-Home documents never receive Home hero preload markup', () => {
  [
    '/products',
    '/shop',
    '/product/example-123456789012345678901234',
    '/category/women',
    '/login',
    '/cart',
    '/checkout',
    '/contact',
    '/track-order',
    '/profile',
    '/admin',
  ].forEach((route) => assert.equal(renderHomeHeroPreloads(route), ''));
});

test('the SEO build keeps a preload-free shell and emits a dedicated Home document', () => {
  assert.match(seoGeneratorSource, /const homeHeroPreloads = renderHomeHeroPreloads\(route\)/);
  assert.match(seoGeneratorSource, /const homeOutputDirectory = path\.join\(distDirectory, 'home'\)/);
  assert.doesNotMatch(
    seoGeneratorSource,
    /writeFile\(path\.join\(distDirectory, 'index\.html'\), renderHtml\('\/'/
  );
});

test('only the root route is rewritten to the generated Home document', () => {
  [frontendVercelConfig, rootVercelConfig].forEach((config) => {
    const rootRewrite = config.rewrites.find((rewrite) => rewrite.source === '/');
    assert.equal(rootRewrite?.destination, '/home/index.html');
  });

  const productsRewrite = frontendVercelConfig.rewrites.find(
    (rewrite) => rewrite.source === '/products'
  );
  assert.equal(productsRewrite?.destination, '/products/index.html');
  assert.match(seoGeneratorSource, /renderHtml\(route, seo\)/);
});

test('Home hero URLs, responsive visibility, and native priority remain unchanged', () => {
  assert.match(homePageSource, /`\/hero\/hero-bg-\$\{index \+ 1\}\.webp`/);
  assert.match(homePageSource, /`\/hero\/hero-mobile-\$\{index \+ 1\}\.webp`/);
  assert.match(homePageSource, /src="\/apex-fashion-mobile-hero-512\.webp"/);
  assert.match(homePageSource, /fetchPriority=\{activeHeroImage === 0 \? 'high' : 'auto'\}/);
  assert.match(homePageSource, /className="hero-bg-crossfade[^"']+md:hidden"/);
  assert.match(homePageSource, /className="hero-bg-crossfade[^"']+hidden[^"']+md:block"/);
});

test('completed Shop and product-card performance flows remain protected', () => {
  assert.doesNotMatch(productsPageSource, /preloadProductGridImages/);
  assert.match(
    productsPageSource,
    /const payload = normalizeProductPayload\(data\);\s*setProducts\(payload\.products\);/
  );
  assert.match(productCardSource, /srcSet=\{productImageSrcSet \|\| undefined\}/);
  assert.match(productCardSource, /const PRODUCT_CARD_IMAGE_WIDTHS = \[240, 360, 520, 720\]/);
});
