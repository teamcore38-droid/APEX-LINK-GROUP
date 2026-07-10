import express from 'express';
import {
  getProducts,
  getProductById,
  getProductBySlug,
  deleteProduct,
  createProduct,
  updateProduct,
} from '../controllers/productController.js';
import { protect, protectOptional, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();

router.route('/').get(protectOptional, getProducts).post(protect, requirePermission(PERMISSIONS.CATALOG_WRITE), createProduct);
router.route('/slug/:slug').get(protectOptional, getProductBySlug);
router
  .route('/:id')
  .get(protectOptional, getProductById)
  .delete(protect, requirePermission(PERMISSIONS.CATALOG_DELETE), deleteProduct)
  .put(protect, requirePermission(PERMISSIONS.CATALOG_WRITE), updateProduct);

export default router;
