import express from 'express';
import {
  createContactMessage,
  getContactMessages,
  updateContactMessageStatus,
  deleteContactMessage,
} from '../controllers/contactController.js';
import { protect, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../utils/permissions.js';
import { contactSubmitLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.route('/').post(contactSubmitLimiter, createContactMessage);
router.route('/admin/all').get(protect, requirePermission(PERMISSIONS.ORDERS_READ), getContactMessages);
router.route('/admin/:id/status').put(protect, requirePermission(PERMISSIONS.ORDERS_WRITE), updateContactMessageStatus);
router.route('/admin/:id').delete(protect, requirePermission(PERMISSIONS.ORDERS_WRITE), deleteContactMessage);

export default router;
