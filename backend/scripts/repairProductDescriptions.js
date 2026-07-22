import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Product from '../models/productModel.js';
import {
  buildDatabaseProductDescription,
  cleanProductText,
  hasCopiedMarketplaceDescription,
} from '../utils/productSeoContent.js';

dotenv.config();

const applyChanges = process.argv.includes('--apply');
const needsRepair = (value = '') =>
  !cleanProductText(value) || hasCopiedMarketplaceDescription(value);

try {
  await connectDB({ strict: true });
  const products = await Product.find({}).lean();
  const repairs = products
    .filter((product) => needsRepair(product.description))
    .map((product) => {
      const description = buildDatabaseProductDescription(product);
      return {
        id: product._id.toString(),
        name: product.name,
        previousDescription: product.description || '',
        description,
        shortDescription: description.slice(0, 160),
      };
    });

  console.log(`[product-description-repair] ${repairs.length} of ${products.length} products require repair.`);

  if (!applyChanges) {
    repairs.forEach((repair) => console.log(`- ${repair.name}`));
    console.log('Dry run only. Re-run with --apply to update the database.');
  } else if (repairs.length > 0) {
    const backupDirectory = resolve('../.codex-logs');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = resolve(backupDirectory, `product-descriptions-${timestamp}.log`);
    await mkdir(backupDirectory, { recursive: true });
    await writeFile(backupPath, JSON.stringify(repairs, null, 2), 'utf8');

    const operations = repairs.map((repair) => ({
      updateOne: {
        filter: { _id: repair.id },
        update: {
          $set: {
            description: repair.description,
            shortDescription: repair.shortDescription,
            'seo.description': repair.shortDescription,
          },
        },
      },
    }));
    const result = await Product.bulkWrite(operations, { ordered: false });
    console.log(`[product-description-repair] Updated ${result.modifiedCount} products.`);
    console.log(`[product-description-repair] Backup written to ${backupPath}.`);
  }
} catch (error) {
  console.error(`[product-description-repair] ${error.message}`);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
