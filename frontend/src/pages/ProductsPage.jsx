import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowUpDown,
  BadgeCheck,
  Check,
  RotateCcw,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import Product from '../components/Product';
import CustomSelect from '../components/CustomSelect';
import {
  PRODUCT_PAGE_SIZE,
  PRODUCT_PRICE_SORT_OPTIONS,
  SHOP_STOCK_FILTER_OPTIONS,
  normalizeProductPayload,
} from '../utils/productUi';
import { applySeo } from '../utils/seo';
import useScrollReveal from '../hooks/useScrollReveal';
import { preloadProductGridImages } from '../utils/imagePreloader';
import { getCategories } from '../utils/categoryApi';

const INITIAL_FILTERS = {
  keyword: '',
  category: '',
  minPrice: '',
  maxPrice: '',
  stock: '',
  brand: '',
  origin: '',
  rating: '',
  sort: '',
};

const MOBILE_FILTER_KEYS = [
  'category',
  'minPrice',
  'maxPrice',
  'brand',
  'origin',
  'stock',
  'rating',
];

const RATING_OPTIONS = [
  { value: '', label: 'Any Rating' },
  { value: '4', label: '4+ Stars' },
  { value: '3', label: '3+ Stars' },
];

const ProductsPage = () => {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return {
      ...INITIAL_FILTERS,
      category: params.get('category') || '',
      keyword: params.get('keyword') || '',
      brand: params.get('brand') || '',
    };
  });
  const [mobilePanel, setMobilePanel] = useState(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState(INITIAL_FILTERS);
  const [meta, setMeta] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [facets, setFacets] = useState({ categories: [], brands: [], origins: [], availability: [], priceRange: {} });
  const [productGridRef, productsVisible] = useScrollReveal();
  const [featuresRef, featuresVisible] = useScrollReveal();
  const loaderRef = useRef(null);
  const queryVersionRef = useRef(0);
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const categoryParam = searchParams.get('category') || '';
    const keywordParam = searchParams.get('keyword') || '';
    const brandParam = searchParams.get('brand') || '';

    const frame = window.requestAnimationFrame(() => {
      setFilters((prev) => {
        if (
          prev.category === categoryParam &&
          prev.keyword === keywordParam &&
          prev.brand === brandParam
        ) {
          return prev;
        }
        return {
          ...prev,
          category: categoryParam,
          keyword: keywordParam,
          brand: brandParam,
        };
      });

      if (keywordParam) {
        setSearchInput(keywordParam);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.search]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters((currentFilters) => {
        if (currentFilters.keyword === searchInput.trim()) {
          return currentFilters;
        }

        return {
          ...currentFilters,
          keyword: searchInput.trim(),
        };
      });
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    if (!mobilePanel) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setMobilePanel(null);
      }
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobilePanel]);

  useEffect(() => {
    applySeo({
      title: 'Shop Premium Products',
      description: 'Browse Apex Link Group products across textiles, food, technology, industrial equipment, and more.',
      keywords: ['global marketplace', 'premium products', 'Apex Link Group'],
      canonicalUrl: `${window.location.origin}/products`,
      type: 'website',
    });

    const fetchCategories = async () => {
      try {
        setCategories(await getCategories());
      } catch (fetchError) {
        console.error(fetchError);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const requestVersion = queryVersionRef.current + 1;
    queryVersionRef.current = requestVersion;
    const controller = new AbortController();

    const fetchFirstPage = async () => {
      setLoading(true);
      setLoadingMore(false);
      loadingMoreRef.current = false;
      setError('');
      setProducts([]);

      try {
        const { data } = await axios.get('/api/customer/search', {
          params: {
            ...filters,
            page: 1,
            limit: PRODUCT_PAGE_SIZE,
          },
          signal: controller.signal,
        });

        if (queryVersionRef.current !== requestVersion) {
          return;
        }

        const payload = normalizeProductPayload(data);
        await preloadProductGridImages(payload.products);

        if (queryVersionRef.current !== requestVersion) {
          return;
        }

        setProducts(payload.products);
        setFacets(data.facets || { categories: [], brands: [], origins: [], availability: [], priceRange: {} });
        setMeta({
          currentPage: payload.currentPage,
          totalPages: payload.totalPages,
          totalProducts: payload.totalProducts,
          hasNextPage: payload.hasNextPage,
          hasPrevPage: payload.hasPrevPage,
        });
      } catch (fetchError) {
        if (fetchError.name === 'CanceledError' || fetchError.code === 'ERR_CANCELED') {
          return;
        }

        console.error(fetchError);
        setError(fetchError.response?.data?.message || 'Unable to load products right now.');
      } finally {
        if (queryVersionRef.current === requestVersion) {
          setLoading(false);
        }
      }
    };

    fetchFirstPage();

    return () => {
      controller.abort();
    };
  }, [filters]);

  const loadMoreProducts = useCallback(async () => {
    if (loading || loadingMore || loadingMoreRef.current || !meta.hasNextPage) {
      return;
    }

    const requestVersion = queryVersionRef.current;
    const nextPage = meta.currentPage + 1;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError('');

    try {
      const { data } = await axios.get('/api/customer/search', {
        params: {
          ...filters,
          page: nextPage,
          limit: PRODUCT_PAGE_SIZE,
        },
      });

      if (queryVersionRef.current !== requestVersion) {
        return;
      }

      const payload = normalizeProductPayload(data);
      await preloadProductGridImages(payload.products);

      if (queryVersionRef.current !== requestVersion) {
        return;
      }

      setProducts((currentProducts) => {
        const seenProductIds = new Set(currentProducts.map((product) => product._id));
        const nextProducts = payload.products.filter((product) => !seenProductIds.has(product._id));
        return [...currentProducts, ...nextProducts];
      });
      setFacets(data.facets || { categories: [], brands: [], origins: [], availability: [], priceRange: {} });
      setMeta({
        currentPage: payload.currentPage,
        totalPages: payload.totalPages,
        totalProducts: payload.totalProducts,
        hasNextPage: payload.hasNextPage,
        hasPrevPage: payload.hasPrevPage,
      });
    } catch (fetchError) {
      console.error(fetchError);
      setError(fetchError.response?.data?.message || 'Unable to load more products right now.');
    } finally {
      if (queryVersionRef.current === requestVersion) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [filters, loading, loadingMore, meta.currentPage, meta.hasNextPage]);

  useEffect(() => {
    const loaderElement = loaderRef.current;

    if (!loaderElement || loading || !meta.hasNextPage) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          loadMoreProducts();
        }
      },
      { root: null, rootMargin: '900px 0px 700px', threshold: 0 }
    );

    observer.observe(loaderElement);

    return () => observer.disconnect();
  }, [loadMoreProducts, loading, meta.hasNextPage]);

  const updateFilter = (key, value) => {
    setError('');
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setSearchInput('');
    setFilters(INITIAL_FILTERS);
    setError('');
  };

  const openMobileFilters = () => {
    setFilterDraft(filters);
    setMobilePanel('filters');
  };

  const updateFilterDraft = (key, value) => {
    setFilterDraft((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  };

  const resetMobileFilterDraft = () => {
    setFilterDraft((currentFilters) => ({
      ...currentFilters,
      ...Object.fromEntries(MOBILE_FILTER_KEYS.map((key) => [key, ''])),
    }));
  };

  const applyMobileFilters = () => {
    setError('');
    setFilters((currentFilters) => ({
      ...currentFilters,
      ...Object.fromEntries(MOBILE_FILTER_KEYS.map((key) => [key, filterDraft[key]])),
    }));
    setMobilePanel(null);
  };

  const applyMobileSort = (value) => {
    updateFilter('sort', value);
    setMobilePanel(null);
  };

  const categoryOptions = [
    { value: '', label: 'All Categories' },
    ...(facets.categories?.length
      ? facets.categories.filter((facet) => facet._id).map((facet) => ({
          value: facet._id,
          label: `${facet._id} (${facet.count})`,
        }))
      : !categoriesLoading
        ? categories.map((category) => ({
            value: category.name,
            label: category.name,
          }))
        : []),
  ];
  const brandOptions = [
    { value: '', label: 'All Brands' },
    ...(facets.brands || []).filter((facet) => facet._id).map((facet) => ({
      value: facet._id,
      label: `${facet._id} (${facet.count})`,
    })),
  ];
  const originOptions = [
    { value: '', label: 'All Origins' },
    ...(facets.origins || []).filter((facet) => facet._id).map((facet) => ({
      value: facet._id,
      label: `${facet._id} (${facet.count})`,
    })),
  ];
  const activeFilterCount = MOBILE_FILTER_KEYS.filter((key) => filters[key] !== '').length;
  const activeSortLabel = PRODUCT_PRICE_SORT_OPTIONS.find(
    (option) => option.value === filters.sort
  )?.label || 'Featured First';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8efe6] pb-8 pt-2 sm:pb-10 sm:pt-3">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-[#ead6c6] to-transparent opacity-70" />
      <div className="pointer-events-none absolute left-0 top-0 h-64 w-64 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-multiply" />

      <div className="relative z-10 container mx-auto max-w-7xl px-3 sm:px-4">
        <div className="rounded-[30px] bg-white p-3 shadow-[0_20px_60px_rgba(53,26,17,0.08)] sm:p-6">
          <div className="lg:hidden">
            <div className="grid grid-cols-3 gap-2" aria-label="Product controls">
              <button
                type="button"
                onClick={() => setMobileSearchOpen((isOpen) => !isOpen)}
                aria-expanded={mobileSearchOpen}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 text-xs font-bold uppercase tracking-[0.08em] transition-colors ${
                  mobileSearchOpen || filters.keyword
                    ? 'border-brand-primary bg-brand-primary text-white'
                    : 'border-[#e4cdbc] bg-[#fffaf4] text-brand-dark'
                }`}
              >
                <Search size={16} /> Search
              </button>
              <button
                type="button"
                onClick={openMobileFilters}
                aria-haspopup="dialog"
                className={`relative inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 text-xs font-bold uppercase tracking-[0.08em] transition-colors ${
                  activeFilterCount > 0
                    ? 'border-brand-primary bg-brand-primary text-white'
                    : 'border-[#e4cdbc] bg-[#fffaf4] text-brand-dark'
                }`}
              >
                <SlidersHorizontal size={16} /> Filter
                {activeFilterCount > 0 ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] text-brand-primary">
                    {activeFilterCount}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => setMobilePanel('sort')}
                aria-haspopup="dialog"
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-2 text-xs font-bold uppercase tracking-[0.08em] transition-colors ${
                  filters.sort
                    ? 'border-brand-primary bg-brand-primary text-white'
                    : 'border-[#e4cdbc] bg-[#fffaf4] text-brand-dark'
                }`}
              >
                <ArrowUpDown size={16} /> Sort
              </button>
            </div>

            {mobileSearchOpen ? (
              <div className="relative mt-3">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="search"
                  autoFocus
                  placeholder="Search products, brands, origin, or SKU..."
                  className="min-w-0 w-full rounded-xl border border-[#e4cdbc] bg-[#fffaf4] py-3 pl-11 pr-11 text-sm text-brand-dark shadow-sm outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
                {searchInput ? (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    aria-label="Clear product search"
                    className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 hover:bg-[#f0dfd0]"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="mt-3 flex min-h-8 items-center justify-between gap-3 px-1 text-xs text-gray-500">
              <span>{meta.totalProducts} products</span>
              <span className="min-w-0 truncate text-right">{activeSortLabel}</span>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Search Products
                </span>
                <Search className="pointer-events-none absolute left-4 top-[3.2rem] -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search products, brands, origin, or SKU..."
                  className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] py-3 pl-12 pr-4 text-gray-600 shadow-sm outline-none transition focus:border-brand-accent"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
              </div>

              <div className="rounded-full bg-brand-light px-4 py-3 text-sm font-semibold text-brand-dark">
                {meta.totalProducts} products found
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1fr_0.9fr_0.9fr_0.8fr_auto]">
            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                Category
              </span>
              <CustomSelect
                value={filters.category}
                onChange={(nextValue) => updateFilter('category', nextValue)}
                options={categoryOptions}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Min Price
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.minPrice}
                  onChange={(event) => updateFilter('minPrice', event.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Max Price
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={filters.maxPrice}
                  onChange={(event) => updateFilter('maxPrice', event.target.value)}
                  placeholder="50"
                  className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                Brand
              </span>
              <CustomSelect
                value={filters.brand}
                onChange={(nextValue) => updateFilter('brand', nextValue)}
                options={brandOptions}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                Origin
              </span>
              <CustomSelect
                value={filters.origin}
                onChange={(nextValue) => updateFilter('origin', nextValue)}
                options={originOptions}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                Availability
              </span>
              <CustomSelect
                value={filters.stock}
                onChange={(nextValue) => updateFilter('stock', nextValue)}
                options={SHOP_STOCK_FILTER_OPTIONS}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                Minimum Rating
              </span>
              <CustomSelect
                value={filters.rating}
                onChange={(nextValue) => updateFilter('rating', nextValue)}
                options={RATING_OPTIONS}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                Sort
              </span>
              <CustomSelect
                value={filters.sort}
                onChange={(nextValue) => updateFilter('sort', nextValue)}
                options={PRODUCT_PRICE_SORT_OPTIONS}
                leftIcon={<SlidersHorizontal size={18} />}
              />
            </label>

            <button
              type="button"
              onClick={resetFilters}
              className="mt-auto inline-flex items-center justify-center rounded-xl border border-brand-primary/20 px-4 py-3 text-sm font-semibold text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
            >
              <RotateCcw size={16} className="mr-2" /> Reset
            </button>
            </div>
          </div>

          {error ? (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-red-700">
              {error}
            </div>
          ) : loading ? (
            <div className="product-grid mt-0 md:mt-10">
              {[...Array(PRODUCT_PAGE_SIZE)].map((_, index) => (
                <div key={index} className="min-h-[330px] animate-pulse rounded-2xl bg-[#f8efe6] sm:min-h-[430px]" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="mt-0 md:mt-10 rounded-3xl border border-dashed border-brand-accent/30 bg-[#f8efe6] px-6 py-12 text-center">
              <p className="font-serif text-3xl font-bold text-brand-dark">No products match your filters</p>
              <p className="mt-3 text-sm text-gray-500">
                Try widening your price range, changing categories, or resetting the shop controls.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center rounded-md bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-brand-dark"
                >
                  <RotateCcw size={16} className="mr-2" /> Reset Filters
                </button>
                <Link
                  to="/categories"
                  className="inline-flex items-center rounded-md border border-brand-primary/20 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                >
                  Browse Categories
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div ref={productGridRef} className="product-grid mt-0 md:mt-10">
                {products.map((product, index) => (
                  <div
                    key={product._id}
                    className={`h-full reveal-fade-up ${productsVisible ? 'is-visible' : ''}`}
                    style={{ transitionDelay: `${(index % 8 + 1) * 75}ms` }}
                  >
                    <Product product={product} priority={index < 4} />
                  </div>
                ))}
                {loadingMore
                  ? [...Array(4)].map((_, index) => (
                      <div key={`loading-more-${index}`} className="min-h-[330px] animate-pulse rounded-2xl bg-[#f8efe6] sm:min-h-[430px]" />
                    ))
                  : null}
              </div>

              <div ref={loaderRef} className="h-10" aria-hidden="true" />

              <div className="mt-6 flex flex-col items-center gap-4 border-t border-[#ecd9ca] pt-6 text-center">
                {meta.hasNextPage ? (
                  <>
                    <p className="text-sm text-gray-500">
                      Showing <span className="font-semibold text-brand-dark">{products.length}</span> of{' '}
                      <span className="font-semibold text-brand-dark">{meta.totalProducts}</span> products
                    </p>
                    <button
                      type="button"
                      disabled={loadingMore}
                      onClick={loadMoreProducts}
                      className="rounded-full bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-dark disabled:cursor-wait disabled:opacity-60"
                    >
                      {loadingMore ? 'Loading products...' : 'Load More'}
                    </button>
                  </>
                ) : (
                  <p className="text-sm font-semibold text-gray-500">
                    All <span className="text-brand-dark">{meta.totalProducts}</span> products are loaded.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div ref={featuresRef} className="container mx-auto mt-20 max-w-6xl px-4">
        <div className="grid gap-6 border-t border-gray-300/50 pt-10 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['100% Pure & Natural', 'No fillers, no compromise.'],
            ['Ethically Sourced', 'Relationships built directly with growers.'],
            ['Securely Packed', 'Protective, category-appropriate packaging on every order.'],
            ['Fast Delivery', 'Premium products shipped with care worldwide.'],
          ].map(([title, subtitle], idx) => (
            <div
              key={title}
              className={`flex items-start gap-4 rounded-[24px] bg-white/70 p-5 shadow-sm reveal-fade-up ${
                featuresVisible ? 'is-visible' : ''
              }`}
              style={{ transitionDelay: `${idx * 80}ms` }}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-accent/30 bg-[#f5e7da]">
                <BadgeCheck className="text-brand-primary" size={20} />
              </div>
              <div>
                <h4 className="mb-1 text-sm font-bold text-[#2a140e]">{title}</h4>
                <p className="text-xs leading-6 text-gray-500">{subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {mobilePanel ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            aria-label="Close product controls"
            onClick={() => setMobilePanel(null)}
            className="mobile-sheet-backdrop absolute inset-0 bg-[#1f0f0a]/55 backdrop-blur-[2px]"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-product-panel-title"
            className={`mobile-product-sheet absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-[28px] bg-white shadow-[0_-24px_60px_rgba(42,20,14,0.28)] ${
              mobilePanel === 'sort' ? 'max-h-[70dvh]' : ''
            }`}
          >
            <div className="flex justify-center pb-1 pt-3" aria-hidden="true">
              <span className="h-1 w-12 rounded-full bg-[#d9c4b5]" />
            </div>

            <div className="flex items-center justify-between border-b border-[#edddd1] px-5 py-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-accent">
                  Shop Controls
                </p>
                <h2 id="mobile-product-panel-title" className="mt-1 font-serif text-2xl font-bold text-brand-dark">
                  {mobilePanel === 'filters' ? 'Filter products' : 'Sort products'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setMobilePanel(null)}
                aria-label="Close product controls"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#ead6c6] text-brand-dark transition-colors hover:bg-[#f8efe6]"
              >
                <X size={20} />
              </button>
            </div>

            {mobilePanel === 'filters' ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
                  <div className="grid min-w-0 gap-5">
                    <label className="block min-w-0">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Category</span>
                      <CustomSelect
                        value={filterDraft.category}
                        onChange={(nextValue) => updateFilterDraft('category', nextValue)}
                        options={categoryOptions}
                      />
                    </label>

                    <label className="block min-w-0">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Brand</span>
                      <CustomSelect
                        value={filterDraft.brand}
                        onChange={(nextValue) => updateFilterDraft('brand', nextValue)}
                        options={brandOptions}
                      />
                    </label>

                    <label className="block min-w-0">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Origin</span>
                      <CustomSelect
                        value={filterDraft.origin}
                        onChange={(nextValue) => updateFilterDraft('origin', nextValue)}
                        options={originOptions}
                      />
                    </label>

                    <div className="grid min-w-0 grid-cols-2 gap-3">
                      <label className="block min-w-0">
                        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Min Price</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={filterDraft.minPrice}
                          onChange={(event) => updateFilterDraft('minPrice', event.target.value)}
                          placeholder="0"
                          className="min-w-0 w-full rounded-xl border border-[#dfc3ae] bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
                        />
                      </label>
                      <label className="block min-w-0">
                        <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Max Price</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={filterDraft.maxPrice}
                          onChange={(event) => updateFilterDraft('maxPrice', event.target.value)}
                          placeholder="Any"
                          className="min-w-0 w-full rounded-xl border border-[#dfc3ae] bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
                        />
                      </label>
                    </div>

                    <label className="block min-w-0">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Availability</span>
                      <CustomSelect
                        value={filterDraft.stock}
                        onChange={(nextValue) => updateFilterDraft('stock', nextValue)}
                        options={SHOP_STOCK_FILTER_OPTIONS}
                      />
                    </label>

                    <label className="block min-w-0">
                      <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-gray-500">Minimum Rating</span>
                      <CustomSelect
                        value={filterDraft.rating}
                        onChange={(nextValue) => updateFilterDraft('rating', nextValue)}
                        options={RATING_OPTIONS}
                        listClassName="bottom-full mb-2 mt-0"
                      />
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-[0.85fr_1.4fr] gap-3 border-t border-[#edddd1] bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
                  <button
                    type="button"
                    onClick={resetMobileFilterDraft}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl border border-brand-primary/20 px-3 text-sm font-bold text-brand-primary transition-colors hover:bg-[#f8efe6]"
                  >
                    <RotateCcw size={16} className="mr-2" /> Reset
                  </button>
                  <button
                    type="button"
                    onClick={applyMobileFilters}
                    className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-primary px-4 text-sm font-bold text-white transition-colors hover:bg-brand-dark"
                  >
                    Apply Filters
                  </button>
                </div>
              </>
            ) : (
              <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
                {PRODUCT_PRICE_SORT_OPTIONS.map((option) => {
                  const isSelected = option.value === filters.sort;

                  return (
                    <button
                      key={option.value || 'featured'}
                      type="button"
                      onClick={() => applyMobileSort(option.value)}
                      className={`flex min-h-14 w-full items-center justify-between border-b border-[#f0e3d9] px-1 text-left text-sm font-semibold transition-colors ${
                        isSelected ? 'text-brand-primary' : 'text-brand-dark hover:text-brand-primary'
                      }`}
                    >
                      <span>{option.label}</span>
                      {isSelected ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-primary text-white">
                          <Check size={16} />
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
};

export default ProductsPage;
