import express from 'express';
import {
  createReturnRequest,
  getMyReturns,
  getReturns,
  updateReturnRequest,
} from '../controllers/returnController.js';
import { protect, requirePermission } from '../middleware/authMiddleware.js';
import { PERMISSIONS } from '../utils/permissions.js';

const router = express.Router();

router.route('/').post(protect, createReturnRequest);
router.route('/my').get(protect, getMyReturns);
router.route('/admin/all').get(protect, requirePermission(PERMISSIONS.COMMERCE_MANAGE), getReturns);
router.route('/admin/:id').put(protect, requirePermission(PERMISSIONS.COMMERCE_MANAGE), updateReturnRequest);

export default router;
