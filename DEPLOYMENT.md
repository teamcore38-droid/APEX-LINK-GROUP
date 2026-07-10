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
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CURRENCY`
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

### Frontend (`frontend/.env`)

- `VITE_API_URL` (deployed backend base URL, no trailing slash)
- `VITE_STRIPE_PUBLIC_KEY`
- `VITE_APP_ENV` (optional display/debug label)

Security rules:

- Stripe secret and webhook secret must never be exposed in frontend env.
- Stripe publishable key must never be stored in backend-only env stores.

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
- Stripe webhook raw-body route preserved:
  - `POST /api/payments/webhook`
- Operational endpoints:
  - `GET /api/ops/health`
  - `GET /api/ops/readiness`
  - `GET /api/ops/metrics`
  - `GET /api/docs/openapi.json`
- Structured JSON logging, optional Sentry-compatible error delivery via `SENTRY_DSN`, and alert webhook support via `ALERT_WEBHOOK_URL`.

## 5. Stripe Test-Mode Verification Checklist

Required env:

- Backend: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_CURRENCY`
- Frontend: `VITE_STRIPE_PUBLIC_KEY`

Local webhook forward:

```bash
stripe listen --forward-to localhost:5000/api/payments/webhook
```

Subscribe/forward required events:

- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `payment_intent.canceled`
- `charge.refunded`
- `refund.created`
- `refund.updated`
- `refund.failed`

Test card scenarios:

1. Successful card payment (`4242 4242 4242 4242`)
2. Failed card payment (`4000 0000 0000 9995`)
3. 3DS/authentication required (`4000 0025 0000 3155`)
4. Admin refund (partial and full)

Expected app behavior:

- Payment success marks order paid and updates timeline
- Payment failure keeps order unpaid with failure status
- Duplicate webhook event does not double-process
- Refund updates admin detail, customer detail, invoice, and history safely

## 6. Email Production Setup

SMTP env:

- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM`

Recommended providers:

- SendGrid SMTP
- Mailgun SMTP
- Amazon SES SMTP
- Gmail SMTP for development/testing only

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
6. Configure Stripe webhook URL to:
   - `https://<backend-domain>/api/payments/webhook`

## 9. Frontend Deployment Steps

### Vercel

1. Set project root to `frontend`.
2. Build command:
   - `npm run build`
3. Output dir:
   - `dist`
4. Add frontend env vars (`VITE_API_URL`, `VITE_STRIPE_PUBLIC_KEY`).

### Netlify

1. Base directory: `frontend`
2. Build command: `npm run build`
3. Publish directory: `frontend/dist`
4. Add frontend env vars.

## 10. Staging Go-Live Checklist

1. Backend health endpoint returns `status: ok`.
2. Frontend points to staging backend via `VITE_API_URL`.
3. CORS allows staging frontend origin.
4. Stripe test-mode keys configured.
5. Webhook secret configured and verified.
6. SMTP configured (or explicitly approved no-email staging mode).
7. Customer checkout + order + invoice flow tested.
8. Admin order update + refund flow tested.
9. Confirm no secrets in repository.

## 11. Production Go-Live Checklist

1. Use production domains (`https` only).
2. Use production Stripe keys and webhook secret.
3. Confirm admin password rotation and least-privilege access.
4. Confirm DB backups and alerting.
5. Confirm rate limits and logs are monitored.
6. Verify payment + webhook + refund flows end-to-end once in production.
7. Configure uptime checks against `/api/ops/uptime`.
8. Schedule `npm run backup:create` or provider-native MongoDB Atlas backups.
9. Run `npm run perf:checkout` against staging before traffic campaigns.
