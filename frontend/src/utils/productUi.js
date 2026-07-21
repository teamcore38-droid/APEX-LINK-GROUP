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
  brand: 'Apex Link Group',
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

export const getOptimizedImageUrl = (entry = '', options = {}) => {
  const url = getProductImageUrl(entry);

  if (!url.includes('/image/upload/')) {
    return url;
  }

  const {
    width,
    height,
    crop = 'limit',
    quality = 'auto:eco',
    format = 'auto',
  } = options;
  const transformations = [
    format ? `f_${format}` : '',
    quality ? `q_${quality}` : '',
    width ? `w_${width}` : '',
    height ? `h_${height}` : '',
    crop ? `c_${crop}` : '',
    'dpr_auto',
  ].filter(Boolean);

  if (!transformations.length || /\/image\/upload\/[^/]*(?:f_auto|q_auto)/.test(url)) {
    return url;
  }

  return url.replace('/image/upload/', `/image/upload/${transformations.join(',')}/`);
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

export const buildProductFormFromProduct = (product = {}) => {
  const gallery = getProductImageAssets(product);
  const [primaryImage = { url: product.image || '', publicId: product.imagePublicId || '' }, ...additionalImages] = gallery;

  return {
    name: product.name || '',
    slug: product.slug || '',
    category: product.category || '',
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
    brand: product.brand || 'Apex Link Group',
    sku: product.sku || '',
    isFeatured: Boolean(product.isFeatured),
    isActive: product.isActive ?? true,
    isBestSeller: Boolean(product.isBestSeller),
  };
};

export const buildProductPayloadFromForm = (form) => {
  const gallery = getProductFormGalleryImages(form);
  const primaryImage = gallery[0] || { url: '', publicId: '' };

  return {
    name: form.name.trim(),
    slug: form.slug.trim(),
    category: form.category,
    price: Number(form.price),
    compareAtPrice: form.compareAtPrice === '' ? 0 : Number(form.compareAtPrice),
    weight: form.weight.trim(),
    countInStock: Number(form.countInStock),
    lowStockThreshold: Number(form.lowStockThreshold ?? 10),
    image: primaryImage.url,
    imagePublicId: primaryImage.publicId,
    images: gallery,
    variants: JSON.parse(form.variantsJson || '[]'),
    hasSizes: Boolean(form.hasSizes),
    sizes: Array.isArray(form.sizes)
      ? form.sizes
          .map((s) => ({
            size: String(s.size || '').trim(),
            price: Number(s.price || 0),
            countInStock: Math.max(0, Number(s.countInStock || 0)),
            reservedStock: Math.max(0, Number(s.reservedStock || 0)),
            colors: Array.isArray(s.colors)
              ? s.colors.map((c) => String(c || '').trim()).filter(Boolean)
              : [],
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
