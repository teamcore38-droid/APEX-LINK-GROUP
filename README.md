# Apex Link Group — Global Marketplace (MERN E-Commerce)

Premium multi-industry marketplace (textiles, spices & food, IT solutions, industrial equipment, home & living, health & beauty) with customer accounts, admin operations, PayHere payments, refund management, invoices, packing slips, contact workflows, and production hardening.

## Project Layout

- `backend/` Express + MongoDB API
- `frontend/` React + Vite application
- `DEPLOYMENT.md` staging/production deployment + verification guide
- `docs/OPERATIONS.md` tests, CI, monitoring, backups, OpenAPI, and load testing

## Prerequisites

- Node.js 18+
- MongoDB (Atlas or local)
- PayHere merchant account (sandbox for testing, live for production)
- Brevo SMTP account (for production email delivery)

## Local Setup

1. Install backend dependencies:

```bash
cd backend
npm install
```

2. Install frontend dependencies:

```bash
cd frontend
npm install
```

3. Configure environments:

- Copy `backend/.env.example` to `backend/.env`
- Copy `frontend/.env.example` to `frontend/.env`

4. Run development servers:

```bash
# terminal 1
cd backend
npm run dev

# terminal 2
cd frontend
npm run dev
```

## Core Scripts

### Backend

- `npm run dev` - start API with nodemon
- `npm start` - production API start
- `npm run data:import` - destructive full seed import
- `npm run data:destroy` - destructive wipe
- `npm run data:seed-categories` - safe category seed (non-destructive for existing slugs)
- `npm test` - backend automated tests
- `npm run test:e2e` - checkout E2E smoke test using `E2E_BASE_URL`
- `npm run openapi:check` - validate OpenAPI documentation
- `npm run backup:create` / `npm run backup:restore` - MongoDB backup tooling
- `npm run perf:checkout` - checkout quote load test

### Frontend

- `npm run dev` - Vite development
- `npm run lint` - lint checks
- `npm run build` - production build
- `npm test` - frontend automated tests
- `npm run preview` - local production preview

## Environment Variables

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

Optional:

- `CLIENT_URL`
- `CORS_ORIGINS` (comma-separated extra allowed origins)
- `BUSINESS_NAME`
- `BUSINESS_EMAIL`
- `BUSINESS_PHONE`
- `BUSINESS_ADDRESS`
- `BUSINESS_WEBSITE`
- `EMAIL_REPLY_TO`
- `EMAIL_TEST_TO` (local SMTP test recipient)
- `EMAIL_SEND_MAX_ATTEMPTS` (default `3`)
- `EMAIL_RETRY_DELAY_MS` (default `750`)

### Frontend (`frontend/.env`)

- `VITE_API_URL` (required when frontend/backend are on different domains)
- `VITE_APP_ENV` (optional)

Security:

- Never place PayHere merchant secrets in frontend env.
- Never commit real secrets to the repository.

## API Health and Hardening

- Health endpoint: `GET /api/health`
- Security headers: Helmet enabled
- Request logging: Morgan enabled
- Rate limits applied to:
  - register
  - login
  - forgot/reset password
  - contact submit
  - public order tracking
- PayHere notification route:
  - `POST /api/payments/payhere/notify`

## PayHere Test Workflow (Local/Staging)

1. Set:
   - `PAYHERE_MERCHANT_ID` (backend)
   - `PAYHERE_MERCHANT_SECRET` (backend)
   - `PAYHERE_CURRENCY=LKR` (backend)
   - `PAYHERE_SANDBOX=true` (backend)
   - `PAYHERE_NOTIFY_URL=https://<backend-domain>/api/payments/payhere/notify` (backend)
   - `VITE_API_URL=https://<backend-domain>` (frontend)
2. For local callback testing, expose the backend:

```bash
ngrok http 5000
```

3. Use the ngrok HTTPS URL as `PAYHERE_NOTIFY_URL`.
4. Complete checkout with PayHere sandbox cards and confirm the order becomes paid only after the callback.

## Email Behavior

- Production: SMTP sends password reset, order, status, invoice, refund, and contact emails.
- Development: if SMTP is missing, the app falls back safely to non-crashing no-op/dev logging behavior.
- Brevo SMTP: use `EMAIL_HOST=smtp-relay.brevo.com`, `EMAIL_PORT=587`, `EMAIL_USER` as your Brevo SMTP login, `EMAIL_PASS` as your Brevo SMTP key, and `EMAIL_FROM` as a verified sender such as `Apex Fashion <orders@apexfashion.lk>`.
- Local SMTP smoke test: from `backend/`, run `npm run email:test -- you@example.com`.

## Seed and Data Safety

- `data:import` and `data:destroy` are destructive and should **never** be run on production.
- For production, use admin UI or controlled import/migration workflows.
- Default seeded admin credentials are dev/staging-only examples and must be rotated before production.

## Deployment

Use [`DEPLOYMENT.md`](./DEPLOYMENT.md) for:

- Render/Railway/Heroku-style backend deployment
- Vercel/Netlify frontend deployment
- PayHere live-path verification checklist
- Email provider setup checklist
- Staging and production launch checklists
