import { useEffect, useState } from 'react';
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
  NOINDEX_ROBOTS,
  applySeo,
  buildBreadcrumbStructuredData,
  buildCategoryStructuredData,
} from '../utils/seo';
import { buildCanonicalUrl } from '../utils/seoConfig';
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

const CategoryPage = () => {
  const { slug } = useParams();

  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState(() => createCategoryFilters(''));
  const [mobilePanel, setMobilePanel] = useState(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [filterDraft, setFilterDraft] = useState(() => createCategoryFilters(''));
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [facets, setFacets] = useState({ categories: [], brands: [], origins: [], availability: [], priceRange: {} });
  const [productGridRef, productsVisible] = useScrollReveal();

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1);
      setFilters((currentFilters) => ({
        ...currentFilters,
        keyword: searchInput.trim(),
        category: category?.name || currentFilters.category,
      }));
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
    const fetchCategory = async () => {
      setLoadingCategory(true);
      setError('');

      try {
        const { data } = await axios.get(`/api/categories/${slug}`);
        setCategory(data);
        const seoResponse = await axios.get(`/api/seo/category/${data.slug}`).catch(() => null);
        const canonicalUrl = buildCanonicalUrl(`/category/${data.slug}`);
        applySeo({
          title: seoResponse?.data?.title || data.seo?.title || data.name,
          description: seoResponse?.data?.description || data.seo?.description || data.description,
          keywords: seoResponse?.data?.keywords || data.seo?.keywords || [data.name, 'Apex Fashion'],
          canonicalUrl,
          ogImage: seoResponse?.data?.ogImage || data.seo?.ogImage || data.image,
          type: 'website',
          structuredData: [
            seoResponse?.data?.structuredData || buildCategoryStructuredData(data, canonicalUrl),
            seoResponse?.data?.breadcrumbs ||
              buildBreadcrumbStructuredData([
                { name: 'Home', url: '/' },
                { name: 'Categories', url: '/categories' },
                { name: data.name, url: canonicalUrl },
              ]),
          ],
        });
        setSearchInput('');
        setFilters(createCategoryFilters(data.name));
        setFilterDraft(createCategoryFilters(data.name));
        setPage(1);
      } catch (fetchError) {
        console.error(fetchError);
        setError(fetchError.response?.data?.message || 'Unable to load this category right now.');
        applySeo({
          title: 'Category Not Found',
          description: 'This Apex Fashion category is unavailable or could not be found.',
          canonicalUrl: buildCanonicalUrl(`/category/${slug}`),
          robots: NOINDEX_ROBOTS,
        });
      } finally {
        setLoadingCategory(false);
      }
    };

    fetchCategory();
  }, [slug]);

  useEffect(() => {
    if (!category?.name) {
      return;
    }

    const fetchProducts = async () => {
      setLoadingProducts(true);
      setError('');

      try {
        const { data } = await axios.get('/api/customer/search', {
          params: {
            ...filters,
            category: category.name,
            page,
            limit: PRODUCT_PAGE_SIZE,
          },
        });

        const payload = normalizeProductPayload(data);
        await preloadProductGridImages(payload.products);

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
        console.error(fetchError);
        setError(fetchError.response?.data?.message || 'Unable to load category products right now.');
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [category?.name, filters, page]);

  const updateFilter = (key, value) => {
    setError('');
    setPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      category: category?.name || currentFilters.category,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    const nextFilters = createCategoryFilters(category?.name || '');
    setSearchInput('');
    setFilters(nextFilters);
    setFilterDraft(nextFilters);
    setPage(1);
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
    setError('');
    setPage(1);
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

  if (loadingCategory) {
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
          <p className="font-serif text-3xl font-bold text-brand-dark">Category unavailable</p>
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

          <div className="mt-8">
            {!loadingProducts && !error && (
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

            {loadingProducts ? (
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
                </div>

                <div className="mt-8 flex flex-col gap-4 border-t border-[#ecd9ca] pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-gray-500">
                    Page <span className="font-semibold text-brand-dark">{meta.currentPage}</span> of{' '}
                    <span className="font-semibold text-brand-dark">{meta.totalPages}</span>
                  </p>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      disabled={!meta.hasPrevPage}
                      onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
                      className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-brand-dark transition-colors duration-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={!meta.hasNextPage}
                      onClick={() => setPage((currentPage) => currentPage + 1)}
                      className="rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next Page
                    </button>
                  </div>
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
