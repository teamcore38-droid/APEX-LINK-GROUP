import { getResponsiveImageSrcSet } from './productUi.js';

const CATEGORY_IMAGE_FALLBACKS = {
  women:
    'https://images.pexels.com/photos/6069552/pexels-photo-6069552.jpeg?auto=compress&cs=tinysrgb&w=1400',
  men:
    'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'shoes-footwear':
    'https://images.pexels.com/photos/298863/pexels-photo-298863.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'handbags-accessories':
    'https://images.pexels.com/photos/1152077/pexels-photo-1152077.jpeg?auto=compress&cs=tinysrgb&w=1400',
  watches:
    'https://images.pexels.com/photos/125779/pexels-photo-125779.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'fragrances-perfumes':
    'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg?auto=compress&cs=tinysrgb&w=1400',
};

export const HOME_CATEGORY_IMAGE_WIDTHS = [128, 160, 192, 256, 320, 480];
export const HOME_CATEGORY_IMAGE_SIZES =
  '(min-width: 768px) 132px, (min-width: 640px) 122px, 104px';
const HOME_CATEGORY_IMAGE_ASPECT_RATIO = 0.78;

const getPexelsResponsiveImageSrcSet = (url = '') => {
  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch {
    return '';
  }

  if (parsedUrl.hostname.toLowerCase() !== 'images.pexels.com') {
    return '';
  }

  return HOME_CATEGORY_IMAGE_WIDTHS
    .map((width) => {
      const candidateUrl = new URL(parsedUrl);
      candidateUrl.searchParams.set('w', String(width));
      return `${candidateUrl.toString()} ${width}w`;
    })
    .join(', ');
};

export const slugifyCategoryName = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const getPublicCategoryPath = (categoryName = '', categorySlug = '', categoryPath = '') => {
  const path = String(categoryPath || '')
    .split('/')
    .map((segment) => slugifyCategoryName(segment))
    .filter(Boolean)
    .join('/');
  const slug = path || slugifyCategoryName(categorySlug);

  if (path) {
    return `/${path}`;
  }

  return slug
    ? `/category/${slug}`
    : `/products?category=${encodeURIComponent(String(categoryName || '').trim())}`;
};

const getCategorySlugFromPathname = (pathname = '') => {
  const match = String(pathname).match(/^\/(?:category\/)?(.+?)\/?$/i);
  if (!match) return '';

  try {
    return decodeURIComponent(match[1]).toLowerCase().replace(/^\/+|\/+$/g, '');
  } catch {
    return match[1].toLowerCase().replace(/^\/+|\/+$/g, '');
  }
};

export const getActiveTopLevelCategoryId = (categories = [], pathname = '', search = '') => {
  const isProductsRoute = /^\/products\/?$/i.test(String(pathname));
  const activeSlug = isProductsRoute ? '' : getCategorySlugFromPathname(pathname);
  const categoryFilter = isProductsRoute
    ? new URLSearchParams(search).get('category')
    : '';
  const normalizedFilter = slugifyCategoryName(categoryFilter || '');

  if (!activeSlug && !normalizedFilter) return null;

  const categoryById = new Map(
    categories.map((category) => [String(category?._id || ''), category])
  );
  let current = categories.find(
    (category) => {
      const categorySlug = slugifyCategoryName(category?.slug || category?.name || '');
      const categoryPath = String(category?.path || '').toLowerCase();
      return activeSlug
        ? categoryPath === activeSlug || categorySlug === activeSlug.split('/').pop()
        : categorySlug === normalizedFilter || slugifyCategoryName(category?.name) === normalizedFilter;
    }
  );
  const visited = new Set();

  while (current) {
    const currentId = String(current._id || '');
    if (!currentId || visited.has(currentId)) return null;
    visited.add(currentId);

    const parentId = String(current.parentCategory?._id || current.parentCategory || '');
    if (!parentId) return currentId;

    current = categoryById.get(parentId);
  }

  return null;
};

export const getCategoryImage = (category) => {
  const [firstCandidate] = getCategoryImageCandidates(category);
  return firstCandidate;
};

export const getHomeCategoryImageSrcSet = (category) => {
  const imageUrl = getCategoryImage(category);

  if (!imageUrl) {
    return '';
  }

  const cloudinarySrcSet = getResponsiveImageSrcSet(imageUrl, {
    widths: HOME_CATEGORY_IMAGE_WIDTHS,
    aspectRatio: HOME_CATEGORY_IMAGE_ASPECT_RATIO,
    format: 'auto',
    quality: 'auto',
    crop: 'fill',
  });

  return cloudinarySrcSet || getPexelsResponsiveImageSrcSet(imageUrl);
};

export const getCategoryImageCandidates = (category) => {
  const candidates = [];

  if (category?.image) {
    candidates.push(String(category.image).trim());
  }

  const slug = category?.slug || slugifyCategoryName(category?.name || '');
  const fallbackBySlug = CATEGORY_IMAGE_FALLBACKS[slug];

  if (fallbackBySlug) {
    candidates.push(fallbackBySlug);
  }

  candidates.push(
    'https://images.pexels.com/photos/6069552/pexels-photo-6069552.jpeg?auto=compress&cs=tinysrgb&w=1400'
  );

  return [...new Set(candidates.filter(Boolean))];
};
