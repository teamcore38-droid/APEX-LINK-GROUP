import express from 'express';
import {
  addOrderItems,
  getOrders,
  getOrderById,
  getMyOrders,
  getOrderInvoice,
  getOrderPackingSlip,
  markOrderAsPaid,
  updateOrderStatus,
  trackOrder,
} from '../controllers/orderController.js';
import { protect, protectOptional, admin } from '../middleware/authMiddleware.js';
import { orderTrackingLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.route('/').post(protect, addOrderItems);
router.route('/admin/all').get(protect, admin, getOrders);
router.route('/myorders').get(protect, getMyOrders);
router.route('/track').post(orderTrackingLimiter, protectOptional, trackOrder);
router.route('/:id/invoice').get(protect, getOrderInvoice);
router.route('/:id/packing-slip').get(protect, admin, getOrderPackingSlip);
router.route('/:id/pay').put(protect, markOrderAsPaid);
router.route('/:id').get(protect, getOrderById);
router.route('/:id/status').put(protect, admin, updateOrderStatus);

export default router;
