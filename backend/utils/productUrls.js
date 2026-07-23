const slugifyProductUrlSegment = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getProductUrlSlug = (product = {}) =>
  slugifyProductUrlSegment(product.slug || product.name || '') || 'product';

const buildProductPath = (product = {}) => {
  const productId = product._id?.toString?.() || product._id || product.id || '';
  return `/product/${getProductUrlSlug(product)}-${productId}`;
};

const buildProductUrl = (product = {}, siteUrl = '') => `${siteUrl}${buildProductPath(product)}`;

export {
  buildProductPath,
  buildProductUrl,
  getProductUrlSlug,
  slugifyProductUrlSegment,
};
