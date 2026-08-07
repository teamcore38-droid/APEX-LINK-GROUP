import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';

dotenv.config();

const BATCH_SIZE = 500;

const slugify = (value = '') =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const addLookupValue = (map, value, category) => {
  const key = String(value || '').trim().toLowerCase();

  if (!key) {
    return;
  }

  map.set(key, [...(map.get(key) || []), category]);
};

const buildCategoryLookup = (categories = []) => {
  const byId = new Map(categories.map((category) => [String(category._id), category]));
  const byValue = new Map();

  const getPath = (category) => {
    const slugs = [];
    const visited = new Set();
    let current = category;

    while (current) {
      const id = String(current._id);
      if (!id || visited.has(id)) break;
      visited.add(id);
      slugs.unshift(current.slug);
      current = current.parentCategory ? byId.get(String(current.parentCategory)) : null;
    }

    return slugs.filter(Boolean).join('/');
  };

  categories.forEach((category) => {
    category.path = getPath(category);
    addLookupValue(byValue, category._id, category);
    addLookupValue(byValue, category.slug, category);
    addLookupValue(byValue, category.name, category);
    addLookupValue(byValue, category.path, category);
  });

  return { byValue };
};

const resolveCategory = (lookup, value = '') => {
  const input = String(value || '').trim();

  if (!input) {
    return { category: null, ambiguous: false };
  }

  const key = mongoose.Types.ObjectId.isValid(input) ? input : slugify(input);
  const matches = lookup.byValue.get(key.toLowerCase()) || lookup.byValue.get(input.toLowerCase()) || [];

  if (matches.length <= 1) {
    return { category: matches[0] || null, ambiguous: false };
  }

  const topLevelMatch = matches.find((category) => !category.parentCategory);
  return {
    category: topLevelMatch || null,
    ambiguous: !topLevelMatch,
  };
};

const getProductCategoryInputs = (product) => [
  product.categoryRef,
  ...(Array.isArray(product.categoryRefs) ? product.categoryRefs : []),
  product.category,
  ...(Array.isArray(product.categories) ? product.categories : []),
];

const migrateProductCategoryRefs = async () => {
  await connectDB({ strict: true });

  const categories = await Category.find({}).select('_id name slug parentCategory').lean();
  const lookup = buildCategoryLookup(categories);
  const totalProducts = await Product.countDocuments({});
  const cursor = Product.find({})
    .select('_id name category categories categoryRef categoryRefs')
    .lean()
    .cursor();

  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  const ambiguous = [];
  let operations = [];

  const flush = async () => {
    if (operations.length === 0) {
      return;
    }

    await Product.bulkWrite(operations, { ordered: false });
    operations = [];
  };

  for await (const product of cursor) {
    scanned += 1;
    const resolvedCategories = [];
    let hasAmbiguousCategory = false;

    for (const input of getProductCategoryInputs(product)) {
      const { category, ambiguous: ambiguousCategory } = resolveCategory(lookup, input);

      if (ambiguousCategory) {
        hasAmbiguousCategory = true;
      }

      if (category && !resolvedCategories.some((item) => String(item._id) === String(category._id))) {
        resolvedCategories.push(category);
      }
    }

    if (hasAmbiguousCategory && resolvedCategories.length === 0) {
      ambiguous.push(`${product._id}: ${product.name}`);
      skipped += 1;
      continue;
    }

    if (resolvedCategories.length === 0) {
      skipped += 1;
      continue;
    }

    operations.push({
      updateOne: {
        filter: { _id: product._id },
        update: {
          $set: {
            categoryRef: resolvedCategories[0]._id,
            categoryRefs: resolvedCategories.map((category) => category._id),
            category: resolvedCategories[0].name,
            categories: resolvedCategories.map((category) => category.name),
          },
        },
      },
    });
    updated += 1;

    if (operations.length >= BATCH_SIZE) {
      await flush();
      console.log(`Processed ${scanned}/${totalProducts} products...`);
    }
  }

  await flush();
  await Product.createIndexes();

  console.log(`Updated ${updated} products with category references.`);
  console.log(`Skipped ${skipped} products without a resolvable category.`);

  if (ambiguous.length > 0) {
    console.log('Products requiring manual category assignment:');
    ambiguous.forEach((entry) => console.log(`- ${entry}`));
  }

  const indexes = await Product.collection.indexes();
  console.log('Current product category indexes:');
  indexes
    .filter((index) => JSON.stringify(index.key).includes('category'))
    .forEach((index) => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
};

migrateProductCategoryRefs()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error(error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
