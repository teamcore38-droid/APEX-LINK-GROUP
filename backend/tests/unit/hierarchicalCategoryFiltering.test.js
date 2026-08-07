import test from 'node:test';
import assert from 'node:assert/strict';
import Category from '../../models/categoryModel.js';
import { resolveCategoryByPath } from '../../controllers/categoryController.js';
import { buildSearchFilter } from '../../controllers/customerExperienceController.js';
import { resolveProductCategoryAssignments } from '../../controllers/productController.js';

const menId = '64f200000000000000000001';
const womenId = '64f200000000000000000002';
const topFootwearId = '64f200000000000000000003';
const menFootwearId = '64f200000000000000000004';
const womenFootwearId = '64f200000000000000000005';
const menBootsId = '64f200000000000000000006';

const categoryDocs = [
  { _id: menId, name: 'Men', slug: 'men', parentCategory: null },
  { _id: womenId, name: 'Women', slug: 'women', parentCategory: null },
  { _id: topFootwearId, name: 'Footwear', slug: 'footwear', parentCategory: null },
  { _id: menFootwearId, name: 'Footwear', slug: 'footwear', parentCategory: menId },
  { _id: womenFootwearId, name: 'Footwear', slug: 'footwear', parentCategory: womenId },
  { _id: menBootsId, name: 'Boots', slug: 'boots', parentCategory: menFootwearId },
];

const productDocs = [
  { name: 'Men Sneaker', categoryRef: menFootwearId, categoryRefs: [menFootwearId] },
  { name: 'Men Boot', categoryRef: menBootsId, categoryRefs: [menFootwearId, menBootsId] },
  { name: 'Women Heel', categoryRef: womenFootwearId, categoryRefs: [womenFootwearId] },
  { name: 'Generic Footwear', categoryRef: topFootwearId, categoryRefs: [topFootwearId] },
];

const getParentId = (category) => String(category?.parentCategory?._id || category?.parentCategory || '');

const matchesFilter = (product, filter) => {
  const conditions = filter.$and || [];

  return conditions.every((condition) => {
    if (condition._id === null) return false;
    if (!condition.$or) return true;

    return condition.$or.some((option) => {
      if (option.categoryRef?.$in) {
        return option.categoryRef.$in.map(String).includes(String(product.categoryRef));
      }

      if (option.categoryRefs?.$in) {
        const ids = option.categoryRefs.$in.map(String);
        return (product.categoryRefs || []).some((categoryId) => ids.includes(String(categoryId)));
      }

      return false;
    });
  });
};

const filterProductsByCategoryIds = (categoryIds) => {
  const { filter, error } = buildSearchFilter(
    { category: 'Footwear' },
    { categoryIds }
  );

  assert.equal(error, undefined);
  return productDocs.filter((product) => matchesFilter(product, filter));
};

test('Men -> Footwear does not return Women -> Footwear products and includes valid descendants', () => {
  const products = filterProductsByCategoryIds([menFootwearId, menBootsId]);

  assert.deepEqual(products.map((product) => product.name), ['Men Sneaker', 'Men Boot']);
});

test('Women -> Footwear does not return Men -> Footwear products', () => {
  const products = filterProductsByCategoryIds([womenFootwearId]);

  assert.deepEqual(products.map((product) => product.name), ['Women Heel']);
});

test('same category names under different parents have independent product counts', () => {
  assert.equal(filterProductsByCategoryIds([menFootwearId, menBootsId]).length, 2);
  assert.equal(filterProductsByCategoryIds([womenFootwearId]).length, 1);
  assert.equal(filterProductsByCategoryIds([topFootwearId]).length, 1);
});

test('existing top-level category pages still filter independently', () => {
  const products = filterProductsByCategoryIds([topFootwearId]);

  assert.deepEqual(products.map((product) => product.name), ['Generic Footwear']);
});

test('category URLs resolve to the correct category in duplicate-slug hierarchies', async () => {
  const originalFindOne = Category.findOne;

  Category.findOne = (query) => ({
    lean: async () => categoryDocs.find((category) => {
      const parentMatches = Object.prototype.hasOwnProperty.call(query, 'parentCategory')
        ? String(query.parentCategory || '') === getParentId(category)
        : true;

      return category.slug === query.slug && parentMatches;
    }) || null,
  });

  try {
    const menFootwear = await resolveCategoryByPath('men/footwear');
    const womenFootwear = await resolveCategoryByPath('women/footwear');
    const topFootwear = await resolveCategoryByPath('footwear');

    assert.equal(String(menFootwear._id), menFootwearId);
    assert.equal(menFootwear.path, 'men/footwear');
    assert.equal(menFootwear.namePath, 'Men / Footwear');
    assert.equal(String(womenFootwear._id), womenFootwearId);
    assert.equal(womenFootwear.path, 'women/footwear');
    assert.equal(String(topFootwear._id), topFootwearId);
    assert.equal(topFootwear.path, 'footwear');
  } finally {
    Category.findOne = originalFindOne;
  }
});

test('product editing preserves the correct child-category assignment by ID', async () => {
  const byId = new Map(categoryDocs.map((category) => [String(category._id), category]));
  const assignment = await resolveProductCategoryAssignments({
    primaryCategory: 'Footwear',
    primaryCategoryId: menFootwearId,
    categories: ['Footwear'],
    categoryIds: [menFootwearId],
    resolveCategory: async (input) => byId.get(String(input)) || null,
  });

  assert.equal(assignment.categories[0], 'Footwear');
  assert.equal(String(assignment.categoryRefs[0]), menFootwearId);
  assert.deepEqual(assignment.categoryRefs.map(String), [menFootwearId]);
  assert.deepEqual(assignment.invalidCategories, []);
});
