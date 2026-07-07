import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { ArrowRight, Globe, Sparkles } from 'lucide-react';
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

  return (
    <div className="min-h-screen bg-[#f4f7fb] py-16">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="relative overflow-hidden rounded-[32px] bg-brand-dark px-6 py-16 text-white shadow-2xl sm:px-10">
          <div className="absolute -right-16 top-0 h-48 w-48 rounded-full bg-brand-accent/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-52 w-52 rounded-full bg-brand-primary/40 blur-3xl" />
          <div className="relative z-10 max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-accent">Browse by Collection</p>
            <h1 className="mt-4 font-serif text-4xl font-bold leading-tight sm:text-5xl">
              Find the right industry for every sourcing need
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/80 sm:text-base">
              Explore curated collections spanning textiles, food products, technology, industrial equipment, and more — all verified for premium quality.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/products"
                className="inline-flex items-center rounded-md bg-brand-accent px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-brand-dark transition-transform duration-200 hover:-translate-y-0.5"
              >
                Shop All Products <ArrowRight size={16} className="ml-2" />
              </Link>
              <Link
                to="/"
                className="inline-flex items-center rounded-md border border-white/25 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-white/10"
              >
                Back Home
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-14">
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
          ) : categories.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-brand-accent/30 bg-white px-6 py-12 text-center shadow-sm">
              <Sparkles size={36} className="mx-auto text-brand-accent" />
              <p className="mt-4 font-serif text-2xl font-bold text-brand-dark">No active categories available</p>
              <p className="mt-2 text-sm text-gray-500">
                Check back soon as we continue expanding our industry collections.
              </p>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
              {categories.map((category) => (
                <Link
                  key={category._id}
                  to={`/category/${category.slug}`}
                  className="group overflow-hidden rounded-[28px] bg-white shadow-[0_20px_50px_rgba(11,31,58,0.08)] transition-transform duration-300 hover:-translate-y-1"
                >
                  <div className="relative h-72 overflow-hidden">
                    <img
                      src={getCategoryImage(category)}
                      alt={category.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/85 via-brand-dark/20 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] backdrop-blur-sm">
                        <Globe size={12} className="mr-2 text-brand-accent" /> Premium Collection
                      </div>
                      <h2 className="mt-4 font-serif text-3xl font-bold">{category.name}</h2>
                    </div>
                  </div>
                  <div className="p-6">
                    <p className="text-sm leading-7 text-gray-600">
                      {category.description || 'Explore a carefully curated collection of premium products.'}
                    </p>
                    <div className="mt-6 inline-flex items-center text-sm font-bold uppercase tracking-[0.2em] text-brand-primary">
                      Explore Category <ArrowRight size={16} className="ml-2 transition-transform duration-200 group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoriesPage;
