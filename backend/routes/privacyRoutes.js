import express from 'express';
import {
  createPrivacyRequest,
  deleteMyData,
  exportMyData,
  getConsent,
  getMyPrivacyRequests,
  saveConsent,
} from '../controllers/privacyController.js';
import { protect, protectOptional } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/consent').get(protectOptional, getConsent).post(protectOptional, saveConsent);
router.route('/requests').get(protect, getMyPrivacyRequests).post(protect, createPrivacyRequest);
router.route('/export').get(protect, exportMyData);
router.route('/delete-account').post(protect, deleteMyData);

export default router;
