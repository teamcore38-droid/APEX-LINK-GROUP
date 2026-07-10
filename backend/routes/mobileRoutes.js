import express from 'express';
import {
  deactivatePushSubscription,
  getMobileAdminSummary,
  getMobileBootstrap,
  getMobileConfig,
  getMyPushSubscriptions,
  resolveDeepLink,
  upsertPushSubscription,
} from '../controllers/mobileController.js';
import { protect, protectOptional, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();

router.route('/config').get(getMobileConfig);
router.route('/bootstrap').get(protectOptional, getMobileBootstrap);
router.route('/deep-link').get(resolveDeepLink);
router.route('/deep-link/:type').get(resolveDeepLink);
router.route('/deep-link/:type/:id').get(resolveDeepLink);
router
  .route('/push-subscriptions')
  .post(protectOptional, upsertPushSubscription)
  .get(protect, getMyPushSubscriptions);
router.route('/push-subscriptions/:id').delete(protect, deactivatePushSubscription);
router
  .route('/admin/summary')
  .get(protect, requirePermission(PERMISSIONS.REPORTS_READ), getMobileAdminSummary);

export default router;
