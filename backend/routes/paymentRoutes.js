import express from 'express';
import {
  createPayHerePayment,
  createRefund,
  getOrderPaymentEvents,
  handlePayHereNotification,
} from '../controllers/paymentController.js';
import { protect, protectOptional, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();

router.route('/payhere/notify').post(handlePayHereNotification);
router.route('/payhere/create').post(protectOptional, createPayHerePayment);
router.route('/refund').post(protect, requirePermission(PERMISSIONS.COMMERCE_MANAGE), createRefund);
router.route('/admin/order/:orderId/events').get(protect, requirePermission(PERMISSIONS.ORDERS_READ), getOrderPaymentEvents);

export default router;
