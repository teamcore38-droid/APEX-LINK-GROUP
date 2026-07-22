import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDatabaseProductDescription,
  getDatabaseProductDescription,
  hasCopiedMarketplaceDescription,
} from '../../utils/productSeoContent.js';

test('marketplace and BIS product copy is rejected', () => {
  assert.equal(
    hasCopiedMarketplaceDescription('Product may be regulated by BIS Quality Control Order.'),
    true
  );
  assert.equal(
    hasCopiedMarketplaceDescription('Shoe | Running | Best shoe | Waterproof | New style'),
    true
  );
  assert.equal(hasCopiedMarketplaceDescription('Breathable walking shoe with a cushioned sole.'), false);
});

test('database product descriptions use only stored product attributes', () => {
  const product = {
    name: 'Walking Shoe',
    brand: 'Apex Fashion',
    category: 'Shoes',
    origin: 'Sri Lanka',
    variants: [{ size: 'M', color: 'Black' }],
  };
  const description = buildDatabaseProductDescription(product);

  assert.match(description, /Walking Shoe/);
  assert.match(description, /Apex Fashion/);
  assert.match(description, /Available sizes: M/);
  assert.match(description, /Available colors: Black/);
});

test('safe database descriptions are preserved and copied descriptions are replaced', () => {
  assert.equal(
    getDatabaseProductDescription({
      name: 'Leather Bag',
      description: 'Structured leather bag with an adjustable shoulder strap.',
    }),
    'Structured leather bag with an adjustable shoulder strap.'
  );
  assert.doesNotMatch(
    getDatabaseProductDescription({
      name: 'Walking Shoe',
      category: 'Shoes',
      description: 'Visit bis.gov.in for BIS Quality Control Order information.',
    }),
    /BIS|bis\.gov\.in/i
  );
});
