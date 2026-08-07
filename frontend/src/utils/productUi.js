export const PRODUCT_PRICE_SORT_OPTIONS = [
  { value: '', label: 'Featured First' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A to Z' },
];

export const ADMIN_PRODUCT_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-low', label: 'Price: Low to High' },
  { value: 'price-high', label: 'Price: High to Low' },
  { value: 'stock-low', label: 'Stock: Low to High' },
  { value: 'stock-high', label: 'Stock: High to Low' },
  { value: 'name-asc', label: 'Name: A to Z' },
];

export const PRODUCT_STOCK_FILTER_OPTIONS = [
  { value: '', label: 'All Stock States' },
  { value: 'in-stock', label: 'In Stock' },
  { value: 'out-of-stock', label: 'Out of Stock' },
  { value: 'low-stock', label: 'Low Stock' },
];

export const SHOP_STOCK_FILTER_OPTIONS = [
  { value: '', label: 'All Availability' },
  { value: 'in-stock', label: 'In Stock Only' },
];

export const PRODUCT_ACTIVE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Products' },
  { value: 'true', label: 'Active Only' },
  { value: 'false', label: 'Inactive Only' },
];

export const PRODUCT_PAGE_SIZE = 12;
export const ADMIN_PRODUCT_PAGE_SIZE = 8;

export const createInitialProductForm = () => ({
  name: '',
  slug: '',
  category: '',
  categoryId: '',
  categories: [],
  categoryIds: [],
  price: '0',
  compareAtPrice: '',
  weight: '',
  countInStock: '0',
  lowStockThreshold: '10',
  image: '',
  imagePublicId: '',
  imageList: '',
  imageAssets: [],
  variantsJson: '[]',
  hasSizes: false,
  sizes: [],
  shortDescription: '',
  description: '',
  origin: '',
  ingredients: '',
  brand: 'Apex Fashion',
  sku: '',
  isFeatured: false,
  isActive: true,
  isBestSeller: false,
});

const parseImageList = (value = '') =>
  String(value || '')
    .split(/\r?\n/)
    .map((image) => image.trim())
    .filter(Boolean);

export const normalizeProductImageAsset = (entry = {}) => {
  if (typeof entry === 'string') {
    const url = entry.trim();
    return url ? { url, publicId: '' } : null;
  }

  if (!entry || typeof entry !== 'object') {
    return null;
  }

  const url = String(entry.url || entry.secureUrl || entry.secure_url || '').trim();
  const publicId = String(entry.publicId || entry.public_id || '').trim();

  return url ? { url, publicId } : null;
};

export const getProductImageUrl = (entry = '') =>
  typeof entry === 'string' ? entry : String(entry?.url || entry?.secureUrl || '').trim();

const CLOUDINARY_TRANSFORMATION_KEYS = new Set([
  'a',
  'ac',
  'af',
  'ar',
  'b',
  'bo',
  'br',
  'c',
  'co',
  'cs',
  'd',
  'dl',
  'dn',
  'dpr',
  'du',
  'e',
  'eo',
  'f',
  'fl',
  'fn',
  'fps',
  'g',
  'h',
  'if',
  'ki',
  'l',
  'o',
  'p',
  'pg',
  'q',
  'r',
  'so',
  'sp',
  't',
  'u',
  'vc',
  'vs',
  'w',
  'x',
  'y',
  'z',
]);
const MANAGED_CLOUDINARY_TRANSFORMS = [
  { key: 'f', option: 'format', fallback: 'auto' },
  { key: 'q', option: 'quality', fallback: 'auto:eco' },
  { key: 'w', option: 'width' },
  { key: 'h', option: 'height' },
  { key: 'c', option: 'crop', fallback: 'limit' },
  { key: 'dpr', option: 'dpr', fallback: 'auto' },
];
const MANAGED_CLOUDINARY_KEYS = new Set(
  MANAGED_CLOUDINARY_TRANSFORMS.map(({ key }) => key)
);

const getCloudinaryTransformationKey = (directive = '') => {
  const separatorIndex = directive.indexOf('_');
  return separatorIndex > 0 ? directive.slice(0, separatorIndex) : '';
};

const isCloudinaryTransformationDirective = (directive = '') => {
  if (directive.startsWith('$') || directive === 'if_else' || directive === 'if_end') {
    return true;
  }

  return CLOUDINARY_TRANSFORMATION_KEYS.has(getCloudinaryTransformationKey(directive));
};

const isCloudinaryTransformationSegment = (segment = '') => {
  if (!segment || /\.[a-z0-9]{2,5}$/i.test(segment)) {
    return false;
  }

  const directives = segment.split(',').filter(Boolean);
  return directives.length > 0 && directives.every(isCloudinaryTransformationDirective);
};

const parseCloudinaryUploadUrl = (value = '') => {
  let parsedUrl;

  try {
    parsedUrl = new URL(value);
  } catch {
    return null;
  }

  if (
    !['http:', 'https:'].includes(parsedUrl.protocol) ||
    parsedUrl.hostname.toLowerCase() !== 'res.cloudinary.com'
  ) {
    return null;
  }

  const pathSegments = parsedUrl.pathname.split('/');
  const imageIndex = pathSegments.findIndex(
    (segment, index) => segment === 'image' && pathSegments[index + 1] === 'upload'
  );

  if (imageIndex < 0) {
    return null;
  }

  const uploadIndex = imageIndex + 1;
  const firstAssetSegment = pathSegments[uploadIndex + 1] || '';

  // Changing a signed delivery URL invalidates its Cloudinary signature.
  if (/^s--[^/]+--$/.test(firstAssetSegment)) {
    return null;
  }

  let assetStartIndex = uploadIndex + 1;
  while (isCloudinaryTransformationSegment(pathSegments[assetStartIndex])) {
    assetStartIndex += 1;
  }

  return {
    parsedUrl,
    pathSegments,
    uploadIndex,
    assetStartIndex,
  };
};

const normalizeCloudinaryTransformationValue = (value, key) => {
  if (value === false || value === null || value === undefined || value === '') {
    return '';
  }

  if (key === 'w' || key === 'h') {
    const dimension = Math.round(Number(value));
    return Number.isFinite(dimension) && dimension > 0 ? String(dimension) : '';
  }

  const normalizedValue = String(value).trim();
  return /^[a-z0-9:.-]+$/i.test(normalizedValue) ? normalizedValue : '';
};

export const getOptimizedImageUrl = (entry = '', options = {}) => {
  const url = getProductImageUrl(entry);
  const cloudinaryUrl = parseCloudinaryUploadUrl(url);

  if (!cloudinaryUrl) {
    return url;
  }

  const { parsedUrl, pathSegments, uploadIndex, assetStartIndex } = cloudinaryUrl;
  const transformationSegments = pathSegments
    .slice(uploadIndex + 1, assetStartIndex)
    .map((segment) => segment.split(',').filter(Boolean));
  const existingManagedTransforms = new Map();
  let targetSegmentIndex = transformationSegments.length > 0
    ? transformationSegments.length - 1
    : 0;

  transformationSegments.forEach((directives, segmentIndex) => {
    directives.forEach((directive) => {
      const key = getCloudinaryTransformationKey(directive);

      if (MANAGED_CLOUDINARY_KEYS.has(key)) {
        existingManagedTransforms.set(key, directive);
        targetSegmentIndex = segmentIndex;
      }
    });
  });

  const cleanedTransformationSegments = transformationSegments.map((directives) =>
    directives.filter(
      (directive) => !MANAGED_CLOUDINARY_KEYS.has(getCloudinaryTransformationKey(directive))
    )
  );

  if (cleanedTransformationSegments.length === 0) {
    cleanedTransformationSegments.push([]);
    targetSegmentIndex = 0;
  }

  const mergedManagedTransforms = MANAGED_CLOUDINARY_TRANSFORMS.map(
    ({ key, option, fallback }) => {
      if (!Object.hasOwn(options, option) && existingManagedTransforms.has(key)) {
        return existingManagedTransforms.get(key);
      }

      const value = Object.hasOwn(options, option) ? options[option] : fallback;
      const normalizedValue = normalizeCloudinaryTransformationValue(value, key);
      return normalizedValue ? `${key}_${normalizedValue}` : '';
    }
  ).filter(Boolean);

  cleanedTransformationSegments[targetSegmentIndex].push(...mergedManagedTransforms);
  const mergedTransformationSegments = cleanedTransformationSegments
    .filter((directives) => directives.length > 0)
    .map((directives) => directives.join(','));

  if (mergedTransformationSegments.length === 0) {
    return url;
  }

  parsedUrl.pathname = [
    ...pathSegments.slice(0, uploadIndex + 1),
    ...mergedTransformationSegments,
    ...pathSegments.slice(assetStartIndex),
  ].join('/');

  return parsedUrl.toString();
};

export const getResponsiveImageSrcSet = (entry = '', options = {}) => {
  const url = getProductImageUrl(entry);

  if (!parseCloudinaryUploadUrl(url)) {
    return '';
  }

  const { widths = [], aspectRatio, ...transformOptions } = options;
  const normalizedWidths = (Array.isArray(widths) ? widths : [])
    .map((width) => Math.round(Number(width)))
    .filter((width) => Number.isFinite(width) && width > 0);
  const candidateWidths = [...new Set(normalizedWidths)]
    .sort((left, right) => left - right);

  return candidateWidths
    .map((width) => {
      const height = Number(aspectRatio) > 0
        ? Math.round(width / Number(aspectRatio))
        : transformOptions.height;
      const candidateUrl = getOptimizedImageUrl(url, {
        ...transformOptions,
        width,
        height,
        dpr: false,
      });

      return `${candidateUrl} ${width}w`;
    })
    .join(', ');
};

export const normalizeProductPayload = (data) => {
  if (Array.isArray(data)) {
    return {
      products: data,
      currentPage: 1,
      totalPages: 1,
      totalProducts: data.length,
      hasNextPage: false,
      hasPrevPage: false,
    };
  }

  return {
    products: data?.products || [],
    currentPage: data?.currentPage || 1,
    totalPages: data?.totalPages || 1,
    totalProducts: data?.totalProducts || 0,
    hasNextPage: Boolean(data?.hasNextPage),
    hasPrevPage: Boolean(data?.hasPrevPage),
  };
};

export const formatCurrency = (value = 0) => {
  const parsedValue = Number(value) || 0;
  try {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      maximumFractionDigits: 2,
    }).format(parsedValue);
  } catch {
    return `LKR ${parsedValue.toFixed(2)}`;
  }
};

export const slugifyProductName = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const getProductUrlSlug = (product = {}) =>
  slugifyProductName(product.slug || product.name || '') || 'product';

export const buildProductPath = (productOrId = {}, slug = '') => {
  const product =
    productOrId && typeof productOrId === 'object'
      ? productOrId
      : { _id: productOrId, slug };
  const productId = product._id || product.id || product.product || '';

  return `/product/${getProductUrlSlug(product)}-${productId}`;
};

export const getProductIdFromRouteParam = (value = '') => {
  const normalizedValue = String(value || '').trim();
  const productIdMatch = normalizedValue.match(/[a-f0-9]{24}$/i);

  return productIdMatch?.[0] || normalizedValue;
};

export const getProductImages = (product = {}) => {
  return getProductImageAssets(product).map((asset) => asset.url);
};

export const getProductImageAssets = (product = {}) => {
  const images = Array.isArray(product.images) ? product.images : [];
  const primaryAsset = normalizeProductImageAsset({
    url: product.image,
    publicId: product.imagePublicId,
  });
  const assets = [primaryAsset, ...images.map((image) => normalizeProductImageAsset(image))].filter(Boolean);
  const uniqueAssets = new Map();

  assets.forEach((asset) => {
    uniqueAssets.set(asset.publicId || asset.url, asset);
  });

  return [...uniqueAssets.values()];
};

export const getVariantImageAssets = (variant = {}) => {
  const safeVariant = variant || {};
  const images = Array.isArray(safeVariant.images)
    ? safeVariant.images
    : Array.isArray(safeVariant.imageAssets)
      ? safeVariant.imageAssets
      : Array.isArray(safeVariant.galleryImages)
        ? safeVariant.galleryImages
        : Array.isArray(safeVariant.gallery)
          ? safeVariant.gallery
          : [];

  return getProductImageAssets({
    image: safeVariant.image || safeVariant.imageUrl,
    imagePublicId: safeVariant.imagePublicId || safeVariant.publicId,
    images,
  });
};

export const setVariantImageAssets = (variant = {}, images = []) => {
  const uniqueAssets = new Map();

  images
    .map((image) => normalizeProductImageAsset(image))
    .filter(Boolean)
    .forEach((asset) => {
      uniqueAssets.set(asset.publicId || asset.url, asset);
    });

  const gallery = [...uniqueAssets.values()];
  const [primaryImage = { url: '', publicId: '' }] = gallery;

  return {
    ...variant,
    image: primaryImage.url,
    imagePublicId: primaryImage.publicId,
    images: gallery,
  };
};

export const getProductFormGalleryImages = (form = {}) =>
  Array.isArray(form.imageAssets) && form.imageAssets.length > 0
    ? getProductImageAssets({ images: form.imageAssets })
    : getProductImageAssets({
        image: form.image,
        imagePublicId: form.imagePublicId,
        images: parseImageList(form.imageList),
      });

export const setProductFormGalleryImages = (form = {}, images = []) => {
  const uniqueAssets = new Map();

  images
    .map((image) => normalizeProductImageAsset(image))
    .filter(Boolean)
    .forEach((asset) => {
      uniqueAssets.set(asset.publicId || asset.url, asset);
    });

  const gallery = [...uniqueAssets.values()];
  const [primaryImage = { url: '', publicId: '' }, ...additionalImages] = gallery;

  return {
    ...form,
    image: primaryImage.url,
    imagePublicId: primaryImage.publicId,
    imageList: additionalImages.map((image) => image.url).join('\n'),
    imageAssets: gallery,
  };
};

export const getStockPresentation = (countInStock = 0) => {
  if (countInStock <= 0) {
    return {
      label: 'Out of Stock',
      className: 'border-red-200 bg-red-50 text-red-700',
    };
  }

  if (countInStock <= 10) {
    return {
      label: `Low Stock (${countInStock})`,
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }

  return {
    label: 'In Stock',
    className: 'border-green-200 bg-green-50 text-green-700',
  };
};

export const getProductStatusBadge = (product = {}) => {
  if (product.countInStock <= 0) {
    return {
      label: 'Out of Stock',
      className: 'bg-red-600 text-white',
    };
  }

  if (product.isBestSeller) {
    return {
      label: 'Best Seller',
      className: 'bg-[#8c3b2a] text-white',
    };
  }

  if (product.isFeatured) {
    return {
      label: 'Featured',
      className: 'bg-[#d99a32] text-white',
    };
  }

  return null;
};

export const getProductBadges = (product = {}) => {
  const countInStock = Number(product.countInStock || 0);
  const badges = [];

  if (product.isBestSeller) {
    badges.push({
      key: 'best-seller',
      label: 'Best Seller',
      className: 'bg-[#8c3b2a] text-white',
    });
  }

  if (product.isFeatured) {
    badges.push({
      key: 'featured',
      label: 'Featured',
      className: 'bg-[#d99a32] text-[#2a140e]',
    });
  }

  if (countInStock <= 0) {
    badges.push({
      key: 'out-of-stock',
      label: 'Out of Stock',
      className: 'bg-gray-500 text-white',
    });
  } else if (countInStock <= 10) {
    badges.push({
      key: 'low-stock',
      label: `Low Stock (${countInStock})`,
      className: 'bg-[#d99a32] text-[#2a140e]',
    });
  } else {
    badges.push({
      key: 'in-stock',
      label: 'In Stock',
      className: 'bg-[#3f8b62] text-white',
    });
  }

  return badges.slice(0, 2);
};

export const buildProductFormFromProduct = (product = {}) => {
  const gallery = getProductImageAssets(product);
  const [primaryImage = { url: product.image || '', publicId: product.imagePublicId || '' }, ...additionalImages] = gallery;
  const categories = [
    product.category,
    ...(Array.isArray(product.categories) ? product.categories : []),
  ]
    .map((category) => String(category || '').trim())
    .filter(Boolean);
  const uniqueCategories = [...new Set(categories.map((category) => category.toLowerCase()))]
    .map((lowerCategory) => categories.find((category) => category.toLowerCase() === lowerCategory));
  const categoryIds = [
    product.categoryRef,
    ...(Array.isArray(product.categoryRefs) ? product.categoryRefs : []),
  ]
    .map((categoryId) => String(categoryId?._id || categoryId || '').trim())
    .filter(Boolean);
  const uniqueCategoryIds = [...new Set(categoryIds)];

  return {
    name: product.name || '',
    slug: product.slug || '',
    category: product.category || '',
    categoryId: String(product.categoryRef?._id || product.categoryRef || ''),
    categories: uniqueCategories,
    categoryIds: uniqueCategoryIds,
    price: product.price ?? 0,
    compareAtPrice: product.compareAtPrice ?? '',
    weight: product.weight || '',
    countInStock: product.countInStock ?? 0,
    lowStockThreshold: product.lowStockThreshold ?? 10,
    image: primaryImage.url,
    imagePublicId: primaryImage.publicId,
    imageList: additionalImages.map((image) => image.url).join('\n'),
    imageAssets: gallery,
    variantsJson: JSON.stringify(product.variants || [], null, 2),
    hasSizes: Boolean(product.hasSizes),
    sizes: Array.isArray(product.sizes)
      ? product.sizes.map((s) => ({
          size: s.size || '',
          price: s.price ?? 0,
          countInStock: s.countInStock ?? 0,
          reservedStock: s.reservedStock ?? 0,
          colors: Array.isArray(s.colors) ? s.colors : [],
        }))
      : [],
    shortDescription: product.shortDescription || '',
    description: product.description || '',
    origin: product.origin || '',
    ingredients: product.ingredients || '',
    brand: product.brand || 'Apex Fashion',
    sku: product.sku || '',
    isFeatured: Boolean(product.isFeatured),
    isActive: product.isActive ?? true,
    isBestSeller: Boolean(product.isBestSeller),
  };
};

export const buildProductPayloadFromForm = (form) => {
  const gallery = getProductFormGalleryImages(form);
  const primaryImage = gallery[0] || { url: '', publicId: '' };
  const categoryInputs = [
    form.category,
    ...(Array.isArray(form.categories) ? form.categories : []),
  ]
    .map((category) => String(category || '').trim())
    .filter(Boolean);
  const categories = [...new Set(categoryInputs.map((category) => category.toLowerCase()))]
    .map((lowerCategory) => categoryInputs.find((category) => category.toLowerCase() === lowerCategory));
  const categoryIdInputs = [
    form.categoryId,
    ...(Array.isArray(form.categoryIds) ? form.categoryIds : []),
  ]
    .map((categoryId) => String(categoryId || '').trim())
    .filter(Boolean);
  const categoryIds = [...new Set(categoryIdInputs)];
  const variants = JSON.parse(form.variantsJson || '[]').map((variant) => ({
    ...variant,
    price: Number(variant.price || 0),
    priceAdjustment: Number(variant.priceAdjustment || 0),
    countInStock: Math.max(0, Number(variant.countInStock || 0)),
    reservedStock: Math.max(0, Number(variant.reservedStock || 0)),
  }));
  const colorsBySize = new Map();

  variants.forEach((variant) => {
    const size = String(variant.size || '').trim();
    const color = String(variant.color || variant.label || '').trim();

    if (!size || !color || variant.isActive === false) {
      return;
    }

    const colors = colorsBySize.get(size) || new Set();
    colors.add(color);
    colorsBySize.set(size, colors);
  });

  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    category: form.category,
    categoryId: form.categoryId || form.category,
    categories,
    categoryIds,
    price: Number(form.price),
    compareAtPrice: form.compareAtPrice === '' ? 0 : Number(form.compareAtPrice),
    weight: form.weight.trim(),
    countInStock: Number(form.countInStock),
    lowStockThreshold: Number(form.lowStockThreshold ?? 10),
    image: primaryImage.url,
    imagePublicId: primaryImage.publicId,
    images: gallery,
    variants,
    hasSizes: Boolean(form.hasSizes),
    sizes: Array.isArray(form.sizes)
      ? form.sizes
          .map((s) => ({
            size: String(s.size || '').trim(),
            price: Number(s.price || 0),
            countInStock: Math.max(0, Number(s.countInStock || 0)),
            reservedStock: Math.max(0, Number(s.reservedStock || 0)),
            colors: [...(colorsBySize.get(String(s.size || '').trim()) || new Set())],
          }))
          .filter((s) => Boolean(s.size))
      : [],
    shortDescription: form.shortDescription.trim(),
    description: form.description.trim(),
    origin: form.origin.trim(),
    ingredients: form.ingredients.trim(),
    brand: form.brand.trim(),
    sku: form.sku.trim(),
    isFeatured: Boolean(form.isFeatured),
    isActive: Boolean(form.isActive),
    isBestSeller: Boolean(form.isBestSeller),
  };
};
