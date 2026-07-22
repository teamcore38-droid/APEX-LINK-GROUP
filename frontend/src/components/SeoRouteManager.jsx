import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  INDEX_ROBOTS,
  NOINDEX_ROBOTS,
  applySeo,
  buildBreadcrumbStructuredData,
  buildStoreStructuredData,
  buildWebPageStructuredData,
  buildWebsiteStructuredData,
} from '../utils/seo';
import {
  DEFAULT_DESCRIPTION,
  DEFAULT_IMAGE,
  SITE_NAME,
  buildCanonicalUrl,
  getPublicRouteSeo,
  isNoIndexPath,
} from '../utils/seoConfig';

const getPrivatePageTitle = (pathname) => {
  if (pathname.startsWith('/admin')) return 'Admin';
  if (pathname.startsWith('/orders') || pathname.startsWith('/order')) return 'Order Details';
  if (pathname.startsWith('/vendor')) return 'Vendor Portal';
  if (pathname.startsWith('/reset-password') || pathname.startsWith('/forgot-password')) return 'Password Help';
  if (pathname.startsWith('/profile') || pathname.startsWith('/account')) return 'My Account';
  if (pathname.startsWith('/track-order')) return 'Track Order';
  if (pathname.startsWith('/checkout')) return 'Checkout';
  if (pathname.startsWith('/cart')) return 'Shopping Cart';
  if (pathname.startsWith('/login')) return 'Sign In';
  if (pathname.startsWith('/register')) return 'Create Account';
  return 'Private Page';
};

const SeoRouteManager = () => {
  const location = useLocation();

  useEffect(() => {
    const { pathname, search } = location;
    const routeSeo = getPublicRouteSeo(pathname);
    const canonicalUrl = buildCanonicalUrl(pathname);
    const isDynamicCatalogRoute = pathname.startsWith('/product/') || pathname.startsWith('/category/');
    const isFilteredCatalog = pathname === '/products' && Boolean(search);
    const shouldNoIndex = isNoIndexPath(pathname) || isFilteredCatalog || (!routeSeo && !isDynamicCatalogRoute);

    if (isDynamicCatalogRoute) {
      applySeo({
        title: pathname.startsWith('/product/') ? 'Product' : 'Fashion Collection',
        description: DEFAULT_DESCRIPTION,
        canonicalUrl,
        ogImage: DEFAULT_IMAGE,
        robots: INDEX_ROBOTS,
      });
      return;
    }

    const title = routeSeo?.title || (shouldNoIndex ? getPrivatePageTitle(pathname) : `Page Not Found | ${SITE_NAME}`);
    const description = routeSeo?.description || DEFAULT_DESCRIPTION;
    const structuredData = shouldNoIndex
      ? null
      : [
          ...(pathname === '/' ? [buildStoreStructuredData(), buildWebsiteStructuredData()] : []),
          buildWebPageStructuredData({ title, description, url: canonicalUrl }),
          ...(pathname === '/'
            ? []
            : [
                buildBreadcrumbStructuredData([
                  { name: 'Home', url: '/' },
                  { name: title.replace(/\s*\|.*$/, ''), url: canonicalUrl },
                ]),
              ]),
        ];

    applySeo({
      ...routeSeo,
      title,
      description,
      canonicalUrl,
      ogImage: DEFAULT_IMAGE,
      robots: shouldNoIndex ? NOINDEX_ROBOTS : INDEX_ROBOTS,
      structuredData,
    });
  }, [location]);

  return null;
};

export default SeoRouteManager;
