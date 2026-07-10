import crypto from 'crypto';
import logger from './logger.js';
import { sendAlert } from './alertService.js';

const parseSentryDsn = (dsn = '') => {
  try {
    const url = new URL(dsn);
    const projectId = url.pathname.replace(/^\//, '');
    const publicKey = url.username;
    return {
      storeUrl: `${url.protocol}//${url.host}/api/${projectId}/store/`,
      publicKey,
    };
  } catch {
    return null;
  }
};

const captureException = async (error, context = {}) => {
  const eventId = crypto.randomUUID().replace(/-/g, '');
  const payload = {
    event_id: eventId,
    timestamp: new Date().toISOString(),
    platform: 'node',
    level: context.level || 'error',
    logger: 'apex-backend',
    environment: process.env.NODE_ENV || 'development',
    message: error?.message || String(error),
    exception: {
      values: [
        {
          type: error?.name || 'Error',
          value: error?.message || String(error),
          stacktrace: error?.stack || '',
        },
      ],
    },
    extra: context,
  };

  logger.error('Captured exception', {
    eventId,
    message: payload.message,
    path: context.path,
    method: context.method,
  });

  if (context.severity === 'critical') {
    await sendAlert({
      title: 'Critical backend exception',
      message: payload.message,
      severity: 'critical',
      metadata: { eventId, path: context.path },
    });
  }

  const sentry = parseSentryDsn(process.env.SENTRY_DSN || '');

  if (!sentry) {
    return { eventId, sent: false, skipped: true };
  }

  try {
    const response = await fetch(sentry.storeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${sentry.publicKey}, sentry_client=apex-custom/1.0`,
      },
      body: JSON.stringify(payload),
    });

    return { eventId, sent: response.ok, status: response.status };
  } catch (sendError) {
    logger.error('Sentry event delivery failed', { eventId, error: sendError.message });
    return { eventId, sent: false, error: sendError.message };
  }
};

export { captureException };
