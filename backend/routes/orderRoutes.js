import express from 'express';
import {
  addOrderItems,
  addGuestOrderItems,
  addShipmentUpdate,
  createCancellationRequest,
  getOrders,
  getOrderById,
  getMyOrders,
  getOrderInvoice,
  getOrderPackingSlip,
  markOrderAsPaid,
  quoteOrder,
  reviewCancellationRequest,
  updateOrderStatus,
  trackOrder,
  getOrderShippingRates,
} from '../controllers/orderController.js';
import { protect, protectOptional, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../utils/permissions.js';
import { orderTrackingLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.route('/').post(protect, addOrderItems);
router.route('/guest').post(addGuestOrderItems);
router.route('/admin/all').get(protect, requirePermission(PERMISSIONS.ORDERS_READ), getOrders);
router.route('/myorders').get(protect, getMyOrders);
router.route('/track').post(orderTrackingLimiter, protectOptional, trackOrder);
router.route('/quote').post(protectOptional, quoteOrder);
router.route('/shipping-rates').post(protectOptional, getOrderShippingRates);
router.route('/:id/invoice').get(protect, getOrderInvoice);
router.route('/:id/packing-slip').get(protect, requirePermission(PERMISSIONS.ORDERS_READ), getOrderPackingSlip);
router.route('/:id/pay').put(protect, markOrderAsPaid);
router.route('/:id').get(protect, getOrderById);
router.route('/:id/status').put(protect, requirePermission(PERMISSIONS.ORDERS_WRITE), updateOrderStatus);
router.route('/:id/cancellation-requests').post(protectOptional, createCancellationRequest);
router
  .route('/:id/cancellation-requests/:requestId')
  .put(protect, requirePermission(PERMISSIONS.ORDERS_WRITE), reviewCancellationRequest);
router
  .route('/:id/shipment-updates')
  .post(protect, requirePermission(PERMISSIONS.ORDERS_WRITE), addShipmentUpdate);

export default router;
