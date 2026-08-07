import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  HOME_HERO_PRELOADS,
  renderHomeHeroPreloads,
} from '../scripts/homeHeroPreloads.mjs';
import {
  HOME_HERO_BACKGROUND_IMAGES,
  HOME_HERO_DESKTOP_MEDIA,
  HOME_HERO_MOBILE_MEDIA,
  HOME_MOBILE_HERO_BACKGROUND_IMAGES,
  HOME_MOBILE_HERO_MARK,
} from '../src/utils/homeHeroAssets.js';

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const sharedHtml = await readSource('../index.html');
const homePageSource = await readSource('../src/pages/HomePage.jsx');
const productsPageSource = await readSource('../src/pages/ProductsPage.jsx');
const productCardSource = await readSource('../src/components/Product.jsx');
const productRenderSource = await readSource('../api/render.js');
const seoGeneratorSource = await readSource('../scripts/generateSeoPages.mjs');
const frontendVercelConfig = JSON.parse(await readSource('../vercel.json'));
const rootVercelConfig = JSON.parse(await readSource('../../vercel.json'));

const HERO_ASSET_URLS = HOME_HERO_PRELOADS.map(({ href }) => href);
const homePictureMarkup = [...homePageSource.matchAll(/<picture[\s\S]*?<\/picture>/g)].map(
  ([markup]) => markup
);
const mobileHeroMarkMarkup = homePictureMarkup.find((markup) => (
  markup.includes('HOME_MOBILE_HERO_MARK')
)) || '';
const mobileHeroMarkImageMarkup = mobileHeroMarkMarkup.match(/<img[\s\S]*?\/>/)?.[0] || '';

test('the shared application shell contains no Home hero preload declarations', () => {
  assert.doesNotMatch(sharedHtml, /<link[^>]+rel=["']preload["'][^>]+(?:hero-bg|hero-mobile|mobile-hero)/i);
  HERO_ASSET_URLS.forEach((url) => {
    assert.doesNotMatch(sharedHtml, new RegExp(`rel=["']preload["'][^>]+${url.replaceAll('/', '\\/')}`));
  });
});

test('Home receives the existing hero assets as media-scoped high-priority preloads', () => {
  const markup = renderHomeHeroPreloads('/');

  assert.deepEqual(HOME_HERO_PRELOADS, [
    { href: HOME_MOBILE_HERO_MARK, media: HOME_HERO_MOBILE_MEDIA },
    { href: HOME_MOBILE_HERO_BACKGROUND_IMAGES[0], media: HOME_HERO_MOBILE_MEDIA },
    { href: HOME_HERO_BACKGROUND_IMAGES[0], media: HOME_HERO_DESKTOP_MEDIA },
  ]);
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
  assert.match(seoGeneratorSource, /renderHtml\('\/', PUBLIC_ROUTE_SEO\['\/'\]\)/);
  assert.doesNotMatch(seoGeneratorSource, /renderHtml\('\/home'/);
  assert.doesNotMatch(
    seoGeneratorSource,
    /writeFile\(path\.join\(distDirectory, 'index\.html'\), renderHtml\('\/'/
  );
});

test('Product Details continues to render from the preload-free shared shell', () => {
  assert.match(productRenderSource, /fetch\(`\$\{origin\}\/index\.html`/);
  assert.equal(renderHomeHeroPreloads('/product/example-123456789012345678901234'), '');
  assert.doesNotMatch(sharedHtml, /data-home-hero-preload/);
});

test('an exact pre-filesystem route serves the generated Home document at the public root URL', () => {
  [frontendVercelConfig, rootVercelConfig].forEach((config) => {
    assert.deepEqual(config.routes?.[0], { src: '^/$', dest: '/home/index.html' });
    assert.equal(config.rewrites.some((rewrite) => rewrite.source === '/'), false);
    assert.equal(
      config.redirects.some(
        (redirect) => redirect.source === '/' || redirect.destination?.startsWith('/home')
      ),
      false
    );
  });

  const productsRewrite = frontendVercelConfig.rewrites.find(
    (rewrite) => rewrite.source === '/products'
  );
  assert.equal(productsRewrite?.destination, '/products/index.html');
  assert.match(seoGeneratorSource, /renderHtml\(route, seo\)/);
});

test('Home hero resources retain native priority and the legitimate mobile mark', () => {
  assert.match(mobileHeroMarkMarkup, /media=\{HOME_HERO_MOBILE_MEDIA\}/);
  assert.match(mobileHeroMarkMarkup, /srcSet=\{HOME_MOBILE_HERO_MARK\}/);
  assert.doesNotMatch(mobileHeroMarkImageMarkup, /\bsrc(?:Set)?=/);
  assert.match(mobileHeroMarkImageMarkup, /fetchPriority="high"/);
  assert.match(mobileHeroMarkImageMarkup, /className="[^"]+md:hidden"/);
  assert.match(homePageSource, /fetchPriority=\{activeHeroImage === 0 \? 'high' : 'auto'\}/);
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
