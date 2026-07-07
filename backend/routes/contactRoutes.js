import express from 'express';
import {
  createContactMessage,
  getContactMessages,
  updateContactMessageStatus,
  deleteContactMessage,
} from '../controllers/contactController.js';
import { protect, admin } from '../middleware/authMiddleware.js';
import { contactSubmitLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();

router.route('/').post(contactSubmitLimiter, createContactMessage);
router.route('/admin/all').get(protect, admin, getContactMessages);
router.route('/admin/:id/status').put(protect, admin, updateContactMessageStatus);
router.route('/admin/:id').delete(protect, admin, deleteContactMessage);

export default router;
