import express from 'express';
import {
  getMetrics,
  getOpenApi,
  getOpsHealth,
  getReadiness,
  recordClientError,
  uptimeCheck,
} from '../controllers/opsController.js';

const router = express.Router();

router.get('/health', getOpsHealth);
router.get('/readiness', getReadiness);
router.get('/metrics', getMetrics);
router.get('/uptime', uptimeCheck);
router.post('/client-errors', recordClientError);
router.get('/openapi.json', getOpenApi);

export default router;
