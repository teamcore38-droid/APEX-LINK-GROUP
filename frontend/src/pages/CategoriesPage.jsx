import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Globe, Sparkles, Tag } from 'lucide-react';
import { getCategoryImage } from '../utils/categoryUi';

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data } = await axios.get('/api/categories');
        setCategories(data);
      } catch (fetchError) {
        console.error(fetchError);
        setError(fetchError.response?.data?.message || 'Unable to load categories right now.');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const parentCategories = categories.filter((c) => !c.parentCategory && c.isActive);

  const getChildrenForParent = (parentId) => {
    return categories.filter(
      (c) =>
        c.isActive &&
        (c.parentCategory?._id === parentId ||
          c.parentCategory === parentId ||
          (typeof c.parentCategory === 'object' && c.parentCategory?._id === parentId))
    );
  };

  return (
    <div className="min-h-screen bg-[#f8efe6] pt-2 sm:pt-4 pb-12">
      <div className="container mx-auto max-w-7xl px-3 sm:px-4">
        <div className="relative overflow-hidden rounded-2xl bg-brand-dark px-5 py-4 text-white shadow-lg sm:px-8 sm:py-5">
          <div className="absolute -right-16 top-0 h-32 w-32 rounded-full bg-brand-accent/20 blur-2xl" />
          <div className="relative z-10 flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-accent sm:text-xs">Browse by Collection</p>
              <h1 className="mt-1 font-serif text-2xl font-bold sm:text-3xl">
                Find the right industry for every sourcing need
              </h1>
              <p className="mt-1 hidden text-xs leading-5 text-white/80 sm:block sm:text-sm">
                Explore curated collections and subcategories verified for premium quality.
              </p>
            </div>
            <div className="flex shrink-0 gap-2.5">
              <Link
                to="/products"
                className="inline-flex items-center rounded-xl bg-brand-accent px-4 py-2 text-xs font-bold uppercase tracking-wider text-brand-dark transition-colors duration-200 hover:bg-white"
              >
                Shop All Products <ArrowRight size={14} className="ml-1.5" />
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-6 sm:mt-8">
          {loading ? (
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, index) => (
                <div key={index} className="h-[360px] animate-pulse rounded-[28px] bg-white shadow-sm" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-red-200 bg-red-50 px-6 py-8 text-center text-red-700 shadow-sm">
              <p className="font-serif text-2xl font-bold">Unable to load categories</p>
              <p className="mt-2 text-sm">{error}</p>
            </div>
          ) : parentCategories.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-brand-accent/30 bg-white px-6 py-12 text-center shadow-sm">
              <Sparkles size={36} className="mx-auto text-brand-accent" />
              <p className="mt-4 font-serif text-2xl font-bold text-brand-dark">No active categories available</p>
              <p className="mt-2 text-sm text-gray-500">
                Check back soon as we continue expanding our industry collections.
              </p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {parentCategories.map((category) => {
                const subcategories = getChildrenForParent(category._id);

                return (
                  <div
                    key={category._id}
                    className="group flex flex-col justify-between overflow-hidden rounded-[28px] bg-white shadow-[0_20px_50px_rgba(53, 26, 17,0.08)] transition-all duration-300 hover:-translate-y-1"
                  >
                    <div>
                      <Link to={`/products?category=${encodeURIComponent(category.name)}`} className="block relative h-72 overflow-hidden">
                        <img
                          src={getCategoryImage(category)}
                          alt={category.name}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/85 via-brand-dark/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                          <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] backdrop-blur-sm">
                            <Globe size={12} className="mr-2 text-brand-accent" /> Main Collection
                          </div>
                          <h2 className="mt-4 font-serif text-3xl font-bold">{category.name}</h2>
                        </div>
                      </Link>

                      <div className="p-6">
                        <p className="text-sm leading-7 text-gray-600">
                          {category.description || 'Explore a carefully curated collection of premium products.'}
                        </p>

                        {/* Subcategory Pills */}
                        {subcategories.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent mb-2.5">
                              Subcategories ({subcategories.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {subcategories.map((sub) => (
                                <Link
                                  key={sub._id}
                                  to={`/products?category=${encodeURIComponent(sub.name)}`}
                                  className="inline-flex items-center gap-1 rounded-full bg-[#fff7ee] border border-brand-accent/30 px-3 py-1 text-xs font-semibold text-brand-dark transition-all hover:bg-brand-primary hover:text-white hover:border-brand-primary"
                                >
                                  <Tag size={10} className="text-brand-accent" />
                                  <span>{sub.name}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="px-6 pb-6 pt-2">
                      <Link
                        to={`/products?category=${encodeURIComponent(category.name)}`}
                        className="inline-flex items-center text-sm font-bold uppercase tracking-[0.2em] text-brand-primary hover:text-brand-dark transition-colors"
                      >
                        Explore All {category.name} <ArrowRight size={16} className="ml-2 transition-transform duration-200 group-hover:translate-x-1" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoriesPage;
