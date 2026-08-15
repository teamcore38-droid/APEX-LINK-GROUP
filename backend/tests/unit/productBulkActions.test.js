import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import AuditLog from '../../models/auditLogModel.js';
import Category from '../../models/categoryModel.js';
import Product from '../../models/productModel.js';
import User from '../../models/userModel.js';
import {
  buildBulkProductSelection,
  buildProductQueryFilter,
  bulkMutateProducts,
  executeBulkProductMutation,
  verifyBulkAdminCredentials,
} from '../../controllers/productController.js';

const productIdA = '64f900000000000000000001';
const productIdB = '64f900000000000000000002';
const productIdC = '64f900000000000000000003';
const clothingCategoryId = '64f900000000000000000010';
const productRoutesSource = await readFile(
  new URL('../../routes/productRoutes.js', import.meta.url),
  'utf8'
);

const createResponse = () => ({
  statusCode: 200,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(payload) {
    this.body = payload;
    return this;
  },
});

test('shared listing query reconstructs search, visibility, and stock filters server-side', async () => {
  const { filter, error } = await buildProductQueryFilter(
    { keyword: 'bra', active: 'true', stock: 'in-stock' },
    { isAdmin: true }
  );

  assert.equal(error, undefined);
  assert.equal(filter.$and.length, 3);
  const keywordFilter = filter.$and.find((condition) =>
    condition.$or?.some((entry) => entry.name instanceof RegExp));
  const stockFilter = filter.$and.find((condition) => condition.countInStock?.$gt === 0);

  assert.equal(keywordFilter.$or[0].name.test('Strapless Bra'), true);
  assert.deepEqual(stockFilter, { countInStock: { $gt: 0 } });
});

test('shared listing query applies category, search, visibility, and stock as one intersection', async () => {
  const originalCategoryFind = Category.find;

  Category.find = async (query) => {
    if (query.$or) {
      return [{
        _id: clothingCategoryId,
        name: 'Clothing',
        slug: 'clothing',
        parentCategory: null,
      }];
    }

    return [];
  };

  try {
    const { filter, error } = await buildProductQueryFilter({
      keyword: 'bra',
      category: 'clothing',
      active: 'true',
      stock: 'in-stock',
    }, { isAdmin: true });

    assert.equal(error, undefined);
    assert.equal(filter.$and.length, 4);

    const categoryFilter = filter.$and.find((condition) =>
      condition.$or?.some((entry) => entry.category instanceof RegExp));
    const keywordFilter = filter.$and.find((condition) =>
      condition.$or?.some((entry) => entry.name instanceof RegExp));

    assert.equal(categoryFilter.$or[0].category.test('Clothing'), true);
    assert.equal(categoryFilter.$or[0].category.test('Shoes'), false);
    assert.equal(keywordFilter.$or[0].name.test('Everyday Bra'), true);
    assert.deepEqual(
      filter.$and.find((condition) => condition.countInStock?.$gt === 0),
      { countInStock: { $gt: 0 } }
    );
  } finally {
    Category.find = originalCategoryFind;
  }
});

test('all-filtered selection preserves combined filters and manual exclusions', async () => {
  let receivedFilters;
  const selection = await buildBulkProductSelection(
    {
      mode: 'allFiltered',
      filters: {
        keyword: 'bra',
        category: 'clothing',
        active: 'true',
        stock: 'in-stock',
      },
      excludedIds: [productIdC],
    },
    { isAdmin: true },
    async (filters) => {
      receivedFilters = filters;
      return { filter: { $and: [{ searchMatch: true }, { categoryMatch: true }] } };
    }
  );

  assert.deepEqual(receivedFilters, {
    keyword: 'bra',
    category: 'clothing',
    active: 'true',
    stock: 'in-stock',
  });
  assert.deepEqual(selection.filter, {
    $and: [
      { $and: [{ searchMatch: true }, { categoryMatch: true }] },
      { _id: { $nin: [productIdC] } },
    ],
  });
  assert.equal(selection.requestedCount, null);
});

test('complete-catalog mode requires an explicit allFiltered selection and resolves to the admin catalog', async () => {
  const selection = await buildBulkProductSelection({
    mode: 'allFiltered',
    filters: {
      keyword: '',
      category: '',
      active: 'all',
      stock: '',
    },
    excludedIds: [],
  }, { isAdmin: true });

  assert.equal(selection.mode, 'allFiltered');
  assert.equal(selection.requestedCount, null);
  assert.deepEqual(selection.filter, {});
  assert.deepEqual(selection.selectionMetadata.filters, {
    keyword: '',
    category: '',
    active: 'all',
    stock: '',
  });
});

test('manipulated pagination filters and invalid exclusions are rejected before target resolution', async () => {
  const paginatedSelection = await buildBulkProductSelection({
    mode: 'allFiltered',
    filters: { keyword: 'bra', page: 2 },
    excludedIds: [],
  }, { isAdmin: true });
  const invalidExclusion = await buildBulkProductSelection({
    mode: 'allFiltered',
    filters: { keyword: 'bra' },
    excludedIds: ['not-an-object-id'],
  }, { isAdmin: true });

  assert.equal(paginatedSelection.error, 'Unsupported bulk product filter: page');
  assert.match(invalidExclusion.error, /invalid product ID/);
});

test('explicit selection validates IDs, deduplicates them, and cannot broaden to the catalog', async () => {
  const selection = await buildBulkProductSelection({
    mode: 'explicit',
    ids: [productIdA, productIdB, productIdA],
  }, { isAdmin: true });

  assert.deepEqual(selection.filter, { _id: { $in: [productIdA, productIdB] } });
  assert.equal(selection.requestedCount, 2);

  const invalid = await buildBulkProductSelection({
    mode: 'explicit',
    ids: ['not-an-object-id'],
  }, { isAdmin: true });
  assert.match(invalid.error, /invalid product ID/);
});

test('credential verification accepts only the current account identity and valid password', async () => {
  const currentUser = {
    email: 'owner@example.com',
    name: 'Store Owner',
    matchPassword: async (password) => password === 'valid-password',
  };
  const findCurrentUser = async () => currentUser;

  assert.equal(await verifyBulkAdminCredentials(
    { _id: 'admin-id' },
    { username: 'owner@example.com', password: 'valid-password' },
    findCurrentUser
  ), true);
  assert.equal(await verifyBulkAdminCredentials(
    { _id: 'admin-id' },
    { username: 'other@example.com', password: 'valid-password' },
    findCurrentUser
  ), false);
  assert.equal(await verifyBulkAdminCredentials(
    { _id: 'admin-id' },
    { username: 'owner@example.com', password: 'wrong-password' },
    findCurrentUser
  ), false);
});

test('activate, deactivate, feature, and unfeature use one bounded server-side update', async () => {
  const expectations = {
    activate: { isActive: true },
    deactivate: { isActive: false },
    feature: { isFeatured: true },
    unfeature: { isFeatured: false },
  };

  for (const [operation, expectedUpdate] of Object.entries(expectations)) {
    const updates = [];
    const result = await executeBulkProductMutation({
      operation,
      targetFilter: { filtered: true },
      requestedCount: 2,
      req: { user: { _id: 'admin-id' } },
      dependencies: {
        findProducts: async () => [
          { _id: productIdA, name: 'A', slug: 'a' },
          { _id: productIdB, name: 'B', slug: 'b' },
        ],
        updateProducts: async (filter, update) => {
          updates.push({ filter, update });
          return { matchedCount: 2, modifiedCount: 2 };
        },
        writeAuditLog: async () => {},
        notifySearchEngines: async () => {},
      },
    });

    assert.equal(updates.length, 1);
    assert.deepEqual(updates[0].filter, { _id: { $in: [productIdA, productIdB] } });
    assert.deepEqual(updates[0].update, { $set: expectedUpdate });
    assert.equal(result.affectedCount, 2);
    assert.equal(result.failedCount, 0);
  }
});

test('bulk delete reuses image cleanup and accurately reports partial or skipped work', async () => {
  const destroyedImages = [];
  const deleted = await executeBulkProductMutation({
    operation: 'delete',
    targetFilter: { filtered: true },
    requestedCount: 2,
    req: { user: { _id: 'admin-id' } },
    dependencies: {
      findProducts: async () => [
        { _id: productIdA, name: 'A', slug: 'a', image: 'a.jpg', imagePublicId: 'products/a' },
        { _id: productIdB, name: 'B', slug: 'b', images: [{ url: 'b.jpg', publicId: 'products/b' }] },
      ],
      deleteProducts: async () => ({ deletedCount: 2 }),
      destroyImages: async (publicIds) => destroyedImages.push(...publicIds),
      writeAuditLog: async () => {},
      notifySearchEngines: async () => {},
    },
  });

  assert.equal(deleted.affectedCount, 2);
  assert.deepEqual(destroyedImages.sort(), ['products/a', 'products/b']);

  const partial = await executeBulkProductMutation({
    operation: 'deactivate',
    targetFilter: { explicit: true },
    requestedCount: 3,
    req: { user: { _id: 'admin-id' } },
    dependencies: {
      findProducts: async () => [
        { _id: productIdA, name: 'A', slug: 'a' },
        { _id: productIdB, name: 'B', slug: 'b' },
      ],
      updateProducts: async () => ({ matchedCount: 1, modifiedCount: 1 }),
      writeAuditLog: async () => {},
      notifySearchEngines: async () => {},
    },
  });

  assert.equal(partial.affectedCount, 1);
  assert.equal(partial.failedCount, 1);
  assert.equal(partial.skippedCount, 1);
  assert.match(partial.message, /2 could not be updated/);
});

test('partial bulk deletion never removes media belonging to a product that may remain', async () => {
  let mediaCleanupCalls = 0;
  const result = await executeBulkProductMutation({
    operation: 'delete',
    targetFilter: { filtered: true },
    requestedCount: 2,
    req: { user: { _id: 'admin-id' } },
    dependencies: {
      findProducts: async () => [
        { _id: productIdA, name: 'A', slug: 'a', image: 'a.jpg', imagePublicId: 'products/a' },
        { _id: productIdB, name: 'B', slug: 'b', image: 'b.jpg', imagePublicId: 'products/b' },
      ],
      deleteProducts: async () => ({ deletedCount: 1 }),
      destroyImages: async () => { mediaCleanupCalls += 1; },
      writeAuditLog: async () => {},
      notifySearchEngines: async () => {},
    },
  });

  assert.equal(result.affectedCount, 1);
  assert.equal(result.failedCount, 1);
  assert.equal(mediaCleanupCalls, 0);
});

test('invalid credentials and unauthorized sessions return before every mutation', async () => {
  const originalUserFindById = User.findById;
  const originalProductFind = Product.find;
  let productQueries = 0;

  Product.find = () => {
    productQueries += 1;
    throw new Error('Product lookup must not happen');
  };

  try {
    User.findById = () => ({
      select: async () => ({
        email: 'owner@example.com',
        name: 'Store Owner',
        matchPassword: async () => false,
      }),
    });
    const invalidCredentialsResponse = createResponse();
    await bulkMutateProducts({
      user: { _id: 'admin-id', isAdmin: true },
      body: {
        operation: 'deactivate',
        selection: { mode: 'explicit', ids: [productIdA] },
        credentials: { username: 'owner@example.com', password: 'wrong' },
      },
    }, invalidCredentialsResponse);

    assert.equal(invalidCredentialsResponse.statusCode, 401);
    assert.match(invalidCredentialsResponse.body.message, /No products were changed/);
    assert.equal(productQueries, 0);

    User.findById = () => {
      throw new Error('Credential lookup must not happen for unauthorized users');
    };
    const unauthorizedResponse = createResponse();
    await bulkMutateProducts({
      user: { _id: 'customer-id', isAdmin: false, isStaff: false },
      body: {
        operation: 'delete',
        selection: { mode: 'explicit', ids: [productIdA] },
        credentials: { username: 'owner@example.com', password: 'valid-password' },
      },
    }, unauthorizedResponse);

    assert.equal(unauthorizedResponse.statusCode, 403);
    assert.equal(productQueries, 0);
  } finally {
    User.findById = originalUserFindById;
    Product.find = originalProductFind;
  }
});

test('valid credentials cannot make manipulated all-filtered requests reach the product model', async () => {
  const originalUserFindById = User.findById;
  const originalProductFind = Product.find;
  let productQueries = 0;

  try {
    User.findById = () => ({
      select: async () => ({
        email: 'owner@example.com',
        name: 'Store Owner',
        matchPassword: async () => true,
      }),
    });
    Product.find = () => {
      productQueries += 1;
      throw new Error('Manipulated selection must not reach Product.find');
    };

    const response = createResponse();
    await bulkMutateProducts({
      user: { _id: 'admin-id', isAdmin: true },
      body: {
        operation: 'deactivate',
        selection: {
          mode: 'allFiltered',
          filters: { keyword: 'bra', page: 999 },
          excludedIds: [],
        },
        credentials: { username: 'owner@example.com', password: 'valid-password' },
      },
    }, response);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.message, 'Unsupported bulk product filter: page');
    assert.equal(productQueries, 0);
  } finally {
    User.findById = originalUserFindById;
    Product.find = originalProductFind;
  }
});

test('valid credentials authorize one mutation and return authoritative counts', async () => {
  const originalUserFindById = User.findById;
  const originalProductFind = Product.find;
  const originalProductUpdateMany = Product.updateMany;
  const originalAuditCreate = AuditLog.create;
  let mutationCalls = 0;

  try {
    User.findById = () => ({
      select: async () => ({
        email: 'owner@example.com',
        name: 'Store Owner',
        matchPassword: async (password) => password === 'valid-password',
      }),
    });
    Product.find = () => ({
      select() { return this; },
      lean: async () => [{ _id: productIdA, name: 'A', slug: 'a' }],
    });
    Product.updateMany = async () => {
      mutationCalls += 1;
      return { matchedCount: 1, modifiedCount: 1 };
    };
    AuditLog.create = async () => ({});

    const response = createResponse();
    await bulkMutateProducts({
      user: { _id: 'admin-id', isAdmin: true, name: 'Store Owner', email: 'owner@example.com' },
      body: {
        operation: 'activate',
        selection: { mode: 'explicit', ids: [productIdA] },
        credentials: { username: 'owner@example.com', password: 'valid-password' },
      },
      method: 'POST',
      originalUrl: '/api/products/bulk',
      headers: {},
    }, response);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.requestedCount, 1);
    assert.equal(response.body.affectedCount, 1);
    assert.equal(mutationCalls, 1);
  } finally {
    User.findById = originalUserFindById;
    Product.find = originalProductFind;
    Product.updateMany = originalProductUpdateMany;
    AuditLog.create = originalAuditCreate;
  }
});

test('bulk route enforces rate limiting, session auth, and bulk permission before the controller', () => {
  assert.match(
    productRoutesSource,
    /router\.post\(\s*'\/bulk',\s*bulkMutationLimiter,\s*protect,\s*requirePermission\(PERMISSIONS\.BULK_MANAGE\),\s*bulkMutateProducts\s*\)/
  );
  assert.ok(
    productRoutesSource.indexOf("'/bulk'") < productRoutesSource.indexOf(".route('/:id')"),
    'The bulk route must be registered before the dynamic product ID route'
  );
});
