const productionOrigins = [
  'https://www.apexfashion.lk',
  'https://apexfashion.lk',
];

const localOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

const normalizeOrigin = (origin) => (
  origin ? origin.trim().replace(/\/+$/, '') : ''
);

export const buildAllowedOrigins = (environment = process.env) => {
  const configuredOrigins = [
    ...productionOrigins,
    environment.FRONTEND_URL,
    environment.CLIENT_URL,
    ...(environment.CORS_ORIGINS || '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    ...localOrigins,
  ].map(normalizeOrigin);

  return [...new Set(configuredOrigins.filter(Boolean))];
};

export const createCorsOptions = (environment = process.env) => {
  const allowedOrigins = buildAllowedOrigins(environment);

  return {
    origin(origin, callback) {
      // Requests without an Origin header are server-to-server calls.
      callback(null, !origin || allowedOrigins.includes(normalizeOrigin(origin)));
    },
    credentials: true,
  };
};
