import express from 'express';
import { getPublicCms, getPublicPolicy } from '../controllers/proAdminController.js';

const router = express.Router();

router.route('/').get(getPublicCms);
router.route('/policies/:slug').get(getPublicPolicy);

export default router;
