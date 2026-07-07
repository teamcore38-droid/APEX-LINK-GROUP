import express from 'express';
import {
  getProducts,
  getProductById,
  getProductBySlug,
  deleteProduct,
  createProduct,
  updateProduct,
} from '../controllers/productController.js';
import { protect, protectOptional, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protectOptional, getProducts).post(protect, admin, createProduct);
router.route('/slug/:slug').get(protectOptional, getProductBySlug);
router
  .route('/:id')
  .get(protectOptional, getProductById)
  .delete(protect, admin, deleteProduct)
  .put(protect, admin, updateProduct);

export default router;
