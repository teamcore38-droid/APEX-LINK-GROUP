import dotenv from 'dotenv';
import connectDB from './config/db.js';
import categories from './data/categories.js';
import Category from './models/categoryModel.js';
import Product from './models/productModel.js';

dotenv.config();

await connectDB({ strict: true });

const seedCategories = async () => {
  try {
    let parentCount = 0;
    let childCount = 0;

    for (const catData of categories) {
      const { children, ...parentPayload } = catData;

      let parentDoc = await Category.findOne({ slug: parentPayload.slug });
      if (parentDoc) {
        parentDoc.name = parentPayload.name;
        parentDoc.description = parentPayload.description;
        parentDoc.image = parentPayload.image;
        parentDoc.isActive = parentPayload.isActive;
        parentDoc.displayOrder = parentPayload.displayOrder;
        parentDoc.parentCategory = null;
        await parentDoc.save();
      } else {
        parentDoc = await Category.create({ ...parentPayload, parentCategory: null });
        parentCount++;
      }

      if (Array.isArray(children)) {
        for (const childPayload of children) {
          let childDoc = await Category.findOne({ slug: childPayload.slug });
          if (childDoc) {
            childDoc.name = childPayload.name;
            childDoc.description = childPayload.description;
            childDoc.image = childPayload.image;
            childDoc.isActive = childPayload.isActive;
            childDoc.displayOrder = childPayload.displayOrder;
            childDoc.parentCategory = parentDoc._id;
            await childDoc.save();
          } else {
            await Category.create({ ...childPayload, parentCategory: parentDoc._id });
            childCount++;
          }
        }
      }
    }

    console.log(`Seeded categories: ${parentCount} parents, ${childCount} children.`);

    // Reassign products to suitable categories if needed
    const products = await Product.find({});
    for (const prod of products) {
      const catLower = (prod.category || '').toLowerCase();
      if (catLower.includes('textiles') || catLower.includes('apparel') || catLower.includes('clothing') || catLower.includes('fashion')) {
        prod.category = 'Women';
        await prod.save();
      } else if (catLower.includes('shoe') || catLower.includes('footwear')) {
        prod.category = 'Shoes & Footwear';
        await prod.save();
      } else if (catLower.includes('electronics') || catLower.includes('it')) {
        prod.category = 'Watches';
        await prod.save();
      } else if (catLower.includes('spice') || catLower.includes('food')) {
        prod.category = 'Women';
        await prod.save();
      }
    }
    console.log('Reassigned existing products to hierarchical categories successfully.');

    process.exit(0);
  } catch (error) {
    console.error(`Error seeding categories: ${error.message}`);
    process.exit(1);
  }
};

seedCategories();
