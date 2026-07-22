import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIndexNowPayload, notifyIndexNow } from '../../utils/indexNowService.js';

test('IndexNow payload only includes canonical storefront URLs', () => {
  const payload = buildIndexNowPayload([
    '/product/123',
    '/product/123',
    'https://malicious.example/product/456',
  ]);

  assert.equal(payload.host, 'apexfashion.lk');
  assert.deepEqual(payload.urlList, ['https://apexfashion.lk/product/123']);
  assert.equal(payload.keyLocation.endsWith(`/${payload.key}.txt`), true);
});

test('IndexNow notifications stay disabled outside production', async () => {
  assert.equal(await notifyIndexNow(['/products']), false);
});
