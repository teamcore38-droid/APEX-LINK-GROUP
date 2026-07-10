import express from 'express';
import {
  createPayout,
  createProductSubmission,
  getAdminPayouts,
  getAdminProductSubmissions,
  getAdminVendorOrders,
  getAdminVendors,
  getMyProductSubmissions,
  getVendorDashboard,
  getVendorProfile,
  reviewProductSubmission,
  reviewVendor,
  submitVendorProfile,
  updatePayout,
  upsertVendorProfile,
} from '../controllers/vendorController.js';
import {
  getVendorRfqs,
  submitVendorQuote,
} from '../controllers/rfqController.js';
import { protect, requirePermission, vendor } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();

router.route('/me').get(protect, getVendorProfile).put(protect, upsertVendorProfile);
router.route('/me/submit').put(protect, submitVendorProfile);
router.route('/dashboard').get(protect, vendor, getVendorDashboard);
router
  .route('/product-submissions')
  .get(protect, vendor, getMyProductSubmissions)
  .post(protect, vendor, createProductSubmission);
router.route('/rfqs').get(protect, vendor, getVendorRfqs);
router.route('/rfqs/:id/quotes').post(protect, vendor, submitVendorQuote);

router.route('/admin/all').get(protect, requirePermission(PERMISSIONS.VENDORS_MANAGE), getAdminVendors);
router.route('/admin/:id/review').put(protect, requirePermission(PERMISSIONS.VENDORS_MANAGE), reviewVendor);
router.route('/admin/submissions').get(protect, requirePermission(PERMISSIONS.VENDORS_MANAGE), getAdminProductSubmissions);
router.route('/admin/submissions/:id/review').put(protect, requirePermission(PERMISSIONS.VENDORS_MANAGE), reviewProductSubmission);
router.route('/admin/orders').get(protect, requirePermission(PERMISSIONS.VENDORS_MANAGE), getAdminVendorOrders);
router.route('/admin/payouts').get(protect, requirePermission(PERMISSIONS.VENDORS_MANAGE), getAdminPayouts).post(protect, requirePermission(PERMISSIONS.VENDORS_MANAGE), createPayout);
router.route('/admin/payouts/:id').put(protect, requirePermission(PERMISSIONS.VENDORS_MANAGE), updatePayout);

export default router;
