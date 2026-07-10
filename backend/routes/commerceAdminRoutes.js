import express from 'express';
import {
  getInventoryEvents,
  getLowStockProducts,
  listCoupons,
  listGiftCards,
  listShippingRates,
  listTaxRules,
  upsertCoupon,
  upsertGiftCard,
  upsertShippingRate,
  upsertTaxRule,
} from '../controllers/commerceAdminController.js';
import { protect, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();

router.route('/inventory/events').get(protect, requirePermission(PERMISSIONS.COMMERCE_MANAGE), getInventoryEvents);
router.route('/inventory/low-stock').get(protect, requirePermission(PERMISSIONS.COMMERCE_MANAGE), getLowStockProducts);
router.route('/coupons').get(protect, requirePermission(PERMISSIONS.COMMERCE_MANAGE), listCoupons).post(protect, requirePermission(PERMISSIONS.COMMERCE_MANAGE), upsertCoupon);
router.route('/gift-cards').get(protect, requirePermission(PERMISSIONS.COMMERCE_MANAGE), listGiftCards).post(protect, requirePermission(PERMISSIONS.COMMERCE_MANAGE), upsertGiftCard);
router.route('/tax-rules').get(protect, requirePermission(PERMISSIONS.COMMERCE_MANAGE), listTaxRules).post(protect, requirePermission(PERMISSIONS.COMMERCE_MANAGE), upsertTaxRule);
router.route('/shipping-rates').get(protect, requirePermission(PERMISSIONS.COMMERCE_MANAGE), listShippingRates).post(protect, requirePermission(PERMISSIONS.COMMERCE_MANAGE), upsertShippingRate);

export default router;
