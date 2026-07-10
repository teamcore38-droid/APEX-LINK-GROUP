import test from 'node:test';
import assert from 'node:assert/strict';
import { hashValue } from '../../utils/securityService.js';

test('hashValue is deterministic and does not expose raw token', () => {
  const token = 'refresh-token-value';
  const first = hashValue(token);
  const second = hashValue(token);

  assert.equal(first, second);
  assert.notEqual(first, token);
  assert.equal(first.length, 64);
});
