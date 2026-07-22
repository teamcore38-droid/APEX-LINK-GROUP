# Apex Link Group Deployment Guide

This guide prepares the MERN stack for staging and production without changing business features.

## 1. Platform Targets

- Backend: Render, Railway, or Heroku-style Node hosts
- Frontend: Vercel or Netlify
- Database: MongoDB Atlas

## 2. Environment Variables

### Backend (`backend/.env`)

Required:

- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `NODE_ENV`
- `FRONTEND_URL`
- `PAYHERE_MERCHANT_ID`
- `PAYHERE_MERCHANT_SECRET`
- `PAYHERE_CURRENCY`
- `PAYHERE_SANDBOX`
- `PAYHERE_NOTIFY_URL` or `BACKEND_PUBLIC_URL`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`

Recommended:

- `CLIENT_URL`
- `CORS_ORIGINS` (comma-separated extra frontend origins)
- `BUSINESS_NAME`
- `BUSINESS_EMAIL`
- `BUSINESS_PHONE`
- `BUSINESS_ADDRESS`
- `BUSINESS_WEBSITE`
- `EMAIL_REPLY_TO`
- `EMAIL_TEST_TO`
- `EMAIL_SEND_MAX_ATTEMPTS`
- `EMAIL_RETRY_DELAY_MS`

### Frontend (`frontend/.env`)

- `VITE_API_URL` (deployed backend base URL, no trailing slash)
- `VITE_APP_ENV` (optional display/debug label)

Security rules:

- PayHere merchant secret must never be exposed in frontend env.

## 3. CORS + Cross-Domain Setup

Backend CORS now supports:

- `FRONTEND_URL`
- `CLIENT_URL`
- `CORS_ORIGINS` entries
- local dev origins for Vite (`5173`/`4173`)

For production split-domain deployments, set:

1. `FRONTEND_URL=https://your-frontend-domain`
2. `CLIENT_URL=https://your-frontend-domain` (or second domain)
3. Additional domains in `CORS_ORIGINS` if needed

## 4. Backend Hardening Included

- `helmet` security headers enabled
- `morgan` request logging enabled (`combined` in production)
- JSON/body size limit: `1mb`
- Rate limits added to sensitive endpoints:
  - register
  - login
  - forgot password
  - reset password
  - contact submit
  - public order tracking
- Unknown route handler + centralized error handler
- Health endpoint:
  - `GET /api/health`
  - returns `status`, `uptime`, `environment`, `timestamp`, DB connection state
- PayHere notification route:
  - `POST /api/payments/payhere/notify`
- Operational endpoints:
  - `GET /api/ops/health`
  - `GET /api/ops/readiness`
  - `GET /api/ops/metrics`
- `GET /api/docs/openapi.json`
- Structured JSON logging, optional Sentry-compatible error delivery via `SENTRY_DSN`, and alert webhook support via `ALERT_WEBHOOK_URL`.

## 5. PayHere Sandbox Verification Checklist

Required env:

- Backend: `PAYHERE_MERCHANT_ID`, `PAYHERE_MERCHANT_SECRET`, `PAYHERE_CURRENCY=LKR`, `PAYHERE_SANDBOX=true`
- Backend callback: `PAYHERE_NOTIFY_URL=https://<backend-domain>/api/payments/payhere/notify`
- Frontend: `VITE_API_URL=https://<backend-domain>`

Local callback testing:

```bash
ngrok http 5000
```

Use the ngrok HTTPS URL as:

```env
PAYHERE_NOTIFY_URL=https://<ngrok-subdomain>/api/payments/payhere/notify
```

Sandbox card scenarios:

1. Successful Visa payment: `4916217501611292`
2. Successful MasterCard payment: `5307732125531191`
3. Failed/declined sandbox card from PayHere's sandbox card list
4. Admin refund record, partial and full

Expected app behavior:

- Payment success marks order paid and updates timeline
- Payment failure keeps order unpaid with failure status
- Duplicate PayHere notification does not double-process
- Refund updates admin detail, customer detail, invoice, and history safely

## 6. Email Production Setup

### Brevo SMTP env

Add these variables to the backend deployment environment. In Vercel, add them under your backend/API project: **Settings -> Environment Variables**.

```env
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USER=<Brevo SMTP login>
EMAIL_PASS=<Brevo SMTP key>
EMAIL_FROM=Apex Fashion <orders@apexfashion.lk>
EMAIL_REPLY_TO=support@apexfashion.lk
EMAIL_SEND_MAX_ATTEMPTS=3
EMAIL_RETRY_DELAY_MS=750
```

Brevo notes:

- Use the Brevo SMTP key for `EMAIL_PASS`, not a Brevo API key.
- `EMAIL_FROM` must use a sender/domain verified in Brevo.
- Port `587` is recommended for STARTTLS. Port `465` can also be used for SSL.

Local smoke test:

```bash
cd backend
npm run email:test -- you@example.com
```

Redeploy the backend after changing production environment variables so the Node process receives the new SMTP settings.

### SMTP env reference

- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO` (optional)
- `EMAIL_SEND_MAX_ATTEMPTS` (optional, default `3`)
- `EMAIL_RETRY_DELAY_MS` (optional, default `750`)

Email flows:

- Password reset
- Order confirmation
- Order status update
- Invoice email
- Refund confirmation
- Contact notifications + auto-reply

Development fallback:

- If SMTP is missing, mail sending no-ops safely and app flow continues.

## 7. Seed and Data Safety

Scripts:

- `npm run data:import`
  - destructive: deletes users/products/categories/orders first
- `npm run data:destroy`
  - destructive wipe
- `npm run data:seed-categories`
  - safer category-only seed (non-destructive to existing slugs)

Staging recommendation:

1. Use `data:import` only on fresh staging databases.
2. Use `data:seed-categories` for incremental category bootstrap.

Production recommendation:

1. Never run destructive seed scripts.
2. Use admin UI or controlled migration/import scripts.
3. Rotate default admin credentials immediately.

## 8. Backend Deployment Steps

### Render / Railway / Heroku-style

1. Set root/service to `backend`.
2. Build command:
   - `npm install`
3. Start command:
   - `npm start`
4. Add all backend env vars.
5. Confirm `GET /api/health` is healthy.
6. Configure PayHere notify URL to:
   - `https://<backend-domain>/api/payments/payhere/notify`

## 9. Frontend Deployment Steps

### Vercel

1. Set project root to `frontend`.
2. Build command:
   - `npm run build`
3. Output dir:
   - `dist`
4. Add frontend env vars (`VITE_API_URL`, `VITE_APP_ENV` if needed).

### Netlify

1. Base directory: `frontend`
2. Build command: `npm run build`
3. Publish directory: `frontend/dist`
4. Add frontend env vars.

## 10. Staging Go-Live Checklist

1. Backend health endpoint returns `status: ok`.
2. Frontend points to staging backend via `VITE_API_URL`.
3. CORS allows staging frontend origin.
4. PayHere sandbox keys configured.
5. PayHere notify URL configured and verified.
6. SMTP configured (or explicitly approved no-email staging mode).
7. Customer checkout + order + invoice flow tested.
8. Admin order update + refund flow tested.
9. Confirm no secrets in repository.

## 11. Production Go-Live Checklist

1. Use production domains (`https` only).
2. Use production PayHere merchant credentials and `PAYHERE_SANDBOX=false`.
3. Confirm admin password rotation and least-privilege access.
4. Confirm DB backups and alerting.
5. Confirm rate limits and logs are monitored.
6. Verify payment + webhook + refund flows end-to-end once in production.
7. Configure uptime checks against `/api/ops/uptime`.
8. Schedule `npm run backup:create` or provider-native MongoDB Atlas backups.
9. Run `npm run perf:checkout` against staging before traffic campaigns.
