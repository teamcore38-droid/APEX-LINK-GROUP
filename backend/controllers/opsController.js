import mongoose from 'mongoose';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { captureException } from '../utils/errorMonitoring.js';
import { sendAlert } from '../utils/alertService.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const startedAt = new Date();
const counters = {
  clientErrors: 0,
  uptimeChecks: 0,
};

const getDbState = () => {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  return stateMap[mongoose.connection.readyState] || 'unknown';
};

const getOpsHealth = (_req, res) => {
  res.json({
    status: 'ok',
    service: process.env.SERVICE_NAME || 'apex-backend',
    environment: process.env.NODE_ENV || 'development',
    startedAt,
    uptimeSeconds: process.uptime(),
    database: {
      state: getDbState(),
    },
  });
};

const getReadiness = (_req, res) => {
  const dbReady = mongoose.connection.readyState === 1;

  res.status(dbReady ? 200 : 503).json({
    status: dbReady ? 'ready' : 'not_ready',
    database: {
      state: getDbState(),
    },
  });
};

const getMetrics = (_req, res) => {
  const memory = process.memoryUsage();

  res.type('text/plain').send(
    [
      '# HELP apex_uptime_seconds Process uptime in seconds',
      '# TYPE apex_uptime_seconds gauge',
      `apex_uptime_seconds ${Math.round(process.uptime())}`,
      '# HELP apex_memory_heap_used_bytes Node heap used',
      '# TYPE apex_memory_heap_used_bytes gauge',
      `apex_memory_heap_used_bytes ${memory.heapUsed}`,
      '# HELP apex_client_errors_total Client-side errors received',
      '# TYPE apex_client_errors_total counter',
      `apex_client_errors_total ${counters.clientErrors}`,
      '# HELP apex_uptime_checks_total Uptime checks received',
      '# TYPE apex_uptime_checks_total counter',
      `apex_uptime_checks_total ${counters.uptimeChecks}`,
    ].join('\n')
  );
};

const recordClientError = async (req, res) => {
  counters.clientErrors += 1;
  await captureException(new Error(req.body?.message || 'Client error'), {
    level: 'error',
    source: 'frontend',
    path: req.body?.path || '',
    stack: req.body?.stack || '',
    requestId: req.requestId,
  });

  res.status(202).json({ accepted: true });
};

const uptimeCheck = async (_req, res) => {
  counters.uptimeChecks += 1;
  const dbReady = mongoose.connection.readyState === 1;

  if (!dbReady) {
    await sendAlert({
      title: 'Apex uptime check failed',
      message: `Database state is ${getDbState()}`,
      severity: 'critical',
    });
  }

  res.status(dbReady ? 200 : 503).json({
    ok: dbReady,
    checkedAt: new Date().toISOString(),
    database: getDbState(),
  });
};

const getOpenApi = async (_req, res) => {
  const openApiPath = join(__dirname, '..', 'docs', 'openapi.json');
  const contents = await readFile(openApiPath, 'utf8');
  res.type('application/json').send(contents);
};

export {
  getMetrics,
  getOpenApi,
  getOpsHealth,
  getReadiness,
  recordClientError,
  uptimeCheck,
};
