import { readFile } from 'node:fs/promises';

const requiredPaths = [
  '/api/health',
  '/api/products',
  '/api/orders/quote',
  '/api/orders/guest',
  '/api/payments/create-payment-intent',
  '/api/privacy/consent',
  '/api/ops/health',
];

try {
  const spec = JSON.parse(await readFile(new URL('../docs/openapi.json', import.meta.url), 'utf8'));

  if (spec.openapi !== '3.1.0' && !String(spec.openapi || '').startsWith('3.')) {
    throw new Error('OpenAPI version must be 3.x');
  }

  for (const path of requiredPaths) {
    if (!spec.paths[path]) {
      throw new Error(`OpenAPI spec missing required path: ${path}`);
    }
  }

  console.log(`OpenAPI check passed with ${Object.keys(spec.paths).length} documented paths.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
