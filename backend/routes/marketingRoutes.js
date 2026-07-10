import express from 'express';
import {
  recoverAbandonedCart,
  recordAbandonedCart,
  recordAnalyticsEvent,
  sendAbandonedCartBatch,
  subscribeNewsletter,
  unsubscribeNewsletter,
} from '../controllers/marketingController.js';
import { protect, protectOptional, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();

router.route('/newsletter').post(protectOptional, subscribeNewsletter);
router.route('/newsletter/unsubscribe').post(unsubscribeNewsletter);
router.route('/abandoned-cart').post(protectOptional, recordAbandonedCart);
router.route('/abandoned-cart/recovered').post(protectOptional, recoverAbandonedCart);
router
  .route('/abandoned-cart/send')
  .post(protect, requirePermission(PERMISSIONS.COMMERCE_MANAGE), sendAbandonedCartBatch);
router.route('/analytics/events').post(protectOptional, recordAnalyticsEvent);
router.route('/events').post(protectOptional, recordAnalyticsEvent);

export default router;
