import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAllowedOrigins, createCorsOptions } from '../../config/cors.js';

const evaluateOrigin = (options, origin) => new Promise((resolve, reject) => {
  options.origin(origin, (error, allowed) => {
    if (error) {
      reject(error);
      return;
    }

    resolve(allowed);
  });
});

test('always allows both Apex Fashion production origins', () => {
  const origins = buildAllowedOrigins({});

  assert.ok(origins.includes('https://www.apexfashion.lk'));
  assert.ok(origins.includes('https://apexfashion.lk'));
});

test('retains normalized environment and local origins without duplicates', () => {
  const origins = buildAllowedOrigins({
    FRONTEND_URL: 'https://preview.apexfashion.lk/',
    CLIENT_URL: 'https://www.apexfashion.lk/',
    CORS_ORIGINS: 'https://staging.apexfashion.lk/, https://preview.apexfashion.lk',
  });

  assert.ok(origins.includes('https://preview.apexfashion.lk'));
  assert.ok(origins.includes('https://staging.apexfashion.lk'));
  assert.ok(origins.includes('http://localhost:5173'));
  assert.equal(
    origins.filter((origin) => origin === 'https://www.apexfashion.lk').length,
    1
  );
});

test('rejects untrusted browser origins while allowing server-to-server requests', async () => {
  const options = createCorsOptions({});

  assert.equal(await evaluateOrigin(options, 'https://www.apexfashion.lk'), true);
  assert.equal(await evaluateOrigin(options, 'https://apexfashion.lk'), true);
  assert.equal(await evaluateOrigin(options, 'https://untrusted.example'), false);
  assert.equal(await evaluateOrigin(options, undefined), true);
  assert.equal(options.credentials, true);
});
