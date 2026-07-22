import test from 'node:test';
import assert from 'node:assert/strict';
import { getStoredConsent, OPTIONAL_TRACKING_ENABLED } from '../src/utils/analytics.js';

test('optional storefront tracking remains disabled without a consent banner', () => {
  assert.equal(OPTIONAL_TRACKING_ENABLED, false);
  assert.equal(getStoredConsent(), null);
});
