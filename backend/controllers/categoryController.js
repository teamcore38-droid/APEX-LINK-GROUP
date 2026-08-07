import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';
import mongoose from 'mongoose';
import { hasPermission } from '../utils/permissions.js';
import { recordAuditLog } from '../utils/auditService.js';
import { destroyProductImage } from '../utils/cloudinaryService.js';
import { setPublicCatalogCache } from '../utils/catalogPerformance.js';
import { notifyIndexNow } from '../utils/indexNowService.js';

const slugify = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const CATEGORY_DUPLICATE_MESSAGE = 'A category with this name or slug already exists under the selected parent.';

const normalizeBoolean = (value, fallbackValue = true) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return fallbackValue;
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

const normalizeParentCategoryInput = (parentCategory) => {
  const rawParentCategory =
    parentCategory && typeof parentCategory === 'object' && '_id' in parentCategory
      ? parentCategory._id
      : parentCategory;

  if (rawParentCategory === undefined || rawParentCategory === null) {
    return null;
  }

  const parentCategoryId = String(rawParentCategory).trim();
  return parentCategoryId && !['null', 'undefined'].includes(parentCategoryId.toLowerCase())
    ? parentCategoryId
    : null;
};

const buildParentCategoryFilter = (parentCategoryId) =>
  parentCategoryId
    ? { parentCategory: parentCategoryId }
    : { parentCategory: null };

const getCategoryId = (category) => String(category?._id || '');

const getCategoryParentId = (category) =>
  String(category?.parentCategory?._id || category?.parentCategory || '');

const decorateCategoryPaths = (categories = []) => {
  const categoryById = new Map(categories.map((category) => [getCategoryId(category), category]));

  return categories.map((category) => {
    const slugs = [];
    const names = [];
    const visited = new Set();
    let current = category;

    while (current) {
      const currentId = getCategoryId(current);

      if (!currentId || visited.has(currentId)) {
        break;
      }

      visited.add(currentId);
      slugs.unshift(current.slug);
      names.unshift(current.name);

      const parentId = getCategoryParentId(current);
      current = parentId ? categoryById.get(parentId) : null;
    }

    return {
      ...category,
      path: slugs.filter(Boolean).join('/'),
      namePath: names.filter(Boolean).join(' / '),
    };
  });
};

const attachCategoryPath = (category, path) =>
  category
    ? {
        ...category,
        path: path || category.path || category.slug,
      }
    : null;

const resolveCategoryByPath = async (path = '') => {
  const slugPath = String(path || '')
    .split('/')
    .map((segment) => slugify(segment))
    .filter(Boolean);

  if (slugPath.length === 0) {
    return null;
  }

  if (slugPath.length === 1) {
    const category =
      (await Category.findOne({ slug: slugPath[0], parentCategory: null, isActive: true }).lean()) ||
      (await Category.findOne({ slug: slugPath[0], isActive: true }).lean());

    return attachCategoryPath(category, slugPath[0]);
  }

  let parentCategoryId = null;
  let category = null;

  for (const slugSegment of slugPath) {
    category = await Category.findOne({
      slug: slugSegment,
      ...buildParentCategoryFilter(parentCategoryId),
      isActive: true,
    }).lean();

    if (!category) {
      return null;
    }

    parentCategoryId = category._id;
  }

  return attachCategoryPath(category, slugPath.join('/'));
};

const isDuplicateCategoryKeyError = (error) =>
  Boolean(
    error?.code === 11000 &&
    (
      error.keyPattern?.slug ||
      error.keyPattern?.name ||
      error.keyPattern?.parentCategory ||
      error.message?.includes('category_parent_name_unique') ||
      error.message?.includes('category_parent_slug_unique') ||
      error.message?.includes('slug_1') ||
      error.message?.includes('name_1')
    )
  );

const findExistingCategoryConflict = async ({
  name,
  slug,
  parentCategoryId = null,
  categoryId,
  CategoryModel = Category,
}) => {
  const conflicts = [];

  if (name) {
    conflicts.push({
      name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') },
    });
  }

  if (slug) {
    conflicts.push({
      slug,
    });
  }

  if (conflicts.length === 0) {
    return null;
  }

  return CategoryModel.findOne({
    $and: [
      categoryId ? { _id: { $ne: categoryId } } : {},
      buildParentCategoryFilter(parentCategoryId),
      { $or: conflicts },
    ],
  });
};

const getParentCategoryId = (parentCategory) =>
  normalizeParentCategoryInput(parentCategory) || '';

const validateParentCategory = async ({ parentCategory, categoryId = null }) => {
  const parentCategoryId = String(getParentCategoryId(parentCategory)).trim();

  if (!parentCategoryId) {
    return { parentCategoryId: null };
  }

  if (!mongoose.Types.ObjectId.isValid(parentCategoryId)) {
    return { error: 'Valid parent category is required' };
  }

  const parent = await Category.findById(parentCategoryId).select('name parentCategory');

  if (!parent) {
    return { error: 'Parent category not found' };
  }

  if (categoryId) {
    const currentCategoryId = String(categoryId);
    const visited = new Set();
    let current = parent;

    while (current) {
      const currentId = String(current._id);

      if (currentId === currentCategoryId) {
        return { error: 'A category cannot be nested under itself or one of its child categories' };
      }

      if (visited.has(currentId)) {
        return { error: 'Category hierarchy contains a circular parent relationship' };
      }

      visited.add(currentId);
      current = current.parentCategory
        ? await Category.findById(current.parentCategory).select('parentCategory')
        : null;
    }
  }

  return { parentCategoryId: parent._id };
};

// @desc    Get categories
// @route   GET /api/categories
// @access  Public/Admin(optional for inactive)
const getCategories = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const isAdminRequest = includeInactive && hasPermission(req.user, 'catalog:read');

    if (includeInactive && !isAdminRequest) {
      return res.status(401).json({ message: 'Not authorized as an admin' });
    }

    const filter = isAdminRequest ? {} : { isActive: true };

    const categories = await Category.find(filter)
      .populate('parentCategory', 'name slug')
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    if (!isAdminRequest) {
      setPublicCatalogCache(res, 120);
    }
    res.json(decorateCategoryPaths(categories));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get category by slug
// @route   GET /api/categories/:slug
// @access  Public
const getCategoryBySlug = async (req, res) => {
  try {
    const requestedPath = String(req.query.path || req.params.slug || '');
    const category = await resolveCategoryByPath(requestedPath);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    setPublicCatalogCache(res, 120);
    res.json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
  try {
    const {
      name = '',
      slug: rawSlug = '',
      description = '',
      image = '',
      imagePublicId = '',
      isActive = true,
      displayOrder = 0,
      parentCategory = null,
      seo = {},
    } = req.body;

    const trimmedName = name.trim();

    if (!trimmedName) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const normalizedSlug = slugify(rawSlug || trimmedName);

    if (!normalizedSlug) {
      return res.status(400).json({ message: 'Valid category slug is required' });
    }

    const { parentCategoryId, error: parentCategoryError } = await validateParentCategory({
      parentCategory,
    });

    if (parentCategoryError) {
      return res.status(400).json({ message: parentCategoryError });
    }

    const existingConflict = await findExistingCategoryConflict({
      name: trimmedName,
      slug: normalizedSlug,
      parentCategoryId,
    });

    if (existingConflict) {
      return res.status(400).json({ message: CATEGORY_DUPLICATE_MESSAGE });
    }

    const category = new Category({
      name: trimmedName,
      slug: normalizedSlug,
      description: description.trim(),
      image: image.trim(),
      imagePublicId: imagePublicId.trim(),
      isActive: normalizeBoolean(isActive, true),
      displayOrder: Number(displayOrder) || 0,
      parentCategory: parentCategoryId,
      seo: normalizeSeoPayload(seo, {
        title: trimmedName,
        description: description.trim(),
        ogImage: image.trim(),
      }),
    });

    const createdCategory = await category.save();
    await recordAuditLog(req, 'catalog.category.create', 'Category', createdCategory._id, {
      name: createdCategory.name,
    });
    await notifyIndexNow([`/category/${createdCategory.slug}`, '/categories', '/sitemap.xml']);
    res.status(201).json(createdCategory);
  } catch (error) {
    if (isDuplicateCategoryKeyError(error)) {
      return res.status(400).json({ message: CATEGORY_DUPLICATE_MESSAGE });
    }

    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const previousSlug = category.slug;

    const {
      name = category.name,
      slug: rawSlug = category.slug,
      description = category.description,
      image = category.image,
      imagePublicId = category.imagePublicId,
      isActive = category.isActive,
      displayOrder = category.displayOrder,
      parentCategory = category.parentCategory,
      seo = category.seo || {},
    } = req.body;

    const trimmedName = String(name).trim();

    if (!trimmedName) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const normalizedSlug = slugify(rawSlug || trimmedName);

    if (!normalizedSlug) {
      return res.status(400).json({ message: 'Valid category slug is required' });
    }

    const { parentCategoryId, error: parentCategoryError } = await validateParentCategory({
      parentCategory,
      categoryId: category._id,
    });

    if (parentCategoryError) {
      return res.status(400).json({ message: parentCategoryError });
    }

    const existingConflict = await findExistingCategoryConflict({
      name: trimmedName,
      slug: normalizedSlug,
      parentCategoryId,
      categoryId: category._id,
    });

    if (existingConflict) {
      return res.status(400).json({ message: CATEGORY_DUPLICATE_MESSAGE });
    }

    // Clean up old Cloudinary image if it was replaced or cleared
    const oldPublicId = category.imagePublicId;
    const newPublicId = String(imagePublicId).trim();
    if (oldPublicId && oldPublicId !== newPublicId) {
      try {
        await destroyProductImage(oldPublicId);
      } catch (destroyErr) {
        console.error('[categoryController:updateCategory] Failed to cleanup old image:', destroyErr);
      }
    }

    category.name = trimmedName;
    category.slug = normalizedSlug;
    category.description = String(description).trim();
    category.image = String(image).trim();
    category.imagePublicId = newPublicId;
    category.isActive = normalizeBoolean(isActive, category.isActive);
    category.displayOrder = Number(displayOrder) || 0;
    category.parentCategory = parentCategoryId;
    category.seo = normalizeSeoPayload(seo, {
      title: trimmedName,
      description: String(description).trim(),
      ogImage: String(image).trim(),
    });

    const updatedCategory = await category.save();
    await recordAuditLog(req, 'catalog.category.update', 'Category', updatedCategory._id, {
      name: updatedCategory.name,
    });
    await notifyIndexNow([
      `/category/${previousSlug}`,
      `/category/${updatedCategory.slug}`,
      '/categories',
      '/sitemap.xml',
    ]);
    res.json(updatedCategory);
  } catch (error) {
    if (isDuplicateCategoryKeyError(error)) {
      return res.status(400).json({ message: CATEGORY_DUPLICATE_MESSAGE });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid category id' });
    }

    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const childCategories = await Category.countDocuments({ parentCategory: category._id });

    if (childCategories > 0) {
      return res.status(400).json({
        message: 'This category has child subcategories. Reassign or remove its subcategories before deleting.',
      });
    }

    const assignedProducts = await Product.countDocuments({
      $or: [
        { category: { $regex: new RegExp(`^${escapeRegex(category.name)}$`, 'i') } },
        { categories: { $regex: new RegExp(`^${escapeRegex(category.name)}$`, 'i') } },
      ],
    });

    if (assignedProducts > 0) {
      return res.status(400).json({
        message: 'This category has products assigned to it. Reassign those products before deleting the category.',
      });
    }

    // Delete associated Cloudinary image if present
    if (category.imagePublicId) {
      try {
        await destroyProductImage(category.imagePublicId);
      } catch (destroyErr) {
        console.error('[categoryController:deleteCategory] Failed to delete Cloudinary image:', destroyErr);
      }
    }

    await Category.deleteOne({ _id: category._id });
    await recordAuditLog(req, 'catalog.category.delete', 'Category', category._id, {
      name: category.name,
    });
    await notifyIndexNow([`/category/${category.slug}`, '/categories', '/sitemap.xml']);
    res.json({ message: 'Category removed' });
  } catch (error) {
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid category id' });
    }

    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

export {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  slugify,
  CATEGORY_DUPLICATE_MESSAGE,
  buildParentCategoryFilter,
  decorateCategoryPaths,
  findExistingCategoryConflict,
  isDuplicateCategoryKeyError,
  normalizeParentCategoryInput,
  resolveCategoryByPath,
};
