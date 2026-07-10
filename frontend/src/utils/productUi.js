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

export const PRODUCT_PAGE_SIZE = 9;
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
  imageList: '',
  variantsJson: '[]',
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

export const formatCurrency = (value = 0, currency = 'LKR') => {
  const parsedValue = Number(value) || 0;
  try {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency,
    }).format(parsedValue);
  } catch {
    return `${currency} ${parsedValue.toFixed(2)}`;
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
  const images = Array.isArray(product.images) ? product.images : [];
  const gallery = [product.image, ...images].filter(Boolean);
  return [...new Set(gallery)];
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
      className: 'bg-[#c9a227] text-white',
    };
  }

  return null;
};

export const buildProductFormFromProduct = (product = {}) => ({
  name: product.name || '',
  slug: product.slug || '',
  category: product.category || '',
  price: product.price ?? 0,
  compareAtPrice: product.compareAtPrice ?? '',
  weight: product.weight || '',
  countInStock: product.countInStock ?? 0,
  lowStockThreshold: product.lowStockThreshold ?? 10,
  image: product.image || '',
  imageList: Array.isArray(product.images) ? product.images.filter((image) => image && image !== product.image).join('\n') : '',
  variantsJson: JSON.stringify(product.variants || [], null, 2),
  shortDescription: product.shortDescription || '',
  description: product.description || '',
  origin: product.origin || '',
  ingredients: product.ingredients || '',
  brand: product.brand || 'Apex Link Group',
  sku: product.sku || '',
  isFeatured: Boolean(product.isFeatured),
  isActive: product.isActive ?? true,
  isBestSeller: Boolean(product.isBestSeller),
});

export const buildProductPayloadFromForm = (form) => ({
  name: form.name.trim(),
  slug: form.slug.trim(),
  category: form.category,
  price: Number(form.price),
  compareAtPrice: form.compareAtPrice === '' ? 0 : Number(form.compareAtPrice),
  weight: form.weight.trim(),
  countInStock: Number(form.countInStock),
  lowStockThreshold: Number(form.lowStockThreshold ?? 10),
  image: form.image.trim(),
  images: form.imageList
    .split('\n')
    .map((image) => image.trim())
    .filter(Boolean),
  variants: JSON.parse(form.variantsJson || '[]'),
  shortDescription: form.shortDescription.trim(),
  description: form.description.trim(),
  origin: form.origin.trim(),
  ingredients: form.ingredients.trim(),
  brand: form.brand.trim(),
  sku: form.sku.trim(),
  isFeatured: Boolean(form.isFeatured),
  isActive: Boolean(form.isActive),
  isBestSeller: Boolean(form.isBestSeller),
});
