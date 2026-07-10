import logger from './logger.js';

const getAlertWebhookUrl = () =>
  process.env.ALERT_WEBHOOK_URL || process.env.SLACK_WEBHOOK_URL || process.env.TEAMS_WEBHOOK_URL || '';

const sendAlert = async ({ title, message, severity = 'warning', metadata = {} }) => {
  const webhookUrl = getAlertWebhookUrl();
  const payload = {
    title,
    message,
    severity,
    service: process.env.SERVICE_NAME || 'apex-backend',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    metadata,
  };

  logger[severity === 'critical' ? 'error' : 'warn'](title, payload);

  if (!webhookUrl) {
    return { sent: false, skipped: true };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `*[${payload.severity.toUpperCase()}] ${payload.title}*\n${payload.message}`,
        ...payload,
      }),
    });

    return { sent: response.ok, status: response.status };
  } catch (error) {
    logger.error('Alert delivery failed', { error: error.message });
    return { sent: false, error: error.message };
  }
};

export { sendAlert };
