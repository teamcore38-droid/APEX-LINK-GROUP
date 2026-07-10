import express from 'express';
import {
  addSupportTicketReply,
  createSupportTicket,
  getAdvancedSearch,
  getAdminSupportTickets,
  getLoyalty,
  getNotificationPreferences,
  getRecentlyViewed,
  getRecommendations,
  getSupportTickets,
  recordRecentlyViewed,
  updateAdminSupportTicket,
  updateNotificationPreferences,
} from '../controllers/customerExperienceController.js';
import { protect, protectOptional, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();

router.route('/search').get(getAdvancedSearch);
router.route('/recently-viewed').get(protectOptional, getRecentlyViewed).post(protectOptional, recordRecentlyViewed);
router.route('/recommendations').get(protectOptional, getRecommendations);
router.route('/loyalty').get(protect, getLoyalty);
router
  .route('/notification-preferences')
  .get(protect, getNotificationPreferences)
  .put(protect, updateNotificationPreferences);
router
  .route('/support-tickets')
  .get(protectOptional, getSupportTickets)
  .post(protectOptional, createSupportTicket);
router.route('/support-tickets/:id/replies').post(protectOptional, addSupportTicketReply);
router
  .route('/admin/support-tickets')
  .get(protect, requirePermission(PERMISSIONS.ORDERS_READ), getAdminSupportTickets);
router
  .route('/admin/support-tickets/:id')
  .put(protect, requirePermission(PERMISSIONS.ORDERS_WRITE), updateAdminSupportTicket);

export default router;
