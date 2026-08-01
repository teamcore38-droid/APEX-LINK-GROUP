import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WISHLIST_STORAGE_KEY,
  createWishlistItem,
  normalizeWishlistItems,
  readWishlistItems,
  writeWishlistItems,
} from '../src/utils/wishlistStorage.js';

const createMemoryStorage = () => {
  const values = new Map();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
};

test('wishlist items retain the product details needed by storefront cards', () => {
  const item = createWishlistItem({
    _id: 'product-1',
    name: 'Leather Handbag',
    slug: 'leather-handbag',
    category: 'Bags',
    image: '/bag.webp',
    price: '4950',
    compareAtPrice: '5500',
    countInStock: '8',
    isBestSeller: true,
  });

  assert.deepEqual(item, {
    _id: 'product-1',
    slug: 'leather-handbag',
    name: 'Leather Handbag',
    image: '/bag.webp',
    category: 'Bags',
    price: 4950,
    compareAtPrice: 5500,
    countInStock: 8,
    rating: 0,
    numReviews: 0,
    isFeatured: false,
    isBestSeller: true,
    brand: 'Apex Fashion',
    sku: '',
  });
});

test('wishlist normalization removes invalid and duplicate products', () => {
  const items = normalizeWishlistItems([
    { _id: 'product-1', name: 'First' },
    { _id: 'product-1', name: 'Duplicate' },
    { name: 'Missing id' },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].name, 'First');
});

test('wishlist storage is versioned, persistent, and resilient to invalid data', () => {
  const storage = createMemoryStorage();
  writeWishlistItems(storage, [{ _id: 'product-1', name: 'Saved Product', price: 2500 }]);

  const storedValue = JSON.parse(storage.getItem(WISHLIST_STORAGE_KEY));
  assert.equal(storedValue.version, 1);
  assert.equal(readWishlistItems(storage)[0].name, 'Saved Product');

  storage.setItem(WISHLIST_STORAGE_KEY, '{invalid json');
  assert.deepEqual(readWishlistItems(storage), []);
});

test('wishlist storage failures do not break storefront state', () => {
  const blockedStorage = {
    getItem: () => null,
    setItem: () => {
      throw new Error('Storage unavailable');
    },
  };

  assert.equal(writeWishlistItems(blockedStorage, [{ _id: 'product-1' }]), false);
});
