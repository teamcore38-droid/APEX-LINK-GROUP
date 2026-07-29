import { normalizeProductPayload } from './productUi.js';

const createEmptyFacets = () => ({
  categories: [],
  brands: [],
  origins: [],
  availability: [],
  priceRange: {},
});

const getCategoryBootstrapState = (payload) => {
  const productPayload = payload?.productPayload;
  const normalizedProducts = normalizeProductPayload(productPayload);

  return {
    slug: String(payload?.slug || ''),
    category: payload?.category || null,
    seo: payload?.seo || null,
    products: normalizedProducts.products,
    hasCategory: Boolean(payload?.category),
    hasProductPayload: Boolean(productPayload),
    meta: {
      currentPage: normalizedProducts.currentPage,
      totalPages: normalizedProducts.totalPages,
      totalProducts: normalizedProducts.totalProducts,
      hasNextPage: normalizedProducts.hasNextPage,
      hasPrevPage: normalizedProducts.hasPrevPage,
    },
    facets: productPayload?.facets || createEmptyFacets(),
  };
};

export { createEmptyFacets, getCategoryBootstrapState };
