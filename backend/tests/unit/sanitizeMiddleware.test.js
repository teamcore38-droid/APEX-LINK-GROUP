import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeValue } from '../../middleware/sanitizeMiddleware.js';

test('sanitizeValue removes dangerous script tags and handlers', () => {
  const payload = {
    name: '<script>alert(1)</script>Apex',
    nested: {
      body: '<img src=x onerror=alert(1)>hello',
    },
  };

  const result = sanitizeValue(payload);

  assert.equal(result.name.includes('<script'), false);
  assert.equal(result.nested.body.includes('onerror'), false);
  assert.equal(result.nested.body.includes('hello'), true);
});
