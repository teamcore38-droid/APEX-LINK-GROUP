import express from 'express';
import multer from 'multer';
import {
  getProducts,
  getProductById,
  getProductBySlug,
  uploadProductImages,
  deleteProductImage,
  deleteProduct,
  bulkMutateProducts,
  createProduct,
  updateProduct,
} from '../controllers/productController.js';
import { protect, protectOptional, requirePermission } from '../middleware/authMiddleware.js';
import { bulkMutationLimiter } from '../middleware/rateLimiters.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 12,
  },
  fileFilter(_req, file, callback) {
    if (file.mimetype?.startsWith('image/')) {
      callback(null, true);
      return;
    }

    callback(new Error('Only image files can be uploaded'));
  },
});

router.route('/').get(protectOptional, getProducts).post(protect, requirePermission(PERMISSIONS.CATALOG_WRITE), createProduct);
router.route('/slug/:slug').get(protectOptional, getProductBySlug);
router.post(
  '/bulk',
  bulkMutationLimiter,
  protect,
  requirePermission(PERMISSIONS.BULK_MANAGE),
  bulkMutateProducts
);
router
  .route('/images')
  .post(protect, requirePermission(PERMISSIONS.CATALOG_WRITE), upload.array('images', 12), uploadProductImages)
  .delete(protect, requirePermission(PERMISSIONS.CATALOG_WRITE), deleteProductImage);
router
  .route('/:id')
  .get(protectOptional, getProductById)
  .delete(protect, requirePermission(PERMISSIONS.CATALOG_DELETE), deleteProduct)
  .put(protect, requirePermission(PERMISSIONS.CATALOG_WRITE), updateProduct);

export default router;
