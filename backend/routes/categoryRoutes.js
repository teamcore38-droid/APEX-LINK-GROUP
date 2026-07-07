import express from 'express';
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryBySlug,
  updateCategory,
} from '../controllers/categoryController.js';
import { admin, protect, protectOptional } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protectOptional, getCategories).post(protect, admin, createCategory);
router.route('/:slug').get(getCategoryBySlug);
router.route('/:id').put(protect, admin, updateCategory).delete(protect, admin, deleteCategory);

export default router;
