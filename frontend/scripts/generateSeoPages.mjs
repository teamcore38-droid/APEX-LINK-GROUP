import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUSINESS_INFO } from '../src/utils/businessInfo.js';
import {
  DEFAULT_IMAGE,
  PUBLIC_ROUTE_SEO,
  SITE_NAME,
  SITE_URL,
  buildCanonicalUrl,
} from '../src/utils/seoConfig.js';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const frontendDirectory = path.resolve(scriptDirectory, '..');
const distDirectory = path.join(frontendDirectory, 'dist');
const sourceHtml = await readFile(path.join(distDirectory, 'index.html'), 'utf8');

const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const createStructuredData = (route, seo) => {
  const canonicalUrl = buildCanonicalUrl(route);
  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: seo.title,
    description: seo.description,
    url: canonicalUrl,
    inLanguage: 'en-LK',
    isPartOf: { '@id': `${SITE_URL}/#website` },
  };

  if (route !== '/') {
    return [
      webPage,
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
          { '@type': 'ListItem', position: 2, name: seo.title.replace(/\s*\|.*$/, ''), item: canonicalUrl },
        ],
      },
    ];
  }

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'OnlineStore',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      legalName: BUSINESS_INFO.legalName,
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/logo.webp`,
      image: `${SITE_URL}${DEFAULT_IMAGE}`,
      telephone: BUSINESS_INFO.phone,
      email: BUSINESS_INFO.email,
      address: { '@type': 'PostalAddress', ...BUSINESS_INFO.address },
      areaServed: { '@type': 'Country', name: 'Sri Lanka' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      inLanguage: 'en-LK',
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    webPage,
  ];
};

const renderHtml = (route, seo) => {
  const canonicalUrl = buildCanonicalUrl(route);
  const image = `${SITE_URL}${DEFAULT_IMAGE}`;
  const structuredData = createStructuredData(route, seo);
  let html = sourceHtml
    .replace(/\s*<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<link[^>]+rel=["']canonical["'][^>]*>/gi, '')
    .replace(/\s*<link[^>]+rel=["']alternate["'][^>]*>/gi, '')
    .replace(
      /\s*<meta[^>]+(?:name|property)=["'](?:description|robots|googlebot|keywords|og:[^"']+|twitter:[^"']+)["'][^>]*>/gi,
      ''
    )
    .replace(/\s*<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, '');

  const tags = `
    <title>${escapeHtml(seo.title)}</title>
    <meta name="description" content="${escapeHtml(seo.description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <meta name="googlebot" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
    <link rel="canonical" href="${canonicalUrl}" />
    <link rel="alternate" hreflang="en-LK" href="${canonicalUrl}" />
    <link rel="alternate" hreflang="x-default" href="${canonicalUrl}" />
    <meta property="og:site_name" content="${SITE_NAME}" />
    <meta property="og:locale" content="en_LK" />
    <meta property="og:title" content="${escapeHtml(seo.title)}" />
    <meta property="og:description" content="${escapeHtml(seo.description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${canonicalUrl}" />
    <meta property="og:image" content="${image}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(seo.title)}" />
    <meta name="twitter:description" content="${escapeHtml(seo.description)}" />
    <meta name="twitter:image" content="${image}" />
    ${structuredData
      .map(
        (data) =>
          `<script type="application/ld+json" data-seo-prerendered="true">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`
      )
      .join('\n    ')}
  `;

  return html.replace('</head>', `${tags}</head>`);
};

for (const [route, seo] of Object.entries(PUBLIC_ROUTE_SEO)) {
  if (route === '/') continue;
  const outputDirectory = path.join(distDirectory, route.replace(/^\//, ''));
  await mkdir(outputDirectory, { recursive: true });
  await writeFile(path.join(outputDirectory, 'index.html'), renderHtml(route, seo), 'utf8');
}

await writeFile(path.join(distDirectory, 'index.html'), renderHtml('/', PUBLIC_ROUTE_SEO['/']), 'utf8');

console.log(`Generated SEO HTML for ${Object.keys(PUBLIC_ROUTE_SEO).length} public routes.`);
