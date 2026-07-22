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

export const slugifyCategoryName = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const getPublicCategoryPath = (categoryName = '', categorySlug = '') => {
  const slug = slugifyCategoryName(categorySlug);
  return slug
    ? `/category/${slug}`
    : `/products?category=${encodeURIComponent(String(categoryName || '').trim())}`;
};

export const getCategoryImage = (category) => {
  const [firstCandidate] = getCategoryImageCandidates(category);
  return firstCandidate;
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
