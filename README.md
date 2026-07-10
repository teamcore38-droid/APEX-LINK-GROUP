# Apex Link Group — Global Marketplace (MERN E-Commerce)

Premium multi-industry marketplace (textiles, spices & food, IT solutions, industrial equipment, home & living, health & beauty) with customer accounts, admin operations, Stripe-ready payments, refund management, invoices, packing slips, contact workflows, and production hardening.

## Project Layout

- `backend/` Express + MongoDB API
- `frontend/` React + Vite application
- `DEPLOYMENT.md` staging/production deployment + verification guide
- `docs/OPERATIONS.md` tests, CI, monitoring, backups, OpenAPI, and load testing

## Prerequisites

- Node.js 18+
- MongoDB (Atlas or local)
- Stripe account (for live payment mode)
- SMTP provider (for production email delivery)

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
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_CURRENCY`
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

### Frontend (`frontend/.env`)

- `VITE_API_URL` (required when frontend/backend are on different domains)
- `VITE_STRIPE_PUBLIC_KEY`
- `VITE_APP_ENV` (optional)

Security:

- Never place Stripe secret keys in frontend env.
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
- Stripe webhook raw-body parsing preserved at:
  - `POST /api/payments/webhook`

## Stripe Test Workflow (Local/Staging)

1. Set:
   - `STRIPE_SECRET_KEY` (backend)
   - `STRIPE_WEBHOOK_SECRET` (backend)
   - `VITE_STRIPE_PUBLIC_KEY` (frontend)
2. Start webhook forwarding:

```bash
stripe listen --forward-to localhost:5000/api/payments/webhook
```

3. Verify events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
   - `charge.refunded`
   - `refund.created`
   - `refund.updated`
   - `refund.failed`

## Email Behavior

- Production: SMTP sends password reset, order, status, invoice, refund, and contact emails.
- Development: if SMTP is missing, the app falls back safely to non-crashing no-op/dev logging behavior.

## Seed and Data Safety

- `data:import` and `data:destroy` are destructive and should **never** be run on production.
- For production, use admin UI or controlled import/migration workflows.
- Default seeded admin credentials are dev/staging-only examples and must be rotated before production.

## Deployment

Use [`DEPLOYMENT.md`](./DEPLOYMENT.md) for:

- Render/Railway/Heroku-style backend deployment
- Vercel/Netlify frontend deployment
- Stripe live-path verification checklist
- Email provider setup checklist
- Staging and production launch checklists
