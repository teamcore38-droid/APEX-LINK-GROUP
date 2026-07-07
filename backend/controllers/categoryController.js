import Category from '../models/categoryModel.js';
import Product from '../models/productModel.js';

const slugify = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeBoolean = (value, fallbackValue = true) => {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }

  return fallbackValue;
};

const findExistingCategoryConflict = async ({ name, slug, categoryId }) => {
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

  return Category.findOne({
    $and: [
      categoryId ? { _id: { $ne: categoryId } } : {},
      { $or: conflicts },
    ],
  });
};

// @desc    Get categories
// @route   GET /api/categories
// @access  Public/Admin(optional for inactive)
const getCategories = async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const isAdminRequest = includeInactive && req.user?.isAdmin;

    if (includeInactive && !isAdminRequest) {
      return res.status(401).json({ message: 'Not authorized as an admin' });
    }

    const filter = isAdminRequest ? {} : { isActive: true };

    const categories = await Category.find(filter).sort({ displayOrder: 1, name: 1 });

    res.json(categories);
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
    const slug = slugify(req.params.slug);
    const category = await Category.findOne({ slug, isActive: true });

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

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
      isActive = true,
      displayOrder = 0,
    } = req.body;

    const trimmedName = name.trim();

    if (!trimmedName) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const normalizedSlug = slugify(rawSlug || trimmedName);

    if (!normalizedSlug) {
      return res.status(400).json({ message: 'Valid category slug is required' });
    }

    const existingConflict = await findExistingCategoryConflict({
      name: trimmedName,
      slug: normalizedSlug,
    });

    if (existingConflict) {
      return res.status(400).json({ message: 'Category name or slug already exists' });
    }

    const category = new Category({
      name: trimmedName,
      slug: normalizedSlug,
      description: description.trim(),
      image: image.trim(),
      isActive: normalizeBoolean(isActive, true),
      displayOrder: Number(displayOrder) || 0,
    });

    const createdCategory = await category.save();
    res.status(201).json(createdCategory);
  } catch (error) {
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

    const {
      name = category.name,
      slug: rawSlug = category.slug,
      description = category.description,
      image = category.image,
      isActive = category.isActive,
      displayOrder = category.displayOrder,
    } = req.body;

    const trimmedName = String(name).trim();

    if (!trimmedName) {
      return res.status(400).json({ message: 'Category name is required' });
    }

    const normalizedSlug = slugify(rawSlug || trimmedName);

    if (!normalizedSlug) {
      return res.status(400).json({ message: 'Valid category slug is required' });
    }

    const existingConflict = await findExistingCategoryConflict({
      name: trimmedName,
      slug: normalizedSlug,
      categoryId: category._id,
    });

    if (existingConflict) {
      return res.status(400).json({ message: 'Category name or slug already exists' });
    }

    category.name = trimmedName;
    category.slug = normalizedSlug;
    category.description = String(description).trim();
    category.image = String(image).trim();
    category.isActive = normalizeBoolean(isActive, category.isActive);
    category.displayOrder = Number(displayOrder) || 0;

    const updatedCategory = await category.save();
    res.json(updatedCategory);
  } catch (error) {
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

    const assignedProducts = await Product.countDocuments({
      category: { $regex: new RegExp(`^${escapeRegex(category.name)}$`, 'i') },
    });

    if (assignedProducts > 0) {
      return res.status(400).json({
        message: 'This category has products assigned to it. Reassign those products before deleting the category.',
      });
    }

    await Category.deleteOne({ _id: category._id });
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
};
