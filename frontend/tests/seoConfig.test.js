import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PUBLIC_ROUTE_SEO,
  buildCanonicalUrl,
  getPublicRouteSeo,
  isNoIndexPath,
} from '../src/utils/seoConfig.js';
import { injectSeoHead } from '../server/seoResponse.js';

test('SEO routes use the canonical apex storefront domain', () => {
  assert.equal(buildCanonicalUrl('/'), 'https://apexfashion.lk/');
  assert.equal(buildCanonicalUrl('/products/'), 'https://apexfashion.lk/products');
  assert.equal(getPublicRouteSeo('/products').title.includes('Shoes'), true);
  assert.equal(Object.keys(PUBLIC_ROUTE_SEO).includes('/shipping'), true);
});

test('private and transactional routes are noindex routes', () => {
  assert.equal(isNoIndexPath('/checkout'), true);
  assert.equal(isNoIndexPath('/orders/abc/invoice'), true);
  assert.equal(isNoIndexPath('/admin/products/new'), true);
  assert.equal(isNoIndexPath('/products'), false);
  assert.equal(isNoIndexPath('/category/women'), false);
});

test('server-rendered metadata replaces generic head tags without duplicates', () => {
  const source = `<!doctype html><html><head><title>Old</title><meta name="description" content="Old"><link rel="canonical" href="https://old.example/"></head><body><div id="root"></div></body></html>`;
  const html = injectSeoHead(source, {
    title: 'Women Shoes in Sri Lanka | Apex Fashion',
    description: 'Shop women shoes online in Sri Lanka.',
    canonicalUrl: '/category/women-shoes',
    ogImage: 'https://images.example/shoes.jpg',
    structuredData: { '@context': 'https://schema.org', '@type': 'CollectionPage' },
  });

  assert.match(html, /<title>Women Shoes in Sri Lanka \| Apex Fashion<\/title>/);
  assert.match(html, /https:\/\/apexfashion\.lk\/category\/women-shoes/);
  assert.match(html, /https:\/\/images\.example\/shoes\.jpg/);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.equal((html.match(/application\/ld\+json/g) || []).length, 1);
});

test('server-rendered metadata keeps apostrophes readable in descriptions', () => {
  const source = `<!doctype html><html><head><title>Old</title></head><body><div id="root"></div></body></html>`;
  const description =
    'Shop women\'s and men\'s fashion, shoes, dresses, handbags, watches, perfumes, and accessories online across Sri Lanka at Apex Fashion.';
  const html = injectSeoHead(source, {
    title: 'Online Fashion Store Sri Lanka | Apex Fashion',
    description,
    canonicalUrl: '/',
  });

  assert.match(html, /<meta name="description" content="Shop women's and men's fashion/);
  assert.doesNotMatch(html, /women(?:&#039;|&#39;|&apos;)s and men(?:&#039;|&#39;|&apos;)s/);
});
