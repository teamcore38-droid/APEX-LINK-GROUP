import mongoose from 'mongoose';
import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';
import { slugify } from './categoryController.js';
import { hasPermission } from '../utils/permissions.js';
import { recordAuditLog } from '../utils/auditService.js';
import { PRODUCT_CARD_FIELDS, setPublicCatalogCache } from '../utils/catalogPerformance.js';
import { notifyIndexNow } from '../utils/indexNowService.js';
import { hasCopiedMarketplaceDescription } from '../utils/productSeoContent.js';
import { buildProductPath } from '../utils/productUrls.js';
import {
  destroyProductImage,
  destroyProductImages,
  isCloudinaryConfigured,
  uploadProductImageBuffer,
  uploadProductImageUrl,
} from '../utils/cloudinaryService.js';

const PRODUCT_SORT_OPTIONS = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  'price-low': { price: 1, createdAt: -1 },
  'price-high': { price: -1, createdAt: -1 },
  'stock-low': { countInStock: 1, createdAt: -1 },
  'stock-high': { countInStock: -1, createdAt: -1 },
  'name-asc': { name: 1, createdAt: -1 },
  'name-desc': { name: -1, createdAt: -1 },
};

const DEFAULT_PRODUCT_SORT = { isFeatured: -1, isBestSeller: -1, createdAt: -1 };
const DEFAULT_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=1000';
const MAX_PRODUCT_IMAGES = 12;

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildActiveProductFilter = () => ({
  $and: [
    { $or: [{ isActive: true }, { isActive: { $exists: false } }] },
    { $or: [{ approvalStatus: 'Approved' }, { approvalStatus: { $exists: false } }] },
  ],
});

const parseBooleanValue = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (['true', '1', 'yes'].includes(normalizedValue)) {
    return true;
  }

  if (['false', '0', 'no'].includes(normalizedValue)) {
    return false;
  }

  return null;
};

const parseOptionalBooleanFilter = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsedValue = parseBooleanValue(value);

  if (parsedValue === null) {
    return {
      error: `${fieldName} must be true or false`,
    };
  }

  if (parsedValue) {
    return {
      filter: { [fieldName]: true },
    };
  }

  return {
    filter: {
      $or: [{ [fieldName]: false }, { [fieldName]: { $exists: false } }],
    },
  };
};

const parseNumericValue = (value) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue)) {
    return Number.NaN;
  }

  return parsedValue;
};

const normalizeImageAsset = (entry = {}) => {
  if (typeof entry === 'string') {
    const url = entry.trim();
    return url ? { url, publicId: '' } : null;
  }

  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const url = String(entry.url || entry.secureUrl || entry.secure_url || '').trim();
  const publicId = String(entry.publicId || entry.public_id || '').trim();

  return url ? { url, publicId } : null;
};

const normalizeImageList = (images = [], image = '', imagePublicId = '') => {
  const incomingImages = Array.isArray(images)
    ? images
    : typeof images === 'string'
      ? images
          .split('\n')
          .flatMap((entry) => entry.split(','))
          .map((entry) => entry.trim())
      : [];

  const uniqueImages = new Map();
  const primaryAsset = normalizeImageAsset({
    url: image,
    publicId: imagePublicId,
  });

  [primaryAsset, ...incomingImages.map((entry) => normalizeImageAsset(entry))].forEach((asset) => {
    if (asset?.url) {
      uniqueImages.set(asset.publicId || asset.url, asset);
    }
  });

  return [...uniqueImages.values()].slice(0, MAX_PRODUCT_IMAGES);
};

const getProductImageAssets = (product = {}) => {
  const primaryAsset = normalizeImageAsset({
    url: product.image,
    publicId: product.imagePublicId,
  });
  return normalizeImageList(product.images || [], primaryAsset?.url || '', primaryAsset?.publicId || '');
};

const getProductImagePublicIds = (product = {}) =>
  getProductImageAssets(product)
    .map((asset) => asset.publicId)
    .filter(Boolean);

const getRemovedProductImagePublicIds = (beforeProduct = {}, nextImages = []) => {
  const nextPublicIds = new Set(
    nextImages
      .map((asset) => normalizeImageAsset(asset)?.publicId)
      .filter(Boolean)
  );

  return getProductImagePublicIds(beforeProduct).filter((publicId) => !nextPublicIds.has(publicId));
};

const buildProductImagesForSave = (normalized, fallbackImage = DEFAULT_PRODUCT_IMAGE, fallbackPublicId = '') => {
  const images =
    normalized.images.length > 0
      ? normalized.images
      : [
          {
            url: normalized.image || fallbackImage,
            publicId: normalized.imagePublicId || fallbackPublicId,
          },
        ];
  const primaryImage = images[0] || { url: fallbackImage, publicId: '' };

  return {
    image: primaryImage.url || fallbackImage,
    imagePublicId: primaryImage.publicId || '',
    images,
  };
};

const normalizeVariants = (variants = []) => {
  const incomingVariants = Array.isArray(variants) ? variants : [];

  return incomingVariants
    .map((variant) => {
      const normalizedImages = normalizeImageList(variant.images, variant.image, variant.imagePublicId);
      const primaryImage = normalizedImages[0] || { url: '', publicId: '' };

      return {
        _id: variant._id,
        label: String(variant.label || '').trim(),
        sku: String(variant.sku || '').trim(),
        size: String(variant.size || '').trim(),
        color: String(variant.color || '').trim(),
        availableSizes: Array.isArray(variant.availableSizes)
          ? variant.availableSizes.map((size) => String(size || '').trim()).filter(Boolean)
          : typeof variant.availableSizes === 'string'
            ? variant.availableSizes.split(',').map((size) => size.trim()).filter(Boolean)
            : [],
        image: primaryImage.url,
        imagePublicId: primaryImage.publicId,
        images: normalizedImages,
        weight: String(variant.weight || '').trim(),
        packaging: String(variant.packaging || '').trim(),
        price: Number(variant.price || 0),
        priceAdjustment: Number(variant.priceAdjustment || 0),
        countInStock: Number(variant.countInStock || 0),
        reservedStock: Number(variant.reservedStock || 0),
        lowStockThreshold: Number(variant.lowStockThreshold ?? 5),
        isActive: parseBooleanValue(variant.isActive) ?? true,
      };
    })
    .filter((variant) => variant.label);
};

const normalizeSeoPayload = (seo = {}, fallback = {}) => {
  const keywords = Array.isArray(seo.keywords)
    ? seo.keywords
    : typeof seo.keywords === 'string'
      ? seo.keywords.split(',')
      : [];

  return {
    title: String(seo.title || fallback.title || '').trim(),
    description: String(seo.description || fallback.description || '').trim(),
    keywords: keywords.map((keyword) => String(keyword || '').trim()).filter(Boolean),
    canonicalUrl: String(seo.canonicalUrl || '').trim(),
    ogImage: String(seo.ogImage || fallback.ogImage || '').trim(),
  };
};

const findCategoryByValue = async (value = '') => {
  const trimmedValue = String(value).trim();

  if (!trimmedValue) {
    return null;
  }

  const normalizedSlug = slugify(trimmedValue);
  return Category.findOne({
    $or: [
      { slug: normalizedSlug },
      { name: { $regex: new RegExp(`^${escapeRegex(trimmedValue)}$`, 'i') } },
    ],
  });
};

const resolveCategoryName = async (value = '') => {
  const trimmedValue = String(value).trim();

  if (!trimmedValue) {
    return '';
  }

  const category = await findCategoryByValue(trimmedValue);

  return category?.name || trimmedValue;
};

const getCategoryInputs = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === 'string') {
    return value.split(',');
  }

  return [];
};

const resolveProductCategoryNames = async ({ primaryCategory = '', categories = [] }) => {
  const normalizedPrimaryCategory = String(primaryCategory || '').trim().toLowerCase();
  const inputs = [primaryCategory, ...getCategoryInputs(categories)]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  const uniqueInputs = [...new Set(inputs.map((value) => value.toLowerCase()))]
    .map((lowerValue) => inputs.find((value) => value.toLowerCase() === lowerValue));
  const resolvedCategories = [];
  const invalidCategories = [];

  for (const input of uniqueInputs) {
    const category = await findCategoryByValue(input);

    if (!category) {
      invalidCategories.push(input);
      continue;
    }

    if (!resolvedCategories.some((name) => name.toLowerCase() === category.name.toLowerCase())) {
      resolvedCategories.push(category.name);
    }
  }

  return {
    categories: resolvedCategories,
    invalidCategories: invalidCategories.filter(
      (categoryName) =>
        !(resolvedCategories.length > 0 && categoryName.toLowerCase() === normalizedPrimaryCategory)
    ),
  };
};

const findProductByIdWithVisibility = async (productId, reqUser) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return null;
  }

  const filter = hasPermission(reqUser, 'catalog:read')
    ? { _id: productId }
    : {
        _id: productId,
        ...buildActiveProductFilter(),
      };

  return Product.findOne(filter);
};

const getAllDescendantCategoryNames = async (rootCategoryDoc) => {
  const names = [rootCategoryDoc.name];
  const queue = [rootCategoryDoc._id];
  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = await Category.find({ parentCategory: currentId, isActive: true });
    for (const child of children) {
      names.push(child.name);
      queue.push(child._id);
    }
  }
  return names;
};

const buildCategoryFilter = async (categoryValue) => {
  const trimmedCategory = String(categoryValue || '').trim();

  if (!trimmedCategory) {
    return null;
  }

  const categoryDoc = await findCategoryByValue(trimmedCategory);
  if (!categoryDoc) {
    const categoryRegex = new RegExp(`^${escapeRegex(trimmedCategory)}$`, 'i');
    return {
      $or: [{ category: categoryRegex }, { categories: categoryRegex }],
    };
  }

  const categoryNames = await getAllDescendantCategoryNames(categoryDoc);
  const regexPattern = categoryNames.map((name) => `^${escapeRegex(name)}$`).join('|');
  const categoryRegex = new RegExp(regexPattern, 'i');

  return {
    $or: [{ category: categoryRegex }, { categories: categoryRegex }],
  };
};

const buildPaginationPayload = ({ products, page, limit, totalProducts }) => {
  const totalPages = totalProducts === 0 ? 1 : Math.ceil(totalProducts / limit);
  const currentPage = totalProducts === 0 ? 1 : Math.min(page, totalPages);

  return {
    products,
    currentPage,
    totalPages,
    totalProducts,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  };
};

const findExistingSlugConflict = async (slug, productId = null) => {
  if (!slug) {
    return null;
  }

  return Product.findOne({
    slug,
    ...(productId ? { _id: { $ne: productId } } : {}),
  });
};

const validateProductPayload = async (payload, { productId = null } = {}) => {
  const errors = [];
  const name = String(payload.name || '').trim();
  const categoryInput = String(payload.category || '').trim();
  const slug = slugify(payload.slug || name);
  const price = Number(payload.price);
  const countInStock = Number(payload.countInStock ?? 0);
  const compareAtPrice = Number(payload.compareAtPrice ?? 0);
  const lowStockThreshold = Number(payload.lowStockThreshold ?? 10);
  const variants = normalizeVariants(payload.variants);

  if (!name) {
    errors.push('Product name is required');
  }

  if (!categoryInput) {
    errors.push('Product category is required');
  }

  const description = String(payload.description || '').trim();

  if (!description) {
    errors.push('Product description is required');
  } else if (hasCopiedMarketplaceDescription(description)) {
    errors.push('Product description must not contain copied marketplace or certification text');
  }

  if (Number.isNaN(price) || price <= 0) {
    errors.push('Product price is required and must be greater than zero');
  }

  if (Number.isNaN(countInStock) || countInStock < 0) {
    errors.push('Stock quantity cannot be negative');
  }

  if (payload.compareAtPrice !== undefined && (Number.isNaN(compareAtPrice) || compareAtPrice < 0)) {
    errors.push('Compare-at price must be a valid non-negative number');
  }

  if (Number.isNaN(lowStockThreshold) || lowStockThreshold < 0) {
    errors.push('Low-stock threshold must be a valid non-negative number');
  }

  variants.forEach((variant) => {
    if (Number.isNaN(variant.priceAdjustment)) {
      errors.push(`Variant ${variant.label} price adjustment must be a valid number`);
    }

    if (Number.isNaN(variant.price) || variant.price < 0) {
      errors.push(`Variant ${variant.label} price must be a valid non-negative number`);
    }

    if (Number.isNaN(variant.countInStock) || variant.countInStock < 0) {
      errors.push(`Variant ${variant.label} stock cannot be negative`);
    }
  });

  if (!slug) {
    errors.push('A valid product slug is required');
  }

  const normalizedSizes = Array.isArray(payload.sizes)
    ? payload.sizes.map((s) => ({
        size: String(s.size || '').trim(),
        price: Number.isNaN(Number(s.price)) || Number(s.price) < 0 ? 0 : Number(s.price),
        countInStock: Math.max(0, Number(s.countInStock || 0)),
        reservedStock: Math.max(0, Number(s.reservedStock || 0)),
        colors: Array.isArray(s.colors)
          ? s.colors.map((c) => String(c || '').trim()).filter(Boolean)
          : typeof s.colors === 'string'
            ? s.colors.split(',').map((c) => c.trim()).filter(Boolean)
            : [],
      })).filter((s) => Boolean(s.size))
    : [];

  if (payload.hasSizes && normalizedSizes.length === 0) {
    errors.push('Add at least one size option or turn off size selection');
  }

  normalizedSizes.forEach((sizeOption) => {
    if (Number.isNaN(sizeOption.price) || sizeOption.price < 0) {
      errors.push(`Size ${sizeOption.size} price must be a valid non-negative number`);
    }

    if (Number.isNaN(sizeOption.countInStock) || sizeOption.countInStock < 0) {
      errors.push(`Size ${sizeOption.size} stock cannot be negative`);
    }
  });

  const combinationVariants = variants.filter((variant) => variant.size && (variant.color || variant.label));

  if (payload.hasSizes && combinationVariants.length === 0) {
    errors.push('Add at least one Size + Color combination');
  }

  if (payload.hasSizes) {
    const validSizes = new Set(normalizedSizes.map((sizeOption) => sizeOption.size));

    combinationVariants.forEach((variant) => {
      if (!validSizes.has(variant.size)) {
        errors.push(`${variant.label} uses a size that is not in Size Options`);
      }
    });
  }

  const colorsBySize = new Map();

  combinationVariants.forEach((variant) => {
    const colors = colorsBySize.get(variant.size) || new Set();
    colors.add(variant.color || variant.label);
    colorsBySize.set(variant.size, colors);
  });

  const sizesWithLinkedColors = normalizedSizes.map((sizeOption) => ({
    ...sizeOption,
    colors: [...(colorsBySize.get(sizeOption.size) || new Set())],
  }));

  const existingSlug = slug ? await findExistingSlugConflict(slug, productId) : null;

  if (existingSlug) {
    errors.push('Product slug already exists');
  }

  const {
    categories: normalizedCategories,
    invalidCategories,
  } = await resolveProductCategoryNames({
    primaryCategory: categoryInput,
    categories: payload.categories,
  });

  if (invalidCategories.length > 0 || normalizedCategories.length === 0) {
    errors.push('Please choose a valid category');
  }

  return {
    errors,
    normalized: {
      name,
      slug,
      category: normalizedCategories[0] || '',
      categories: normalizedCategories,
      price: Number.isNaN(price) ? 0 : price,
      compareAtPrice: Number.isNaN(compareAtPrice) ? 0 : compareAtPrice,
      countInStock: Number.isNaN(countInStock) ? 0 : countInStock,
      lowStockThreshold: Number.isNaN(lowStockThreshold) ? 10 : lowStockThreshold,
      variants,
      hasSizes: Boolean(payload.hasSizes),
      sizes: sizesWithLinkedColors,
      image: String(payload.image || '').trim(),
      imagePublicId: String(payload.imagePublicId || '').trim(),
      images: normalizeImageList(payload.images, payload.image, payload.imagePublicId),
      shortDescription: String(payload.shortDescription || '').trim(),
      description,
      brand: String(payload.brand || 'Apex Fashion').trim() || 'Apex Fashion',
      weight: String(payload.weight || '').trim(),
      origin: String(payload.origin || '').trim(),
      ingredients: String(payload.ingredients || '').trim(),
      sku: String(payload.sku || '').trim(),
      isFeatured: parseBooleanValue(payload.isFeatured) ?? false,
      isActive: parseBooleanValue(payload.isActive) ?? true,
      isBestSeller: parseBooleanValue(payload.isBestSeller) ?? false,
      approvalStatus: ['Approved', 'Pending', 'Rejected'].includes(payload.approvalStatus)
        ? payload.approvalStatus
        : 'Approved',
      seo: normalizeSeoPayload(payload.seo, {
        title: name,
        description: String(payload.shortDescription || payload.description || '').slice(0, 160),
        ogImage: String(payload.image || '').trim(),
      }),
    },
  };
};

// @desc    Fetch all products
// @route   GET /api/products
// @access  Public/Admin(optional for inactive)
const getProducts = async (req, res) => {
  try {
    const {
      active = '',
      bestSeller = '',
      category = '',
      exclude = '',
      featured = '',
      keyword = '',
      limit = '12',
      maxPrice = '',
      minPrice = '',
      page = '1',
      sort = '',
      stock = '',
    } = req.query;

    const filters = [];
    const isAdmin = hasPermission(req.user, 'catalog:read');
    const trimmedKeyword = String(keyword).trim();
    const normalizedActive = String(active).trim().toLowerCase();
    const normalizedStock = String(stock).trim().toLowerCase();
    const sortKey = String(sort).trim();
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1);
    const limitNumber = Math.min(48, Math.max(1, Number.parseInt(limit, 10) || 12));

    if (!isAdmin) {
      filters.push(buildActiveProductFilter());
    } else if (normalizedActive === 'true') {
      filters.push(buildActiveProductFilter());
    } else if (normalizedActive === 'false') {
      filters.push({ isActive: false });
    } else if (normalizedActive && normalizedActive !== 'all') {
      return res.status(400).json({ message: 'active must be true, false, or all' });
    }

    if (trimmedKeyword) {
      const keywordPattern = new RegExp(escapeRegex(trimmedKeyword), 'i');

      filters.push({
        $or: [
          { name: keywordPattern },
          { shortDescription: keywordPattern },
          { description: keywordPattern },
          { brand: keywordPattern },
          { origin: keywordPattern },
          { ingredients: keywordPattern },
          { sku: keywordPattern },
        ],
      });
    }

    const categoryFilter = await buildCategoryFilter(category);

    if (categoryFilter) {
      filters.push(categoryFilter);
    }

    const normalizedMinPrice = parseNumericValue(minPrice);
    const normalizedMaxPrice = parseNumericValue(maxPrice);

    if (Number.isNaN(normalizedMinPrice) || Number.isNaN(normalizedMaxPrice)) {
      return res.status(400).json({ message: 'Price filters must be valid numbers' });
    }

    if (normalizedMinPrice !== null || normalizedMaxPrice !== null) {
      const priceFilter = {};

      if (normalizedMinPrice !== null) {
        priceFilter.$gte = normalizedMinPrice;
      }

      if (normalizedMaxPrice !== null) {
        priceFilter.$lte = normalizedMaxPrice;
      }

      filters.push({ price: priceFilter });
    }

    if (normalizedStock) {
      if (normalizedStock === 'in-stock') {
        filters.push({ countInStock: { $gt: 0 } });
      } else if (normalizedStock === 'out-of-stock') {
        filters.push({ countInStock: { $lte: 0 } });
      } else if (normalizedStock === 'low-stock') {
        filters.push({ countInStock: { $gt: 0, $lte: 10 } });
      } else {
        return res.status(400).json({ message: 'stock must be in-stock, out-of-stock, or low-stock' });
      }
    }

    const featuredFilter = parseOptionalBooleanFilter(featured, 'isFeatured');

    if (featuredFilter?.error) {
      return res.status(400).json({ message: featuredFilter.error });
    }

    if (featuredFilter?.filter) {
      filters.push(featuredFilter.filter);
    }

    const bestSellerFilter = parseOptionalBooleanFilter(bestSeller, 'isBestSeller');

    if (bestSellerFilter?.error) {
      return res.status(400).json({ message: bestSellerFilter.error });
    }

    if (bestSellerFilter?.filter) {
      filters.push(bestSellerFilter.filter);
    }

    if (exclude && mongoose.Types.ObjectId.isValid(exclude)) {
      filters.push({ _id: { $ne: exclude } });
    }

    const queryFilter = filters.length > 0 ? { $and: filters } : {};
    const totalProducts = await Product.countDocuments(queryFilter);
    const totalPages = totalProducts === 0 ? 1 : Math.ceil(totalProducts / limitNumber);
    const currentPage = totalProducts === 0 ? 1 : Math.min(pageNumber, totalPages);
    const skip = (currentPage - 1) * limitNumber;
    const sortOption = PRODUCT_SORT_OPTIONS[sortKey] || DEFAULT_PRODUCT_SORT;

    let productsQuery = Product.find(queryFilter)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNumber);

    if (!isAdmin) {
      productsQuery = productsQuery.select(PRODUCT_CARD_FIELDS).lean();
    }

    const products = await productsQuery;

    if (!isAdmin) {
      setPublicCatalogCache(res);
    }
    res.vary('Authorization');

    res.json(
      buildPaginationPayload({
        products,
        page: currentPage,
        limit: limitNumber,
        totalProducts,
      })
    );
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Fetch single product
// @route   GET /api/products/:id
// @access  Public/Admin(optional for inactive)
const getProductById = async (req, res) => {
  try {
    const product = await findProductByIdWithVisibility(req.params.id, req.user);

    if (product) {
      return res.json(product);
    }

    res.status(404).json({ message: 'Product not found' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Fetch single product by slug
// @route   GET /api/products/slug/:slug
// @access  Public/Admin(optional for inactive)
const getProductBySlug = async (req, res) => {
  try {
    const slug = slugify(req.params.slug);

    if (!slug) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const product = await Product.findOne({
      slug,
      ...(hasPermission(req.user, 'catalog:read') ? {} : buildActiveProductFilter()),
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Upload product images to Cloudinary
// @route   POST /api/products/images
// @access  Private/Admin
const uploadProductImages = async (req, res) => {
  try {
    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        message: 'Cloudinary is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      });
    }

    const files = Array.isArray(req.files) ? req.files : [];
    const sourceUrl = String(req.body?.sourceUrl || '').trim();

    if (files.length === 0 && !sourceUrl) {
      return res.status(400).json({ message: 'Choose an image file or provide an image URL to import' });
    }

    const uploadedImages = [];

    for (const file of files.slice(0, MAX_PRODUCT_IMAGES)) {
      uploadedImages.push(
        await uploadProductImageBuffer(file.buffer, {
          originalName: file.originalname || '',
        })
      );
    }

    if (sourceUrl) {
      uploadedImages.push(await uploadProductImageUrl(sourceUrl));
    }

    await recordAuditLog(req, 'catalog.product.image.upload', 'Product', '', {
      total: uploadedImages.length,
      publicIds: uploadedImages.map((image) => image.publicId),
    });

    res.status(201).json({ images: uploadedImages });
  } catch (error) {
    console.error('[productController:uploadProductImages]', error);
    res.status(500).json({ message: error.message || 'Unable to upload product images' });
  }
};

// @desc    Delete a Cloudinary product image
// @route   DELETE /api/products/images
// @access  Private/Admin
const deleteProductImage = async (req, res) => {
  try {
    const publicId = String(req.body?.publicId || '').trim();

    if (!publicId) {
      return res.status(400).json({ message: 'Cloudinary public ID is required' });
    }

    await destroyProductImage(publicId);
    await recordAuditLog(req, 'catalog.product.image.delete', 'Product', '', { publicId });
    res.json({ message: 'Image deleted', publicId });
  } catch (error) {
    console.error('[productController:deleteProductImage]', error);
    res.status(500).json({ message: error.message || 'Unable to delete product image' });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      const publicIdsToDelete = getProductImagePublicIds(product);
      await Product.deleteOne({ _id: product._id });
      await destroyProductImages(publicIdsToDelete);
      await recordAuditLog(req, 'catalog.product.delete', 'Product', product._id, {
        name: product.name,
        deletedImagePublicIds: publicIdsToDelete,
      });
      await notifyIndexNow([buildProductPath(product), '/products', '/sitemap.xml']);
      return res.json({ message: 'Product removed' });
    }

    res.status(404).json({ message: 'Product not found' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Product not found' });
    }

    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  try {
    const { errors, normalized } = await validateProductPayload(req.body || {});

    if (errors.length > 0) {
      return res.status(400).json({ message: errors[0] });
    }

    const imagePayload = buildProductImagesForSave(normalized);
    const product = new Product({
      user: req.user._id,
      name: normalized.name,
      slug: normalized.slug,
      image: imagePayload.image,
      imagePublicId: imagePayload.imagePublicId,
      images: imagePayload.images,
      description: normalized.description,
      shortDescription:
        normalized.shortDescription || normalized.description.slice(0, 160).trim(),
      brand: normalized.brand,
      category: normalized.category,
      categories: normalized.categories,
      price: normalized.price,
      compareAtPrice: normalized.compareAtPrice,
      countInStock: normalized.countInStock,
      lowStockThreshold: normalized.lowStockThreshold,
      variants: normalized.variants,
      hasSizes: normalized.hasSizes,
      sizes: normalized.sizes,
      rating: 0,
      numReviews: 0,
      weight: normalized.weight,
      origin: normalized.origin,
      ingredients: normalized.ingredients,
      sku: normalized.sku,
      isFeatured: normalized.isFeatured,
      isActive: normalized.isActive,
      isBestSeller: normalized.isBestSeller,
      approvalStatus: normalized.approvalStatus,
      seo: normalized.seo,
    });

    const createdProduct = await product.save();
    await recordAuditLog(req, 'catalog.product.create', 'Product', createdProduct._id, {
      name: createdProduct.name,
    });
    await notifyIndexNow([buildProductPath(createdProduct), '/products', '/sitemap.xml']);
    res.status(201).json(createdProduct);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const { errors, normalized } = await validateProductPayload(req.body || {}, {
      productId: product._id,
    });

    if (errors.length > 0) {
      return res.status(400).json({ message: errors[0] });
    }

    const previousProduct = product.toObject();
    const imagePayload = buildProductImagesForSave(
      normalized,
      product.image || DEFAULT_PRODUCT_IMAGE,
      product.imagePublicId || ''
    );
    const removedImagePublicIds = getRemovedProductImagePublicIds(previousProduct, imagePayload.images);

    product.name = normalized.name;
    product.slug = normalized.slug;
    product.image = imagePayload.image;
    product.imagePublicId = imagePayload.imagePublicId;
    product.images = imagePayload.images;
    product.brand = normalized.brand;
    product.category = normalized.category;
    product.categories = normalized.categories;
    product.price = normalized.price;
    product.compareAtPrice = normalized.compareAtPrice;
    product.countInStock = normalized.countInStock;
    product.lowStockThreshold = normalized.lowStockThreshold;
    product.variants = normalized.variants;
    product.hasSizes = normalized.hasSizes;
    product.sizes = normalized.sizes;
    product.shortDescription =
      normalized.shortDescription || normalized.description.slice(0, 160).trim();
    product.description = normalized.description;
    product.weight = normalized.weight;
    product.origin = normalized.origin;
    product.ingredients = normalized.ingredients;
    product.sku = normalized.sku;
    product.isFeatured = normalized.isFeatured;
    product.isActive = normalized.isActive;
    product.isBestSeller = normalized.isBestSeller;
    product.approvalStatus = normalized.approvalStatus;
    product.seo = normalized.seo;

    const updatedProduct = await product.save();
    await destroyProductImages(removedImagePublicIds);
    await recordAuditLog(req, 'catalog.product.update', 'Product', updatedProduct._id, {
      name: updatedProduct.name,
      deletedImagePublicIds: removedImagePublicIds,
    });
    await notifyIndexNow([
      buildProductPath(previousProduct),
      buildProductPath(updatedProduct),
      '/products',
      '/sitemap.xml',
    ]);
    res.json(updatedProduct);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Product not found' });
    }

    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export {
  DEFAULT_PRODUCT_IMAGE,
  buildProductImagesForSave,
  validateProductPayload,
  getProducts,
  getProductById,
  getProductBySlug,
  uploadProductImages,
  deleteProductImage,
  deleteProduct,
  createProduct,
  updateProduct,
};
