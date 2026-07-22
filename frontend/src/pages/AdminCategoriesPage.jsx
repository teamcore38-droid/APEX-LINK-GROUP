import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Upload,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getCategoryImage, slugifyCategoryName } from '../utils/categoryUi';
import { invalidateCategoriesCache } from '../utils/categoryApi';

const INITIAL_FORM = {
  name: '',
  slug: '',
  description: '',
  image: '',
  imagePublicId: '',
  isActive: true,
  displayOrder: 0,
  parentCategory: '',
};

const MAX_FILE_SIZE = 8 * 1024 * 1024; // 8MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

const AdminCategoriesPage = () => {
  const navigate = useNavigate();
  const { userInfo } = useAuth();
  const authToken = userInfo?.token;
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
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

  const loadCategories = useCallback(async () => {
    if (!authToken) return;

    try {
      const { data } = await axios.get('/api/categories', {
        headers: { Authorization: `Bearer ${authToken}` },
        params: { includeInactive: true },
      });
      setCategories(data);
    } catch (fetchError) {
      console.error(fetchError);
      setError(fetchError.response?.data?.message || 'Unable to load categories right now.');
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => loadCategories());
    return () => window.cancelAnimationFrame(frame);
  }, [loadCategories]);

  const slugPreview = useMemo(() => {
    return slugifyCategoryName(form.slug || form.name);
  }, [form.name, form.slug]);

  const categoryMap = useMemo(() => {
    const map = new Map();
    categories.forEach((c) => map.set(c._id, c));
    return map;
  }, [categories]);

  const categoryPathMap = useMemo(() => {
    const map = new Map();

    const getPath = (id, visited = new Set()) => {
      if (!id || visited.has(id)) return '';
      visited.add(id);
      const cat = categoryMap.get(id);
      if (!cat) return '';
      const parentId = cat.parentCategory?._id || cat.parentCategory;
      const parentPath = getPath(parentId, visited);
      return parentPath ? `${parentPath} → ${cat.name}` : cat.name;
    };

    categories.forEach((c) => {
      map.set(c._id, getPath(c._id));
    });

    return map;
  }, [categories, categoryMap]);

  const resetForm = () => {
    setEditingId('');
    setForm(INITIAL_FORM);
    setUploadProgress(0);
    setUploadStatus('');
  };

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;

    setSuccess('');
    setError('');
    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');

    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      setError('Unsupported image format. Please upload a JPG, PNG, or WebP image.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File size exceeds 8MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller image.`);
      event.target.value = '';
      return;
    }

    const formData = new FormData();
    formData.append('images', file);

    setUploadingImage(true);
    setUploadProgress(10);
    setUploadStatus(`Uploading ${file.name} to Cloudinary...`);

    try {
      const { data } = await axios.post('/api/products/images', formData, {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      const uploaded = data.images?.[0];
      if (uploaded) {
        setForm((prev) => ({
          ...prev,
          image: uploaded.url,
          imagePublicId: uploaded.publicId,
        }));
        setUploadStatus('Image uploaded successfully to Cloudinary.');
        setSuccess('Thumbnail image uploaded to Cloudinary.');
      }
    } catch (uploadError) {
      console.error(uploadError);
      setError(uploadError.response?.data?.message || 'Failed to upload category image to Cloudinary.');
      setUploadStatus('');
    } finally {
      setUploadingImage(false);
      event.target.value = '';
    }
  };

  const removeImage = async () => {
    setError('');
    setSuccess('');

    if (form.imagePublicId) {
      try {
        await axios.delete('/api/products/images', {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
          data: { publicId: form.imagePublicId },
        });
      } catch (delError) {
        console.error('Failed to cleanup Cloudinary image:', delError);
      }
    }

    setForm((prev) => ({
      ...prev,
      image: '',
      imagePublicId: '',
    }));
    setUploadStatus('');
    setSuccess('Category thumbnail removed.');
  };

  const startEdit = (category) => {
    setEditingId(category._id);
    setSuccess('');
    setError('');
    setUploadStatus('');
    setUploadProgress(0);
    setForm({
      name: category.name || '',
      slug: category.slug || '',
      description: category.description || '',
      image: category.image || '',
      imagePublicId: category.imagePublicId || '',
      isActive: Boolean(category.isActive),
      displayOrder: category.displayOrder ?? 0,
      parentCategory: category.parentCategory?._id || category.parentCategory || '',
    });
  };

  const submitHandler = async (event) => {
    event.preventDefault();

    if (!userInfo?.token) return;

    setSaving(true);
    setSuccess('');
    setError('');

    const payload = {
      ...form,
      parentCategory: form.parentCategory || null,
      displayOrder: Number(form.displayOrder) || 0,
      slug: form.slug.trim(),
    };

    try {
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

      invalidateCategoriesCache();
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
    if (!userInfo?.token) return;

    const key = `${category._id}:toggle`;
    setActionKey(key);
    setSuccess('');
    setError('');

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

      invalidateCategoriesCache();
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
    if (!userInfo?.token) return;

    if (!window.confirm(`Delete category "${category.name}"? This action cannot be undone.`)) return;

    const key = `${category._id}:delete`;
    setActionKey(key);
    setSuccess('');
    setError('');

    try {
      await axios.delete(`/api/categories/${category._id}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });

      invalidateCategoriesCache();
      if (editingId === category._id) resetForm();
      setSuccess('Category deleted successfully.');
      await loadCategories();
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError.response?.data?.message || 'Unable to delete this category.');
    } finally {
      setActionKey('');
    }
  };

  return (
    <div className="min-h-screen bg-[#fff7ee] pt-4 md:pt-6 pb-16">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/profile"
            className="inline-flex items-center text-xs font-bold uppercase tracking-[0.2em] text-brand-primary hover:text-brand-dark"
          >
            <ArrowLeft size={16} className="mr-2" /> Back to Account
          </Link>
          <span className="rounded-full bg-brand-light px-4 py-1.5 text-xs font-bold text-brand-dark">
            {categories.length} Categories Total
          </span>
        </div>

        <section className="mb-8 rounded-[28px] bg-brand-dark px-6 py-8 text-white shadow-xl sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Catalog Management</p>
          <h1 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">Categories & Hierarchy</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-light/80">
            Organize products with direct Cloudinary thumbnail uploads, slug previews, display ordering, active statuses, and multi-level parent categories.
          </p>
        </section>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(53,26,17,0.08)] sm:p-8">
            <div className="mb-6 flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">
                  {editingId ? 'Edit Category' : 'New Category'}
                </p>
                <h2 className="font-serif text-2xl font-bold text-brand-dark">
                  {editingId ? 'Update details' : 'Create category'}
                </h2>
              </div>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={submitHandler} className="space-y-5">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-semibold text-brand-dark">
                  Category Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Women's Clothing"
                  className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-gray-400 focus:border-brand-accent"
                />
              </div>

              <div>
                <label htmlFor="slug" className="mb-2 block text-sm font-semibold text-brand-dark">
                  Slug (URL Path)
                </label>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  value={form.slug}
                  onChange={handleChange}
                  placeholder="Auto-generated if left empty"
                  className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-gray-400 focus:border-brand-accent"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Preview: <span className="font-semibold text-brand-primary">/{slugPreview || 'category-slug'}</span>
                </p>
              </div>

              <div className="rounded-2xl border border-brand-accent/20 bg-[#fff7ee] p-4">
                <label className="mb-2 block text-sm font-semibold text-brand-dark">
                  Category Thumbnail Image
                </label>

                {form.image ? (
                  <div className="relative mb-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
                    <img
                      src={form.image}
                      alt="Thumbnail preview"
                      className="h-36 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 inline-flex items-center rounded-full bg-red-600 p-1.5 text-white shadow-md hover:bg-red-700"
                      title="Remove image"
                    >
                      <X size={14} />
                    </button>
                    {form.imagePublicId && (
                      <span className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                        Cloudinary Hosted
                      </span>
                    )}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-brand-dark">
                    <Upload size={14} className="mr-2" /> Choose Image File
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                  <span className="text-xs text-gray-500">
                    JPG, PNG, or WebP (max 8MB)
                  </span>
                </div>

                {uploadingImage && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-brand-dark font-medium mb-1">
                      <span>{uploadStatus}</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full bg-brand-accent transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="mt-3 border-t border-gray-200 pt-3">
                  <label htmlFor="image" className="mb-1 block text-xs font-semibold text-gray-600">
                    Or enter external Image URL (Fallback)
                  </label>
                  <input
                    id="image"
                    name="image"
                    type="text"
                    value={form.image}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-brand-dark outline-none transition placeholder:text-gray-400 focus:border-brand-accent"
                  />
                </div>
              </div>              <div>
                <label htmlFor="description" className="mb-2 block text-sm font-semibold text-brand-dark">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows="3"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe this category..."
                  className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
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
                    className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm font-semibold text-brand-dark self-end">
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
                  className="h-40 w-full object-cover"
                />
                <div className="p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-accent">Live Preview</p>
                  <p className="mt-1 font-serif text-xl font-bold text-brand-dark">
                    {form.name || 'Category Name'}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-600">
                    {form.description || 'Describe this category in a polished, premium tone.'}
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={saving || uploadingImage}
                className="inline-flex w-full items-center justify-center rounded-xl bg-brand-primary px-5 py-3 text-sm font-bold uppercase tracking-[0.2em] text-white transition-colors duration-200 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-70"
              >
                {saving ? <Loader2 size={16} className="mr-2 animate-spin" /> : editingId ? <Save size={16} className="mr-2" /> : <Plus size={16} className="mr-2" />}
                {editingId ? 'Save Changes' : 'Create Category'}
              </button>
            </form>
          </div>

          <div className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(53,26,17,0.08)] sm:p-8">
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between border-b border-gray-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Category List</p>
                <h2 className="mt-1 font-serif text-2xl font-bold text-brand-dark">Manage category visibility & thumbnails</h2>
              </div>
              <p className="rounded-full bg-brand-light px-4 py-1.5 text-xs font-bold text-brand-dark">
                {categories.length} Total
              </p>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="h-28 animate-pulse rounded-[24px] bg-brand-light" />
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
                      className={`grid gap-4 rounded-[24px] border p-4 transition lg:grid-cols-[140px_minmax(0,1fr)_auto] ${
                        editingId === category._id
                          ? 'border-brand-accent bg-[#fff7ee]'
                          : category.isActive
                            ? 'border-gray-100 bg-white'
                            : 'border-gray-200 bg-gray-50 opacity-75'
                      }`}
                    >
                      <img
                        src={getCategoryImage(category)}
                        alt={category.name}
                        className="h-28 w-full rounded-[18px] object-cover lg:h-full"
                      />

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-serif text-lg font-bold text-brand-dark">{category.name}</h3>
                          {!category.isActive && (
                            <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-700">
                              Inactive
                            </span>
                          )}
                          {category.imagePublicId && (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                              Cloudinary
                            </span>
                          )}
                        </div>

                        <p className="mt-1 font-mono text-xs text-brand-primary">
                          /{category.slug}
                          {category.parentCategory && (
                            <span className="ml-2 font-sans text-gray-500">
                              ({categoryPathMap.get(category._id)})
                            </span>
                          )}
                        </p>

                        <p className="mt-2 text-xs leading-relaxed text-gray-600 line-clamp-2">
                          {category.description || 'No category description added yet.'}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-medium text-gray-400">
                          <span>Order: {category.displayOrder ?? 0}</span>
                          <span>Updated: {new Date(category.updatedAt).toLocaleDateString('en-US')}</span>
                        </div>
                      </div>

                      <div className="flex flex-row lg:flex-col gap-2 justify-end">
                        <button
                          type="button"
                          onClick={() => startEdit(category)}
                          className="inline-flex items-center justify-center rounded-xl border border-brand-primary/20 px-3 py-1.5 text-xs font-semibold text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                        >
                          <Pencil size={14} className="mr-1" /> Edit
                        </button>

                        <button
                          type="button"
                          disabled={isToggleBusy}
                          onClick={() => toggleActiveHandler(category)}
                          className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-semibold text-brand-dark transition-colors duration-200 hover:bg-gray-50 disabled:opacity-60"
                        >
                          {isToggleBusy ? (
                            <Loader2 size={14} className="mr-1 animate-spin" />
                          ) : category.isActive ? (
                            <EyeOff size={14} className="mr-1" />
                          ) : (
                            <Eye size={14} className="mr-1" />
                          )}
                          {category.isActive ? 'Hide' : 'Show'}
                        </button>

                        <button
                          type="button"
                          disabled={isDeleteBusy}
                          onClick={() => deleteHandler(category)}
                          className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors duration-200 hover:bg-red-100 disabled:opacity-60"
                        >
                          {isDeleteBusy ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Trash2 size={14} className="mr-1" />}
                          Delete
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCategoriesPage;
