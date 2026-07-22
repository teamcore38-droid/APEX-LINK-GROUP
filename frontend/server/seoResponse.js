const SITE_URL = 'https://apexfashion.lk';
const DEFAULT_IMAGE = `${SITE_URL}/hero/hero-bg-4.webp`;

const getApiBaseUrl = () =>
  String(process.env.SEO_API_URL || process.env.VITE_API_URL || '').replace(/\/+$/, '');

const getRequestOrigin = (req) => {
  const forwardedProto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || req.headers.host || 'apexfashion.lk')
    .split(',')[0]
    .trim();
  return `${forwardedProto}://${forwardedHost}`;
};

const normalizeCanonicalUrl = (value = '/') => {
  try {
    const url = new URL(value, SITE_URL);
    return new URL(`${url.pathname}${url.search}`, SITE_URL).href;
  } catch {
    return SITE_URL;
  }
};

const normalizeAssetUrl = (value = DEFAULT_IMAGE) => {
  try {
    return new URL(value || DEFAULT_IMAGE, SITE_URL).href;
  } catch {
    return DEFAULT_IMAGE;
  }
};

const normalizeXmlUrls = (xml = '') =>
  String(xml).replace(/<(loc|link)>([^<]+)<\/(loc|link)>/g, (match, openTag, value, closeTag) => {
    if (openTag !== closeTag) return match;
    return `<${openTag}>${normalizeCanonicalUrl(value)}</${closeTag}>`;
  });

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const removeHeadTag = (html, pattern) => html.replace(pattern, '');

const injectSeoHead = (sourceHtml, seo = {}) => {
  const title = String(seo.title || 'Apex Fashion');
  const description = String(
    seo.description ||
      'Shop shoes, dresses, clothing, handbags, watches, fragrances, and fashion accessories online in Sri Lanka.'
  ).slice(0, 160);
  const canonicalUrl = normalizeCanonicalUrl(seo.canonicalUrl || '/');
  const image = normalizeAssetUrl(seo.ogImage || DEFAULT_IMAGE);
  const robots = seo.robots || 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
  const structuredData = [seo.structuredData, seo.breadcrumbs].filter(Boolean);

  let html = sourceHtml;
  html = removeHeadTag(html, /\s*<title>[\s\S]*?<\/title>/i);
  html = removeHeadTag(html, /\s*<link[^>]+rel=["']canonical["'][^>]*>/gi);
  html = removeHeadTag(html, /\s*<link[^>]+rel=["']alternate["'][^>]*>/gi);
  html = removeHeadTag(
    html,
    /\s*<meta[^>]+(?:name|property)=["'](?:description|robots|googlebot|keywords|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi
  );
  html = removeHeadTag(
    html,
    /\s*<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi
  );

  const tags = `
    <title>${escapeHtml(title)}</title>
    <meta name="description" content="${escapeHtml(description)}" />
    <meta name="robots" content="${escapeHtml(robots)}" />
    <meta name="googlebot" content="${escapeHtml(robots)}" />
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />
    <link rel="alternate" hreflang="en-LK" href="${escapeHtml(canonicalUrl)}" />
    <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonicalUrl)}" />
    <meta property="og:site_name" content="Apex Fashion" />
    <meta property="og:locale" content="en_LK" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(description)}" />
    <meta property="og:type" content="${seo.type === 'product' ? 'product' : 'website'}" />
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta property="og:image:alt" content="${escapeHtml(title)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(description)}" />
    <meta name="twitter:image" content="${escapeHtml(image)}" />
    ${structuredData
      .map(
        (data) =>
          `<script type="application/ld+json" data-seo-prerendered="true">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`
      )
      .join('\n    ')}
  `;

  return html.replace('</head>', `${tags}</head>`);
};

const fetchBackend = async (path, options = {}) => {
  const apiBaseUrl = getApiBaseUrl();
  if (!apiBaseUrl) {
    throw new Error('SEO_API_URL or VITE_API_URL is not configured');
  }

  return fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Accept: options.accept || 'application/json',
      'User-Agent': 'ApexFashion-SEO-Proxy/1.0',
      ...(options.headers || {}),
    },
  });
};

export {
  DEFAULT_IMAGE,
  SITE_URL,
  fetchBackend,
  getRequestOrigin,
  injectSeoHead,
  normalizeCanonicalUrl,
  normalizeXmlUrls,
};
