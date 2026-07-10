import express from 'express';
import {
  acceptRfqQuote,
  createRfq,
  getAdminRfqs,
  getBuyerRfqs,
  updateAdminRfq,
} from '../controllers/rfqController.js';
import { protect, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();

router.route('/').get(protect, getBuyerRfqs).post(protect, createRfq);
router.route('/admin/all').get(protect, requirePermission(PERMISSIONS.VENDORS_MANAGE), getAdminRfqs);
router.route('/admin/:id').put(protect, requirePermission(PERMISSIONS.VENDORS_MANAGE), updateAdminRfq);
router.route('/:id/quotes/:quoteId/accept').put(protect, acceptRfqQuote);

export default router;
