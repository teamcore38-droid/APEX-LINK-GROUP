import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(
  new URL('../src/pages/CategoryPage.jsx', import.meta.url),
  'utf8'
);

test('category transitions keep the existing page and products visible', () => {
  assert.match(source, /if \(loadingCategory && !category\)/);
  assert.doesNotMatch(source, /setProducts\(\[\]\)/);
  assert.match(
    source,
    /const isRefreshingProductGrid = \(loadingCategory \|\| loadingProducts\) && products\.length > 0/
  );
  assert.match(source, /loadingProducts && products\.length === 0/);
});

test('category and product requests cancel stale transitions', () => {
  assert.match(source, /categoryRequestVersionRef/);
  assert.match(source, /axios\.get\(`\/api\/categories\/\$\{categoryLeafSlug\}`,\s*\{/);
  assert.match(source, /params: \{ path: categoryPath \}/);
  assert.match(source, /signal: controller\.signal/);
  assert.match(source, /return \(\) => \{\s*controller\.abort\(\);\s*\};/);
  assert.doesNotMatch(
    source,
    /\}, \[\s*applyCategorySeo,\s*bootstrapState\.hasCategory,\s*category,\s*categorySeo,\s*products,\s*slug,\s*\]\);/
  );
});

test('category products publish without waiting for every image', () => {
  assert.doesNotMatch(source, /await preloadProductGridImages/);
  assert.match(source, /void preloadProductGridImages\(payload\.products, 4\)/);
});
