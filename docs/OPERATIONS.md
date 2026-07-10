# Apex Link Group Operations

## Automated Tests

Backend:

```bash
cd backend
npm test
npm run test:e2e
```

Frontend:

```bash
cd frontend
npm run lint
npm test
npm run build
```

Checkout E2E smoke uses `E2E_BASE_URL`. It loads live products, submits a quote, and asserts the server recalculates totals.

## CI/CD

GitHub Actions workflow: `.github/workflows/ci.yml`.

It runs backend unit tests, OpenAPI validation, frontend tests, lint, and production build. Optional checkout E2E runs when `E2E_BASE_URL` is available.

## Error Monitoring

Backend supports `SENTRY_DSN`. Server errors are captured through `backend/utils/errorMonitoring.js`.

Frontend runtime errors are posted to:

```text
POST /api/ops/client-errors
```

## Logging And Alerting

Backend emits structured JSON logs through `backend/utils/logger.js`.

Set one of these to receive alert webhooks:

- `ALERT_WEBHOOK_URL`
- `SLACK_WEBHOOK_URL`
- `TEAMS_WEBHOOK_URL`

## Uptime Monitoring

Probe endpoints:

- `GET /api/ops/health`
- `GET /api/ops/readiness`
- `GET /api/ops/uptime`
- `GET /api/ops/metrics`

Script:

```bash
cd backend
UPTIME_URLS=https://api.example.com/api/ops/uptime npm run uptime:check
```

## Database Backups

Requires MongoDB Database Tools in PATH.

Create backup:

```bash
cd backend
npm run backup:create
```

Restore backup:

```bash
cd backend
ALLOW_DB_RESTORE=true npm run backup:restore -- ./backups/apex-YYYY-MM-DD
```

## API Documentation

OpenAPI JSON lives at:

```text
backend/docs/openapi.json
GET /api/docs/openapi.json
GET /api/ops/openapi.json
```

Validate:

```bash
cd backend
npm run openapi:check
```

## Load Testing

Checkout quote load test:

```bash
cd backend
LOAD_TEST_BASE_URL=http://127.0.0.1:5000 LOAD_TEST_REQUESTS=100 LOAD_TEST_CONCURRENCY=10 npm run perf:checkout
```

## Growth Automation

Newsletter subscribers are stored locally and can sync to `NEWSLETTER_WEBHOOK_URL` or Mailchimp (`MAILCHIMP_API_KEY`, `MAILCHIMP_AUDIENCE_ID`, `MAILCHIMP_SERVER_PREFIX`).

Abandoned cart recovery can run from a scheduler:

```bash
cd backend
npm run marketing:send-abandoned
```
