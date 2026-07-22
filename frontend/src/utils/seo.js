import { BUSINESS_INFO } from './businessInfo';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_IMAGE,
  SITE_NAME,
  SITE_URL,
  buildCanonicalUrl,
} from './seoConfig';

const INDEX_ROBOTS = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
const NOINDEX_ROBOTS = 'noindex, nofollow, noarchive';

const ensureElement = (selector, create) => {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = create();
    document.head.appendChild(element);
  }

  return element;
};

const setMetaTag = ({ name, property, content }) => {
  const selector = name ? `meta[name="${name}"]` : `meta[property="${property}"]`;
  const element = ensureElement(selector, () => {
    const meta = document.createElement('meta');
    if (name) meta.setAttribute('name', name);
    if (property) meta.setAttribute('property', property);
    return meta;
  });
  element.setAttribute('content', content || '');
};

const setLinkTag = ({ rel, href, hreflang }) => {
  const hreflangSelector = hreflang ? `[hreflang="${hreflang}"]` : ':not([hreflang])';
  const element = ensureElement(`link[rel="${rel}"]${hreflangSelector}`, () => {
    const link = document.createElement('link');
    link.setAttribute('rel', rel);
    if (hreflang) link.setAttribute('hreflang', hreflang);
    return link;
  });
  element.setAttribute('href', href);
};

const clearStructuredData = () => {
  document.head
    .querySelectorAll(
      'script[type="application/ld+json"][data-seo-managed="true"], script[type="application/ld+json"][data-seo-prerendered="true"]'
    )
    .forEach((element) => element.remove());
};

const setStructuredData = (structuredData) => {
  clearStructuredData();

  const entries = (Array.isArray(structuredData) ? structuredData : [structuredData]).filter(Boolean);
  entries.forEach((data, index) => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.seoManaged = 'true';
    script.dataset.seoId = String(index);
    script.textContent = JSON.stringify(data);
    document.head.appendChild(script);
  });
};

const toAbsoluteUrl = (value = DEFAULT_IMAGE) => {
  try {
    return new URL(value || DEFAULT_IMAGE, SITE_URL).href;
  } catch {
    return new URL(DEFAULT_IMAGE, SITE_URL).href;
  }
};

const getImageUrl = (image = '') =>
  typeof image === 'string' ? image : String(image?.url || image?.secureUrl || '').trim();

const getProductImageUrls = (product = {}) =>
  [product.image, ...(product.images || [])]
    .map((image) => getImageUrl(image))
    .filter(Boolean)
    .map(toAbsoluteUrl);

const applySeo = ({
  title = SITE_NAME,
  description = DEFAULT_DESCRIPTION,
  keywords = [],
  canonicalUrl = buildCanonicalUrl(window.location.pathname),
  ogImage = DEFAULT_IMAGE,
  imageAlt,
  type = 'website',
  robots = INDEX_ROBOTS,
  structuredData = null,
} = {}) => {
  const cleanTitle = String(title || SITE_NAME).trim();
  const resolvedTitle = cleanTitle.toLowerCase().includes(SITE_NAME.toLowerCase())
    ? cleanTitle
    : `${cleanTitle} | ${SITE_NAME}`;
  const resolvedDescription = String(description || DEFAULT_DESCRIPTION).trim().slice(0, 160);
  const absoluteImage = toAbsoluteUrl(ogImage);
  const absoluteUrl = toAbsoluteUrl(canonicalUrl);
  const resolvedImageAlt = imageAlt || resolvedTitle;

  document.title = resolvedTitle;
  setMetaTag({ name: 'description', content: resolvedDescription });
  setMetaTag({ name: 'robots', content: robots });
  setMetaTag({ name: 'googlebot', content: robots });
  setMetaTag({ name: 'keywords', content: Array.isArray(keywords) ? keywords.join(', ') : keywords });
  setMetaTag({ property: 'og:site_name', content: SITE_NAME });
  setMetaTag({ property: 'og:locale', content: 'en_LK' });
  setMetaTag({ property: 'og:title', content: resolvedTitle });
  setMetaTag({ property: 'og:description', content: resolvedDescription });
  setMetaTag({ property: 'og:type', content: type });
  setMetaTag({ property: 'og:url', content: absoluteUrl });
  setMetaTag({ property: 'og:image', content: absoluteImage });
  setMetaTag({ property: 'og:image:alt', content: resolvedImageAlt });
  setMetaTag({ name: 'twitter:card', content: 'summary_large_image' });
  setMetaTag({ name: 'twitter:title', content: resolvedTitle });
  setMetaTag({ name: 'twitter:description', content: resolvedDescription });
  setMetaTag({ name: 'twitter:image', content: absoluteImage });
  setMetaTag({ name: 'twitter:image:alt', content: resolvedImageAlt });
  setLinkTag({ rel: 'canonical', href: absoluteUrl });
  setLinkTag({ rel: 'alternate', hreflang: 'en-LK', href: absoluteUrl });
  setLinkTag({ rel: 'alternate', hreflang: 'x-default', href: absoluteUrl });
  setStructuredData(structuredData);
};

const buildBreadcrumbStructuredData = (items = []) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: toAbsoluteUrl(item.url),
  })),
});

const buildStoreStructuredData = () => ({
  '@context': 'https://schema.org',
  '@type': 'OnlineStore',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  legalName: BUSINESS_INFO.legalName,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/logo.webp`,
  image: toAbsoluteUrl(DEFAULT_IMAGE),
  description: DEFAULT_DESCRIPTION,
  email: BUSINESS_INFO.email,
  telephone: BUSINESS_INFO.phone,
  currenciesAccepted: 'LKR',
  areaServed: {
    '@type': 'Country',
    name: 'Sri Lanka',
  },
  address: {
    '@type': 'PostalAddress',
    ...BUSINESS_INFO.address,
  },
  openingHoursSpecification: BUSINESS_INFO.openingHours.map((hours) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: hours.days.map((day) => `https://schema.org/${day}`),
    opens: hours.opens,
    closes: hours.closes,
  })),
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    telephone: BUSINESS_INFO.phone,
    email: BUSINESS_INFO.email,
    areaServed: 'LK',
    availableLanguage: ['English'],
  },
});

const buildWebsiteStructuredData = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  inLanguage: 'en-LK',
  publisher: { '@id': `${SITE_URL}/#organization` },
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/products?keyword={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
});

const buildWebPageStructuredData = ({ title, description, url }) => ({
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: title,
  description,
  url: toAbsoluteUrl(url),
  inLanguage: 'en-LK',
  isPartOf: { '@id': `${SITE_URL}/#website` },
  about: { '@id': `${SITE_URL}/#organization` },
});

const buildProductStructuredData = (product, url = buildCanonicalUrl(window.location.pathname)) => {
  const colors = [
    ...(product.variants || []).map((variant) => variant.color),
    ...(product.sizes || []).flatMap((size) => size.colors || []),
  ].filter(Boolean);
  const sizes = [
    ...(product.variants || []).flatMap((variant) => [variant.size, ...(variant.availableSizes || [])]),
    ...(product.sizes || []).map((size) => size.size),
  ].filter(Boolean);

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${toAbsoluteUrl(url)}#product`,
    name: product.name,
    image: getProductImageUrls(product),
    description: product.description || product.shortDescription || '',
    sku: product.sku || product._id,
    category: product.category,
    color: [...new Set(colors)].join(', ') || undefined,
    size: [...new Set(sizes)].join(', ') || undefined,
    brand: {
      '@type': 'Brand',
      name: product.brand || SITE_NAME,
    },
    aggregateRating:
      Number(product.numReviews || 0) > 0 && Number(product.rating || 0) > 0
        ? {
            '@type': 'AggregateRating',
            ratingValue: Number(product.rating),
            reviewCount: Number(product.numReviews),
          }
        : undefined,
    offers: {
      '@type': 'Offer',
      url: toAbsoluteUrl(url),
      priceCurrency: product.currency || 'LKR',
      price: Number(product.price || 0).toFixed(2),
      availability:
        Number(product.countInStock || 0) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@id': `${SITE_URL}/#organization` },
    },
  };
};

const buildCategoryStructuredData = (category, url = buildCanonicalUrl(window.location.pathname)) => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  '@id': `${toAbsoluteUrl(url)}#collection`,
  name: category.name,
  description: category.description || `Shop ${category.name} at ${SITE_NAME}.`,
  image: toAbsoluteUrl(category.image || DEFAULT_IMAGE),
  url: toAbsoluteUrl(url),
  inLanguage: 'en-LK',
  isPartOf: { '@id': `${SITE_URL}/#website` },
});

export {
  DEFAULT_DESCRIPTION,
  DEFAULT_IMAGE,
  INDEX_ROBOTS,
  NOINDEX_ROBOTS,
  SITE_NAME,
  SITE_URL,
  applySeo,
  buildBreadcrumbStructuredData,
  buildCategoryStructuredData,
  buildProductStructuredData,
  buildStoreStructuredData,
  buildWebPageStructuredData,
  buildWebsiteStructuredData,
};
