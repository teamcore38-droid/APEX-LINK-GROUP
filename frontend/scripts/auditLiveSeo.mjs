const SITE_URL = String(process.env.SEO_AUDIT_SITE_URL || 'https://apexfashion.lk').replace(/\/+$/, '');
const CANONICAL_HOST = new URL(SITE_URL).hostname;
const FORBIDDEN_OUTPUT = /localhost|127\.0\.0\.1|\.vercel\.app|https:\/\/www\.apexfashion\.lk|[A-Za-z]:\\/i;
const COPIED_DESCRIPTION =
  /\bBIS\b|bis\.gov\.in|bureau of indian standards|product safety information|\b(?:meesho|amazon|flipkart|indiamart|tradeindia|daraz|alibaba)\b/i;

const decodeXml = (value = '') =>
  String(value)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");

const getXmlValues = (xml, tag) => [
  ...String(xml).matchAll(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'gi')),
].map((match) => decodeXml(match[1].trim()));

const getXmlValue = (xml, tag) => getXmlValues(xml, tag)[0] || '';

const getMeta = (html, attribute, value) => {
  const pattern = new RegExp(
    `<meta[^>]+${attribute}=["']${value}["'][^>]+content=["']([^"']*)`,
    'i'
  );
  return decodeXml(html.match(pattern)?.[1] || '');
};

const getCanonical = (html) =>
  decodeXml(html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1] || '');

const getInternalLinks = (html, pageUrl) =>
  [...String(html).matchAll(/<a[^>]+href=["']([^"'#]+)["']/gi)]
    .map((match) => {
      try {
        const url = new URL(decodeXml(match[1]), pageUrl);
        url.hash = '';
        return ['http:', 'https:'].includes(url.protocol) &&
          [CANONICAL_HOST, `www.${CANONICAL_HOST}`].includes(url.hostname)
          ? url.href
          : '';
      } catch {
        return '';
      }
    })
    .filter(Boolean);

const getStructuredData = (html) =>
  [...String(html).matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

const fetchResource = async (url, options = {}) => {
  const response = await fetch(url, options);
  return { response, text: options.method === 'HEAD' ? '' : await response.text() };
};

const runPool = async (items, task, concurrency = 8) => {
  const results = new Array(items.length);
  let cursor = 0;

  const worker = async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length || 1) }, worker));
  return results;
};

const endpointIssues = [];
const robotsUrl = `${SITE_URL}/robots.txt`;
const sitemapUrl = `${SITE_URL}/sitemap.xml`;
const feedUrl = `${SITE_URL}/product-feed.xml`;
const [robotsResult, sitemapResult, feedResult] = await Promise.all([
  fetchResource(robotsUrl),
  fetchResource(sitemapUrl),
  fetchResource(feedUrl),
]);

for (const [name, result] of [
  ['robots.txt', robotsResult],
  ['sitemap.xml', sitemapResult],
  ['product-feed.xml', feedResult],
]) {
  if (result.response.status !== 200) endpointIssues.push(`${name} returned ${result.response.status}`);
  if (new URL(result.response.url).hostname !== CANONICAL_HOST) {
    endpointIssues.push(`${name} resolved to non-canonical host ${new URL(result.response.url).hostname}`);
  }
  if (FORBIDDEN_OUTPUT.test(result.text)) endpointIssues.push(`${name} contains a forbidden URL or file path`);
}

if (!/^User-agent:\s*\*/im.test(robotsResult.text)) endpointIssues.push('robots.txt has no wildcard user-agent');
if (!/^Allow:\s*\/$/im.test(robotsResult.text)) endpointIssues.push('robots.txt does not allow public crawling');
if (/^Disallow:\s*\/(?:products?|category)/im.test(robotsResult.text)) {
  endpointIssues.push('robots.txt blocks a public catalog path');
}
if (!robotsResult.text.includes(`Sitemap: ${sitemapUrl}`)) {
  endpointIssues.push('robots.txt does not advertise the canonical sitemap URL');
}

const sitemapUrls = getXmlValues(sitemapResult.text, 'loc');
const duplicateSitemapUrls = sitemapUrls.filter((url, index) => sitemapUrls.indexOf(url) !== index);
if (duplicateSitemapUrls.length > 0) endpointIssues.push('sitemap.xml contains duplicate URLs');

const sitemapChecks = await runPool(sitemapUrls, async (url) => {
  const issues = [];
  let html = '';
  let finalUrl = url;

  try {
    const direct = await fetch(url, { redirect: 'manual' });
    if (direct.status !== 200) issues.push(`direct HTTP ${direct.status}`);
    const followed = await fetch(url);
    finalUrl = followed.url;
    html = followed.headers.get('content-type')?.includes('text/html') ? await followed.text() : '';
    if (followed.status !== 200) issues.push(`final HTTP ${followed.status}`);
    if (new URL(followed.url).hostname !== CANONICAL_HOST) {
      issues.push(`resolved to ${new URL(followed.url).hostname}`);
    }
    if (FORBIDDEN_OUTPUT.test(url) || FORBIDDEN_OUTPUT.test(html)) issues.push('forbidden URL or path');

    const canonical = getCanonical(html);
    if (!canonical || new URL(canonical).hostname !== CANONICAL_HOST) issues.push('invalid canonical');

    if (new URL(url).pathname.startsWith('/product/')) {
      const title = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
      const description = getMeta(html, 'name', 'description');
      const ogTitle = getMeta(html, 'property', 'og:title');
      const ogDescription = getMeta(html, 'property', 'og:description');
      const ogImage = getMeta(html, 'property', 'og:image');
      const schema = getStructuredData(html).find((entry) => entry['@type'] === 'Product');
      const schemaImages = Array.isArray(schema?.image) ? schema.image : [schema?.image].filter(Boolean);

      if (!title) issues.push('missing title');
      if (!description) issues.push('missing description');
      if (COPIED_DESCRIPTION.test(description)) issues.push('copied marketplace description');
      if (!ogTitle || !ogDescription || !ogImage) issues.push('incomplete Open Graph metadata');
      if (!schema) issues.push('missing Product schema');
      if (!schema?.name) issues.push('missing schema name');
      if (!schema?.description) issues.push('missing schema description');
      if (schemaImages.length === 0) issues.push('missing schema image');
      if (schema?.offers?.priceCurrency !== 'LKR') issues.push('schema currency is not LKR');
      if (!(Number(schema?.offers?.price) > 0)) issues.push('invalid schema price');
      if (!/^https:\/\/schema\.org\/(?:InStock|OutOfStock)$/.test(schema?.offers?.availability || '')) {
        issues.push('invalid schema availability');
      }
      if (!schema?.brand?.name) issues.push('missing schema brand');
    }
  } catch (error) {
    issues.push(error.message);
  }

  return { url, issues, internalLinks: getInternalLinks(html, finalUrl) };
});

const internalLinks = [
  ...new Set(sitemapChecks.flatMap((item) => item.internalLinks || [])),
];
const linkChecks = await runPool(internalLinks, async (url) => {
  const issues = [];
  try {
    const response = await fetch(url);
    if (response.status >= 400) issues.push(`HTTP ${response.status}`);
  } catch (error) {
    issues.push(error.message);
  }
  return { url, issues };
});

const feedItems = getXmlValues(feedResult.text, 'item');
const feedChecks = feedItems.map((item) => {
  const issues = [];
  const itemGroupId = getXmlValue(item, 'g:item_group_id');
  const itemGroupTitle = getXmlValue(item, 'g:item_group_title');
  const variantOptions = getXmlValues(item, 'g:variant_option');
  const required = {
    id: getXmlValue(item, 'g:id'),
    title: getXmlValue(item, 'title'),
    description: getXmlValue(item, 'description'),
    link: getXmlValue(item, 'link'),
    image: getXmlValue(item, 'g:image_link'),
    availability: getXmlValue(item, 'g:availability'),
    price: getXmlValue(item, 'g:price'),
    condition: getXmlValue(item, 'g:condition'),
    brand: getXmlValue(item, 'g:brand'),
  };

  for (const [field, value] of Object.entries(required)) {
    if (!value) issues.push(`missing ${field}`);
  }
  if (required.id.length > 50) issues.push('id exceeds 50 characters');
  if (required.title.length > 150) issues.push('title exceeds 150 characters');
  if (required.description.length > 5000) issues.push('description exceeds 5000 characters');
  if (COPIED_DESCRIPTION.test(required.description)) issues.push('copied marketplace description');
  if (!/^\d+(?:\.\d{2}) LKR$/.test(required.price) || !(Number.parseFloat(required.price) > 0)) {
    issues.push('invalid LKR price');
  }
  if (!['in_stock', 'out_of_stock', 'preorder', 'backorder'].includes(required.availability)) {
    issues.push('invalid availability');
  }
  if (required.condition !== 'new') issues.push('invalid condition');
  if (FORBIDDEN_OUTPUT.test(Object.values(required).join(' '))) issues.push('forbidden URL or path');

  try {
    const landingPageUrl = new URL(required.link);
    const isVariant = ['variant', 'size', 'color'].some((parameter) =>
      landingPageUrl.searchParams.has(parameter)
    );
    if (isVariant && !itemGroupId) issues.push('variant is missing item_group_id');
    if (isVariant && !itemGroupTitle) issues.push('variant is missing item_group_title');
    if (isVariant && variantOptions.length === 0) issues.push('variant is missing variant_option');

    for (const option of variantOptions) {
      if (!getXmlValue(option, 'g:name') || !getXmlValue(option, 'g:value')) {
        issues.push('variant_option is missing name or value');
      }
    }

    const baseProductUrl = new URL(landingPageUrl);
    baseProductUrl.search = '';
    if (!sitemapUrls.includes(baseProductUrl.href)) issues.push('landing page is absent from sitemap');
  } catch {
    issues.push('invalid landing page URL');
  }

  return { id: required.id, title: required.title, link: required.link, image: required.image, issues };
});

const feedIds = feedChecks.map((item) => item.id);
const duplicateFeedIds = feedIds.filter((id, index) => feedIds.indexOf(id) !== index);
if (feedItems.length === 0) endpointIssues.push('product-feed.xml contains no products');
if (duplicateFeedIds.length > 0) endpointIssues.push('product-feed.xml contains duplicate product IDs');

const imageChecks = await runPool(
  [...new Set(feedChecks.map((item) => item.image).filter(Boolean))],
  async (url) => {
    const issues = [];
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) issues.push(`HTTP ${response.status}`);
      if (!response.headers.get('content-type')?.startsWith('image/')) issues.push('not an image response');
    } catch (error) {
      issues.push(error.message);
    }
    return { url, issues };
  }
);

const report = {
  siteUrl: SITE_URL,
  endpoints: {
    robots: robotsResult.response.status,
    sitemap: sitemapResult.response.status,
    productFeed: feedResult.response.status,
  },
  totals: {
    sitemapUrls: sitemapUrls.length,
    sitemapProducts: sitemapUrls.filter((url) => new URL(url).pathname.startsWith('/product/')).length,
    merchantItems: feedItems.length,
    merchantImages: imageChecks.length,
    internalLinks: internalLinks.length,
  },
  issues: {
    endpoints: endpointIssues,
    sitemap: sitemapChecks.filter((item) => item.issues.length > 0),
    links: linkChecks.filter((item) => item.issues.length > 0),
    feed: feedChecks.filter((item) => item.issues.length > 0),
    images: imageChecks.filter((item) => item.issues.length > 0),
  },
};

const issueCount = Object.values(report.issues).reduce((total, issues) => total + issues.length, 0);
console.log(JSON.stringify({ ...report, issueCount }, null, 2));
if (issueCount > 0) process.exitCode = 1;
