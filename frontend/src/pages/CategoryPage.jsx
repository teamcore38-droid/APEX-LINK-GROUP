import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ArrowRight, Search, SlidersHorizontal } from 'lucide-react';
import Product from '../components/Product';
import CustomSelect from '../components/CustomSelect';
import { getCategoryImage } from '../utils/categoryUi';
import {
  PRODUCT_PAGE_SIZE,
  PRODUCT_PRICE_SORT_OPTIONS,
  normalizeProductPayload,
} from '../utils/productUi';
import { applySeo, buildCategoryStructuredData } from '../utils/seo';

const CategoryPage = () => {
  const { slug } = useParams();

  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingCategory, setLoadingCategory] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [sort, setSort] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    currentPage: 1,
    totalPages: 1,
    totalProducts: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setKeyword(searchInput.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    const fetchCategory = async () => {
      setLoadingCategory(true);
      setError('');

      try {
        const { data } = await axios.get(`/api/categories/${slug}`);
        setCategory(data);
        const seoResponse = await axios.get(`/api/seo/category/${data.slug}`).catch(() => null);
        applySeo({
          title: seoResponse?.data?.title || data.seo?.title || data.name,
          description: seoResponse?.data?.description || data.seo?.description || data.description,
          keywords: seoResponse?.data?.keywords || data.seo?.keywords || [data.name, 'Apex Link Group'],
          canonicalUrl: seoResponse?.data?.canonicalUrl || window.location.href,
          ogImage: seoResponse?.data?.ogImage || data.seo?.ogImage || data.image,
          type: 'website',
          structuredData: seoResponse?.data?.structuredData || buildCategoryStructuredData(data),
        });
        setSearchInput('');
        setKeyword('');
        setSort('');
        setPage(1);
      } catch (fetchError) {
        console.error(fetchError);
        setError(fetchError.response?.data?.message || 'Unable to load this category right now.');
      } finally {
        setLoadingCategory(false);
      }
    };

    fetchCategory();
  }, [slug]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      setError('');

      try {
        const { data } = await axios.get('/api/products', {
          params: {
            category: slug,
            keyword,
            sort,
            page,
            limit: PRODUCT_PAGE_SIZE,
          },
        });

        const payload = normalizeProductPayload(data);
        setProducts(payload.products);
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
  }, [keyword, page, slug, sort]);

  if (loadingCategory) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center bg-[#f4f7fb]">
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
    <div className="min-h-screen bg-[#f4f7fb] pb-16">
      <div className="relative h-[420px] overflow-hidden">
        <img src={getCategoryImage(category)} alt={category?.name} className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/85 via-brand-dark/45 to-brand-dark/25" />
        <div className="container relative z-10 mx-auto flex h-full max-w-7xl items-end px-4 pb-12">
          <div className="max-w-3xl text-white">
            <Link to="/categories" className="inline-flex items-center text-sm font-semibold uppercase tracking-[0.2em] text-white/85 transition-colors duration-200 hover:text-brand-accent">
              <ArrowLeft size={16} className="mr-2" /> All Categories
            </Link>
            <h1 className="mt-5 font-serif text-4xl font-bold sm:text-5xl">{category?.name}</h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
              {category?.description || 'Explore the full collection of premium products in this category.'}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 pt-10">
        <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Category Collection</p>
              <h2 className="mt-2 font-serif text-2xl font-bold text-brand-dark">Discover products in {category?.name}</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_260px] lg:w-[620px]">
              <label className="relative block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Search Within Category
                </span>
                <Search size={16} className="pointer-events-none absolute left-4 top-[3.2rem] -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder={`Search ${category?.name?.toLowerCase() || 'products'}...`}
                  className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] py-3 pl-11 pr-4 text-sm text-brand-dark outline-none transition placeholder:text-gray-400 focus:border-brand-accent"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
                  Sort Products
                </span>
                <CustomSelect
                  value={sort}
                  onChange={(nextValue) => {
                    setSort(nextValue);
                    setPage(1);
                  }}
                  options={PRODUCT_PRICE_SORT_OPTIONS}
                  leftIcon={<SlidersHorizontal size={16} />}
                />
              </label>
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
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="h-[420px] animate-pulse rounded-[28px] bg-[#f4f7fb]" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-brand-accent/30 bg-[#f4f7fb] px-6 py-14 text-center">
                <p className="font-serif text-2xl font-bold text-brand-dark">No products found in this category</p>
                <p className="mt-2 text-sm text-gray-500">
                  Try adjusting your search or continue browsing the full marketplace.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      setKeyword('');
                      setSort('');
                    }}
                    className="inline-flex items-center rounded-md bg-brand-primary px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-brand-dark"
                  >
                    Reset Category Search
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
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {products.map((product) => (
                    <Product key={product._id} product={product} />
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-4 border-t border-[#e1e8f2] pt-6 sm:flex-row sm:items-center sm:justify-between">
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
    </div>
  );
};

export default CategoryPage;
