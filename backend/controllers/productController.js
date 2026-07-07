import mongoose from 'mongoose';
import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';
import { slugify } from './categoryController.js';

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

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildActiveProductFilter = () => ({
  $or: [{ isActive: true }, { isActive: { $exists: false } }],
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

const normalizeImageList = (images = [], image = '') => {
  const incomingImages = Array.isArray(images)
    ? images
    : typeof images === 'string'
      ? images
          .split('\n')
          .flatMap((entry) => entry.split(','))
          .map((entry) => entry.trim())
      : [];

  const uniqueImages = new Set();

  [image, ...incomingImages].forEach((entry) => {
    if (typeof entry === 'string' && entry.trim()) {
      uniqueImages.add(entry.trim());
    }
  });

  return [...uniqueImages];
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

const findProductByIdWithVisibility = async (productId, reqUser) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return null;
  }

  const filter = reqUser?.isAdmin
    ? { _id: productId }
    : {
        _id: productId,
        ...buildActiveProductFilter(),
      };

  return Product.findOne(filter);
};

const buildCategoryFilter = async (categoryValue) => {
  const trimmedCategory = String(categoryValue || '').trim();

  if (!trimmedCategory) {
    return null;
  }

  const resolvedCategoryName = await resolveCategoryName(trimmedCategory);

  return {
    category: {
      $regex: new RegExp(`^${escapeRegex(resolvedCategoryName)}$`, 'i'),
    },
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

  if (!name) {
    errors.push('Product name is required');
  }

  if (!categoryInput) {
    errors.push('Product category is required');
  }

  if (Number.isNaN(price) || price < 0) {
    errors.push('Product price is required and must be a valid number');
  }

  if (Number.isNaN(countInStock) || countInStock < 0) {
    errors.push('Stock quantity cannot be negative');
  }

  if (payload.compareAtPrice !== undefined && (Number.isNaN(compareAtPrice) || compareAtPrice < 0)) {
    errors.push('Compare-at price must be a valid non-negative number');
  }

  if (!slug) {
    errors.push('A valid product slug is required');
  }

  const existingSlug = slug ? await findExistingSlugConflict(slug, productId) : null;

  if (existingSlug) {
    errors.push('Product slug already exists');
  }

  const categoryDocument = categoryInput ? await findCategoryByValue(categoryInput) : null;

  if (!categoryDocument) {
    errors.push('Please choose a valid category');
  }

  return {
    errors,
    normalized: {
      name,
      slug,
      category: categoryDocument?.name || '',
      price: Number.isNaN(price) ? 0 : price,
      compareAtPrice: Number.isNaN(compareAtPrice) ? 0 : compareAtPrice,
      countInStock: Number.isNaN(countInStock) ? 0 : countInStock,
      image: String(payload.image || '').trim(),
      images: normalizeImageList(payload.images, payload.image),
      shortDescription: String(payload.shortDescription || '').trim(),
      description: String(payload.description || '').trim(),
      brand: String(payload.brand || 'Apex Link Group').trim() || 'Apex Link Group',
      weight: String(payload.weight || '').trim(),
      origin: String(payload.origin || '').trim(),
      ingredients: String(payload.ingredients || '').trim(),
      sku: String(payload.sku || '').trim(),
      isFeatured: parseBooleanValue(payload.isFeatured) ?? false,
      isActive: parseBooleanValue(payload.isActive) ?? true,
      isBestSeller: parseBooleanValue(payload.isBestSeller) ?? false,
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
    const isAdmin = Boolean(req.user?.isAdmin);
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

    const products = await Product.find(queryFilter)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNumber);

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
      ...(req.user?.isAdmin ? {} : buildActiveProductFilter()),
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

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      await Product.deleteOne({ _id: product._id });
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

    const product = new Product({
      user: req.user._id,
      name: normalized.name,
      slug: normalized.slug,
      image: normalized.image || DEFAULT_PRODUCT_IMAGE,
      images:
        normalized.images.length > 0
          ? normalized.images
          : [normalized.image || DEFAULT_PRODUCT_IMAGE],
      description: normalized.description,
      shortDescription:
        normalized.shortDescription || normalized.description.slice(0, 160).trim(),
      brand: normalized.brand,
      category: normalized.category,
      price: normalized.price,
      compareAtPrice: normalized.compareAtPrice,
      countInStock: normalized.countInStock,
      rating: 0,
      numReviews: 0,
      weight: normalized.weight,
      origin: normalized.origin,
      ingredients: normalized.ingredients,
      sku: normalized.sku,
      isFeatured: normalized.isFeatured,
      isActive: normalized.isActive,
      isBestSeller: normalized.isBestSeller,
    });

    const createdProduct = await product.save();
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

    product.name = normalized.name;
    product.slug = normalized.slug;
    product.image = normalized.image || product.image || DEFAULT_PRODUCT_IMAGE;
    product.images =
      normalized.images.length > 0
        ? normalized.images
        : [normalized.image || product.image || DEFAULT_PRODUCT_IMAGE];
    product.brand = normalized.brand;
    product.category = normalized.category;
    product.price = normalized.price;
    product.compareAtPrice = normalized.compareAtPrice;
    product.countInStock = normalized.countInStock;
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

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(404).json({ message: 'Product not found' });
    }

    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export { getProducts, getProductById, getProductBySlug, deleteProduct, createProduct, updateProduct };
