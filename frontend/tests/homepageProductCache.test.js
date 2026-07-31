import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';
import {
  clearHomepageProductCache,
  getCachedHomepageProducts,
  getHomepageProducts,
} from '../src/utils/homepageProductCache.js';

test('homepage product requests share in-flight work and reuse cached responses', async () => {
  const originalGet = axios.get;
  let requestCount = 0;

  axios.get = async () => {
    requestCount += 1;
    return { data: { products: [{ _id: 'featured-1', name: 'Featured product' }] } };
  };

  try {
    clearHomepageProductCache();

    const [firstResult, secondResult] = await Promise.all([
      getHomepageProducts('featured'),
      getHomepageProducts('featured'),
    ]);
    const cachedResult = await getHomepageProducts('featured');

    assert.equal(requestCount, 1);
    assert.deepEqual(firstResult, secondResult);
    assert.deepEqual(cachedResult, firstResult);
    assert.deepEqual(getCachedHomepageProducts('featured'), firstResult);
  } finally {
    axios.get = originalGet;
    clearHomepageProductCache();
  }
});

test('homepage collections keep independent requests and caches', async () => {
  const originalGet = axios.get;
  const requestedParams = [];

  axios.get = async (_url, { params }) => {
    requestedParams.push(params);
    return { data: { products: [{ _id: params.featured ? 'featured' : 'best-seller' }] } };
  };

  try {
    clearHomepageProductCache();

    const [featured, bestSellers] = await Promise.all([
      getHomepageProducts('featured'),
      getHomepageProducts('bestSellers'),
    ]);

    assert.equal(requestedParams.length, 2);
    assert.equal(featured[0]._id, 'featured');
    assert.equal(bestSellers[0]._id, 'best-seller');
  } finally {
    axios.get = originalGet;
    clearHomepageProductCache();
  }
});
