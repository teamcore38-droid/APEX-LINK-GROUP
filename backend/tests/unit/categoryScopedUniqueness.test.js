import test from 'node:test';
import assert from 'node:assert/strict';
import Category from '../../models/categoryModel.js';
import {
  CATEGORY_DUPLICATE_MESSAGE,
  buildParentCategoryFilter,
  findExistingCategoryConflict,
  isDuplicateCategoryKeyError,
  normalizeParentCategoryInput,
  slugify,
} from '../../controllers/categoryController.js';

const menId = '64f100000000000000000001';
const womenId = '64f100000000000000000002';
const footwearTopId = '64f100000000000000000003';
const footwearMenId = '64f100000000000000000004';
const footwearWomenId = '64f100000000000000000005';
const accessoriesId = '64f100000000000000000006';

const baseCategories = [
  { _id: menId, name: 'Men', slug: 'men', parentCategory: null },
  { _id: womenId, name: 'Women', slug: 'women', parentCategory: null },
  { _id: footwearTopId, name: 'Footwear', slug: 'footwear', parentCategory: null },
  { _id: footwearMenId, name: 'Footwear', slug: 'footwear', parentCategory: menId },
  { _id: accessoriesId, name: 'Accessories', slug: 'accessories', parentCategory: menId },
];

const getParentId = (category) => category.parentCategory?._id || category.parentCategory || null;

const matchesParentFilter = (category, parentFilter) => {
  if (parentFilter.parentCategory === null) {
    return getParentId(category) === null;
  }

  return String(getParentId(category) || '') === String(parentFilter.parentCategory);
};

const matchesConflictFilter = (category, query) => {
  const filters = query.$and || [];

  return filters.every((filter) => {
    if (filter._id?.$ne) {
      return String(category._id) !== String(filter._id.$ne);
    }

    if (Object.prototype.hasOwnProperty.call(filter, 'parentCategory')) {
      return matchesParentFilter(category, filter);
    }

    if (filter.$or) {
      return filter.$or.some((option) => {
        if (option.name?.$regex) {
          return option.name.$regex.test(category.name);
        }

        if (option.slug) {
          return category.slug === option.slug;
        }

        return false;
      });
    }

    return true;
  });
};

const createFakeCategoryModel = (categories) => ({
  findOne: async (query) => categories.find((category) => matchesConflictFilter(category, query)) || null,
});

const expectConflict = async ({ categories = baseCategories, name, slug, parentCategoryId, categoryId }) => {
  const conflict = await findExistingCategoryConflict({
    name,
    slug: slugify(slug || name),
    parentCategoryId,
    categoryId,
    CategoryModel: createFakeCategoryModel(categories),
  });

  return conflict;
};

test('creating Footwear under Men succeeds when Footwear exists at the top level only', async () => {
  const categories = baseCategories.filter((category) => category._id !== footwearMenId);
  const conflict = await expectConflict({ categories, name: 'Footwear', parentCategoryId: menId });

  assert.equal(conflict, null);
});

test('creating Footwear under Women succeeds when Men -> Footwear exists', async () => {
  const conflict = await expectConflict({ name: 'Footwear', parentCategoryId: womenId });

  assert.equal(conflict, null);
});

test('creating a second Footwear under Men fails', async () => {
  const conflict = await expectConflict({ name: 'Footwear', parentCategoryId: menId });

  assert.equal(conflict?._id, footwearMenId);
});

test('creating the same slug under different parents succeeds', async () => {
  const conflict = await expectConflict({ name: 'Different Label', slug: 'footwear', parentCategoryId: womenId });

  assert.equal(conflict, null);
});

test('creating the same slug under the same parent fails', async () => {
  const conflict = await expectConflict({ name: 'Different Label', slug: 'footwear', parentCategoryId: menId });

  assert.equal(conflict?._id, footwearMenId);
});

test('duplicate top-level names and slugs fail', async () => {
  const byName = await expectConflict({ name: 'Footwear', parentCategoryId: null });
  const bySlug = await expectConflict({ name: 'Different Label', slug: 'footwear', parentCategoryId: null });

  assert.equal(byName?._id, footwearTopId);
  assert.equal(bySlug?._id, footwearTopId);
});

test('updating a category without changing its name or slug succeeds', async () => {
  const conflict = await expectConflict({
    name: 'Footwear',
    slug: 'footwear',
    parentCategoryId: menId,
    categoryId: footwearMenId,
  });

  assert.equal(conflict, null);
});

test('moving a category to a parent where the same name or slug exists fails', async () => {
  const categories = [
    ...baseCategories,
    { _id: footwearWomenId, name: 'Footwear', slug: 'footwear', parentCategory: womenId },
  ];
  const conflict = await expectConflict({
    categories,
    name: 'Accessories',
    slug: 'footwear',
    parentCategoryId: womenId,
    categoryId: accessoriesId,
  });

  assert.equal(conflict?._id, footwearWomenId);
});

test('moving a category to a parent without a conflict succeeds', async () => {
  const conflict = await expectConflict({
    name: 'Accessories',
    slug: 'accessories',
    parentCategoryId: womenId,
    categoryId: accessoriesId,
  });

  assert.equal(conflict, null);
});

test('null, missing, and explicit top-level parent values are handled consistently', () => {
  assert.equal(normalizeParentCategoryInput(null), null);
  assert.equal(normalizeParentCategoryInput(undefined), null);
  assert.equal(normalizeParentCategoryInput(''), null);
  assert.equal(normalizeParentCategoryInput('null'), null);
  assert.equal(normalizeParentCategoryInput({ _id: '' }), null);
  assert.deepEqual(buildParentCategoryFilter(null), { parentCategory: null });
});

test('category schema defines scoped unique indexes instead of global unique slug index', () => {
  const indexes = Category.schema.indexes();
  const hasGlobalSlugUniqueIndex = indexes.some(([fields, options]) =>
    fields.slug === 1 && Object.keys(fields).length === 1 && options?.unique === true
  );
  const hasScopedNameIndex = indexes.some(([fields, options]) =>
    fields.parentCategory === 1 &&
    fields.name === 1 &&
    options?.unique === true &&
    options?.name === 'category_parent_name_unique'
  );
  const hasScopedSlugIndex = indexes.some(([fields, options]) =>
    fields.parentCategory === 1 &&
    fields.slug === 1 &&
    options?.unique === true &&
    options?.name === 'category_parent_slug_unique'
  );

  assert.equal(hasGlobalSlugUniqueIndex, false);
  assert.equal(hasScopedNameIndex, true);
  assert.equal(hasScopedSlugIndex, true);
});

test('duplicate Mongo key errors return the category validation message', () => {
  assert.equal(
    isDuplicateCategoryKeyError({ code: 11000, keyPattern: { parentCategory: 1, slug: 1 } }),
    true
  );
  assert.equal(
    isDuplicateCategoryKeyError({ code: 11000, message: 'E11000 duplicate key error index: categories.slug_1' }),
    true
  );
  assert.equal(CATEGORY_DUPLICATE_MESSAGE, 'A category with this name or slug already exists under the selected parent.');
});
