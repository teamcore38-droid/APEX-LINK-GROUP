import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
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
import {
  applySeo,
  buildBreadcrumbStructuredData,
  buildCategoryItemListStructuredData,
  buildCategoryStructuredData,
} from '../utils/seo';
import { buildCanonicalUrl } from '../utils/seoConfig';
import { getCategories } from '../utils/categoryApi';
import {
  createEmptyFacets,
  getCategoryBootstrapState,
} from '../utils/categoryHydration';
import useScrollReveal from '../hooks/useScrollReveal';
import { preloadProductGridImages } from '../utils/imagePreloader';

const createCategoryFilters = (categoryName = '') => ({
  keyword: '',
  category: categoryName,
  minPrice: '',
  maxPrice: '',
  stock: '',
  brand: '',
  origin: '',
  rating: '',
  sort: '',
});

const MOBILE_FILTER_KEYS = [
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

const getCategoryId = (category) => String(category?._id || '');
const getParentCategoryId = (category) =>
  String(category?.parentCategory?._id || category?.parentCategory || '');
const getPrerenderedCategoryData = (slug) => {
  if (typeof window === 'undefined') return null;

  const payload = window.__APEX_CATEGORY_PRERENDER__;
  return payload?.slug === slug ? payload : null;
};

const CategoryPage = () => {
  const { slug } = useParams();
  const prerenderedData = getPrerenderedCategoryData(slug);
  const bootstrapState = getCategoryBootstrapState(prerenderedData);

  const [category, setCategory] = useState(() => bootstrapState.category);
  const [categorySeo, setCategorySeo] = useState(() => bootstrapState.seo);
  const [allCategories, setAllCategories] = useState([]);
  const [products, setProducts] = useState(() => bootstrapState.products);
  const [loadingCategory, setLoadingCategory] = useState(() => !bootstrapState.hasCategory);
  const [loadingProducts, setLoadingProducts] = useState(() => !bootstrapState.hasProductPayload);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [categoryNotFound, setCategoryNotFound] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState(() => createCategoryFilters(bootstrapState.category?.name));
  const [mobilePanel, setMobilePanel] = useState(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState(() => createCategoryFilters(bootstrapState.category?.name));
  const [meta, setMeta] = useState(() => bootstrapState.meta);
  const [facets, setFacets] = useState(() => bootstrapState.facets);
  const [productGridRef, productsVisible] = useScrollReveal();
  const loaderRef = useRef(null);
  const queryVersionRef = useRef(0);
  const categoryRequestVersionRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const initialBootstrapStateRef = useRef(bootstrapState);
  const resolvedCategorySlugRef = useRef(bootstrapState.hasCategory ? bootstrapState.slug : '');
  const prerenderedSlugRef = useRef(bootstrapState.slug);
  const preservePrerenderedProductsRef = useRef(bootstrapState.hasProductPayload);
  const categorySeoRef = useRef(bootstrapState.seo);

  const applyCategorySeo = useCallback((data, seoData = null, itemListProducts = []) => {
    const canonicalUrl = buildCanonicalUrl(`/category/${data.slug}`);
    const itemList =
      itemListProducts.length > 0
        ? buildCategoryItemListStructuredData(data, itemListProducts, canonicalUrl)
        : seoData?.itemList;

    applySeo({
      title: seoData?.title || data.seo?.title || `${data.name} Online in Sri Lanka`,
      description: seoData?.description || data.seo?.description || data.description,
      keywords: seoData?.keywords || data.seo?.keywords || [data.name, 'Apex Fashion'],
      canonicalUrl,
      ogImage: seoData?.ogImage || data.seo?.ogImage || data.image,
      type: 'website',
      structuredData: [
        seoData?.structuredData || buildCategoryStructuredData(data, canonicalUrl),
        seoData?.breadcrumbs ||
          buildBreadcrumbStructuredData([
            { name: 'Home', url: '/' },
            { name: 'Categories', url: '/categories' },
            { name: data.name, url: canonicalUrl },
          ]),
        itemList,
      ].filter(Boolean),
    });
  }, []);

  const getRelatedCategories = () => {
    if (categorySeo?.relatedCategories?.length > 0) {
      return categorySeo.relatedCategories.slice(0, 8);
    }

    if (!category || allCategories.length === 0) {
      return [];
    }

    const categoryId = getCategoryId(category);
    const parentId = getParentCategoryId(category);
    const children = allCategories.filter((item) => getParentCategoryId(item) === categoryId);
    const siblings = parentId
      ? allCategories.filter((item) => getParentCategoryId(item) === parentId && getCategoryId(item) !== categoryId)
      : [];

    return [...children, ...siblings]
      .filter((item, index, items) => items.findIndex((candidate) => candidate.slug === item.slug) === index)
      .slice(0, 8);
  };
  const relatedCategories = getRelatedCategories();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setFilters((currentFilters) => {
        const keyword = searchInput.trim();
        const categoryName = category?.name || currentFilters.category;

        if (currentFilters.keyword === keyword && currentFilters.category === categoryName) {
          return currentFilters;
        }

        preservePrerenderedProductsRef.current = false;
        return {
          ...currentFilters,
          keyword,
          category: categoryName,
        };
      });
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [category?.name, searchInput]);

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
    const initialBootstrapState = initialBootstrapStateRef.current;

    if (
      initialBootstrapState.hasCategory &&
      resolvedCategorySlugRef.current === slug
    ) {
      setLoadingCategory(false);
      setError('');
      setCategoryNotFound(false);
      applyCategorySeo(
        initialBootstrapState.category,
        initialBootstrapState.seo,
        initialBootstrapState.products
      );
      return undefined;
    }

    preservePrerenderedProductsRef.current = false;
    const requestVersion = categoryRequestVersionRef.current + 1;
    categoryRequestVersionRef.current = requestVersion;
    const controller = new AbortController();

    const fetchCategory = async () => {
      setLoadingCategory(true);
      setLoadingProducts(true);
      setError('');
      setCategoryNotFound(false);

      try {
        const { data } = await axios.get(`/api/categories/${slug}`, {
          signal: controller.signal,
        });

        if (categoryRequestVersionRef.current !== requestVersion) {
          return;
        }

        resolvedCategorySlugRef.current = data.slug;
        categorySeoRef.current = null;
        setCategory(data);
        setCategorySeo(null);
        setSearchInput('');
        setFilters(createCategoryFilters(data.name));
        setFilterDraft(createCategoryFilters(data.name));
        applyCategorySeo(data);
        setLoadingCategory(false);

        const [seoResult, categoriesResult] = await Promise.allSettled([
          axios.get(`/api/seo/category/${data.slug}`, {
            signal: controller.signal,
          }),
          getCategories(),
        ]);

        if (categoryRequestVersionRef.current !== requestVersion) {
          return;
        }

        const seoData = seoResult.status === 'fulfilled' ? seoResult.value.data : null;
        categorySeoRef.current = seoData;
        setCategorySeo(seoData);
        if (categoriesResult.status === 'fulfilled') {
          setAllCategories(categoriesResult.value);
        }
        applyCategorySeo(data, seoData);
      } catch (fetchError) {
        if (fetchError.name === 'CanceledError' || fetchError.code === 'ERR_CANCELED') {
          return;
        }

        if (categoryRequestVersionRef.current !== requestVersion) {
          return;
        }

        console.error(fetchError);
        const isNotFound = fetchError.response?.status === 404;
        setCategoryNotFound(isNotFound);
        setLoadingProducts(false);
        setError(
          isNotFound
            ? 'This category no longer exists.'
            : fetchError.response?.data?.message || 'Unable to load this category right now.'
        );
      } finally {
        if (categoryRequestVersionRef.current === requestVersion) {
          setLoadingCategory(false);
        }
      }
    };

    fetchCategory();

    return () => {
      controller.abort();
    };
  }, [applyCategorySeo, slug]);

  useEffect(() => {
    if (!category?.name || category.slug !== slug) {
      return;
    }

    if (
      preservePrerenderedProductsRef.current &&
      prerenderedSlugRef.current === slug
    ) {
      setLoadingProducts(false);
      setError('');
      return;
    }

    preservePrerenderedProductsRef.current = false;
    const requestVersion = queryVersionRef.current + 1;
    queryVersionRef.current = requestVersion;
    const controller = new AbortController();

    const fetchProducts = async () => {
      setLoadingProducts(true);
      setLoadingMore(false);
      loadingMoreRef.current = false;
      setError('');

      try {
        const { data } = await axios.get('/api/customer/search', {
          params: {
            ...filters,
            category: category.name,
            page: 1,
            limit: PRODUCT_PAGE_SIZE,
          },
          signal: controller.signal,
        });

        if (queryVersionRef.current !== requestVersion) {
          return;
        }

        const payload = normalizeProductPayload(data);

        if (queryVersionRef.current !== requestVersion) {
          return;
        }

        void preloadProductGridImages(payload.products, 4);
        setProducts(payload.products);
        applyCategorySeo(category, categorySeoRef.current, payload.products);
        setFacets(data.facets || createEmptyFacets());
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

        if (queryVersionRef.current !== requestVersion) {
          return;
        }

        console.error(fetchError);
        setError(fetchError.response?.data?.message || 'Unable to load category products right now.');
      } finally {
        if (queryVersionRef.current === requestVersion) {
          setLoadingProducts(false);
        }
      }
    };

    fetchProducts();

    return () => {
      controller.abort();
    };
  }, [applyCategorySeo, category, filters, slug]);

  const loadMoreProducts = useCallback(async () => {
    if (
      loadingProducts ||
      loadingMore ||
      loadingMoreRef.current ||
      !meta.hasNextPage ||
      !category?.name
    ) {
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
          category: category.name,
          page: nextPage,
          limit: PRODUCT_PAGE_SIZE,
        },
      });

      if (queryVersionRef.current !== requestVersion) {
        return;
      }

      const payload = normalizeProductPayload(data);

      if (queryVersionRef.current !== requestVersion) {
        return;
      }

      void preloadProductGridImages(payload.products, 4);
      const seenProductIds = new Set(products.map((product) => product._id));
      const nextProducts = payload.products.filter((product) => !seenProductIds.has(product._id));
      const combinedProducts = [...products, ...nextProducts];

      setProducts(combinedProducts);
      applyCategorySeo(category, categorySeo, combinedProducts);
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
      setError(fetchError.response?.data?.message || 'Unable to load more category products right now.');
    } finally {
      if (queryVersionRef.current === requestVersion) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [
    applyCategorySeo,
    category,
    categorySeo,
    filters,
    loadingMore,
    loadingProducts,
    meta.currentPage,
    meta.hasNextPage,
    products,
  ]);

  useEffect(() => {
    const loaderElement = loaderRef.current;

    if (!loaderElement || loadingProducts || !meta.hasNextPage) {
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
  }, [loadMoreProducts, loadingProducts, meta.hasNextPage]);

  const updateFilter = (key, value) => {
    preservePrerenderedProductsRef.current = false;
    setError('');
    setFilters((currentFilters) => ({
      ...currentFilters,
      category: category?.name || currentFilters.category,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    const nextFilters = createCategoryFilters(category?.name || '');
    preservePrerenderedProductsRef.current = false;
    setSearchInput('');
    setFilters(nextFilters);
    setFilterDraft(nextFilters);
    setError('');
  };

  const openMobileFilters = () => {
    setFilterDraft({
      ...filters,
      category: category?.name || filters.category,
    });
    setMobilePanel('filters');
  };

  const updateFilterDraft = (key, value) => {
    setFilterDraft((currentFilters) => ({
      ...currentFilters,
      category: category?.name || currentFilters.category,
      [key]: value,
    }));
  };

  const resetMobileFilterDraft = () => {
    setFilterDraft((currentFilters) => ({
      ...currentFilters,
      ...Object.fromEntries(MOBILE_FILTER_KEYS.map((key) => [key, ''])),
      category: category?.name || currentFilters.category,
    }));
  };

  const applyMobileFilters = () => {
    preservePrerenderedProductsRef.current = false;
    setError('');
    setFilters((currentFilters) => ({
      ...currentFilters,
      ...Object.fromEntries(MOBILE_FILTER_KEYS.map((key) => [key, filterDraft[key]])),
      category: category?.name || currentFilters.category,
    }));
    setMobilePanel(null);
  };

  const applyMobileSort = (value) => {
    updateFilter('sort', value);
    setMobilePanel(null);
  };

  const categoryOptions = [
    {
      value: category?.name || filters.category,
      label: category?.name || 'Current Category',
    },
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
  const isRefreshingProductGrid = (loadingCategory || loadingProducts) && products.length > 0;

  if (loadingCategory && !category) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-[#f8efe6]">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-brand-accent"></div>
        <p className="mt-4 font-serif text-lg text-brand-dark">Loading category details...</p>
      </div>
    );
  }

  if (error && !category) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16">
        <div className="rounded-3xl border border-red-200 bg-white px-6 py-12 text-center shadow-sm">
          <p className="font-serif text-3xl font-bold text-brand-dark">
            {categoryNotFound ? 'Category not found' : 'Unable to load this category'}
          </p>
          <p className="mt-3 text-sm text-red-700">{error}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/categories"
              className="inline-flex items-center rounded-md bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-brand-dark"
            >
              <ArrowLeft size={16} className="mr-2" /> Back to Categories
            </Link>
            <Link
              to="/products"
              className="inline-flex items-center rounded-md border border-brand-primary/20 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
            >
              View All Products
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8efe6] pb-16">
      <div className="container mx-auto max-w-7xl px-4 pt-4 md:pt-6">
        <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(53, 26, 17,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Category Collection</p>
              <h2 className="mt-2 font-serif text-2xl font-bold text-brand-dark">Discover products in {category?.name}</h2>
            </div>

            <div className="hidden rounded-full bg-brand-light px-4 py-3 text-sm font-semibold text-brand-dark lg:block">
              {meta.totalProducts} products found
            </div>
          </div>

          <div className="mt-5 lg:hidden">
            <div className="grid grid-cols-3 gap-2" aria-label="Category product controls">
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
                  placeholder={`Search ${category?.name?.toLowerCase() || 'products'}...`}
                  className="min-w-0 w-full rounded-xl border border-[#e4cdbc] bg-[#fffaf4] py-3 pl-11 pr-11 text-sm text-brand-dark shadow-sm outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/20"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
                {searchInput ? (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    aria-label="Clear category search"
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

          <div className="mt-6 hidden lg:block">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="relative w-full lg:max-w-md">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Search Products
                </span>
                <Search className="pointer-events-none absolute left-4 top-[3.2rem] -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder={`Search ${category?.name?.toLowerCase() || 'products'}...`}
                  className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] py-3 pl-12 pr-4 text-gray-600 shadow-sm outline-none transition focus:border-brand-accent"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                />
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_1fr_0.9fr_0.9fr_0.8fr_auto]">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Category
                </span>
                <CustomSelect
                  value={category?.name || filters.category}
                  onChange={() => {}}
                  options={categoryOptions}
                  disabled
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
                    placeholder="Any"
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

          {error && category && (
            <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          {relatedCategories.length > 0 && (
            <nav aria-label="Related categories" className="mt-6 border-y border-[#ecd9ca] py-4">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">Related Categories</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {relatedCategories.map((relatedCategory) => (
                  <Link
                    key={relatedCategory.slug}
                    to={`/category/${relatedCategory.slug}`}
                    className="rounded-full border border-brand-primary/20 bg-[#fff7ee] px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
                  >
                    {relatedCategory.name}
                  </Link>
                ))}
              </div>
            </nav>
          )}

          <div className="relative mt-8" aria-busy={loadingCategory || loadingProducts}>
            {!error && (
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-brand-dark">{meta.totalProducts}</span> products in{' '}
                  <span className="font-semibold text-brand-dark">{category?.name}</span>
                </p>
                <Link
                  to="/products"
                  className="inline-flex items-center rounded-full border border-brand-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                >
                  View All Products <ArrowRight size={14} className="ml-2" />
                </Link>
              </div>
            )}

            {isRefreshingProductGrid ? (
              <div
                role="status"
                aria-live="polite"
                className="mb-4 flex items-center justify-center gap-2 text-sm font-medium text-brand-primary"
              >
                <span
                  className="h-4 w-4 animate-spin rounded-full border-2 border-brand-accent/30 border-t-brand-accent"
                  aria-hidden="true"
                />
                Updating products...
              </div>
            ) : null}

            {loadingProducts && products.length === 0 ? (
              <div className="product-grid">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="h-[420px] animate-pulse rounded-[28px] bg-[#f8efe6]" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-brand-accent/30 bg-[#f8efe6] px-6 py-14 text-center">
                <p className="font-serif text-2xl font-bold text-brand-dark">No products found in this category</p>
                <p className="mt-2 text-sm text-gray-500">
                  Try adjusting your search or continue browsing the full collection.
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
                    to="/products"
                    className="inline-flex items-center rounded-md border border-brand-primary/20 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                  >
                    View All Products <ArrowRight size={16} className="ml-2" />
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div ref={productGridRef} className="product-grid">
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
                        <div
                          key={`loading-more-${index}`}
                          className="h-[420px] animate-pulse rounded-[28px] bg-[#f8efe6]"
                        />
                      ))
                    : null}
                </div>

                <div ref={loaderRef} className="h-10" aria-hidden="true" />

                <div className="mt-6 flex flex-col items-center gap-3 border-t border-[#ecd9ca] pt-6 text-center">
                  {meta.hasNextPage ? (
                    <p className="text-sm text-gray-500">
                      Showing <span className="font-semibold text-brand-dark">{products.length}</span> of{' '}
                      <span className="font-semibold text-brand-dark">{meta.totalProducts}</span> products
                      {loadingMore ? ' - loading more...' : ''}
                    </p>
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
      </div>

      {mobilePanel ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            aria-label="Close category product controls"
            onClick={() => setMobilePanel(null)}
            className="mobile-sheet-backdrop absolute inset-0 bg-[#1f0f0a]/55 backdrop-blur-[2px]"
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-category-panel-title"
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
                  Category Controls
                </p>
                <h2 id="mobile-category-panel-title" className="mt-1 font-serif text-2xl font-bold text-brand-dark">
                  {mobilePanel === 'filters' ? 'Filter products' : 'Sort products'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setMobilePanel(null)}
                aria-label="Close category product controls"
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
                        value={category?.name || filterDraft.category}
                        onChange={() => {}}
                        options={categoryOptions}
                        disabled
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

export default CategoryPage;
