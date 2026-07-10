import express from 'express';
import {
  createWebhookSubscription,
  deleteWebhookSubscription,
  listWebhookDeliveries,
  listWebhookSubscriptions,
  testWebhookSubscription,
  updateWebhookSubscription,
} from '../controllers/webhookController.js';
import { protect, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();

router.use(protect, requirePermission(PERMISSIONS.WEBHOOKS_MANAGE));
router.route('/').get(listWebhookSubscriptions).post(createWebhookSubscription);
router.route('/deliveries').get(listWebhookDeliveries);
router
  .route('/:id')
  .put(updateWebhookSubscription)
  .delete(deleteWebhookSubscription);
router.route('/:id/deliveries').get(listWebhookDeliveries);
router.route('/:id/test').post(testWebhookSubscription);

export default router;
