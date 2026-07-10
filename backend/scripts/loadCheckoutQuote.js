const baseUrl = (process.env.LOAD_TEST_BASE_URL || process.env.E2E_BASE_URL || 'http://127.0.0.1:5000').replace(/\/+$/, '');
const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY || 10);
const requests = Number(process.env.LOAD_TEST_REQUESTS || 50);

const durations = [];

const getProduct = async () => {
  const response = await fetch(`${baseUrl}/api/products`);
  if (!response.ok) {
    throw new Error(`Unable to load products: ${response.status}`);
  }

  const payload = await response.json();
  const products = Array.isArray(payload) ? payload : payload.products || [];
  const product = products.find((item) => Number(item.countInStock || 0) > 0) || products[0];

  if (!product) {
    throw new Error('No products available for load test.');
  }

  return product;
};

const quoteOnce = async (product) => {
  const started = performance.now();
  const response = await fetch(`${baseUrl}/api/orders/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderItems: [{ product: product._id, qty: 1 }],
      shippingAddress: {
        fullName: 'Load Test',
        phone: '+10000000000',
        email: 'load@example.com',
        addressLine1: '100 Test Street',
        city: 'Colombo',
        state: 'WP',
        postalCode: '10000',
        country: 'LK',
      },
    }),
  });
  const elapsed = performance.now() - started;
  durations.push(elapsed);

  if (!response.ok) {
    throw new Error(`Quote failed with ${response.status}`);
  }
};

const runWorker = async (product, count) => {
  for (let index = 0; index < count; index += 1) {
    await quoteOnce(product);
  }
};

try {
  const product = await getProduct();
  const perWorker = Math.ceil(requests / concurrency);
  await Promise.all(Array.from({ length: concurrency }, () => runWorker(product, perWorker)));
  durations.sort((left, right) => left - right);
  const p95 = durations[Math.floor(durations.length * 0.95) - 1] || 0;
  const avg = durations.reduce((total, value) => total + value, 0) / durations.length;

  console.log(
    JSON.stringify(
      {
        baseUrl,
        requests: durations.length,
        concurrency,
        averageMs: Math.round(avg),
        p95Ms: Math.round(p95),
        maxMs: Math.round(durations.at(-1) || 0),
      },
      null,
      2
    )
  );
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
