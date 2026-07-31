import axios from 'axios';
import { normalizeProductPayload } from './productUi.js';

const CACHE_TTL_MS = 5 * 60 * 1000;
const STORAGE_PREFIX = 'apex-home-products-v1';
const requestConfig = {
  featured: { featured: true, limit: 8 },
  bestSellers: { bestSeller: true, limit: 4 },
};
const memoryCache = new Map();

const getStorage = () => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const getStorageKey = (collection) => `${STORAGE_PREFIX}:${collection}`;

const removeStoredEntry = (storage, collection) => {
  try {
    storage?.removeItem(getStorageKey(collection));
  } catch {
    // Storage access can be blocked by browser privacy settings.
  }
};

const isFresh = (entry, now = Date.now()) =>
  Array.isArray(entry?.products) && now - entry.timestamp < CACHE_TTL_MS;

const readStoredEntry = (collection) => {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  try {
    const entry = JSON.parse(storage.getItem(getStorageKey(collection)) || 'null');

    if (isFresh(entry)) {
      return entry;
    }

    removeStoredEntry(storage, collection);
  } catch {
    removeStoredEntry(storage, collection);
  }

  return null;
};

const writeEntry = (collection, products) => {
  const entry = { products, timestamp: Date.now() };
  memoryCache.set(collection, { ...entry, promise: null });

  try {
    getStorage()?.setItem(getStorageKey(collection), JSON.stringify(entry));
  } catch {
    // Memory caching still prevents duplicate requests when storage is unavailable.
  }

  return products;
};

export const getCachedHomepageProducts = (collection) => {
  if (!requestConfig[collection]) {
    return null;
  }

  const memoryEntry = memoryCache.get(collection);

  if (isFresh(memoryEntry)) {
    return memoryEntry.products;
  }

  const storedEntry = readStoredEntry(collection);

  if (storedEntry) {
    memoryCache.set(collection, { ...storedEntry, promise: memoryEntry?.promise || null });
    return storedEntry.products;
  }

  return null;
};

export const getHomepageProducts = (collection) => {
  const params = requestConfig[collection];

  if (!params) {
    return Promise.reject(new Error(`Unknown homepage product collection: ${collection}`));
  }

  const cachedProducts = getCachedHomepageProducts(collection);

  if (cachedProducts) {
    return Promise.resolve(cachedProducts);
  }

  const currentEntry = memoryCache.get(collection);

  if (currentEntry?.promise) {
    return currentEntry.promise;
  }

  const request = axios
    .get('/api/products', { params })
    .then(({ data }) => writeEntry(collection, normalizeProductPayload(data).products))
    .catch((error) => {
      const latestEntry = memoryCache.get(collection);
      if (latestEntry?.promise === request) {
        memoryCache.delete(collection);
      }
      throw error;
    });

  memoryCache.set(collection, { products: null, timestamp: 0, promise: request });
  return request;
};

export const clearHomepageProductCache = () => {
  memoryCache.clear();

  const storage = getStorage();
  if (!storage) {
    return;
  }

  Object.keys(requestConfig).forEach((collection) => {
    removeStoredEntry(storage, collection);
  });
};
