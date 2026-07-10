import logger from '../utils/logger.js';
import { captureException } from '../utils/errorMonitoring.js';

const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

const errorHandler = (err, req, res, next) => {
  // Keep express error middleware signature.
  void next;

  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const severity = statusCode >= 500 ? 'critical' : 'warning';

  logger.error('Request failed', {
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    error: err.message,
  });

  if (statusCode >= 500) {
    captureException(err, {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode,
      severity,
    });
  }

  const response = {
    message: err.message || 'Server Error',
    requestId: req.requestId,
  };

  if (!isProduction) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

export { notFound, errorHandler };
