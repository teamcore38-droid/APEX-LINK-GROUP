import { sendAlert } from '../utils/alertService.js';

const urls = (process.env.UPTIME_URLS || process.argv.slice(2).join(','))
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean);

if (urls.length === 0) {
  console.error('Set UPTIME_URLS or pass one or more URLs.');
  process.exit(1);
}

let failed = false;

for (const url of urls) {
  const started = performance.now();
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(Number(process.env.UPTIME_TIMEOUT_MS || 8000)) });
    const elapsed = Math.round(performance.now() - started);

    if (!response.ok) {
      failed = true;
      await sendAlert({
        title: 'Uptime check failed',
        message: `${url} returned ${response.status}`,
        severity: 'critical',
        metadata: { url, elapsed },
      });
    } else {
      console.log(`${url} ok ${response.status} ${elapsed}ms`);
    }
  } catch (error) {
    failed = true;
    await sendAlert({
      title: 'Uptime check failed',
      message: `${url} failed: ${error.message}`,
      severity: 'critical',
      metadata: { url },
    });
  }
}

process.exit(failed ? 1 : 0);
