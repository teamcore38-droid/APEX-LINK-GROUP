import express from 'express';
import {
  createPaymentIntent,
  createRefund,
  getOrderPaymentEvents,
  handleStripeWebhook,
} from '../controllers/paymentController.js';
import { admin, protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/webhook').post(handleStripeWebhook);
router.route('/create-payment-intent').post(protect, createPaymentIntent);
router.route('/refund').post(protect, admin, createRefund);
router.route('/admin/order/:orderId/events').get(protect, admin, getOrderPaymentEvents);

export default router;
