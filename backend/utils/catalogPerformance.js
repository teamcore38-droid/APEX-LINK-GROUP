const PRODUCT_CARD_FIELDS = [
  'name',
  'slug',
  'image',
  'category',
  'brand',
  'origin',
  'price',
  'compareAtPrice',
  'countInStock',
  'rating',
  'numReviews',
  'weight',
  'sku',
  'isFeatured',
  'isBestSeller',
].join(' ');

const setPublicCatalogCache = (res, maxAgeSeconds = 30) => {
  res.set('Cache-Control', `public, max-age=${maxAgeSeconds}, stale-while-revalidate=120`);
};

export { PRODUCT_CARD_FIELDS, setPublicCatalogCache };
