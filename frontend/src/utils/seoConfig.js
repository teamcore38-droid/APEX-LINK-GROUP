const SITE_NAME = 'Apex Fashion';
const SITE_URL = 'https://www.apexfashion.lk';
const DEFAULT_IMAGE = '/hero/hero-bg-4.webp';
const DEFAULT_DESCRIPTION =
  'Shop shoes, dresses, clothing, handbags, watches, fragrances, and fashion accessories online in Sri Lanka with Apex Fashion.';

const PUBLIC_ROUTE_SEO = {
  '/': {
    title: 'Online Fashion Store Sri Lanka | Apex Fashion',
    description:
      'Shop women\'s and men\'s fashion, shoes, dresses, handbags, watches, perfumes, and accessories online across Sri Lanka at Apex Fashion.',
    keywords: [
      'online fashion store Sri Lanka',
      'shoes Sri Lanka',
      'dresses Sri Lanka',
      'women fashion Sri Lanka',
      'men fashion Sri Lanka',
      'handbags Sri Lanka',
    ],
  },
  '/products': {
    title: 'Shop Shoes, Clothing, Dresses & Bags in Sri Lanka',
    description:
      'Browse shoes, women\'s dresses, men\'s clothing, handbags, watches, perfumes, and fashion accessories with islandwide delivery in Sri Lanka.',
    keywords: [
      'buy shoes online Sri Lanka',
      'dresses online Sri Lanka',
      'men clothing Sri Lanka',
      'women clothing Sri Lanka',
      'handbags online Sri Lanka',
    ],
  },
  '/categories': {
    title: 'Fashion Categories | Shoes, Dresses, Clothing & Accessories',
    description:
      'Explore Apex Fashion collections for women and men, including footwear, dresses, clothing, handbags, watches, fragrances, and accessories.',
  },
  '/about': {
    title: 'About Apex Fashion Sri Lanka',
    description:
      'Learn about Apex Fashion, a Sri Lankan online fashion store operated by Apex Link Import and Export pvt Lmt.',
  },
  '/contact': {
    title: 'Contact Apex Fashion',
    description:
      'Contact Apex Fashion customer care in Sri Lanka for product, payment, delivery, return, and order assistance.',
  },
  '/faq': {
    title: 'Frequently Asked Questions',
    description:
      'Find answers about shopping, PayHere payments, delivery, order tracking, returns, and refunds at Apex Fashion Sri Lanka.',
  },
  '/shipping': {
    title: 'Shipping & Delivery Policy Sri Lanka',
    description:
      'Read the Apex Fashion shipping and delivery policy for online fashion orders delivered across Sri Lanka.',
  },
  '/returns': {
    title: 'Refund & Return Policy',
    description:
      'Read the Apex Fashion return, exchange, cancellation, and refund policy before placing your online order.',
  },
  '/payment-policy': {
    title: 'PayHere Payment Policy',
    description:
      'Learn how Apex Fashion processes secure online payments, confirmations, failed payments, refunds, and chargebacks through PayHere.',
  },
  '/privacy': {
    title: 'Privacy Policy',
    description:
      'Learn how Apex Fashion collects, uses, protects, and manages customer personal data in Sri Lanka.',
  },
  '/cookies': {
    title: 'Cookie Policy',
    description:
      'Learn how Apex Fashion uses necessary, analytics, marketing, and personalisation cookies and how to manage your choices.',
  },
  '/terms': {
    title: 'Terms & Conditions',
    description:
      'Read the terms and conditions that apply when browsing, ordering, paying, and receiving products from Apex Fashion.',
  },
};

const NOINDEX_PREFIXES = [
  '/admin',
  '/account',
  '/cart',
  '/checkout',
  '/customer-experience',
  '/forgot-password',
  '/login',
  '/order',
  '/orders',
  '/privacy-center',
  '/profile',
  '/register',
  '/reset-password',
  '/rfq',
  '/track-order',
  '/vendor',
];

const normalizePathname = (pathname = '/') => {
  const normalized = `/${String(pathname || '').replace(/^\/+|\/+$/g, '')}`;
  return normalized === '/' ? normalized : normalized.replace(/\/+$/, '');
};

const buildCanonicalUrl = (pathname = '/') => {
  const normalized = normalizePathname(pathname);
  return normalized === '/' ? `${SITE_URL}/` : `${SITE_URL}${normalized}`;
};

const isNoIndexPath = (pathname = '/') => {
  const normalized = normalizePathname(pathname);
  return NOINDEX_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
};

const getPublicRouteSeo = (pathname = '/') => PUBLIC_ROUTE_SEO[normalizePathname(pathname)] || null;

export {
  DEFAULT_DESCRIPTION,
  DEFAULT_IMAGE,
  NOINDEX_PREFIXES,
  PUBLIC_ROUTE_SEO,
  SITE_NAME,
  SITE_URL,
  buildCanonicalUrl,
  getPublicRouteSeo,
  isNoIndexPath,
  normalizePathname,
};
