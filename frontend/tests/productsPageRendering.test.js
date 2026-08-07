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
  assert.match(productCardSource, /const imageWidth = compact \? 360 : 520/);
  assert.match(productCardSource, /const imageHeight = compact \? 270 : 520/);
  assert.match(productCardSource, /width=\{imageWidth\}/);
  assert.match(productCardSource, /height=\{imageHeight\}/);
});

test('product cards expose responsive Cloudinary candidates and grid-accurate sizes', () => {
  assert.match(productCardSource, /const PRODUCT_CARD_IMAGE_WIDTHS = \[240, 360, 520, 720\]/);
  assert.match(productCardSource, /srcSet=\{productImageSrcSet \|\| undefined\}/);
  assert.match(productCardSource, /\(min-width: 1440px\) 221px/);
  assert.match(productCardSource, /\(min-width: 1024px\) calc\(25vw - 38px\)/);
  assert.match(productCardSource, /\(min-width: 768px\) calc\(33\.333vw - 40px\)/);
  assert.match(productCardSource, /\(min-width: 640px\) calc\(50vw - 46px\)/);
  assert.match(productCardSource, /\(min-width: 1536px\) 364px/);
  assert.match(productCardSource, /COMPACT_PRODUCT_CARD_IMAGE_SIZES : PRODUCT_CARD_IMAGE_SIZES/);
});

test('product cards retain native loading priority without JavaScript-driven image state', () => {
  assert.match(productCardSource, /loading=\{priority \? 'eager' : 'lazy'\}/);
  assert.match(productCardSource, /fetchPriority=\{priority \? 'high' : 'auto'\}/);
  assert.match(productCardSource, /decoding="async"/);
  assert.match(productCardSource, /crop: 'fill',\s*dpr: false/);
  assert.doesNotMatch(productCardSource, /useState\([^)]*image/i);
  assert.doesNotMatch(productCardSource, /new Image\(/);
});
