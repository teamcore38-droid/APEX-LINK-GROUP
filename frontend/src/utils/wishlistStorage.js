export const WISHLIST_STORAGE_KEY = 'apexFashionWishlist';
export const WISHLIST_STORAGE_VERSION = 1;

const getWishlistProductId = (product = {}) =>
  String(product._id || product.id || product.product || '').trim();

export const createWishlistItem = (product = {}) => {
  const productId = getWishlistProductId(product);

  if (!productId) {
    return null;
  }

  return {
    _id: productId,
    slug: product.slug || '',
    name: product.name || 'Product',
    image: product.image || '',
    category: product.category || 'Fashion',
    price: Number(product.price || 0),
    compareAtPrice: Number(product.compareAtPrice || 0),
    countInStock: Number(product.countInStock || 0),
    rating: Number(product.rating || 0),
    numReviews: Number(product.numReviews || 0),
    isFeatured: Boolean(product.isFeatured),
    isBestSeller: Boolean(product.isBestSeller),
    brand: product.brand || 'Apex Fashion',
    sku: product.sku || '',
  };
};

export const normalizeWishlistItems = (items = []) => {
  const seenProductIds = new Set();

  return (Array.isArray(items) ? items : []).reduce((normalizedItems, product) => {
    const item = createWishlistItem(product);

    if (!item || seenProductIds.has(item._id)) {
      return normalizedItems;
    }

    seenProductIds.add(item._id);
    normalizedItems.push(item);
    return normalizedItems;
  }, []);
};

export const readWishlistItems = (storage) => {
  if (!storage) {
    return [];
  }

  try {
    const storedValue = JSON.parse(storage.getItem(WISHLIST_STORAGE_KEY) || 'null');
    const items = Array.isArray(storedValue) ? storedValue : storedValue?.items;
    return normalizeWishlistItems(items);
  } catch {
    return [];
  }
};

export const writeWishlistItems = (storage, items) => {
  if (!storage) {
    return false;
  }

  try {
    storage.setItem(
      WISHLIST_STORAGE_KEY,
      JSON.stringify({
        version: WISHLIST_STORAGE_VERSION,
        items: normalizeWishlistItems(items),
      })
    );
    return true;
  } catch {
    return false;
  }
};

export const localWishlistRepository = {
  load: () => readWishlistItems(typeof window === 'undefined' ? null : window.localStorage),
  save: (items) =>
    writeWishlistItems(typeof window === 'undefined' ? null : window.localStorage, items),
  subscribe: (listener) => {
    if (typeof window === 'undefined') {
      return () => undefined;
    }

    const handleStorage = (event) => {
      if (event.key === WISHLIST_STORAGE_KEY) {
        listener(readWishlistItems(window.localStorage));
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  },
};

export { getWishlistProductId };
