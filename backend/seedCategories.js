import dotenv from 'dotenv';
import connectDB from './config/db.js';
import categories from './data/categories.js';
import products from './data/products.js';
import Category from './models/categoryModel.js';

dotenv.config();

await connectDB({ strict: true });

const slugify = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const categoryImageByName = {
  'textiles & apparel':
    'https://images.pexels.com/photos/6069552/pexels-photo-6069552.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'spices & food products':
    'https://images.pexels.com/photos/1435894/pexels-photo-1435894.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'it solutions & electronics':
    'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'industrial & machinery':
    'https://images.pexels.com/photos/1145434/pexels-photo-1145434.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'home & living':
    'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'health & beauty':
    'https://images.pexels.com/photos/3735657/pexels-photo-3735657.jpeg?auto=compress&cs=tinysrgb&w=1400',
};

const categoryDescriptionByName = {
  'textiles & apparel':
    'Premium fabrics, garments, and technical textiles sourced from certified mills and trusted manufacturers worldwide.',
  'spices & food products':
    'Authentic spices, gourmet ingredients, and packaged food products with full traceability from origin to shelf.',
  'it solutions & electronics':
    'Enterprise hardware, software solutions, and consumer electronics from leading global technology partners.',
  'industrial & machinery':
    'Heavy machinery, tools, components, and industrial supplies engineered for reliability and certified performance.',
  'home & living':
    'Elegant furniture, decor, and lifestyle essentials curated for modern homes and hospitality spaces.',
  'health & beauty':
    'Certified personal care, wellness, and beauty products from internationally accredited manufacturers.',
};

const mergeCategorySeedWithProductCategories = () => {
  const mergedBySlug = new Map();

  categories.forEach((category, index) => {
    const normalizedSlug = slugify(category.slug || category.name);

    mergedBySlug.set(normalizedSlug, {
      name: category.name,
      slug: normalizedSlug,
      description: category.description || '',
      image:
        category.image ||
        categoryImageByName[String(category.name || '').toLowerCase()] ||
        '',
      isActive: category.isActive !== false,
      displayOrder:
        Number.isFinite(Number(category.displayOrder)) ? Number(category.displayOrder) : index + 1,
    });
  });

  const uniqueProductCategories = [...new Set(products.map((product) => String(product.category || '').trim()).filter(Boolean))];

  uniqueProductCategories.forEach((categoryName) => {
    const normalizedSlug = slugify(categoryName);

    if (!normalizedSlug || mergedBySlug.has(normalizedSlug)) {
      return;
    }

    mergedBySlug.set(normalizedSlug, {
      name: categoryName,
      slug: normalizedSlug,
      description:
        categoryDescriptionByName[String(categoryName).toLowerCase()] ||
        `Premium ${categoryName.toLowerCase()} curated for consistent quality and dependable global sourcing.`,
      image:
        categoryImageByName[String(categoryName).toLowerCase()] ||
        'https://images.pexels.com/photos/6069552/pexels-photo-6069552.jpeg?auto=compress&cs=tinysrgb&w=1400',
      isActive: true,
      displayOrder: mergedBySlug.size + 1,
    });
  });

  return [...mergedBySlug.values()].sort((a, b) => a.displayOrder - b.displayOrder);
};

const seedCategories = async () => {
  try {
    const seedPayload = mergeCategorySeedWithProductCategories();
    let insertedCount = 0;
    let updatedCount = 0;

    for (const category of seedPayload) {
      const existingCategory = await Category.findOne({ slug: category.slug });

      if (existingCategory) {
        await Category.updateOne(
          { _id: existingCategory._id },
          {
            $set: {
              name: category.name,
              description: category.description,
              image: category.image,
              isActive: category.isActive,
              displayOrder: category.displayOrder,
            },
          }
        );
        updatedCount += 1;
      } else {
        await Category.create(category);
        insertedCount += 1;
      }
    }

    console.log(
      `Category seed completed. Inserted ${insertedCount} new categories and updated ${updatedCount} existing categories.`
    );
    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedCategories();
