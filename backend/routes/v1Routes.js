import express from 'express';
import categoryRoutes from './categoryRoutes.js';
import cmsRoutes from './cmsRoutes.js';
import customerExperienceRoutes from './customerExperienceRoutes.js';
import mobileRoutes from './mobileRoutes.js';
import orderRoutes from './orderRoutes.js';
import privacyRoutes from './privacyRoutes.js';
import productRoutes from './productRoutes.js';
import returnRoutes from './returnRoutes.js';
import reviewRoutes from './reviewRoutes.js';
import userRoutes from './userRoutes.js';
import vendorRoutes from './vendorRoutes.js';
import wishlistRoutes from './wishlistRoutes.js';

const router = express.Router();

router.get('/status', (_req, res) => {
  res.json({
    status: 'ok',
    apiVersion: 'v1',
    timestamp: new Date().toISOString(),
  });
});

router.use('/mobile', mobileRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/users', userRoutes);
router.use('/orders', orderRoutes);
router.use('/privacy', privacyRoutes);
router.use('/customer', customerExperienceRoutes);
router.use('/cms', cmsRoutes);
router.use('/reviews', reviewRoutes);
router.use('/returns', returnRoutes);
router.use('/vendors', vendorRoutes);
router.use('/wishlist', wishlistRoutes);

export default router;
