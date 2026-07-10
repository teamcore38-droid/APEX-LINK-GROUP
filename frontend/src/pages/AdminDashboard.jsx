import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Package,
  ShieldCheck,
  Store,
  RotateCcw,
  Search,
  ShoppingBag,
  Star,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CustomSelect from '../components/CustomSelect';
import {
  ADMIN_PRODUCT_PAGE_SIZE,
  ADMIN_PRODUCT_SORT_OPTIONS,
  PRODUCT_ACTIVE_FILTER_OPTIONS,
  PRODUCT_STOCK_FILTER_OPTIONS,
  formatCurrency,
  getStockPresentation,
  normalizeProductPayload,
} from '../utils/productUi';
import {
  ORDER_DELIVERY_FILTER_OPTIONS,
  ORDER_PAYMENT_FILTER_OPTIONS,
  ORDER_QUICK_ACTIONS,
  ORDER_SORT_OPTIONS,
  ORDER_STATUS_FILTER_OPTIONS,
  getDeliveryBadgeClass,
  getDeliveryLabel,
  getOrderStatusBadgeClass,
  getPaymentBadgeClass,
  getPaymentLabel,
} from '../utils/orderStatus';

const INITIAL_PRODUCT_FILTERS = {
  keyword: '',
  category: '',
  active: 'all',
  stock: '',
  sort: 'newest',
};

const INITIAL_ORDER_FILTERS = {
  search: '',
  status: '',
  payment: '',
  delivery: '',
  sort: 'newest',
};

const ORDERS_PER_PAGE = 8;

const buildFallbackOrderPayload = (orders) => ({
  orders,
  currentPage: 1,
  totalPages: 1,
  totalOrders: orders.length,
  hasNextPage: false,
  hasPrevPage: false,
});

const ProductFiltersSkeleton = () => (
  <div className="grid gap-4 lg:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))]">
    {[...Array(5)].map((_, index) => (
      <div key={index} className="h-12 animate-pulse rounded-xl bg-brand-light" />
    ))}
  </div>
);

const ProductTableSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, index) => (
      <div key={index} className="h-24 animate-pulse rounded-2xl bg-brand-light" />
    ))}
  </div>
);

const OrderFiltersSkeleton = () => (
  <div className="grid gap-4 lg:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))]">
    {[...Array(5)].map((_, index) => (
      <div key={index} className="h-12 animate-pulse rounded-xl bg-brand-light" />
    ))}
  </div>
);

const OrdersTableSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, index) => (
      <div key={index} className="h-20 animate-pulse rounded-2xl bg-brand-light" />
    ))}
  </div>
);

const getOrderItemCount = (order) =>
  order.orderItems?.reduce((total, item) => total + item.qty, 0) || 0;

const getQuickActionPayload = (order, nextStatus) => {
  const payload = {
    orderStatus: nextStatus,
  };

  if (nextStatus === 'Delivered') {
    payload.isDelivered = true;
  } else if (order.isDelivered) {
    payload.isDelivered = false;
  }

  return payload;
};

const getPaginationRange = (currentPage, totalPages) => {
  const startPage = Math.max(1, currentPage - 1);
  const endPage = Math.min(totalPages, currentPage + 1);
  const pages = [];

  for (let page = startPage; page <= endPage; page += 1) {
    pages.push(page);
  }

  return pages;
};

const buildProductUpdatePayload = (product, overrides = {}) => ({
  name: product.name || '',
  slug: product.slug || '',
  category: product.category || '',
  price: product.price ?? 0,
  compareAtPrice: product.compareAtPrice ?? 0,
  weight: product.weight || '',
  countInStock: product.countInStock ?? 0,
  lowStockThreshold: product.lowStockThreshold ?? 10,
  variants: Array.isArray(product.variants) ? product.variants : [],
  image: product.image || '',
  images: Array.isArray(product.images) ? product.images : [],
  shortDescription: product.shortDescription || '',
  description: product.description || '',
  origin: product.origin || '',
  ingredients: product.ingredients || '',
  brand: product.brand || 'Apex Link Group',
  sku: product.sku || '',
  isFeatured: Boolean(product.isFeatured),
  isActive: product.isActive ?? true,
  isBestSeller: Boolean(product.isBestSeller),
  ...overrides,
});

const AdminDashboard = () => {
  const { userInfo } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('products');

  const [products, setProducts] = useState([]);
  const [productCategories, setProductCategories] = useState([]);
  const [productLoading, setProductLoading] = useState(false);
  const [productError, setProductError] = useState('');
  const [productSuccess, setProductSuccess] = useState('');
  const [productSearchInput, setProductSearchInput] = useState('');
  const [productFilters, setProductFilters] = useState(INITIAL_PRODUCT_FILTERS);
  const [productPage, setProductPage] = useState(1);
  const [productMeta, setProductMeta] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [productRefreshToken, setProductRefreshToken] = useState(0);
  const [productActionKey, setProductActionKey] = useState('');

  const [orders, setOrders] = useState([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');
  const [orderSearchInput, setOrderSearchInput] = useState('');
  const [orderFilters, setOrderFilters] = useState(INITIAL_ORDER_FILTERS);
  const [orderPage, setOrderPage] = useState(1);
  const [orderMeta, setOrderMeta] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [orderRefreshToken, setOrderRefreshToken] = useState(0);
  const [activeQuickAction, setActiveQuickAction] = useState('');
  const canAccessAdmin = Boolean(userInfo?.isAdmin || userInfo?.isStaff || userInfo?.permissions?.length);

  useEffect(() => {
    if (!userInfo || !canAccessAdmin) {
      navigate('/login');
    }
  }, [canAccessAdmin, navigate, userInfo]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setProductFilters((currentFilters) => {
        if (currentFilters.keyword === productSearchInput.trim()) {
          return currentFilters;
        }

        return {
          ...currentFilters,
          keyword: productSearchInput.trim(),
        };
      });
      setProductPage(1);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [productSearchInput]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setOrderFilters((currentFilters) => {
        if (currentFilters.search === orderSearchInput.trim()) {
          return currentFilters;
        }

        return {
          ...currentFilters,
          search: orderSearchInput.trim(),
        };
      });
      setOrderPage(1);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [orderSearchInput]);

  useEffect(() => {
    if (!userInfo?.token || !userInfo.isAdmin || activeTab !== 'products') {
      return;
    }

    const loadCategories = async () => {
      try {
        const { data } = await axios.get('/api/categories', {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
          params: {
            includeInactive: true,
          },
        });

        setProductCategories(data);
      } catch (error) {
        console.error(error);
        setProductError((currentError) => currentError || 'Unable to load categories right now.');
      }
    };

    loadCategories();
  }, [activeTab, userInfo]);

  useEffect(() => {
    if (!userInfo?.token || !userInfo.isAdmin || activeTab !== 'products') {
      return;
    }

    const fetchProducts = async () => {
      setProductLoading(true);
      setProductError('');

      try {
        const { data } = await axios.get('/api/products', {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
          params: {
            ...productFilters,
            page: productPage,
            limit: ADMIN_PRODUCT_PAGE_SIZE,
          },
        });

        const payload = normalizeProductPayload(data);
        setProducts(payload.products);
        setProductMeta({
          currentPage: payload.currentPage,
          totalPages: payload.totalPages,
          totalProducts: payload.totalProducts,
          hasNextPage: payload.hasNextPage,
          hasPrevPage: payload.hasPrevPage,
        });

        if (payload.currentPage !== productPage) {
          setProductPage(payload.currentPage);
        }
      } catch (error) {
        console.error(error);
        setProductError(error.response?.data?.message || 'Unable to load products right now.');
      } finally {
        setProductLoading(false);
      }
    };

    fetchProducts();
  }, [activeTab, productFilters, productPage, productRefreshToken, userInfo]);

  useEffect(() => {
    if (!userInfo?.token || !userInfo.isAdmin || activeTab !== 'orders') {
      return;
    }

    const fetchOrders = async () => {
      setOrderLoading(true);
      setOrderError('');

      try {
        const config = {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
          params: {
            ...orderFilters,
            page: orderPage,
            limit: ORDERS_PER_PAGE,
          },
        };

        const { data } = await axios.get('/api/orders/admin/all', config);
        const payload = data?.orders ? data : buildFallbackOrderPayload(data);

        setOrders(payload.orders);
        setOrderMeta({
          currentPage: payload.currentPage,
          totalPages: payload.totalPages,
          totalOrders: payload.totalOrders,
          hasNextPage: payload.hasNextPage,
          hasPrevPage: payload.hasPrevPage,
        });

        if (payload.currentPage !== orderPage) {
          setOrderPage(payload.currentPage);
        }
      } catch (error) {
        console.error(error);
        setOrderError(error.response?.data?.message || 'Unable to load orders right now.');
      } finally {
        setOrderLoading(false);
      }
    };

    fetchOrders();
  }, [activeTab, orderFilters, orderPage, orderRefreshToken, userInfo]);

  const updateProductFilter = (key, value) => {
    setProductError('');
    setProductSuccess('');
    setProductPage(1);
    setProductFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  };

  const resetProductFilters = () => {
    setProductError('');
    setProductSuccess('');
    setProductSearchInput('');
    setProductFilters(INITIAL_PRODUCT_FILTERS);
    setProductPage(1);
  };

  const navigateToAddProduct = () => {
    navigate('/admin/products/new');
  };

  const toggleProductActiveHandler = async (product) => {
    const nextActiveState = !(product.isActive ?? true);
    const actionKey = `${product._id}:active`;

    setProductActionKey(actionKey);
    setProductError('');
    setProductSuccess('');

    try {
      await axios.put(
        `/api/products/${product._id}`,
        buildProductUpdatePayload(product, { isActive: nextActiveState }),
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setProductSuccess(`Product ${nextActiveState ? 'activated' : 'deactivated'} successfully.`);
      setProductRefreshToken((currentValue) => currentValue + 1);
    } catch (error) {
      console.error(error);
      setProductError(error.response?.data?.message || 'Unable to update product visibility.');
    } finally {
      setProductActionKey('');
    }
  };

  const toggleFeaturedHandler = async (product) => {
    const nextFeaturedState = !product.isFeatured;
    const actionKey = `${product._id}:featured`;

    setProductActionKey(actionKey);
    setProductError('');
    setProductSuccess('');

    try {
      await axios.put(
        `/api/products/${product._id}`,
        buildProductUpdatePayload(product, { isFeatured: nextFeaturedState }),
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setProductSuccess(`Product ${nextFeaturedState ? 'marked as featured' : 'removed from featured'} successfully.`);
      setProductRefreshToken((currentValue) => currentValue + 1);
    } catch (error) {
      console.error(error);
      setProductError(error.response?.data?.message || 'Unable to update featured status.');
    } finally {
      setProductActionKey('');
    }
  };

  const deleteProductHandler = async (product) => {
    const confirmed = window.confirm(
      `Delete "${product.name}"? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    const actionKey = `${product._id}:delete`;
    setProductActionKey(actionKey);
    setProductError('');
    setProductSuccess('');

    try {
      await axios.delete(`/api/products/${product._id}`, {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      });

      setProductSuccess('Product deleted successfully.');
      setProductRefreshToken((currentValue) => currentValue + 1);
    } catch (error) {
      console.error(error);
      setProductError(error.response?.data?.message || 'Unable to delete this product right now.');
    } finally {
      setProductActionKey('');
    }
  };

  const updateOrderFilter = (key, value) => {
    setOrderSuccess('');
    setOrderError('');
    setOrderPage(1);
    setOrderFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  };

  const resetOrderFilters = () => {
    setOrderSuccess('');
    setOrderError('');
    setOrderSearchInput('');
    setOrderFilters(INITIAL_ORDER_FILTERS);
    setOrderPage(1);
  };

  const quickActionHandler = async (order, nextStatus) => {
    if (nextStatus === 'Cancelled') {
      const confirmed = window.confirm('Are you sure you want to mark this order as Cancelled?');

      if (!confirmed) {
        return;
      }
    }

    setOrderError('');
    setOrderSuccess('');
    setActiveQuickAction(`${order._id}:${nextStatus}`);

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
          'Content-Type': 'application/json',
        },
      };

      await axios.put(
        `/api/orders/${order._id}/status`,
        getQuickActionPayload(order, nextStatus),
        config
      );

      setOrderSuccess(`Order ${order._id.slice(-6).toUpperCase()} marked as ${nextStatus}.`);
      setOrderRefreshToken((currentValue) => currentValue + 1);
    } catch (error) {
      console.error(error);
      setOrderError(error.response?.data?.message || `Unable to mark this order as ${nextStatus}.`);
    } finally {
      setActiveQuickAction('');
    }
  };

  const productPaginationPages = getPaginationRange(productMeta.currentPage, productMeta.totalPages);
  const orderPaginationPages = getPaginationRange(orderMeta.currentPage, orderMeta.totalPages);
  const showProductSkeleton = productLoading && products.length === 0;
  const showOrderSkeleton = orderLoading && orders.length === 0;
  const adminCategoryOptions = [
    { value: '', label: 'All Categories' },
    ...productCategories.map((category) => ({
      value: category.slug,
      label: category.name,
    })),
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-serif font-bold text-brand-dark">Admin Dashboard</h1>

      <div className="flex flex-col gap-8 md:flex-row">
        <div className="md:w-1/4">
          <div className="flex flex-col gap-2 rounded-lg bg-white p-4 shadow-sm">
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center rounded p-3 text-left font-medium transition-colors ${
                activeTab === 'products' ? 'bg-brand-primary text-white' : 'hover:bg-gray-100'
              }`}
            >
              <Package size={20} className="mr-3" /> Products
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center rounded p-3 text-left font-medium transition-colors ${
                activeTab === 'orders' ? 'bg-brand-primary text-white' : 'hover:bg-gray-100'
              }`}
            >
              <ShoppingBag size={20} className="mr-3" /> Orders
            </button>
            <button
              onClick={() => navigate('/admin/categories')}
              className="flex items-center rounded p-3 text-left font-medium transition-colors hover:bg-gray-100"
            >
              <Package size={20} className="mr-3" /> Categories
            </button>
            <button
              onClick={() => navigate('/admin/messages')}
              className="flex items-center rounded p-3 text-left font-medium transition-colors hover:bg-gray-100"
            >
              <Mail size={20} className="mr-3" /> Messages
            </button>
            <button
              onClick={() => navigate('/admin/commerce')}
              className="flex items-center rounded p-3 text-left font-medium transition-colors hover:bg-gray-100"
            >
              <ShoppingBag size={20} className="mr-3" /> Commerce Ops
            </button>
            <button
              onClick={() => navigate('/admin/vendors')}
              className="flex items-center rounded p-3 text-left font-medium transition-colors hover:bg-gray-100"
            >
              <Store size={20} className="mr-3" /> Marketplace Ops
            </button>
            <button
              onClick={() => navigate('/admin/professional')}
              className="flex items-center rounded p-3 text-left font-medium transition-colors hover:bg-gray-100"
            >
              <ShieldCheck size={20} className="mr-3" /> Professional Admin
            </button>
          </div>
        </div>

        <div className="md:w-3/4">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            {activeTab === 'products' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Catalog Command Center</p>
                    <h2 className="mt-2 text-2xl font-serif font-bold text-brand-dark">Manage Products</h2>
                    <p className="mt-2 text-sm text-gray-500">
                      Search, merchandise, and maintain storefront readiness without leaving the dashboard.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-2xl border border-brand-accent/20 bg-brand-light px-4 py-3 text-sm">
                      <span className="font-semibold text-brand-dark">{productMeta.totalProducts}</span>{' '}
                      <span className="text-gray-500">matching products</span>
                      {productLoading && products.length > 0 && (
                        <span className="ml-3 inline-flex items-center font-medium text-brand-primary">
                          <Loader2 size={14} className="mr-1 animate-spin" /> Refreshing
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={navigateToAddProduct}
                      className="inline-flex items-center rounded-md bg-brand-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-brand-dark"
                    >
                      Add Product
                    </button>
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-100 bg-gradient-to-br from-white via-white to-brand-light p-5 shadow-sm">
                  {showProductSkeleton ? (
                    <ProductFiltersSkeleton />
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))]">
                      <label className="relative block">
                        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                          Search Products
                        </span>
                        <Search size={16} className="pointer-events-none absolute left-4 top-[3.2rem] -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={productSearchInput}
                          onChange={(event) => {
                            setProductError('');
                            setProductSuccess('');
                            setProductSearchInput(event.target.value);
                          }}
                          placeholder="Search name, origin, SKU, or description"
                          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-brand-dark outline-none transition placeholder:text-gray-400 focus:border-brand-accent"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                          Category
                        </span>
                        <CustomSelect
                          value={productFilters.category}
                          onChange={(nextValue) => updateProductFilter('category', nextValue)}
                          options={adminCategoryOptions}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                          Visibility
                        </span>
                        <CustomSelect
                          value={productFilters.active}
                          onChange={(nextValue) => updateProductFilter('active', nextValue)}
                          options={PRODUCT_ACTIVE_FILTER_OPTIONS}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                          Stock
                        </span>
                        <CustomSelect
                          value={productFilters.stock}
                          onChange={(nextValue) => updateProductFilter('stock', nextValue)}
                          options={PRODUCT_STOCK_FILTER_OPTIONS}
                        />
                      </label>

                      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <label className="block">
                          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                            Sort
                          </span>
                          <CustomSelect
                            value={productFilters.sort}
                            onChange={(nextValue) => updateProductFilter('sort', nextValue)}
                            options={ADMIN_PRODUCT_SORT_OPTIONS}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={resetProductFilters}
                          className="mt-auto inline-flex items-center justify-center rounded-xl border border-brand-primary/20 px-4 py-3 text-sm font-semibold text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                        >
                          <RotateCcw size={16} className="mr-2" /> Reset
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {productError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {productError}
                  </div>
                )}

                {productSuccess && (
                  <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                    {productSuccess}
                  </div>
                )}

                {showProductSkeleton ? (
                  <ProductTableSkeleton />
                ) : products.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-brand-accent/30 bg-brand-light px-6 py-12 text-center">
                    <p className="font-serif text-2xl font-bold text-brand-dark">No matching products found</p>
                    <p className="mt-2 text-sm text-gray-500">
                      Adjust your filters or add a new product to keep the catalog moving.
                    </p>
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                      <button
                        type="button"
                        onClick={resetProductFilters}
                        className="inline-flex items-center rounded-md border border-brand-primary/20 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                      >
                        <RotateCcw size={16} className="mr-2" /> Reset Filters
                      </button>
                      <button
                        type="button"
                        onClick={navigateToAddProduct}
                        className="inline-flex items-center rounded-md bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-brand-dark"
                      >
                        Add Product
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 xl:hidden">
                      {products.map((product) => {
                        const stockPresentation = getStockPresentation(product.countInStock);
                        const activeActionKey = `${product._id}:active`;
                        const featuredActionKey = `${product._id}:featured`;
                        const deleteActionKey = `${product._id}:delete`;

                        return (
                          <article
                            key={product._id}
                            className="rounded-3xl border border-gray-100 bg-gradient-to-br from-white to-brand-light p-5 shadow-sm"
                          >
                            <div className="flex items-start gap-4">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="h-28 w-24 rounded-2xl object-cover"
                              />

                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">
                                    {product.category}
                                  </p>
                                  {product.isFeatured && (
                                    <span className="inline-flex rounded-full bg-[#f3f6fc] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8a6d14]">
                                      Featured
                                    </span>
                                  )}
                                  {product.isBestSeller && (
                                    <span className="inline-flex rounded-full bg-[#f3e1de] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8c3b2a]">
                                      Best Seller
                                    </span>
                                  )}
                                </div>

                                <h3 className="mt-2 font-serif text-xl font-bold text-brand-dark">
                                  {product.name}
                                </h3>
                                <p className="mt-1 text-sm text-gray-500">{product.sku || 'No SKU assigned'}</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-brand-dark">
                                    {formatCurrency(product.price)}
                                  </span>
                                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${stockPresentation.className}`}>
                                    {stockPresentation.label}
                                  </span>
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                      product.isActive
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-gray-200 text-gray-600'
                                    }`}
                                  >
                                    {product.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                              <Link
                                to={`/admin/product/${product._id}/edit`}
                                className="inline-flex items-center rounded-full border border-brand-primary/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                              >
                                <Edit size={12} className="mr-2" /> Edit
                              </Link>
                              <button
                                type="button"
                                disabled={productActionKey === activeActionKey}
                                onClick={() => toggleProductActiveHandler(product)}
                                className="inline-flex items-center rounded-full border border-gray-200 px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] text-brand-dark transition-colors duration-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {productActionKey === activeActionKey ? (
                                  <Loader2 size={12} className="mr-2 animate-spin" />
                                ) : product.isActive ? (
                                  <EyeOff size={12} className="mr-2" />
                                ) : (
                                  <Eye size={12} className="mr-2" />
                                )}
                                {product.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                type="button"
                                disabled={productActionKey === featuredActionKey}
                                onClick={() => toggleFeaturedHandler(product)}
                                className="inline-flex items-center rounded-full border border-[#c3d1e4] px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] text-[#7a5f10] transition-colors duration-200 hover:bg-[#f3f6fc] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {productActionKey === featuredActionKey ? (
                                  <Loader2 size={12} className="mr-2 animate-spin" />
                                ) : (
                                  <Star size={12} className="mr-2" />
                                )}
                                {product.isFeatured ? 'Unfeature' : 'Feature'}
                              </button>
                              <button
                                type="button"
                                disabled={productActionKey === deleteActionKey}
                                onClick={() => deleteProductHandler(product)}
                                className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold uppercase tracking-[0.15em] text-red-700 transition-colors duration-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {productActionKey === deleteActionKey ? (
                                  <Loader2 size={12} className="mr-2 animate-spin" />
                                ) : (
                                  <Trash2 size={12} className="mr-2" />
                                )}
                                Delete
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    <div className="hidden overflow-x-auto xl:block">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b-2 border-gray-200 bg-gray-50/60 text-xs font-bold uppercase tracking-wider text-gray-500">
                            <th className="px-4 py-4">Product</th>
                            <th className="px-4 py-4">Category</th>
                            <th className="px-4 py-4">Price</th>
                            <th className="px-4 py-4">Stock</th>
                            <th className="px-4 py-4">Status</th>
                            <th className="px-4 py-4">Featured</th>
                            <th className="px-4 py-4">Quick Actions</th>
                            <th className="px-4 py-4 text-right">Manage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                          {products.map((product) => {
                            const stockPresentation = getStockPresentation(product.countInStock);
                            const activeActionKey = `${product._id}:active`;
                            const featuredActionKey = `${product._id}:featured`;
                            const deleteActionKey = `${product._id}:delete`;

                            return (
                              <tr key={product._id} className="align-top transition duration-150 hover:bg-gray-50/50">
                                <td className="px-4 py-4">
                                  <div className="flex items-center gap-4">
                                    <img
                                      src={product.image}
                                      alt={product.name}
                                      className="h-16 w-16 rounded-2xl object-cover"
                                    />
                                    <div>
                                      <div className="font-semibold text-brand-dark">{product.name}</div>
                                      <div className="text-xs text-gray-500">{product.sku || 'No SKU assigned'}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-gray-600">{product.category}</td>
                                <td className="px-4 py-4 font-serif text-lg font-bold text-brand-dark">
                                  {formatCurrency(product.price)}
                                </td>
                                <td className="px-4 py-4">
                                  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${stockPresentation.className}`}>
                                    {stockPresentation.label}
                                  </span>
                                </td>
                                <td className="px-4 py-4">
                                  <span
                                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                      product.isActive
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-gray-200 text-gray-600'
                                    }`}
                                  >
                                    {product.isActive ? 'Active' : 'Inactive'}
                                  </span>
                                </td>
                                <td className="px-4 py-4">
                                  <span
                                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                      product.isFeatured
                                        ? 'bg-[#f3f6fc] text-[#8a6d14]'
                                        : 'bg-gray-100 text-gray-500'
                                    }`}
                                  >
                                    {product.isFeatured ? 'Featured' : 'Standard'}
                                  </span>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      disabled={productActionKey === activeActionKey}
                                      onClick={() => toggleProductActiveHandler(product)}
                                      className="inline-flex items-center rounded-full border border-gray-200 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-dark transition-colors duration-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {productActionKey === activeActionKey ? (
                                        <Loader2 size={11} className="mr-1 animate-spin" />
                                      ) : product.isActive ? (
                                        <EyeOff size={11} className="mr-1" />
                                      ) : (
                                        <Eye size={11} className="mr-1" />
                                      )}
                                      {product.isActive ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={productActionKey === featuredActionKey}
                                      onClick={() => toggleFeaturedHandler(product)}
                                      className="inline-flex items-center rounded-full border border-[#c3d1e4] px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#7a5f10] transition-colors duration-200 hover:bg-[#f3f6fc] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {productActionKey === featuredActionKey ? (
                                        <Loader2 size={11} className="mr-1 animate-spin" />
                                      ) : (
                                        <Star size={11} className="mr-1" />
                                      )}
                                      {product.isFeatured ? 'Unfeature' : 'Feature'}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={productActionKey === deleteActionKey}
                                      onClick={() => deleteProductHandler(product)}
                                      className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-red-700 transition-colors duration-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {productActionKey === deleteActionKey ? (
                                        <Loader2 size={11} className="mr-1 animate-spin" />
                                      ) : (
                                        <Trash2 size={11} className="mr-1" />
                                      )}
                                      Delete
                                    </button>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <Link
                                    to={`/admin/product/${product._id}/edit`}
                                    className="inline-flex items-center rounded-md border border-brand-primary/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                                  >
                                    Edit
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-col gap-4 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-gray-500">
                        Showing page <span className="font-semibold text-brand-dark">{productMeta.currentPage}</span> of{' '}
                        <span className="font-semibold text-brand-dark">{productMeta.totalPages}</span>
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={!productMeta.hasPrevPage}
                          onClick={() => setProductPage((currentPage) => Math.max(currentPage - 1, 1))}
                          className="inline-flex items-center rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-brand-dark transition-colors duration-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ChevronLeft size={16} className="mr-1" /> Prev
                        </button>

                        {productPaginationPages.map((pageNumber) => (
                          <button
                            key={pageNumber}
                            type="button"
                            onClick={() => setProductPage(pageNumber)}
                            className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
                              pageNumber === productMeta.currentPage
                                ? 'bg-brand-primary text-white'
                                : 'border border-gray-200 text-brand-dark hover:bg-gray-50'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        ))}

                        <button
                          type="button"
                          disabled={!productMeta.hasNextPage}
                          onClick={() => setProductPage((currentPage) => currentPage + 1)}
                          className="inline-flex items-center rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-brand-dark transition-colors duration-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Next <ChevronRight size={16} className="ml-1" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Workflow Productivity</p>
                    <h2 className="mt-2 text-2xl font-serif font-bold text-brand-dark">Manage Orders</h2>
                    <p className="mt-2 text-sm text-gray-500">
                      Search, filter, sort, and update fulfillment states without leaving the dashboard.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-brand-accent/20 bg-brand-light px-4 py-3 text-sm">
                    <span className="font-semibold text-brand-dark">{orderMeta.totalOrders}</span>{' '}
                    <span className="text-gray-500">matching orders</span>
                    {orderLoading && orders.length > 0 && (
                      <span className="ml-3 inline-flex items-center font-medium text-brand-primary">
                        <Loader2 size={14} className="mr-1 animate-spin" /> Refreshing
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-gray-100 bg-gradient-to-br from-white via-white to-brand-light p-5 shadow-sm">
                  {showOrderSkeleton ? (
                    <OrderFiltersSkeleton />
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-[1.6fr_repeat(4,minmax(0,1fr))]">
                      <label className="relative block">
                        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                          Search Orders
                        </span>
                        <Search size={16} className="pointer-events-none absolute left-4 top-[3.2rem] -translate-y-1/2 text-gray-400" />
                        <input
                          type="text"
                          value={orderSearchInput}
                          onChange={(event) => {
                            setOrderSuccess('');
                            setOrderError('');
                            setOrderSearchInput(event.target.value);
                          }}
                          placeholder="Order ID, customer name, or email"
                          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-brand-dark outline-none transition placeholder:text-gray-400 focus:border-brand-accent"
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                          Status
                        </span>
                        <CustomSelect
                          value={orderFilters.status}
                          onChange={(nextValue) => updateOrderFilter('status', nextValue)}
                          options={ORDER_STATUS_FILTER_OPTIONS}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                          Payment
                        </span>
                        <CustomSelect
                          value={orderFilters.payment}
                          onChange={(nextValue) => updateOrderFilter('payment', nextValue)}
                          options={ORDER_PAYMENT_FILTER_OPTIONS}
                        />
                      </label>

                      <label className="block">
                        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                          Delivery
                        </span>
                        <CustomSelect
                          value={orderFilters.delivery}
                          onChange={(nextValue) => updateOrderFilter('delivery', nextValue)}
                          options={ORDER_DELIVERY_FILTER_OPTIONS}
                        />
                      </label>

                      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <label className="block">
                          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                            Sort
                          </span>
                          <CustomSelect
                            value={orderFilters.sort}
                            onChange={(nextValue) => updateOrderFilter('sort', nextValue)}
                            options={ORDER_SORT_OPTIONS}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={resetOrderFilters}
                          className="mt-auto inline-flex items-center justify-center rounded-xl border border-brand-primary/20 px-4 py-3 text-sm font-semibold text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                        >
                          <RotateCcw size={16} className="mr-2" /> Reset
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {orderError && (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {orderError}
                  </div>
                )}

                {orderSuccess && (
                  <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                    {orderSuccess}
                  </div>
                )}

                {showOrderSkeleton ? (
                  <OrdersTableSkeleton />
                ) : orders.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-brand-accent/30 bg-brand-light px-6 py-12 text-center">
                    <p className="font-serif text-2xl font-bold text-brand-dark">No matching orders found</p>
                    <p className="mt-2 text-sm text-gray-500">
                      Try adjusting your search, filters, or sorting to surface more orders.
                    </p>
                    <button
                      type="button"
                      onClick={resetOrderFilters}
                      className="mt-6 inline-flex items-center rounded-md bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-brand-dark"
                    >
                      <RotateCcw size={16} className="mr-2" /> Reset Filters
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 xl:hidden">
                      {orders.map((order) => {
                        const status = order.orderStatus || 'Processing';
                        const itemCount = getOrderItemCount(order);

                        return (
                          <article
                            key={order._id}
                            className="rounded-3xl border border-gray-100 bg-gradient-to-br from-white to-brand-light p-5 shadow-sm"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">Order ID</p>
                                <p className="mt-1 break-all font-mono text-xs text-brand-primary">{order._id}</p>
                                <p className="mt-3 font-serif text-lg font-bold text-brand-dark">
                                  {order.user?.name || order.user?.email || 'Guest'}
                                </p>
                                <p className="text-sm text-gray-500">{order.user?.email || 'No email available'}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-serif text-xl font-bold text-brand-dark">{formatCurrency(order.totalPrice)}</p>
                                <p className="mt-1 text-xs text-gray-500">
                                  {new Date(order.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </p>
                                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                                  {itemCount} {itemCount === 1 ? 'Item' : 'Items'}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getOrderStatusBadgeClass(status)}`}>
                                {status}
                              </span>
                              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPaymentBadgeClass(order)}`}>
                                {getPaymentLabel(order)}
                              </span>
                              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getDeliveryBadgeClass(order.isDelivered, status)}`}>
                                {getDeliveryLabel(order.isDelivered, status)}
                              </span>
                            </div>

                            <div className="mt-5 flex flex-wrap gap-2">
                              {ORDER_QUICK_ACTIONS.map((action) => {
                                const isActiveAction = activeQuickAction === `${order._id}:${action.status}`;
                                const isDisabled = isActiveAction || order.orderStatus === action.status;

                                return (
                                  <button
                                    key={action.status}
                                    type="button"
                                    disabled={isDisabled}
                                    onClick={() => quickActionHandler(order, action.status)}
                                    className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${action.className}`}
                                  >
                                    {isActiveAction && <Loader2 size={12} className="mr-1 animate-spin" />}
                                    Mark {action.label}
                                  </button>
                                );
                              })}
                            </div>

                            <div className="mt-5">
                              <Link
                                to={`/admin/orders/${order._id}`}
                                className="inline-flex items-center justify-center rounded-md bg-brand-primary px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-brand-dark"
                              >
                                View / Manage
                              </Link>
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    <div className="hidden overflow-x-auto xl:block">
                      <table className="w-full border-collapse text-left">
                        <thead>
                          <tr className="border-b-2 border-gray-200 bg-gray-50/60 text-xs font-bold uppercase tracking-wider text-gray-500">
                            <th className="px-4 py-4">Order ID</th>
                            <th className="px-4 py-4">Customer</th>
                            <th className="px-4 py-4">Date</th>
                            <th className="px-4 py-4">Items</th>
                            <th className="px-4 py-4">Total</th>
                            <th className="px-4 py-4">Order Status</th>
                            <th className="px-4 py-4">Payment</th>
                            <th className="px-4 py-4">Delivery</th>
                            <th className="px-4 py-4">Quick Actions</th>
                            <th className="px-4 py-4 text-right">Manage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                          {orders.map((order) => {
                            const status = order.orderStatus || 'Processing';
                            const itemCount = getOrderItemCount(order);

                            return (
                              <tr key={order._id} className="align-top transition duration-150 hover:bg-gray-50/50">
                                <td className="px-4 py-4 font-mono text-xs font-bold text-brand-primary">
                                  {order._id}
                                </td>
                                <td className="px-4 py-4">
                                  <div className="font-semibold text-brand-dark">
                                    {order.user?.name || order.user?.email || 'Guest'}
                                  </div>
                                  <div className="text-xs text-gray-500">{order.user?.email || 'No email available'}</div>
                                </td>
                                <td className="px-4 py-4 text-gray-600">
                                  {new Date(order.createdAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </td>
                                <td className="px-4 py-4 font-medium text-brand-dark">
                                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                                </td>
                                <td className="px-4 py-4 font-serif text-lg font-bold text-brand-dark">
                                  {formatCurrency(order.totalPrice)}
                                </td>
                                <td className="px-4 py-4">
                                  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold ${getOrderStatusBadgeClass(status)}`}>
                                    {status}
                                  </span>
                                </td>
                                <td className="px-4 py-4">
                                  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getPaymentBadgeClass(order)}`}>
                                    {getPaymentLabel(order)}
                                  </span>
                                </td>
                                <td className="px-4 py-4">
                                  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getDeliveryBadgeClass(order.isDelivered, status)}`}>
                                    {getDeliveryLabel(order.isDelivered, status)}
                                  </span>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex flex-wrap gap-2">
                                    {ORDER_QUICK_ACTIONS.map((action) => {
                                      const isActiveAction = activeQuickAction === `${order._id}:${action.status}`;
                                      const isDisabled = isActiveAction || order.orderStatus === action.status;

                                      return (
                                        <button
                                          key={action.status}
                                          type="button"
                                          disabled={isDisabled}
                                          onClick={() => quickActionHandler(order, action.status)}
                                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50 ${action.className}`}
                                        >
                                          {isActiveAction && <Loader2 size={11} className="mr-1 animate-spin" />}
                                          {action.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-right">
                                  <Link
                                    to={`/admin/orders/${order._id}`}
                                    className="inline-flex items-center rounded-md border border-brand-primary/20 px-3 py-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                                  >
                                    View / Manage
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-col gap-4 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-gray-500">
                        Showing page <span className="font-semibold text-brand-dark">{orderMeta.currentPage}</span> of{' '}
                        <span className="font-semibold text-brand-dark">{orderMeta.totalPages}</span>
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={!orderMeta.hasPrevPage}
                          onClick={() => setOrderPage((currentPage) => Math.max(currentPage - 1, 1))}
                          className="inline-flex items-center rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-brand-dark transition-colors duration-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <ChevronLeft size={16} className="mr-1" /> Prev
                        </button>

                        {orderPaginationPages.map((pageNumber) => (
                          <button
                            key={pageNumber}
                            type="button"
                            onClick={() => setOrderPage(pageNumber)}
                            className={`rounded-md px-3 py-2 text-sm font-semibold transition-colors duration-200 ${
                              pageNumber === orderMeta.currentPage
                                ? 'bg-brand-primary text-white'
                                : 'border border-gray-200 text-brand-dark hover:bg-gray-50'
                            }`}
                          >
                            {pageNumber}
                          </button>
                        ))}

                        <button
                          type="button"
                          disabled={!orderMeta.hasNextPage}
                          onClick={() => setOrderPage((currentPage) => currentPage + 1)}
                          className="inline-flex items-center rounded-md border border-gray-200 px-3 py-2 text-sm font-semibold text-brand-dark transition-colors duration-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Next <ChevronRight size={16} className="ml-1" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
