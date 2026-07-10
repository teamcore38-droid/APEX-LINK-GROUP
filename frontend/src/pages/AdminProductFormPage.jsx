import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Loader2, Plus, Save, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CustomSelect from '../components/CustomSelect';
import {
  buildProductFormFromProduct,
  buildProductPayloadFromForm,
  createInitialProductForm,
  formatCurrency,
  getProductImages,
  slugifyProductName,
} from '../utils/productUi';

const validateForm = (form) => {
  if (!form.name.trim()) {
    return 'Product name is required.';
  }

  if (!form.category) {
    return 'Please choose a category.';
  }

  if (form.price === '' || Number.isNaN(Number(form.price)) || Number(form.price) < 0) {
    return 'Price is required and must be a valid number.';
  }

  if (Number.isNaN(Number(form.countInStock)) || Number(form.countInStock) < 0) {
    return 'Stock quantity cannot be negative.';
  }

  if (Number.isNaN(Number(form.lowStockThreshold)) || Number(form.lowStockThreshold) < 0) {
    return 'Low-stock threshold cannot be negative.';
  }

  try {
    JSON.parse(form.variantsJson || '[]');
  } catch {
    return 'Variants must be valid JSON.';
  }

  return '';
};

const AdminProductFormPage = ({ mode = 'create' }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { userInfo } = useAuth();
  const isEditMode = mode === 'edit';
  const canManageCatalog = Boolean(
    userInfo?.isAdmin ||
      userInfo?.permissions?.includes('catalog:write') ||
      userInfo?.permissions?.includes('*')
  );

  const [form, setForm] = useState(createInitialProductForm());
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!userInfo?.token) {
      navigate(
        `/login?redirect=${encodeURIComponent(isEditMode ? `/admin/product/${id}/edit` : '/admin/products/new')}`
      );
      return;
    }

    if (!canManageCatalog) {
      navigate('/profile');
    }
  }, [canManageCatalog, id, isEditMode, navigate, userInfo]);

  useEffect(() => {
    if (!userInfo?.token || !canManageCatalog) {
      return;
    }

    const initializeForm = async () => {
      setLoading(true);
      setError('');

      try {
        const categoryPromise = axios.get('/api/categories', {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
          params: {
            includeInactive: true,
          },
        });

        if (isEditMode) {
          const [categoryResponse, productResponse] = await Promise.all([
            categoryPromise,
            axios.get(`/api/products/${id}`, {
              headers: {
                Authorization: `Bearer ${userInfo.token}`,
              },
            }),
          ]);

          setCategories(categoryResponse.data);
          setForm(buildProductFormFromProduct(productResponse.data));
          setSlugTouched(Boolean(productResponse.data.slug));
        } else {
          const { data } = await categoryPromise;
          setCategories(data);
          setForm(createInitialProductForm());
          setSlugTouched(false);
        }
      } catch (loadError) {
        console.error(loadError);
        setError(loadError.response?.data?.message || 'Unable to load product form data right now.');
      } finally {
        setLoading(false);
      }
    };

    initializeForm();
  }, [canManageCatalog, id, isEditMode, userInfo]);

  const previewProduct = useMemo(() => {
    try {
      const payload = buildProductPayloadFromForm(form);

      return {
        ...payload,
        _id: id || 'preview',
        rating: 5,
        numReviews: 18,
        images: payload.images,
      };
    } catch {
      return {
        _id: id || 'preview',
        name: form.name || 'Product preview',
        image: form.image,
        images: [],
        price: Number(form.price || 0),
        countInStock: Number(form.countInStock || 0),
        category: form.category,
      };
    }
  }, [form, id]);

  const previewImages = useMemo(() => getProductImages(previewProduct), [previewProduct]);

  const handleChange = (event) => {
    const { checked, name, type, value } = event.target;

    setError('');
    setSuccess('');

    setForm((currentForm) => {
      const nextForm = {
        ...currentForm,
        [name]: type === 'checkbox' ? checked : value,
      };

      if (name === 'name' && !slugTouched) {
        nextForm.slug = slugifyProductName(value);
      }

      return nextForm;
    });

    if (name === 'slug') {
      setSlugTouched(true);
    }
  };

  const submitHandler = async (event) => {
    event.preventDefault();

    const validationError = validateForm(form);

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
          'Content-Type': 'application/json',
        },
      };

      const payload = buildProductPayloadFromForm(form);

      if (isEditMode) {
        await axios.put(`/api/products/${id}`, payload, config);
        setSuccess('Product updated successfully.');
      } else {
        const { data } = await axios.post('/api/products', payload, config);
        navigate(`/admin/product/${data._id}/edit`);
        return;
      }
    } catch (saveError) {
      console.error(saveError);
      setError(saveError.response?.data?.message || 'Unable to save this product right now.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[#f7f9fc]">
        <div className="h-14 w-14 animate-spin rounded-full border-b-2 border-t-2 border-brand-accent" />
        <p className="mt-4 font-serif text-xl text-brand-dark">
          {isEditMode ? 'Loading product editor...' : 'Preparing a new product form...'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fc] py-12">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/admin"
            className="inline-flex items-center text-sm font-semibold text-brand-primary transition-colors duration-200 hover:text-brand-dark"
          >
            <ArrowLeft size={16} className="mr-2" /> Back to Admin Dashboard
          </Link>

          {isEditMode && (
            <Link
              to={`/product/${id}`}
              className="inline-flex items-center rounded-full border border-brand-primary/20 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
            >
              View Public Product
            </Link>
          )}
        </div>

        <div className="rounded-[32px] bg-brand-dark px-6 py-12 text-white shadow-2xl sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-accent">
            {isEditMode ? 'Edit Product' : 'Add Product'}
          </p>
          <h1 className="mt-4 font-serif text-4xl font-bold sm:text-5xl">
            {isEditMode ? 'Refine your premium product details' : 'Launch a new product into the catalog'}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80 sm:text-base">
            Shape pricing, imagery, merchandising tags, stock, and story details in one polished workflow.
          </p>
        </div>

        <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <form
            onSubmit={submitHandler}
            className="space-y-8 rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)] sm:p-8"
          >
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                {success}
              </div>
            )}

            <section className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Core Details</p>
                <h2 className="mt-2 font-serif text-2xl font-bold text-brand-dark">Identity and merchandising</h2>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-semibold text-brand-dark">
                    Product Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>

                <div>
                  <label htmlFor="slug" className="mb-2 block text-sm font-semibold text-brand-dark">
                    Slug
                  </label>
                  <input
                    id="slug"
                    name="slug"
                    type="text"
                    value={form.slug}
                    onChange={handleChange}
                    placeholder="Auto-generated from the product name"
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-gray-400 focus:border-brand-accent"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Preview: <span className="font-semibold text-brand-primary">/api/products/slug/{slugifyProductName(form.slug || form.name) || 'product-slug'}</span>
                  </p>
                </div>

                <div>
                  <label htmlFor="category" className="mb-2 block text-sm font-semibold text-brand-dark">
                    Category
                  </label>
                  <CustomSelect
                    id="category"
                    value={form.category}
                    onChange={(nextValue) => {
                      setError('');
                      setSuccess('');
                      setForm((currentForm) => ({
                        ...currentForm,
                        category: nextValue,
                      }));
                    }}
                    options={[
                      { value: '', label: 'Select a category' },
                      ...categories.map((category) => ({
                        value: category.name,
                        label: `${category.name}${category.isActive ? '' : ' (Inactive)'}`,
                      })),
                    ]}
                  />
                </div>

                <div>
                  <label htmlFor="brand" className="mb-2 block text-sm font-semibold text-brand-dark">
                    Brand
                  </label>
                  <input
                    id="brand"
                    name="brand"
                    type="text"
                    value={form.brand}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>

                <div>
                  <label htmlFor="sku" className="mb-2 block text-sm font-semibold text-brand-dark">
                    SKU
                  </label>
                  <input
                    id="sku"
                    name="sku"
                    type="text"
                    value={form.sku}
                    onChange={handleChange}
                    placeholder="APX-..."
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>

                <div>
                  <label htmlFor="weight" className="mb-2 block text-sm font-semibold text-brand-dark">
                    Weight / Size
                  </label>
                  <input
                    id="weight"
                    name="weight"
                    type="text"
                    value={form.weight}
                    onChange={handleChange}
                    placeholder="100g, 250g, 1kg"
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Pricing & Inventory</p>
                <h2 className="mt-2 font-serif text-2xl font-bold text-brand-dark">Commercial controls</h2>
              </div>

              <div className="grid gap-5 md:grid-cols-3">
                <div>
                  <label htmlFor="price" className="mb-2 block text-sm font-semibold text-brand-dark">
                    Price
                  </label>
                  <input
                    id="price"
                    name="price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>

                <div>
                  <label htmlFor="compareAtPrice" className="mb-2 block text-sm font-semibold text-brand-dark">
                    Compare-at Price
                  </label>
                  <input
                    id="compareAtPrice"
                    name="compareAtPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.compareAtPrice}
                    onChange={handleChange}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>

                <div>
                  <label htmlFor="countInStock" className="mb-2 block text-sm font-semibold text-brand-dark">
                    Stock Quantity
                  </label>
                  <input
                    id="countInStock"
                    name="countInStock"
                    type="number"
                    min="0"
                    value={form.countInStock}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>

                <div>
                  <label htmlFor="lowStockThreshold" className="mb-2 block text-sm font-semibold text-brand-dark">
                    Low-Stock Alert Threshold
                  </label>
                  <input
                    id="lowStockThreshold"
                    name="lowStockThreshold"
                    type="number"
                    min="0"
                    value={form.lowStockThreshold}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Media & Story</p>
                <h2 className="mt-2 font-serif text-2xl font-bold text-brand-dark">Visuals and selling copy</h2>
              </div>

              <div>
                <label htmlFor="image" className="mb-2 block text-sm font-semibold text-brand-dark">
                  Main Image URL
                </label>
                <input
                  id="image"
                  name="image"
                  type="text"
                  value={form.image}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                />
              </div>

              <div>
                <label htmlFor="imageList" className="mb-2 block text-sm font-semibold text-brand-dark">
                  Additional Image URLs
                </label>
                <textarea
                  id="imageList"
                  name="imageList"
                  rows="4"
                  value={form.imageList}
                  onChange={handleChange}
                  placeholder="One image URL per line"
                  className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                />
              </div>

              <div>
                <label htmlFor="variantsJson" className="mb-2 block text-sm font-semibold text-brand-dark">
                  Variants JSON
                </label>
                <textarea
                  id="variantsJson"
                  name="variantsJson"
                  rows="8"
                  value={form.variantsJson}
                  onChange={handleChange}
                  placeholder='[{"label":"500g pouch","sku":"SKU-500","weight":"500g","packaging":"Pouch","priceAdjustment":0,"countInStock":25}]'
                  className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 font-mono text-xs text-brand-dark outline-none transition focus:border-brand-accent"
                />
              </div>

              <div>
                <label htmlFor="shortDescription" className="mb-2 block text-sm font-semibold text-brand-dark">
                  Short Description
                </label>
                <textarea
                  id="shortDescription"
                  name="shortDescription"
                  rows="3"
                  value={form.shortDescription}
                  onChange={handleChange}
                  placeholder="A concise premium summary for product cards and key merchandising surfaces."
                  className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                />
              </div>

              <div>
                <label htmlFor="description" className="mb-2 block text-sm font-semibold text-brand-dark">
                  Full Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows="6"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Tell the product story, tasting notes, recommended uses, and what makes it premium."
                  className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label htmlFor="origin" className="mb-2 block text-sm font-semibold text-brand-dark">
                    Origin / Source
                  </label>
                  <input
                    id="origin"
                    name="origin"
                    type="text"
                    value={form.origin}
                    onChange={handleChange}
                    placeholder="Sri Lanka, Kerala, Madagascar..."
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>

                <div>
                  <label htmlFor="ingredients" className="mb-2 block text-sm font-semibold text-brand-dark">
                    Contents & Specifications
                  </label>
                  <input
                    id="ingredients"
                    name="ingredients"
                    type="text"
                    value={form.ingredients}
                    onChange={handleChange}
                    placeholder="100% pure turmeric, no additives"
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Storefront Toggles</p>
                <h2 className="mt-2 font-serif text-2xl font-bold text-brand-dark">Visibility and badges</h2>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ['isFeatured', 'Featured Product'],
                  ['isBestSeller', 'Best Seller'],
                  ['isActive', 'Active in Storefront'],
                ].map(([name, label]) => (
                  <label
                    key={name}
                    className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-[#f7f9fc] px-4 py-4 text-sm font-semibold text-brand-dark"
                  >
                    <input
                      name={name}
                      type="checkbox"
                      checked={Boolean(form[name])}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-accent"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </section>

            <div className="flex flex-col gap-4 border-t border-gray-100 pt-6 sm:flex-row sm:justify-end">
              <Link
                to="/admin"
                className="inline-flex items-center justify-center rounded-xl border border-brand-primary/20 px-5 py-3 text-sm font-semibold uppercase tracking-[0.18em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
              >
                Cancel
              </Link>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-bold uppercase tracking-[0.18em] text-white transition-colors duration-200 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : isEditMode ? (
                  <Save size={16} className="mr-2" />
                ) : (
                  <Plus size={16} className="mr-2" />
                )}
                {saving ? 'Saving...' : isEditMode ? 'Update Product' : 'Create Product'}
              </button>
            </div>
          </form>

          <aside className="space-y-6">
            <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)]">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Live Preview</p>
              <h2 className="mt-2 font-serif text-2xl font-bold text-brand-dark">Storefront impression</h2>

              <div className="mt-5 overflow-hidden rounded-[24px] border border-[#dce4ef] bg-[#f4f7fb]">
                <img
                  src={
                    previewProduct.image ||
                    'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=1000'
                  }
                  alt={previewProduct.name || 'Product preview'}
                  className="h-64 w-full object-cover"
                />
                <div className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-brand-accent">
                      {previewProduct.category || 'Category'}
                    </span>
                    <span className="rounded-full bg-[#e8edf5] px-3 py-1 text-xs font-semibold text-[#2c4a73]">
                      {previewProduct.weight || 'Weight'}
                    </span>
                  </div>

                  <h3 className="font-serif text-2xl font-bold text-brand-dark">
                    {previewProduct.name || 'Product Name'}
                  </h3>

                  <p className="text-sm leading-7 text-gray-600">
                    {previewProduct.shortDescription ||
                      'Your short product summary will appear here and help customers scan the catalog quickly.'}
                  </p>

                  <div className="flex items-center gap-3 pt-2">
                    {previewProduct.compareAtPrice > previewProduct.price && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatCurrency(previewProduct.compareAtPrice)}
                      </span>
                    )}
                    <span className="font-serif text-3xl font-bold text-brand-dark">
                      {formatCurrency(previewProduct.price)}
                    </span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#edf1f8] text-brand-primary">
                  <Sparkles size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Gallery</p>
                  <h2 className="font-serif text-2xl font-bold text-brand-dark">Additional imagery</h2>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {previewImages.length > 0 ? (
                  previewImages.map((image) => (
                    <img
                      key={image}
                      src={image}
                      alt="Product gallery preview"
                      className="h-40 w-full rounded-[20px] object-cover"
                    />
                  ))
                ) : (
                  <div className="rounded-[20px] border border-dashed border-brand-accent/30 bg-brand-light px-4 py-10 text-center text-sm text-gray-500">
                    Add a main image or gallery URLs to preview them here.
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default AdminProductFormPage;
