const BULK_FILTER_KEYS = [
  'active',
  'bestSeller',
  'category',
  'categoryId',
  'categoryPath',
  'featured',
  'keyword',
  'maxPrice',
  'minPrice',
  'stock',
];

const uniqueIds = (ids = []) => [
  ...new Set((ids || []).map((id) => String(id || '').trim()).filter(Boolean)),
];

export const createEmptyProductSelection = () => ({
  mode: 'explicit',
  selectedIds: [],
  excludedIds: [],
});

export const isProductSelected = (selection, productId) => {
  const id = String(productId || '');

  if (!id) {
    return false;
  }

  if (selection?.mode === 'allFiltered') {
    return !uniqueIds(selection.excludedIds).includes(id);
  }

  return uniqueIds(selection?.selectedIds).includes(id);
};

export const getSelectedProductCount = (selection, totalMatchingProducts = 0) => {
  if (selection?.mode === 'allFiltered') {
    return Math.max(0, Number(totalMatchingProducts || 0) - uniqueIds(selection.excludedIds).length);
  }

  return uniqueIds(selection?.selectedIds).length;
};

export const getPageSelectionState = (selection, pageProductIds = []) => {
  const ids = uniqueIds(pageProductIds);
  const selectedOnPage = ids.filter((id) => isProductSelected(selection, id)).length;

  return {
    checked: ids.length > 0 && selectedOnPage === ids.length,
    indeterminate: selectedOnPage > 0 && selectedOnPage < ids.length,
    selectedOnPage,
    pageCount: ids.length,
  };
};

export const setProductSelected = (selection, productId, shouldSelect) => {
  const id = String(productId || '').trim();

  if (!id) {
    return selection || createEmptyProductSelection();
  }

  if (selection?.mode === 'allFiltered') {
    const exclusions = new Set(uniqueIds(selection.excludedIds));

    if (shouldSelect) {
      exclusions.delete(id);
    } else {
      exclusions.add(id);
    }

    return {
      mode: 'allFiltered',
      selectedIds: [],
      excludedIds: [...exclusions],
    };
  }

  const selectedIds = new Set(uniqueIds(selection?.selectedIds));

  if (shouldSelect) {
    selectedIds.add(id);
  } else {
    selectedIds.delete(id);
  }

  return {
    mode: 'explicit',
    selectedIds: [...selectedIds],
    excludedIds: [],
  };
};

export const selectProductPage = (selection, pageProductIds = []) => {
  const pageIds = uniqueIds(pageProductIds);

  if (selection?.mode === 'allFiltered') {
    const pageIdSet = new Set(pageIds);
    return {
      mode: 'allFiltered',
      selectedIds: [],
      excludedIds: uniqueIds(selection.excludedIds).filter((id) => !pageIdSet.has(id)),
    };
  }

  return {
    mode: 'explicit',
    selectedIds: uniqueIds([...(selection?.selectedIds || []), ...pageIds]),
    excludedIds: [],
  };
};

export const unselectProductPage = (selection, pageProductIds = []) => {
  const pageIds = uniqueIds(pageProductIds);
  const pageIdSet = new Set(pageIds);

  if (selection?.mode === 'allFiltered') {
    return {
      mode: 'allFiltered',
      selectedIds: [],
      excludedIds: uniqueIds([...(selection.excludedIds || []), ...pageIds]),
    };
  }

  return {
    mode: 'explicit',
    selectedIds: uniqueIds(selection?.selectedIds).filter((id) => !pageIdSet.has(id)),
    excludedIds: [],
  };
};

export const selectAllFilteredProducts = () => ({
  mode: 'allFiltered',
  selectedIds: [],
  excludedIds: [],
});

export const buildBulkSelectionPayload = (selection, productFilters = {}) => {
  if (selection?.mode !== 'allFiltered') {
    return {
      mode: 'explicit',
      ids: uniqueIds(selection?.selectedIds),
    };
  }

  const filters = Object.fromEntries(
    BULK_FILTER_KEYS
      .filter((key) => Object.prototype.hasOwnProperty.call(productFilters, key))
      .map((key) => [key, productFilters[key]])
  );

  return {
    mode: 'allFiltered',
    filters,
    excludedIds: uniqueIds(selection.excludedIds),
  };
};

export const hasActiveProductResultFilters = (filters = {}) => Boolean(
  String(filters.keyword || '').trim()
  || String(filters.category || '').trim()
  || (String(filters.active || '').trim() && String(filters.active).trim() !== 'all')
  || String(filters.stock || '').trim()
  || String(filters.featured || '').trim()
  || String(filters.bestSeller || '').trim()
  || String(filters.minPrice || '').trim()
  || String(filters.maxPrice || '').trim()
);

export const describeProductResultFilters = (filters = {}) => {
  const descriptions = [];
  const keyword = String(filters.keyword || '').trim();
  const category = String(filters.category || '').trim();
  const active = String(filters.active || '').trim();
  const stock = String(filters.stock || '').trim();

  if (keyword) descriptions.push(`Search: “${keyword}”`);
  if (category) descriptions.push(`Category: ${category}`);
  if (active && active !== 'all') descriptions.push(`Visibility: ${active === 'true' ? 'Active' : 'Inactive'}`);
  if (stock) descriptions.push(`Stock: ${stock.replaceAll('-', ' ')}`);

  return descriptions.length > 0 ? descriptions.join(' · ') : 'Entire catalog (no active filters)';
};
