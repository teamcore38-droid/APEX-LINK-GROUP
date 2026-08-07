import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Category from '../models/categoryModel.js';

dotenv.config();

const LEGACY_UNIQUE_INDEX_KEYS = ['name', 'slug'];
const SCOPED_INDEX_NAMES = ['category_parent_name_unique', 'category_parent_slug_unique'];

const isSingleFieldUniqueIndex = (index = {}) => {
  const keyEntries = Object.entries(index.key || {});
  return index.unique === true &&
    keyEntries.length === 1 &&
    LEGACY_UNIQUE_INDEX_KEYS.includes(keyEntries[0][0]) &&
    Number(keyEntries[0][1]) === 1;
};

const summarizeDuplicateGroups = (groups = []) =>
  groups
    .map((group) => {
      const parent = group._id.parentCategory || 'top-level';
      const field = group._id.name ? `name "${group._id.name}"` : `slug "${group._id.slug}"`;
      return `${field} under ${parent} (${group.count} categories)`;
    })
    .join('; ');

const findSiblingDuplicates = async () => Category.aggregate([
  {
    $project: {
      parentCategory: { $ifNull: ['$parentCategory', null] },
      normalizedName: { $toLower: { $trim: { input: '$name' } } },
      normalizedSlug: { $toLower: { $trim: { input: '$slug' } } },
    },
  },
  {
    $facet: {
      names: [
        {
          $group: {
            _id: { parentCategory: '$parentCategory', name: '$normalizedName' },
            count: { $sum: 1 },
            ids: { $push: '$_id' },
          },
        },
        { $match: { count: { $gt: 1 }, '_id.name': { $ne: '' } } },
      ],
      slugs: [
        {
          $group: {
            _id: { parentCategory: '$parentCategory', slug: '$normalizedSlug' },
            count: { $sum: 1 },
            ids: { $push: '$_id' },
          },
        },
        { $match: { count: { $gt: 1 }, '_id.slug': { $ne: '' } } },
      ],
    },
  },
]);

const migrateCategoryScopedIndexes = async () => {
  await connectDB({ strict: true });

  const [duplicateResult = { names: [], slugs: [] }] = await findSiblingDuplicates();
  const duplicates = [...duplicateResult.names, ...duplicateResult.slugs];

  if (duplicates.length > 0) {
    throw new Error(
      `Cannot create scoped category indexes until duplicate siblings are resolved: ${summarizeDuplicateGroups(duplicates)}`
    );
  }

  const normalized = await Category.updateMany(
    { parentCategory: { $exists: false } },
    { $set: { parentCategory: null } }
  );

  const existingIndexes = await Category.collection.indexes();
  const legacyIndexes = existingIndexes.filter(isSingleFieldUniqueIndex);

  for (const index of legacyIndexes) {
    await Category.collection.dropIndex(index.name);
    console.log(`Dropped legacy global unique category index: ${index.name}`);
  }

  await Category.createIndexes();

  const finalIndexes = await Category.collection.indexes();
  const scopedIndexes = finalIndexes.filter((index) => SCOPED_INDEX_NAMES.includes(index.name));

  console.log(`Normalized ${normalized.modifiedCount || 0} categories with missing parentCategory to null.`);
  console.log(`Added/verified scoped category indexes: ${scopedIndexes.map((index) => index.name).join(', ')}`);
  console.log('Current category indexes:');
  finalIndexes.forEach((index) => {
    console.log(`- ${index.name}: ${JSON.stringify(index.key)}${index.unique ? ' unique' : ''}`);
  });
};

migrateCategoryScopedIndexes()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error(error.message);
    await mongoose.disconnect();
    process.exit(1);
  });
