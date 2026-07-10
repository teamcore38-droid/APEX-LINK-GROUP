const redactValue = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  if (value.length > 500) {
    return `${value.slice(0, 500)}...`;
  }

  return value;
};

const redact = (payload = {}) => {
  if (!payload || typeof payload !== 'object') {
    return payload;
  }

  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (/password|token|secret|authorization|cookie|key/i.test(key)) {
        return [key, '[REDACTED]'];
      }

      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return [key, redact(value)];
      }

      return [key, redactValue(value)];
    })
  );
};

const write = (level, message, metadata = {}) => {
  const record = {
    level,
    message,
    service: process.env.SERVICE_NAME || 'apex-backend',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    ...redact(metadata),
  };

  const line = JSON.stringify(record);

  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
};

const logger = {
  info: (message, metadata) => write('info', message, metadata),
  warn: (message, metadata) => write('warn', message, metadata),
  error: (message, metadata) => write('error', message, metadata),
};

export default logger;
