import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Product from '../models/productModel.js';
import { uploadProductImageBuffer } from '../utils/cloudinaryService.js';

dotenv.config();

const isMyntraUrl = (value = '') => /assets\.myntassets\.com/i.test(String(value || ''));

const getAssetUrl = (asset) =>
  typeof asset === 'string' ? asset : asset?.url || asset?.secureUrl || asset?.secure_url || '';

const uploadCache = new Map();

const importAsset = async (sourceUrl) => {
  if (!isMyntraUrl(sourceUrl)) {
    return null;
  }

  if (!uploadCache.has(sourceUrl)) {
    uploadCache.set(
      sourceUrl,
      (async () => {
        const response = await fetch(sourceUrl, {
          headers: { 'User-Agent': 'ApexFashion-ImageImporter/1.0' },
          signal: AbortSignal.timeout(30000),
        });

        if (!response.ok) {
          throw new Error(`source returned ${response.status}`);
        }

        const contentType = String(response.headers.get('content-type') || '').toLowerCase();
        if (!contentType.startsWith('image/')) {
          throw new Error(`source returned ${contentType || 'an unknown content type'}`);
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        return uploadProductImageBuffer(buffer, { originalName: 'myntra-product-image.jpg' });
      })()
    );
  }

  return uploadCache.get(sourceUrl);
};

const replaceAsset = async (asset) => {
  const sourceUrl = getAssetUrl(asset);
  const uploaded = await importAsset(sourceUrl);

  if (!uploaded) {
    return { asset, changed: false };
  }

  if (typeof asset === 'string') {
    return { asset: uploaded.url, publicId: uploaded.publicId, changed: true };
  }

  return {
    asset: {
      ...asset,
      url: uploaded.url,
      secureUrl: uploaded.secureUrl,
      publicId: uploaded.publicId,
      width: uploaded.width,
      height: uploaded.height,
      format: uploaded.format,
    },
    changed: true,
  };
};

const migrateProduct = async (product) => {
  let changed = false;
  const primary = await replaceAsset(product.image);
  const images = [];

  if (primary.changed) {
    product.image = primary.asset;
    product.imagePublicId = primary.publicId || primary.asset.publicId || '';
    changed = true;
  }

  for (const image of product.images || []) {
    const result = await replaceAsset(image);
    images.push(result.asset);
    changed ||= result.changed;
  }

  const variants = [];
  for (const variant of product.variants || []) {
    const variantCopy = variant.toObject ? variant.toObject() : { ...variant };
    const variantPrimary = await replaceAsset(variantCopy.image);
    const variantImages = [];

    if (variantPrimary.changed) {
      variantCopy.image = variantPrimary.asset;
      variantCopy.imagePublicId = variantPrimary.publicId || variantPrimary.asset.publicId || '';
      changed = true;
    }

    for (const image of variantCopy.images || []) {
      const result = await replaceAsset(image);
      variantImages.push(result.asset);
      changed ||= result.changed;
    }

    if (variantPrimary.changed || variantImages.some((image, index) => image !== variantCopy.images?.[index])) {
      variantCopy.images = variantImages;
    }

    variants.push(variantCopy);
  }

  if (changed) {
    product.images = images;
    product.variants = variants;
    await Product.updateOne(
      { _id: product._id },
      {
        $set: {
          image: product.image,
          imagePublicId: product.imagePublicId || '',
          images,
          variants,
        },
      }
    );
  }

  return changed;
};

const execute = process.argv.includes('--execute');
const connectionString = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!connectionString) {
  throw new Error('MONGO_URI or MONGODB_URI is required');
}

await mongoose.connect(connectionString, { serverSelectionTimeoutMS: 10000 });
const products = await Product.find({
  $or: [
    { image: /assets\.myntassets\.com/i },
    { images: /assets\.myntassets\.com/i },
    { 'images.url': /assets\.myntassets\.com/i },
    { 'variants.image': /assets\.myntassets\.com/i },
    { 'variants.images': /assets\.myntassets\.com/i },
    { 'variants.images.url': /assets\.myntassets\.com/i },
  ],
});
const affected = products.length;

if (!execute) {
  console.log(`Dry run: ${affected} product records contain Myntra image URLs. Re-run with --execute to import them.`);
  await mongoose.disconnect();
  process.exit(0);
}

let migrated = 0;
let failed = 0;
const concurrency = 4;
for (let index = 0; index < products.length; index += concurrency) {
  const batch = products.slice(index, index + concurrency);
  await Promise.all(
    batch.map(async (product) => {
      try {
        if (await migrateProduct(product)) {
          migrated += 1;
          process.stdout.write(`Migrated ${migrated}/${affected}: ${product._id}\n`);
        }
      } catch (error) {
        failed += 1;
        process.stdout.write(`Failed ${product._id}: ${error.message}\n`);
      }
    })
  );
}

await mongoose.disconnect();
console.log(`Completed: ${migrated} product records migrated; ${uploadCache.size} unique source images imported; ${failed} failed records.`);
