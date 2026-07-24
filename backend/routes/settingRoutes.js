import express from 'express';
import { getSettings, updateSettings } from '../controllers/settingController.js';
import { protect, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();

router
  .route('/')
  .get(getSettings)
  .put(protect, requirePermission(PERMISSIONS.COMMERCE_MANAGE), updateSettings);

export default router;
