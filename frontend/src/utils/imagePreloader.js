import { getOptimizedImageUrl } from '../utils/productUi';

/**
 * Preloads the images of the first N products from an API response.
 * Returns a promise that resolves when all initial images have either loaded or errored,
 * or when a safety timeout fires.
 *
 * @param {Array} products - List of product objects
 * @param {number} [count=4] - Number of initial products to preload images for
 * @param {number} [timeoutMs=3500] - Safety fallback timeout
 * @returns {Promise<void>}
 */
export const preloadProductGridImages = (products = [], count = 4, timeoutMs = 3500) => {
  if (!products || products.length === 0) {
    return Promise.resolve();
  }

  const initialProducts = products.slice(0, count);
  const imageUrls = initialProducts
    .map((product) => getOptimizedImageUrl(product.image, { width: 520, height: 520, crop: 'fill' }))
    .filter(Boolean);

  if (imageUrls.length === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settledCount = 0;
    let isDone = false;

    const done = () => {
      if (!isDone) {
        isDone = true;
        resolve();
      }
    };

    // Safety timeout to prevent hanging if network stalls
    const timer = setTimeout(done, timeoutMs);

    imageUrls.forEach((url) => {
      const img = new Image();

      const onFinish = () => {
        settledCount += 1;
        if (settledCount >= imageUrls.length) {
          clearTimeout(timer);
          done();
        }
      };

      img.onload = onFinish;
      img.onerror = onFinish;
      img.src = url;

      // If already cached by browser
      if (img.complete) {
        onFinish();
      }
    });
  });
};
