import express from 'express';
import {
  archiveMedia,
  bulkOrderActions,
  exportProducts,
  getAuditLogs,
  getPublicCms,
  getPublicPolicy,
  getReports,
  getStaffUsers,
  importProducts,
  listCms,
  listMedia,
  updateStaffStatus,
  upsertBanner,
  upsertFaq,
  upsertHomepageSection,
  upsertMedia,
  upsertPolicy,
  upsertStaffUser,
} from '../controllers/proAdminController.js';
import { protect, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();

router.route('/public').get(getPublicCms);
router.route('/public/policies/:slug').get(getPublicPolicy);

router
  .route('/staff')
  .get(protect, requirePermission(PERMISSIONS.STAFF_MANAGE), getStaffUsers)
  .post(protect, requirePermission(PERMISSIONS.STAFF_MANAGE), upsertStaffUser);
router
  .route('/staff/:id/status')
  .put(protect, requirePermission(PERMISSIONS.STAFF_MANAGE), updateStaffStatus);
router.route('/audit').get(protect, requirePermission(PERMISSIONS.AUDIT_READ), getAuditLogs);
router.route('/reports').get(protect, requirePermission(PERMISSIONS.REPORTS_READ), getReports);

router
  .route('/bulk/products/import')
  .post(protect, requirePermission(PERMISSIONS.BULK_MANAGE), importProducts);
router
  .route('/bulk/products/export')
  .get(protect, requirePermission(PERMISSIONS.BULK_MANAGE), exportProducts);
router
  .route('/bulk/orders')
  .put(protect, requirePermission(PERMISSIONS.BULK_MANAGE), bulkOrderActions);

router.route('/cms').get(protect, requirePermission(PERMISSIONS.CMS_MANAGE), listCms);
router.route('/cms/banners').post(protect, requirePermission(PERMISSIONS.CMS_MANAGE), upsertBanner);
router.route('/cms/banners/:id').put(protect, requirePermission(PERMISSIONS.CMS_MANAGE), upsertBanner);
router
  .route('/cms/homepage-sections')
  .post(protect, requirePermission(PERMISSIONS.CMS_MANAGE), upsertHomepageSection);
router
  .route('/cms/homepage-sections/:id')
  .put(protect, requirePermission(PERMISSIONS.CMS_MANAGE), upsertHomepageSection);
router.route('/cms/faqs').post(protect, requirePermission(PERMISSIONS.CMS_MANAGE), upsertFaq);
router.route('/cms/faqs/:id').put(protect, requirePermission(PERMISSIONS.CMS_MANAGE), upsertFaq);
router.route('/cms/policies').post(protect, requirePermission(PERMISSIONS.CMS_MANAGE), upsertPolicy);
router.route('/cms/policies/:id').put(protect, requirePermission(PERMISSIONS.CMS_MANAGE), upsertPolicy);

router
  .route('/media')
  .get(protect, requirePermission(PERMISSIONS.MEDIA_MANAGE), listMedia)
  .post(protect, requirePermission(PERMISSIONS.MEDIA_MANAGE), upsertMedia);
router.route('/media/:id').put(protect, requirePermission(PERMISSIONS.MEDIA_MANAGE), upsertMedia);
router.route('/media/:id/archive').put(protect, requirePermission(PERMISSIONS.MEDIA_MANAGE), archiveMedia);

export default router;
