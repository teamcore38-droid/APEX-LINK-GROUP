import axios from 'axios';

const CACHE_TTL_MS = 2 * 60 * 1000;

let cachedCategories = null;
let cacheExpiresAt = 0;
let pendingRequest = null;

const getCategories = async ({ force = false } = {}) => {
  const now = Date.now();

  if (!force && cachedCategories && now < cacheExpiresAt) {
    return cachedCategories;
  }

  if (!force && pendingRequest) {
    return pendingRequest;
  }

  pendingRequest = axios
    .get('/api/categories')
    .then(({ data }) => {
      cachedCategories = Array.isArray(data) ? data : [];
      cacheExpiresAt = Date.now() + CACHE_TTL_MS;
      return cachedCategories;
    })
    .finally(() => {
      pendingRequest = null;
    });

  return pendingRequest;
};

const invalidateCategoriesCache = () => {
  cachedCategories = null;
  cacheExpiresAt = 0;
};

export { getCategories, invalidateCategoriesCache };
