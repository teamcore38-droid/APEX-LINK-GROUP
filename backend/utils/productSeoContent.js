const MARKETPLACE_DESCRIPTION_PATTERNS = [
  /\bBIS\b/i,
  /bis\.gov\.in/i,
  /bureau of indian standards/i,
  /product safety information/i,
  /net quantity\s*\(n\)/i,
  /\b(?:meesho|amazon|flipkart|indiamart|tradeindia|daraz|alibaba)\b/i,
  /COOPERWINGS Men's Stylish Casual Sports Walking Sneakers/i,
];

const cleanProductText = (value = '', maxLength = 5000) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);

const hasCopiedMarketplaceDescription = (value = '') => {
  const description = cleanProductText(value);
  const separatorCount = (description.match(/\s\|\s/g) || []).length;

  return (
    MARKETPLACE_DESCRIPTION_PATTERNS.some((pattern) => pattern.test(description)) ||
    separatorCount >= 3
  );
};

const getDistinctValues = (values = []) => [
  ...new Set(values.map((value) => cleanProductText(value, 80)).filter(Boolean)),
];

const getProductOptions = (product = {}) => ({
  colors: getDistinctValues([
    ...(product.variants || []).map((variant) => variant.color),
    ...(product.sizes || []).flatMap((size) => size.colors || []),
  ]),
  sizes: getDistinctValues([
    ...(product.variants || []).flatMap((variant) => [variant.size, ...(variant.availableSizes || [])]),
    ...(product.sizes || []).map((size) => size.size),
  ]),
});

const buildDatabaseProductDescription = (product = {}) => {
  const name = cleanProductText(product.name, 150) || 'This product';
  const brand = cleanProductText(product.brand, 100);
  const category = cleanProductText(product.category, 100);
  const origin = cleanProductText(product.origin, 100);
  const { colors, sizes } = getProductOptions(product);
  const brandText = brand && !name.toLowerCase().includes(brand.toLowerCase()) ? ` by ${brand}` : '';
  const collectionText = category ? ` in the ${category} collection` : '';
  const sentences = [`${name}${brandText} is available${collectionText} at Apex Fashion.`];

  if (origin) {
    sentences.push(`Country of origin: ${origin}.`);
  }

  if (sizes.length > 0) {
    sentences.push(`Available sizes: ${sizes.join(', ')}.`);
  }

  if (colors.length > 0) {
    sentences.push(`Available colors: ${colors.join(', ')}.`);
  }

  sentences.push('Review the product images and select an available option before ordering.');
  return cleanProductText(sentences.join(' '));
};

const getDatabaseProductDescription = (product = {}, maxLength = 5000) => {
  const candidates = [product.description, product.shortDescription, product.seo?.description];
  const databaseDescription = candidates
    .map((candidate) => cleanProductText(candidate, maxLength))
    .find((candidate) => candidate && !hasCopiedMarketplaceDescription(candidate));

  return cleanProductText(databaseDescription || buildDatabaseProductDescription(product), maxLength);
};

export {
  buildDatabaseProductDescription,
  cleanProductText,
  getDatabaseProductDescription,
  getProductOptions,
  hasCopiedMarketplaceDescription,
};
