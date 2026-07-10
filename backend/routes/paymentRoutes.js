import express from 'express';
import {
  createPaymentIntent,
  createRefund,
  getOrderPaymentEvents,
  handleStripeWebhook,
} from '../controllers/paymentController.js';
import { protect, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();

router.route('/webhook').post(handleStripeWebhook);
router.route('/create-payment-intent').post(protect, createPaymentIntent);
router.route('/refund').post(protect, requirePermission(PERMISSIONS.COMMERCE_MANAGE), createRefund);
router.route('/admin/order/:orderId/events').get(protect, requirePermission(PERMISSIONS.ORDERS_READ), getOrderPaymentEvents);

export default router;
