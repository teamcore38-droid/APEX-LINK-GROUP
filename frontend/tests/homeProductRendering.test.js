import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const homePageSource = await readFile(
  new URL('../src/pages/HomePage.jsx', import.meta.url),
  'utf8'
);
const categoryPageSource = await readFile(
  new URL('../src/pages/CategoryPage.jsx', import.meta.url),
  'utf8'
);
const productCardSource = await readFile(
  new URL('../src/components/Product.jsx', import.meta.url),
  'utf8'
);

test('Home publishes fetched product collections without a manual image-preload dependency', () => {
  assert.doesNotMatch(homePageSource, /imagePreloader/);
  assert.doesNotMatch(homePageSource, /preloadProductGridImages/);
  assert.match(
    homePageSource,
    /const publishProducts = \(collection, products\) => \{\s*if \(!isActive\) \{\s*return;\s*\}\s*const setCollectionState = collection === 'featured' \? setFeaturedState : setBestSellersState;\s*setCollectionState\(\{ products, loading: false, error: null \}\);/
  );
});

test('Home keeps hero-gated, deduplicated product requests and native product-card priority', () => {
  assert.match(homePageSource, /if \(!heroContentReady\) \{\s*return undefined;/);
  assert.match(homePageSource, /window\.requestIdleCallback\(startProductRequests, \{ timeout: 1200 \}\)/);
  assert.match(homePageSource, /void getHomepageProducts\('featured'\)/);
  assert.match(homePageSource, /void getHomepageProducts\('bestSellers'\)/);
  assert.match(homePageSource, /priority=\{prioritizeProductImages && index < initialImageCounts\.bestSellers\}/);
  assert.match(productCardSource, /loading=\{priority \? 'eager' : 'lazy'\}/);
  assert.match(productCardSource, /fetchPriority=\{priority \? 'high' : 'auto'\}/);
});

test('Category pages retain their independent non-blocking product image preloading', () => {
  assert.match(categoryPageSource, /void preloadProductGridImages\(payload\.products, 4\)/);
  assert.doesNotMatch(categoryPageSource, /await preloadProductGridImages/);
});
