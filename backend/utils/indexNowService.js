const DEFAULT_SITE_URL = 'https://www.apexfashion.lk';
const DEFAULT_INDEXNOW_KEY = '1ef018ac3d1ac76bbd2ec0b7d79ce2ce';
const DEFAULT_ENDPOINT = 'https://api.indexnow.org/indexnow';

const getSiteUrl = () => {
  const configured = String(process.env.FRONTEND_URL || DEFAULT_SITE_URL).replace(/\/+$/, '');

  try {
    const url = new URL(configured);
    if (url.hostname === 'apexfashion.lk') url.hostname = 'www.apexfashion.lk';
    return url.href.replace(/\/+$/, '');
  } catch {
    return DEFAULT_SITE_URL;
  }
};

const buildIndexNowPayload = (paths = []) => {
  const siteUrl = getSiteUrl();
  const site = new URL(siteUrl);
  const key = String(process.env.INDEXNOW_KEY || DEFAULT_INDEXNOW_KEY).trim();
  const urlList = [
    ...new Set(
      paths
        .filter(Boolean)
        .map((path) => new URL(path, `${siteUrl}/`).href)
        .filter((url) => new URL(url).host === site.host)
    ),
  ].slice(0, 10000);

  return {
    host: site.host,
    key,
    keyLocation: `${siteUrl}/${key}.txt`,
    urlList,
  };
};

const notifyIndexNow = async (paths = []) => {
  if (process.env.NODE_ENV !== 'production' || process.env.INDEXNOW_ENABLED === 'false') {
    return false;
  }

  const payload = buildIndexNowPayload(paths);
  if (payload.urlList.length === 0) {
    return false;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch(process.env.INDEXNOW_ENDPOINT || DEFAULT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (![200, 202].includes(response.status)) {
      console.warn(`[indexnow] Submission returned HTTP ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.warn(`[indexnow] Submission failed: ${error.message}`);
    return false;
  } finally {
    clearTimeout(timeout);
  }
};

export { buildIndexNowPayload, notifyIndexNow };
