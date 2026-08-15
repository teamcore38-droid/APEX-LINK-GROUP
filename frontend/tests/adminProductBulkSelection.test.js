import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  buildBulkSelectionPayload,
  createEmptyProductSelection,
  getPageSelectionState,
  getSelectedProductCount,
  hasActiveProductResultFilters,
  isProductSelected,
  selectAllFilteredProducts,
  selectProductPage,
  setProductSelected,
  unselectProductPage,
} from '../src/utils/adminProductBulk.js';

const dashboardSource = await readFile(
  new URL('../src/pages/AdminDashboard.jsx', import.meta.url),
  'utf8'
);

test('individual products can be selected and deselected with an accurate count', () => {
  let selection = createEmptyProductSelection();
  selection = setProductSelected(selection, 'product-a', true);
  selection = setProductSelected(selection, 'product-b', true);

  assert.equal(isProductSelected(selection, 'product-a'), true);
  assert.equal(isProductSelected(selection, 'product-b'), true);
  assert.equal(getSelectedProductCount(selection, 99), 2);

  selection = setProductSelected(selection, 'product-a', false);
  assert.equal(isProductSelected(selection, 'product-a'), false);
  assert.equal(getSelectedProductCount(selection, 99), 1);
});

test('master selection selects and unselects the current page and exposes indeterminate state', () => {
  const pageIds = ['product-a', 'product-b', 'product-c'];
  let selection = selectProductPage(createEmptyProductSelection(), pageIds);

  assert.deepEqual(getPageSelectionState(selection, pageIds), {
    checked: true,
    indeterminate: false,
    selectedOnPage: 3,
    pageCount: 3,
  });

  selection = setProductSelected(selection, 'product-b', false);
  assert.deepEqual(getPageSelectionState(selection, pageIds), {
    checked: false,
    indeterminate: true,
    selectedOnPage: 2,
    pageCount: 3,
  });

  selection = unselectProductPage(selection, pageIds);
  assert.equal(getSelectedProductCount(selection, 99), 0);
  assert.equal(getPageSelectionState(selection, pageIds).checked, false);
});

test('explicit selections accumulate across pages and unselecting one page preserves the others', () => {
  const firstPage = ['page-1-a', 'page-1-b'];
  const secondPage = ['page-2-a', 'page-2-b'];
  let selection = selectProductPage(createEmptyProductSelection(), firstPage);
  selection = selectProductPage(selection, secondPage);

  assert.equal(getSelectedProductCount(selection, 100), 4);
  assert.equal(getPageSelectionState(selection, firstPage).checked, true);
  assert.equal(getPageSelectionState(selection, secondPage).checked, true);

  selection = unselectProductPage(selection, secondPage);
  assert.equal(getSelectedProductCount(selection, 100), 2);
  assert.equal(getPageSelectionState(selection, firstPage).checked, true);
  assert.equal(getPageSelectionState(selection, secondPage).checked, false);

  selection = createEmptyProductSelection();
  assert.equal(getSelectedProductCount(selection, 100), 0);
});

test('all-filtered selection keeps a compact exclusion model across pagination', () => {
  let selection = selectAllFilteredProducts();
  selection = setProductSelected(selection, 'page-1-product', false);

  assert.equal(selection.mode, 'allFiltered');
  assert.deepEqual(selection.selectedIds, []);
  assert.deepEqual(selection.excludedIds, ['page-1-product']);
  assert.equal(getSelectedProductCount(selection, 3820), 3819);
  assert.equal(isProductSelected(selection, 'unloaded-page-product'), true);

  selection = selectProductPage(selection, ['page-1-product']);
  assert.deepEqual(selection.excludedIds, []);
  assert.equal(getSelectedProductCount(selection, 3820), 3820);
});

test('clicking Select All again after manual exclusions restores the complete result set', () => {
  let selection = selectAllFilteredProducts();
  selection = setProductSelected(selection, 'excluded-a', false);
  selection = setProductSelected(selection, 'excluded-b', false);

  assert.equal(getSelectedProductCount(selection, 31), 29);
  assert.deepEqual(selection.excludedIds, ['excluded-a', 'excluded-b']);

  selection = selectAllFilteredProducts();
  assert.equal(getSelectedProductCount(selection, 31), 31);
  assert.deepEqual(selection.excludedIds, []);
});

test('search-aware all-filtered payload targets the search result set without page or sort fields', () => {
  const payload = buildBulkSelectionPayload(selectAllFilteredProducts(), {
    keyword: 'bra',
    category: '',
    active: 'all',
    stock: '',
    sort: 'price-high',
    page: 3,
  });

  assert.deepEqual(payload, {
    mode: 'allFiltered',
    filters: {
      active: 'all',
      category: '',
      keyword: 'bra',
      stock: '',
    },
    excludedIds: [],
  });
  assert.equal(hasActiveProductResultFilters(payload.filters), true);
});

test('the required 31-result bra search scenario reports and submits exactly 31 filtered products', () => {
  const selection = selectAllFilteredProducts();
  const payload = buildBulkSelectionPayload(selection, {
    keyword: 'bra',
    category: '',
    active: 'all',
    stock: '',
    sort: 'newest',
  });

  assert.equal(getSelectedProductCount(selection, 31), 31);
  assert.equal(payload.mode, 'allFiltered');
  assert.equal(payload.filters.keyword, 'bra');
  assert.equal(Object.prototype.hasOwnProperty.call(payload.filters, 'page'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(payload.filters, 'sort'), false);
});

test('category and combined filters are preserved as the exact all-filtered intersection', () => {
  const payload = buildBulkSelectionPayload(selectAllFilteredProducts(), {
    keyword: 'bra',
    category: 'clothing',
    active: 'true',
    stock: 'in-stock',
    sort: 'newest',
  });

  assert.deepEqual(payload.filters, {
    active: 'true',
    category: 'clothing',
    keyword: 'bra',
    stock: 'in-stock',
  });
  assert.equal(hasActiveProductResultFilters(payload.filters), true);
});

test('complete-catalog selection is explicit and serializes an unfiltered authoritative query', () => {
  const selection = selectAllFilteredProducts();
  const payload = buildBulkSelectionPayload(selection, {
    keyword: '',
    category: '',
    active: 'all',
    stock: '',
    sort: 'stock-low',
  });

  assert.equal(getSelectedProductCount(selection, 3820), 3820);
  assert.equal(hasActiveProductResultFilters(payload.filters), false);
  assert.deepEqual(payload, {
    mode: 'allFiltered',
    filters: {
      active: 'all',
      category: '',
      keyword: '',
      stock: '',
    },
    excludedIds: [],
  });
});

test('explicit API payload contains only the selected IDs and cannot include hidden catalog filters', () => {
  let selection = createEmptyProductSelection();
  selection = setProductSelected(selection, 'product-a', true);
  selection = setProductSelected(selection, 'product-b', true);

  assert.deepEqual(buildBulkSelectionPayload(selection, {
    keyword: 'ignored-for-explicit-mode',
    active: 'false',
  }), {
    mode: 'explicit',
    ids: ['product-a', 'product-b'],
  });
});

test('dashboard clears dangerous selection on search and filter changes but not sort or pagination', () => {
  assert.match(
    dashboardSource,
    /if \(key !== 'sort'\) \{\s*clearProductSelection\(\);\s*\}/
  );
  assert.match(
    dashboardSource,
    /onChange=\{\(event\) => \{\s*setProductError\(''\);\s*setProductSuccess\(''\);\s*clearProductSelection\(\);\s*setProductSearchInput/
  );
  assert.doesNotMatch(dashboardSource, /onClick=\{\(\) => setProductPage\([^}]*clearProductSelection/);
});

test('dashboard protects bulk submission, clears passwords, and exposes accessible confirmation controls', () => {
  assert.match(dashboardSource, /if \(!bulkProductDialog \|\| bulkSubmittingRef\.current\) \{/);
  assert.match(dashboardSource, /bulkSubmittingRef\.current = true;/);
  assert.match(dashboardSource, /axios\.post\(\s*'\/api\/products\/bulk'/);
  assert.match(dashboardSource, /password: ''/);
  assert.doesNotMatch(dashboardSource, /localStorage[^\n]*bulkCredentials|sessionStorage[^\n]*bulkCredentials/);
  assert.match(dashboardSource, /aria-modal="true"/);
  assert.match(dashboardSource, /aria-checked=\{indeterminate \? 'mixed'/);
  assert.match(dashboardSource, /Admin username \(email\)/);
  assert.match(dashboardSource, /autoComplete="current-password"/);
  ['activate', 'deactivate', 'feature', 'unfeature', 'delete'].forEach((operation) => {
    assert.match(dashboardSource, new RegExp(`operation: '${operation}'`));
  });
});

test('successful bulk responses clear selection, refresh the server list, and surface partial results', () => {
  const submitHandlerStart = dashboardSource.indexOf('const submitBulkProductOperation');
  const submitHandlerEnd = dashboardSource.indexOf('const exportProductsHandler', submitHandlerStart);
  const submitHandler = dashboardSource.slice(submitHandlerStart, submitHandlerEnd);

  assert.notEqual(submitHandler, '');
  assert.match(submitHandler, /setProductSelection\(createEmptyProductSelection\(\)\);/);
  assert.match(submitHandler, /setProductRefreshToken\(\(currentValue\) => currentValue \+ 1\);/);
  assert.match(submitHandler, /data\.failedCount/);
  assert.match(submitHandler, /data\.skippedCount/);
  assert.match(submitHandler, /setProductError\(data\.message\);/);
  assert.match(submitHandler, /setProductSuccess\(data\.message\);/);
});
