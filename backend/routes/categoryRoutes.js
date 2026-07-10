import express from 'express';
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryBySlug,
  updateCategory,
} from '../controllers/categoryController.js';
import { protect, protectOptional, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();

router.route('/').get(protectOptional, getCategories).post(protect, requirePermission(PERMISSIONS.CATALOG_WRITE), createCategory);
router.route('/:slug').get(getCategoryBySlug);
router.route('/:id').put(protect, requirePermission(PERMISSIONS.CATALOG_WRITE), updateCategory).delete(protect, requirePermission(PERMISSIONS.CATALOG_DELETE), deleteCategory);

export default router;
