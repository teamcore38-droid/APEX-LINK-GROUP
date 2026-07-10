import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCategoryImage, slugifyCategoryName } from '../utils/categoryUi';

const INITIAL_FORM = {
  name: '',
  slug: '',
  description: '',
  image: '',
  isActive: true,
  displayOrder: 0,
};

const AdminCategoriesPage = () => {
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  const canManageCatalog = Boolean(
    userInfo?.isAdmin ||
      userInfo?.permissions?.includes('catalog:write') ||
      userInfo?.permissions?.includes('*')
  );

  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionKey, setActionKey] = useState('');

  useEffect(() => {
    if (!userInfo?.token) {
      navigate('/login?redirect=/admin/categories');
      return;
    }

    if (!canManageCatalog) {
      navigate('/profile');
    }
  }, [canManageCatalog, navigate, userInfo]);

  const loadCategories = async () => {
    if (!userInfo?.token) {
      return;
    }

    try {
      const { data } = await axios.get('/api/categories', {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
        params: {
          includeInactive: true,
        },
      });

      setCategories(data);
    } catch (fetchError) {
      console.error(fetchError);
      setError(fetchError.response?.data?.message || 'Unable to load categories right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!userInfo?.token || !canManageCatalog) {
      return;
    }

    const initializeCategories = async () => {
      try {
        const { data } = await axios.get('/api/categories', {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
          params: {
            includeInactive: true,
          },
        });

        setCategories(data);
      } catch (fetchError) {
        console.error(fetchError);
        setError(fetchError.response?.data?.message || 'Unable to load categories right now.');
      } finally {
        setLoading(false);
      }
    };

    initializeCategories();
  }, [canManageCatalog, userInfo]);

  const slugPreview = useMemo(
    () => slugifyCategoryName(form.slug || form.name),
    [form.name, form.slug]
  );

  const resetForm = () => {
    setEditingId('');
    setForm(INITIAL_FORM);
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setSuccess('');
    setError('');
    setForm((currentForm) => ({
      ...currentForm,
      [name]:
        type === 'checkbox'
          ? checked
          : name === 'displayOrder'
            ? value
            : value,
    }));
  };

  const startEdit = (category) => {
    setEditingId(category._id);
    setSuccess('');
    setError('');
    setForm({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      image: category.image || '',
      isActive: Boolean(category.isActive),
      displayOrder: category.displayOrder ?? 0,
    });
  };

  const submitHandler = async (event) => {
    event.preventDefault();

    if (!userInfo?.token) {
      return;
    }

    setSaving(true);
    setSuccess('');
    setError('');

    const payload = {
      ...form,
      displayOrder: Number(form.displayOrder) || 0,
      slug: form.slug.trim(),
    };

    try {
      setLoading(true);
      setError('');

      const config = {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
          'Content-Type': 'application/json',
        },
      };

      if (editingId) {
        await axios.put(`/api/categories/${editingId}`, payload, config);
        setSuccess('Category updated successfully.');
      } else {
        await axios.post('/api/categories', payload, config);
        setSuccess('Category created successfully.');
      }

      resetForm();
      await loadCategories();
    } catch (saveError) {
      console.error(saveError);
      setError(saveError.response?.data?.message || 'Unable to save this category right now.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActiveHandler = async (category) => {
    if (!userInfo?.token) {
      return;
    }

    const key = `${category._id}:toggle`;
    setActionKey(key);
    setSuccess('');
    setError('');
    setLoading(true);

    try {
      await axios.put(
        `/api/categories/${category._id}`,
        {
          ...category,
          isActive: !category.isActive,
        },
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setSuccess(`Category ${category.isActive ? 'deactivated' : 'activated'} successfully.`);
      await loadCategories();
    } catch (toggleError) {
      console.error(toggleError);
      setError(toggleError.response?.data?.message || 'Unable to update this category right now.');
    } finally {
      setActionKey('');
    }
  };

  const deleteHandler = async (category) => {
    if (!userInfo?.token) {
      return;
    }

    const confirmed = window.confirm(`Delete category "${category.name}"? This action cannot be undone.`);

    if (!confirmed) {
      return;
    }

    const key = `${category._id}:delete`;
    setActionKey(key);
    setSuccess('');
    setError('');
    setLoading(true);

    try {
      await axios.delete(`/api/categories/${category._id}`, {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
        },
      });

      if (editingId === category._id) {
        resetForm();
      }

      setSuccess('Category deleted successfully.');
      await loadCategories();
    } catch (deleteError) {
      console.error(deleteError);
      setError(
        deleteError.response?.data?.message ||
          'Unable to delete this category. Reassign any linked products first.'
      );
    } finally {
      setActionKey('');
    }
  };

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

          <Link
            to="/categories"
            className="inline-flex items-center rounded-md border border-brand-primary/20 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
          >
            View Public Categories
          </Link>
        </div>

        <div className="mb-10 rounded-[32px] bg-brand-dark px-6 py-12 text-white shadow-2xl sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-brand-accent">Admin Category Management</p>
          <h1 className="mt-4 font-serif text-4xl font-bold sm:text-5xl">Shape the storefront by category</h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-white/80 sm:text-base">
            Curate category names, slug structure, activation states, imagery, and display order without touching the rest of the catalog.
          </p>
        </div>

        <div className="grid gap-8 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">
                  {editingId ? 'Edit Category' : 'Create Category'}
                </p>
                <h2 className="mt-2 font-serif text-2xl font-bold text-brand-dark">
                  {editingId ? 'Update category details' : 'Add a new collection'}
                </h2>
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md border border-brand-primary/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                >
                  New Category
                </button>
              )}
            </div>

            <form className="mt-6 space-y-5" onSubmit={submitHandler}>
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-semibold text-brand-dark">
                  Category Name
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
                  placeholder="Leave blank to auto-generate from name"
                  className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-gray-400 focus:border-brand-accent"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Preview: <span className="font-semibold text-brand-primary">/{slugPreview || 'category-slug'}</span>
                </p>
              </div>

              <div>
                <label htmlFor="image" className="mb-2 block text-sm font-semibold text-brand-dark">
                  Category Image URL
                </label>
                <input
                  id="image"
                  name="image"
                  type="text"
                  value={form.image}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-gray-400 focus:border-brand-accent"
                />
              </div>

              <div>
                <label htmlFor="description" className="mb-2 block text-sm font-semibold text-brand-dark">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows="4"
                  value={form.description}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="displayOrder" className="mb-2 block text-sm font-semibold text-brand-dark">
                    Display Order
                  </label>
                  <input
                    id="displayOrder"
                    name="displayOrder"
                    type="number"
                    value={form.displayOrder}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-[#f7f9fc] px-4 py-3 text-sm font-semibold text-brand-dark">
                  <input
                    name="isActive"
                    type="checkbox"
                    checked={form.isActive}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-accent"
                  />
                  Category is active
                </label>
              </div>

              <div className="overflow-hidden rounded-[24px] border border-gray-100 bg-brand-light">
                <img
                  src={getCategoryImage({ ...form, slug: slugPreview })}
                  alt={form.name || 'Category preview'}
                  className="h-48 w-full object-cover"
                />
                <div className="p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">Preview</p>
                  <p className="mt-2 font-serif text-2xl font-bold text-brand-dark">
                    {form.name || 'Category Name'}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {form.description || 'Use this space to describe the category in a polished, premium tone.'}
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : editingId ? <Save size={16} className="mr-2" /> : <Plus size={16} className="mr-2" />}
                {saving ? 'Saving Category...' : editingId ? 'Update Category' : 'Create Category'}
              </button>
            </form>
          </section>

          <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(11,31,58,0.08)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Category List</p>
                <h2 className="mt-2 font-serif text-2xl font-bold text-brand-dark">Manage category visibility and order</h2>
              </div>
              <p className="rounded-full bg-brand-light px-4 py-2 text-sm font-semibold text-brand-dark">
                {categories.length} total categories
              </p>
            </div>

            {error && (
              <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                {success}
              </div>
            )}

            <div className="mt-6">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, index) => (
                    <div key={index} className="h-32 animate-pulse rounded-[24px] bg-brand-light" />
                  ))}
                </div>
              ) : categories.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-brand-accent/30 bg-brand-light px-6 py-12 text-center">
                  <p className="font-serif text-2xl font-bold text-brand-dark">No categories yet</p>
                  <p className="mt-2 text-sm text-gray-500">
                    Create your first category to unlock category-driven storefront browsing.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {categories.map((category) => {
                    const isToggleBusy = actionKey === `${category._id}:toggle`;
                    const isDeleteBusy = actionKey === `${category._id}:delete`;

                    return (
                      <article
                        key={category._id}
                        className="grid gap-4 rounded-[24px] border border-gray-100 bg-gradient-to-br from-white to-brand-light p-4 lg:grid-cols-[180px_minmax(0,1fr)_auto]"
                      >
                        <img
                          src={getCategoryImage(category)}
                          alt={category.name}
                          className="h-40 w-full rounded-[20px] object-cover lg:h-full"
                        />

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-serif text-2xl font-bold text-brand-dark">{category.name}</h3>
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${
                                category.isActive
                                  ? 'bg-green-50 text-green-700'
                                  : 'bg-gray-200 text-gray-600'
                              }`}
                            >
                              {category.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>

                          <p className="mt-2 font-mono text-xs text-brand-primary">/{category.slug}</p>
                          <p className="mt-3 text-sm leading-7 text-gray-600">
                            {category.description || 'No category description has been added yet.'}
                          </p>

                          <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                            <span>Display Order: {category.displayOrder ?? 0}</span>
                            <span>Updated: {new Date(category.updatedAt).toLocaleDateString('en-US')}</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2 lg:w-[180px]">
                          <button
                            type="button"
                            onClick={() => startEdit(category)}
                            className="inline-flex items-center justify-center rounded-md border border-brand-primary/20 px-4 py-2 text-sm font-semibold text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                          >
                            <Pencil size={16} className="mr-2" /> Edit
                          </button>

                          <button
                            type="button"
                            disabled={isToggleBusy}
                            onClick={() => toggleActiveHandler(category)}
                            className="inline-flex items-center justify-center rounded-md border border-gray-200 px-4 py-2 text-sm font-semibold text-brand-dark transition-colors duration-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isToggleBusy ? (
                              <Loader2 size={16} className="mr-2 animate-spin" />
                            ) : category.isActive ? (
                              <EyeOff size={16} className="mr-2" />
                            ) : (
                              <Eye size={16} className="mr-2" />
                            )}
                            {category.isActive ? 'Deactivate' : 'Activate'}
                          </button>

                          <button
                            type="button"
                            disabled={isDeleteBusy}
                            onClick={() => deleteHandler(category)}
                            className="inline-flex items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition-colors duration-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isDeleteBusy ? <Loader2 size={16} className="mr-2 animate-spin" /> : <Trash2 size={16} className="mr-2" />}
                            Delete
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminCategoriesPage;
