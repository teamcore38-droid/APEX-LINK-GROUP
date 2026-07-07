const CATEGORY_IMAGE_FALLBACKS = {
  'textiles-apparel':
    'https://images.pexels.com/photos/6069552/pexels-photo-6069552.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'spices-food-products':
    'https://images.pexels.com/photos/1435894/pexels-photo-1435894.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'it-solutions-electronics':
    'https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'industrial-machinery':
    'https://images.pexels.com/photos/1145434/pexels-photo-1145434.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'home-living':
    'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg?auto=compress&cs=tinysrgb&w=1400',
  'health-beauty':
    'https://images.pexels.com/photos/3735657/pexels-photo-3735657.jpeg?auto=compress&cs=tinysrgb&w=1400',
};

export const slugifyCategoryName = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

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
