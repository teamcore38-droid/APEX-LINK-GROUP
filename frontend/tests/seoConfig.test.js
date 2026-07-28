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
  assert.equal(isNoIndexPath('/checkout/payment'), true);
  assert.equal(isNoIndexPath('/orders/abc/invoice'), true);
  assert.equal(isNoIndexPath('/admin/products/new'), true);
  assert.equal(isNoIndexPath('/account/settings'), true);
  assert.equal(isNoIndexPath('/cart'), true);
  assert.equal(isNoIndexPath('/login'), true);
  assert.equal(isNoIndexPath('/register'), true);
});

test('public SEO landing pages are indexable routes', () => {
  assert.equal(isNoIndexPath('/'), false);
  assert.equal(isNoIndexPath('/products'), false);
  assert.equal(isNoIndexPath('/product/example-123456789012345678901234'), false);
  assert.equal(isNoIndexPath('/categories'), false);
  assert.equal(isNoIndexPath('/category/women'), false);
  assert.equal(isNoIndexPath('/about'), false);
  assert.equal(isNoIndexPath('/contact'), false);
  assert.equal(isNoIndexPath('/faq'), false);
  assert.equal(isNoIndexPath('/shipping'), false);
  assert.equal(isNoIndexPath('/returns'), false);
  assert.equal(isNoIndexPath('/payment-policy'), false);
  assert.equal(isNoIndexPath('/privacy'), false);
  assert.equal(isNoIndexPath('/cookies'), false);
  assert.equal(isNoIndexPath('/terms'), false);
  assert.equal(isNoIndexPath('/rfq'), false);
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

test('server-rendered category metadata includes breadcrumb and item list JSON-LD', () => {
  const source = `<!doctype html><html><head><title>Old</title></head><body><div id="root"></div></body></html>`;
  const html = injectSeoHead(source, {
    title: 'Women Shoes Online in Sri Lanka | Apex Fashion',
    description: 'Shop Women Shoes online in Sri Lanka.',
    canonicalUrl: '/category/women-shoes',
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': 'https://apexfashion.lk/category/women-shoes#collection',
    },
    breadcrumbs: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://apexfashion.lk/' },
        { '@type': 'ListItem', position: 2, name: 'Women Shoes', item: 'https://apexfashion.lk/category/women-shoes' },
      ],
    },
    itemList: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Block Heel Sandals',
          url: 'https://apexfashion.lk/product/block-heel-sandals-123456789012345678901234',
        },
      ],
    },
  });

  assert.equal((html.match(/application\/ld\+json/g) || []).length, 3);
  assert.match(html, /"@type":"CollectionPage"/);
  assert.match(html, /"@type":"BreadcrumbList"/);
  assert.match(html, /"@type":"ItemList"/);
  assert.match(html, /"position":1/);
});

test('server-rendered public catalog metadata emits indexable robots tags', () => {
  const source = `<!doctype html><html><head><title>Old</title><meta name="robots" content="noindex"></head><body><div id="root"></div></body></html>`;
  const html = injectSeoHead(source, {
    title: 'Women Online in Sri Lanka | Apex Fashion',
    description: 'Shop Women online in Sri Lanka.',
    canonicalUrl: '/category/women',
  });

  assert.match(html, /<meta name="robots" content="index,follow" \/>/);
  assert.match(html, /<meta name="googlebot" content="index,follow" \/>/);
  assert.doesNotMatch(html, /noindex/i);
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
