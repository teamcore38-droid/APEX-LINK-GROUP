const SITE_NAME = 'Apex Link Group';
const DEFAULT_DESCRIPTION =
  'Premium multi-industry marketplace across textiles, food products, IT solutions, industrial equipment, and more.';
const DEFAULT_IMAGE = '/Apex Logo.jpg';

const ensureMeta = (selector, create) => {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = create();
    document.head.appendChild(element);
  }

  return element;
};

const setMetaTag = ({ name, property, content }) => {
  const selector = name ? `meta[name="${name}"]` : `meta[property="${property}"]`;
  const element = ensureMeta(selector, () => {
    const meta = document.createElement('meta');
    if (name) meta.setAttribute('name', name);
    if (property) meta.setAttribute('property', property);
    return meta;
  });
  element.setAttribute('content', content || '');
};

const setLinkTag = ({ rel, href }) => {
  const element = ensureMeta(`link[rel="${rel}"]`, () => {
    const link = document.createElement('link');
    link.setAttribute('rel', rel);
    return link;
  });
  element.setAttribute('href', href);
};

const setStructuredData = (id, data) => {
  const element = ensureMeta(`script[type="application/ld+json"][data-seo-id="${id}"]`, () => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.dataset.seoId = id;
    return script;
  });
  element.textContent = JSON.stringify(data);
};

const applySeo = ({
  title = SITE_NAME,
  description = DEFAULT_DESCRIPTION,
  keywords = [],
  canonicalUrl = window.location.href,
  ogImage = DEFAULT_IMAGE,
  type = 'website',
  structuredData = null,
} = {}) => {
  const resolvedTitle = title.includes(SITE_NAME) ? title : `${title} | ${SITE_NAME}`;
  const absoluteImage = new URL(ogImage || DEFAULT_IMAGE, window.location.origin).href;
  const absoluteUrl = canonicalUrl || window.location.href;

  document.title = resolvedTitle;
  setMetaTag({ name: 'description', content: description });
  setMetaTag({ name: 'keywords', content: Array.isArray(keywords) ? keywords.join(', ') : keywords });
  setMetaTag({ property: 'og:title', content: resolvedTitle });
  setMetaTag({ property: 'og:description', content: description });
  setMetaTag({ property: 'og:type', content: type });
  setMetaTag({ property: 'og:url', content: absoluteUrl });
  setMetaTag({ property: 'og:image', content: absoluteImage });
  setMetaTag({ name: 'twitter:card', content: 'summary_large_image' });
  setMetaTag({ name: 'twitter:title', content: resolvedTitle });
  setMetaTag({ name: 'twitter:description', content: description });
  setMetaTag({ name: 'twitter:image', content: absoluteImage });
  setLinkTag({ rel: 'canonical', href: absoluteUrl });

  if (structuredData) {
    setStructuredData('primary', structuredData);
  }
};

const buildProductStructuredData = (product, url = window.location.href) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  image: [product.image, ...(product.images || [])].filter(Boolean),
  description: product.description || product.shortDescription || '',
  sku: product.sku || product._id,
  brand: {
    '@type': 'Brand',
    name: product.brand || SITE_NAME,
  },
  aggregateRating:
    Number(product.numReviews || 0) > 0
      ? {
          '@type': 'AggregateRating',
          ratingValue: Number(product.rating || 0),
          reviewCount: Number(product.numReviews || 0),
        }
      : undefined,
  offers: {
    '@type': 'Offer',
    url,
    priceCurrency: product.currency || 'LKR',
    price: Number(product.price || 0).toFixed(2),
    availability:
      Number(product.countInStock || 0) > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    itemCondition: 'https://schema.org/NewCondition',
  },
});

const buildCategoryStructuredData = (category, url = window.location.href) => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: category.name,
  description: category.description || '',
  image: category.image || DEFAULT_IMAGE,
  url,
});

export {
  DEFAULT_DESCRIPTION,
  DEFAULT_IMAGE,
  SITE_NAME,
  applySeo,
  buildCategoryStructuredData,
  buildProductStructuredData,
};
