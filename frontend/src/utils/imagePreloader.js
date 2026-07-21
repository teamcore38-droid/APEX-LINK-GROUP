import { getOptimizedImageUrl } from '../utils/productUi';

/**
 * Preloads the images of the first N products from an API response.
 * Returns a promise that resolves when all initial images have either loaded or errored,
 * or when a safety timeout fires.
 *
 * @param {Array} products - List of product objects
 * @param {number} [count] - Number of products to preload images for. Defaults to every product passed in.
 * @param {number} [timeoutMs=5000] - Safety fallback timeout
 * @returns {Promise<void>}
 */
export const preloadProductGridImages = (products = [], count = products.length, timeoutMs = 5000) => {
  if (!products || products.length === 0) {
    return Promise.resolve();
  }

  const preloadCount = Number.isFinite(count) ? Math.max(0, count) : products.length;
  const imageUrls = [
    ...new Set(
      products
        .slice(0, preloadCount)
        .map((product) => getOptimizedImageUrl(product.image, { width: 520, height: 520, crop: 'fill' }))
        .filter(Boolean)
    ),
  ];

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
      let didSettle = false;

      const onFinish = () => {
        if (didSettle || isDone) {
          return;
        }

        didSettle = true;
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
