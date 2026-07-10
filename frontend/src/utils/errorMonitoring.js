import axios from 'axios';

const sendClientError = async ({ message, stack, source }) => {
  try {
    await axios.post('/api/ops/client-errors', {
      message,
      stack,
      source,
      path: window.location.pathname,
      userAgent: navigator.userAgent,
      occurredAt: new Date().toISOString(),
    });
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('[errorMonitoring]', error);
    }
  }
};

const installFrontendErrorMonitoring = () => {
  window.addEventListener('error', (event) => {
    sendClientError({
      message: event.message,
      stack: event.error?.stack || '',
      source: 'window.error',
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    sendClientError({
      message: event.reason?.message || String(event.reason || 'Unhandled promise rejection'),
      stack: event.reason?.stack || '',
      source: 'unhandledrejection',
    });
  });
};

export { installFrontendErrorMonitoring };
