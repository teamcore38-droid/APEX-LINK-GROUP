import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const productsPageSource = await readFile(
  new URL('../src/pages/ProductsPage.jsx', import.meta.url),
  'utf8'
);
const productCardSource = await readFile(
  new URL('../src/components/Product.jsx', import.meta.url),
  'utf8'
);

const assertShopHasNoImagePreloadDependency = () => {
  assert.doesNotMatch(productsPageSource, /imagePreloader/);
  assert.doesNotMatch(productsPageSource, /preloadProductGridImages/);
};

test('Shop publishes the first product page immediately after normalizing the API response', () => {
  assert.match(
    productsPageSource,
    /const payload = normalizeProductPayload\(data\);\s*setProducts\(payload\.products\);/
  );
});

test('a failed image preload cannot block Shop product rendering', () => {
  assertShopHasNoImagePreloadDependency();
});

test('a slow or never-resolving image preload cannot block Shop product rendering', () => {
  assertShopHasNoImagePreloadDependency();
});

test('Shop load-more pagination publishes and deduplicates products without image preload gating', () => {
  assert.match(productsPageSource, /const nextPage = meta\.currentPage \+ 1/);
  assert.match(
    productsPageSource,
    /const payload = normalizeProductPayload\(data\);\s*setProducts\(\(currentProducts\) => \{\s*const seenProductIds/
  );
  assert.match(
    productsPageSource,
    /const nextProducts = payload\.products\.filter\(\(product\) => !seenProductIds\.has\(product\._id\)\)/
  );
});

test('Shop requests preserve filters, sorting, page size, pagination, and stale-request guards', () => {
  assert.match(productsPageSource, /params: \{\s*\.\.\.filters,\s*page: 1,\s*limit: PRODUCT_PAGE_SIZE/);
  assert.match(productsPageSource, /params: \{\s*\.\.\.filters,\s*page: nextPage,\s*limit: PRODUCT_PAGE_SIZE/);
  assert.match(productsPageSource, /queryVersionRef\.current !== requestVersion/);
  assert.match(productsPageSource, /\}, \[filters\]\);/);
  assert.match(productsPageSource, /PRODUCT_PRICE_SORT_OPTIONS/);
});

test('product cards keep a reserved responsive image area while images load independently', () => {
  assert.match(productCardSource, /compact \? 'aspect-\[4\/3\]' : 'aspect-square sm:aspect-\[4\/3\]'/);
  assert.match(productCardSource, /width=\{compact \? 360 : 520\}/);
  assert.match(productCardSource, /height=\{compact \? 270 : 520\}/);
});
