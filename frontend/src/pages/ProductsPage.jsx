import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { BadgeCheck, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import Product from '../components/Product';
import CustomSelect from '../components/CustomSelect';
import {
  PRODUCT_PAGE_SIZE,
  PRODUCT_PRICE_SORT_OPTIONS,
  SHOP_STOCK_FILTER_OPTIONS,
  normalizeProductPayload,
} from '../utils/productUi';
import { applySeo } from '../utils/seo';

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

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [facets, setFacets] = useState({ categories: [], brands: [], origins: [], availability: [], priceRange: {} });

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
      setPage(1);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

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
        const { data } = await axios.get('/api/categories');
        setCategories(data);
      } catch (fetchError) {
        console.error(fetchError);
      } finally {
        setCategoriesLoading(false);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError('');

      try {
        const { data } = await axios.get('/api/customer/search', {
          params: {
            ...filters,
            page,
            limit: PRODUCT_PAGE_SIZE,
          },
        });

        const payload = normalizeProductPayload(data);
        setProducts(payload.products);
        setFacets(data.facets || { categories: [], brands: [], origins: [], availability: [], priceRange: {} });
        setMeta({
          currentPage: payload.currentPage,
          totalPages: payload.totalPages,
          totalProducts: payload.totalProducts,
          hasNextPage: payload.hasNextPage,
          hasPrevPage: payload.hasPrevPage,
        });

        if (payload.currentPage !== page) {
          setPage(payload.currentPage);
        }
      } catch (fetchError) {
        console.error(fetchError);
        setError(fetchError.response?.data?.message || 'Unable to load products right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [filters, page]);

  const updateFilter = (key, value) => {
    setError('');
    setPage(1);
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setSearchInput('');
    setFilters(INITIAL_FILTERS);
    setPage(1);
    setError('');
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f4f7fb] py-16">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-[#e2e9f3] to-transparent opacity-70" />
      <div className="pointer-events-none absolute left-0 top-0 h-64 w-64 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-multiply" />

      <div className="relative z-10 container mx-auto max-w-7xl px-4">
        <div className="rounded-[36px] bg-[#0d2340] px-6 py-14 text-center text-white shadow-[0_24px_60px_rgba(11,31,58,0.25)] sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-accent">The Global Product Library</p>
          <h1 className="mt-4 font-serif text-4xl font-bold text-[#f5f8fc] [text-shadow:0_4px_24px_rgba(0,0,0,0.35)] sm:text-6xl">
            Shop our curated collection
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-sm leading-7 text-[#edf1f8] sm:text-base">
            Explore premium products across textiles, food, technology, industrial equipment, and more — with refined filtering built for real shopping.
          </p>
        </div>

        <div className="mt-10 rounded-[30px] bg-white p-6 shadow-[0_20px_60px_rgba(11,31,58,0.08)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                Search Products
              </span>
              <Search className="pointer-events-none absolute left-4 top-[3.2rem] -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search products, brands, origin, or SKU..."
                className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] py-3 pl-12 pr-4 text-gray-600 shadow-sm outline-none transition focus:border-brand-accent"
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
                  className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
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
                  className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
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
                options={[
                  { value: '', label: 'Any Rating' },
                  { value: '4', label: '4+ Stars' },
                  { value: '3', label: '3+ Stars' },
                ]}
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

          {error ? (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-red-700">
              {error}
            </div>
          ) : loading ? (
            <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[...Array(PRODUCT_PAGE_SIZE)].map((_, index) => (
                <div key={index} className="h-[470px] animate-pulse rounded-[28px] bg-[#f4f7fb]" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-dashed border-brand-accent/30 bg-[#f4f7fb] px-6 py-12 text-center">
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
              <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => (
                  <Product key={product._id} product={product} />
                ))}
              </div>

              <div className="mt-10 flex flex-col gap-4 border-t border-[#e1e8f2] pt-6 sm:flex-row sm:items-center sm:justify-between">
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

      <div className="container mx-auto mt-20 max-w-6xl px-4">
        <div className="grid gap-6 border-t border-gray-300/50 pt-10 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['100% Pure & Natural', 'No fillers, no compromise.'],
            ['Ethically Sourced', 'Relationships built directly with growers.'],
            ['Securely Packed', 'Protective, category-appropriate packaging on every order.'],
            ['Fast Delivery', 'Premium products shipped with care worldwide.'],
          ].map(([title, subtitle]) => (
            <div key={title} className="flex items-start gap-4 rounded-[24px] bg-white/70 p-5 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-accent/30 bg-[#edf1f8]">
                <BadgeCheck className="text-brand-primary" size={20} />
              </div>
              <div>
                <h4 className="mb-1 text-sm font-bold text-[#081729]">{title}</h4>
                <p className="text-xs leading-6 text-gray-500">{subtitle}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
