import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ImagePlus,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Star,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CustomSelect from '../components/CustomSelect';
import {
  buildProductFormFromProduct,
  buildProductPath,
  buildProductPayloadFromForm,
  createInitialProductForm,
  formatCurrency,
  getProductFormGalleryImages,
  getProductImageUrl,
  getProductImages,
  getVariantImageAssets,
  setVariantImageAssets,
  setProductFormGalleryImages,
  slugifyProductName,
} from '../utils/productUi';

const MAX_GALLERY_IMAGES = 12;
const MAX_VARIANT_IMAGES = 8;
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const getAssetKey = (asset = {}) => asset.publicId || asset.url || getProductImageUrl(asset);
const getPublicIds = (assets = []) =>
  assets.map((asset) => asset.publicId).filter(Boolean);

const parseVariantsJson = (value = '[]') => {
  try {
    const variants = JSON.parse(value || '[]');
    return Array.isArray(variants) ? variants : [];
  } catch {
    return [];
  }
};

const getFormPublicIds = (form) => {
  const variantImages = parseVariantsJson(form.variantsJson).flatMap((variant) => getVariantImageAssets(variant));
  return getPublicIds([...(form.imageAssets || []), ...variantImages]);
};

const getUniqueCategoryNames = (values = []) => {
  const categoryNames = values.map((value) => String(value || '').trim()).filter(Boolean);

  return [...new Set(categoryNames.map((value) => value.toLowerCase()))]
    .map((lowerValue) => categoryNames.find((value) => value.toLowerCase() === lowerValue));
};

const reconcileProductCategorySelection = (productForm, categoryList = []) => {
  const categoryByName = new Map(categoryList.map((category) => [category.name, category]));
  const assignedCategories = getUniqueCategoryNames([
    productForm.category,
    ...(productForm.categories || []),
  ]);
  const validAssignedCategories = assignedCategories.filter((categoryName) => categoryByName.has(categoryName));

  if (productForm.category && categoryByName.has(productForm.category)) {
    return {
      form: {
        ...productForm,
        categories: assignedCategories,
      },
      replacedCategory: '',
    };
  }

  const fallbackCategory = validAssignedCategories[validAssignedCategories.length - 1] || '';

  return {
    form: {
      ...productForm,
      category: fallbackCategory,
      categories: fallbackCategory ? getUniqueCategoryNames([fallbackCategory, ...validAssignedCategories]) : validAssignedCategories,
    },
    replacedCategory: fallbackCategory ? productForm.category || 'missing primary category' : '',
  };
};

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

  if (form.hasSizes) {
    const sizes = Array.isArray(form.sizes) ? form.sizes : [];

    if (sizes.length === 0) {
      return 'Add at least one size option or turn off size selection.';
    }

    for (const sizeOption of sizes) {
      if (!String(sizeOption.size || '').trim()) {
        return 'Every size option needs a size label.';
      }

      if (Number.isNaN(Number(sizeOption.price)) || Number(sizeOption.price) < 0) {
        return `Size ${sizeOption.size} needs a valid price.`;
      }

      if (Number.isNaN(Number(sizeOption.countInStock)) || Number(sizeOption.countInStock) < 0) {
        return `Size ${sizeOption.size} stock quantity cannot be negative.`;
      }
    }
  }

  try {
    const variants = JSON.parse(form.variantsJson || '[]');

    if (form.hasSizes) {
      const combinations = Array.isArray(variants)
        ? variants.filter((variant) => String(variant.size || '').trim() && String(variant.color || variant.label || '').trim())
        : [];

      if (combinations.length === 0) {
        return 'Add at least one Size + Color combination in Color Options.';
      }

      for (const combination of combinations) {
        const label = [combination.color || combination.label, combination.size].filter(Boolean).join(' / ');

        if (Number.isNaN(Number(combination.price)) || Number(combination.price) < 0) {
          return `${label} needs a valid price.`;
        }

        if (Number.isNaN(Number(combination.countInStock)) || Number(combination.countInStock) < 0) {
          return `${label} stock quantity cannot be negative.`;
        }
      }
    }
  } catch {
    return 'Color combinations must be valid.';
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
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [variantImageUrlInputs, setVariantImageUrlInputs] = useState({});
  const [, setVariantUploadStatus] = useState({});
  const [uploadStatus, setUploadStatus] = useState('');
  const [categoryNotice, setCategoryNotice] = useState('');
  const [persistedImagePublicIds, setPersistedImagePublicIds] = useState(new Set());

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

          const { form: nextForm, replacedCategory } = reconcileProductCategorySelection(
            buildProductFormFromProduct(productResponse.data),
            categoryResponse.data
          );
          setCategories(categoryResponse.data);
          setForm(nextForm);
          setCategoryNotice(
            replacedCategory
              ? replacedCategory === 'missing primary category'
                ? 'Saved primary category was missing, so a valid assigned category was selected.'
                : `Saved primary category "${replacedCategory}" no longer exists, so a valid assigned category was selected.`
              : ''
          );
          setPersistedImagePublicIds(new Set(getFormPublicIds(nextForm)));
          setSlugTouched(Boolean(productResponse.data.slug));
        } else {
          const { data } = await categoryPromise;
          setCategories(data);
          setForm(createInitialProductForm());
          setCategoryNotice('');
          setPersistedImagePublicIds(new Set());
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

  const categoryPathMap = useMemo(() => {
    const map = new Map();
    const categoriesMap = new Map(categories.map((c) => [c._id, c]));

    const getPath = (catId, visited = new Set()) => {
      const cat = categoriesMap.get(catId);
      if (!cat || visited.has(catId)) return '';
      visited.add(catId);
      const parentId = typeof cat.parentCategory === 'object' ? cat.parentCategory?._id : cat.parentCategory;
      if (parentId) {
        const pPath = getPath(parentId, visited);
        return pPath ? `${pPath} > ${cat.name}` : cat.name;
      }
      return cat.name;
    };

    categories.forEach((c) => {
      map.set(c._id, getPath(c._id));
    });

    return map;
  }, [categories]);

  const categorySelectOptions = useMemo(
    () => [
      { value: '', label: 'Select a category' },
      ...categories.map((category) => {
        const fullPath = categoryPathMap.get(category._id) || category.name;
        return {
          value: category.name,
          label: `${fullPath}${category.isActive ? '' : ' (Inactive)'}`,
        };
      }),
    ],
    [categories, categoryPathMap]
  );

  const assignedCategoryNames = useMemo(
    () => new Set(getUniqueCategoryNames([form.category, ...(form.categories || [])])),
    [form.categories, form.category]
  );

  const additionalCategoryOptions = useMemo(
    () => categories.filter((category) => category.name !== form.category),
    [categories, form.category]
  );

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

  const galleryImages = useMemo(() => getProductFormGalleryImages(form), [form]);
  const previewImages = useMemo(() => getProductImages(previewProduct), [previewProduct]);
  const variants = useMemo(() => parseVariantsJson(form.variantsJson), [form.variantsJson]);
  const colorGroups = useMemo(() => {
    const groups = new Map();

    variants.forEach((variant, index) => {
      const colorName = String(variant.color || variant.label || '').trim() || `Color option ${index + 1}`;
      const key = colorName.toLowerCase();
      const existing = groups.get(key) || {
        color: colorName,
        primaryIndex: index,
        variants: [],
      };

      existing.variants.push({ variant, index });
      groups.set(key, existing);
    });

    return [...groups.values()];
  }, [variants]);

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

  const updateGalleryImages = (images) => {
    setError('');
    setSuccess('');
    setForm((currentForm) => setProductFormGalleryImages(currentForm, images.slice(0, MAX_GALLERY_IMAGES)));
  };

  const handleGalleryUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (files.length === 0) {
      return;
    }

    const availableSlots = Math.max(0, MAX_GALLERY_IMAGES - galleryImages.length);

    if (availableSlots === 0) {
      setError(`A product can have up to ${MAX_GALLERY_IMAGES} images.`);
      return;
    }

    setError('');
    setSuccess('');
    const selectedFiles = files.slice(0, availableSlots);
    const invalidFile = selectedFiles.find((file) => !file.type.startsWith('image/') || file.size > MAX_UPLOAD_BYTES);

    if (invalidFile) {
      setError(
        !invalidFile.type.startsWith('image/')
          ? `${invalidFile.name} is not an image file.`
          : `${invalidFile.name} is larger than 8MB.`
      );
      return;
    }

    setUploadStatus(`Uploading ${selectedFiles.length} image${selectedFiles.length === 1 ? '' : 's'} to Cloudinary...`);

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('images', file));
      const { data } = await axios.post('/api/products/images', formData, {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      const uploadedImages = data.images || [];

      updateGalleryImages([...galleryImages, ...uploadedImages]);
      setUploadStatus(`Added ${uploadedImages.length} Cloudinary image${uploadedImages.length === 1 ? '' : 's'} to the gallery.`);
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || uploadError.message || 'Unable to upload product images.');
      setUploadStatus('');
    }
  };

  const addGalleryUrl = async () => {
    const nextUrl = imageUrlInput.trim();

    if (!nextUrl) {
      return;
    }

    if (galleryImages.length >= MAX_GALLERY_IMAGES) {
      setError(`A product can have up to ${MAX_GALLERY_IMAGES} images.`);
      return;
    }

    setError('');
    setSuccess('');
    setUploadStatus('Importing image URL into Cloudinary...');

    try {
      const { data } = await axios.post(
        '/api/products/images',
        { sourceUrl: nextUrl },
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const [uploadedImage] = data.images || [];

      if (uploadedImage) {
        updateGalleryImages([...galleryImages, uploadedImage]);
        setImageUrlInput('');
        setUploadStatus('Image URL imported to Cloudinary and added to the gallery.');
      }
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || uploadError.message || 'Unable to import that image URL.');
      setUploadStatus('');
    }
  };

  const removeGalleryImage = async (image) => {
    const publicId = image.publicId || '';
    updateGalleryImages(galleryImages.filter((galleryImage) => getAssetKey(galleryImage) !== getAssetKey(image)));

    if (publicId && !persistedImagePublicIds.has(publicId)) {
      try {
        await axios.delete('/api/products/images', {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
          data: { publicId },
        });
        setUploadStatus('Unsaved Cloudinary image removed.');
      } catch (deleteError) {
        setUploadStatus('');
        setError(deleteError.response?.data?.message || 'Image removed from the form, but Cloudinary cleanup failed.');
      }
      return;
    }

    setUploadStatus(publicId ? 'Image will be deleted from Cloudinary when you save.' : 'Image removed from the gallery.');
  };

  const moveGalleryImage = (image, direction) => {
    const currentIndex = galleryImages.findIndex((galleryImage) => getAssetKey(galleryImage) === getAssetKey(image));
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= galleryImages.length) {
      return;
    }

    const nextImages = [...galleryImages];
    [nextImages[currentIndex], nextImages[nextIndex]] = [nextImages[nextIndex], nextImages[currentIndex]];
    updateGalleryImages(nextImages);
  };

  const setPrimaryGalleryImage = (image) => {
    updateGalleryImages([image, ...galleryImages.filter((galleryImage) => getAssetKey(galleryImage) !== getAssetKey(image))]);
    setUploadStatus('Primary product image updated.');
  };

  const updateVariants = (updater) => {
    setError('');
    setSuccess('');
    setForm((currentForm) => {
      const currentVariants = parseVariantsJson(currentForm.variantsJson);
      const nextVariants = typeof updater === 'function' ? updater(currentVariants) : updater;

      return {
        ...currentForm,
        variantsJson: JSON.stringify(nextVariants, null, 2),
      };
    });
  };

  const addVariant = () => {
    updateVariants((currentVariants) => [
      ...currentVariants,
      {
        label: `Color option ${currentVariants.length + 1}`,
        sku: '',
        size: '',
        color: '',
        availableSizes: [],
        image: '',
        imagePublicId: '',
        images: [],
        weight: '',
        packaging: '',
        price: Number(form.price || 0),
        priceAdjustment: 0,
        countInStock: 0,
        lowStockThreshold: 5,
        isActive: true,
      },
    ]);
  };

  const updateVariantField = (variantIndex, field, value) => {
    updateVariants((currentVariants) =>
      currentVariants.map((variant, index) => (
        index === variantIndex
          ? {
              ...variant,
              [field]: value,
            }
          : variant
      ))
    );
  };

  const updateColorGroupField = (group, field, value) => {
    const nextColor = String(value || '').trim();

    updateVariants((currentVariants) =>
      currentVariants.map((variant, index) => {
        const isInGroup = group.variants.some((entry) => entry.index === index);

        if (!isInGroup) {
          return variant;
        }

        if (field === 'color') {
          return {
            ...variant,
            color: nextColor,
            label: variant.size && nextColor ? `${nextColor} / ${variant.size}` : nextColor || variant.label,
          };
        }

        return {
          ...variant,
          [field]: value,
        };
      })
    );
  };

  const getCombinationIndex = (colorName, sizeName) =>
    variants.findIndex((variant) =>
      String(variant.color || variant.label || '').trim().toLowerCase() === String(colorName || '').trim().toLowerCase() &&
        String(variant.size || '').trim().toLowerCase() === String(sizeName || '').trim().toLowerCase()
    );

  const getSizeOptionByName = (sizeName) =>
    (form.sizes || []).find((sizeOption) => String(sizeOption.size || '') === String(sizeName || '')) || null;

  const updateCombinationField = (variantIndex, field, value) => {
    updateVariantField(variantIndex, field, value);
  };

  const toggleCombinationForColor = (group, sizeName) => {
    const colorName = String(group.color || '').trim();

    if (!colorName || !sizeName) {
      return;
    }

    const existingIndex = getCombinationIndex(colorName, sizeName);

    updateVariants((currentVariants) => {
      if (existingIndex >= 0) {
        const groupIndexes = group.variants.map((entry) => entry.index);

        if (groupIndexes.length === 1) {
          return currentVariants.map((variant, index) =>
            index === existingIndex
              ? {
                  ...variant,
                  size: '',
                  label: colorName,
                  sku: '',
                  countInStock: 0,
                }
              : variant
          );
        }

        return currentVariants.filter((_, index) => index !== existingIndex);
      }

      const sizeOption = getSizeOptionByName(sizeName);
      const placeholderIndex = group.variants.find((entry) => !entry.variant.size)?.index;

      if (placeholderIndex !== undefined) {
        return currentVariants.map((variant, index) =>
          index === placeholderIndex
            ? {
                ...variant,
                label: `${colorName} / ${sizeName}`,
                color: colorName,
                size: sizeName,
                price: Number(sizeOption?.price || form.price || 0),
                countInStock: 0,
                sku: variant.sku || '',
                isActive: true,
              }
            : variant
        );
      }

      return [
        ...currentVariants,
        {
          label: `${colorName} / ${sizeName}`,
          color: colorName,
          size: sizeName,
          sku: '',
          image: '',
          imagePublicId: '',
          images: [],
          weight: '',
          packaging: '',
          price: Number(sizeOption?.price || form.price || 0),
          priceAdjustment: 0,
          countInStock: 0,
          reservedStock: 0,
          lowStockThreshold: 5,
          isActive: true,
        },
      ];
    });
  };

  const updateVariantImages = (variantIndex, images) => {
    updateVariants((currentVariants) =>
      currentVariants.map((variant, index) => (
        index === variantIndex
          ? setVariantImageAssets(variant, images.slice(0, MAX_VARIANT_IMAGES))
          : variant
      ))
    );
  };

  const handleVariantImageUpload = async (variantIndex, event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';

    if (files.length === 0) {
      return;
    }

    const variant = variants[variantIndex];
    const variantImages = getVariantImageAssets(variant);
    const availableSlots = Math.max(0, MAX_VARIANT_IMAGES - variantImages.length);

    if (availableSlots === 0) {
      setError(`A variant can have up to ${MAX_VARIANT_IMAGES} images.`);
      return;
    }

    const selectedFiles = files.slice(0, availableSlots);
    const invalidFile = selectedFiles.find((file) => !file.type.startsWith('image/') || file.size > MAX_UPLOAD_BYTES);

    if (invalidFile) {
      setError(
        !invalidFile.type.startsWith('image/')
          ? `${invalidFile.name} is not an image file.`
          : `${invalidFile.name} is larger than 8MB.`
      );
      return;
    }

    setError('');
    setSuccess('');
    setVariantUploadStatus((currentStatus) => ({
      ...currentStatus,
      [variantIndex]: `Uploading ${selectedFiles.length} variant image${selectedFiles.length === 1 ? '' : 's'}...`,
    }));

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append('images', file));
      const { data } = await axios.post('/api/products/images', formData, {
        headers: {
          Authorization: `Bearer ${userInfo.token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      const uploadedImages = data.images || [];

      updateVariantImages(variantIndex, [...variantImages, ...uploadedImages]);
      setVariantUploadStatus((currentStatus) => ({
        ...currentStatus,
        [variantIndex]: `Added ${uploadedImages.length} color image${uploadedImages.length === 1 ? '' : 's'}.`,
      }));
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || uploadError.message || 'Unable to upload variant images.');
      setVariantUploadStatus((currentStatus) => ({
        ...currentStatus,
        [variantIndex]: '',
      }));
    }
  };

  const addVariantImageUrl = async (variantIndex) => {
    const nextUrl = String(variantImageUrlInputs[variantIndex] || '').trim();

    if (!nextUrl) {
      return;
    }

    const variantImages = getVariantImageAssets(variants[variantIndex]);

    if (variantImages.length >= MAX_VARIANT_IMAGES) {
      setError(`A variant can have up to ${MAX_VARIANT_IMAGES} images.`);
      return;
    }

    setError('');
    setSuccess('');
    setVariantUploadStatus((currentStatus) => ({
      ...currentStatus,
      [variantIndex]: 'Importing variant image URL into Cloudinary...',
    }));

    try {
      const { data } = await axios.post(
        '/api/products/images',
        { sourceUrl: nextUrl },
        {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const [uploadedImage] = data.images || [];

      if (uploadedImage) {
        updateVariantImages(variantIndex, [...variantImages, uploadedImage]);
        setVariantImageUrlInputs((currentInputs) => ({
          ...currentInputs,
          [variantIndex]: '',
        }));
        setVariantUploadStatus((currentStatus) => ({
          ...currentStatus,
          [variantIndex]: 'Variant image URL imported to Cloudinary.',
        }));
      }
    } catch (uploadError) {
      setError(uploadError.response?.data?.message || uploadError.message || 'Unable to import that variant image URL.');
      setVariantUploadStatus((currentStatus) => ({
        ...currentStatus,
        [variantIndex]: '',
      }));
    }
  };

  const removeVariantImage = async (variantIndex, image) => {
    const publicId = image.publicId || '';
    const variantImages = getVariantImageAssets(variants[variantIndex]);
    updateVariantImages(
      variantIndex,
      variantImages.filter((variantImage) => getAssetKey(variantImage) !== getAssetKey(image))
    );

    if (publicId && !persistedImagePublicIds.has(publicId)) {
      try {
        await axios.delete('/api/products/images', {
          headers: {
            Authorization: `Bearer ${userInfo.token}`,
          },
          data: { publicId },
        });
      } catch (deleteError) {
        setError(deleteError.response?.data?.message || 'Variant image removed from the form, but Cloudinary cleanup failed.');
      }
    }
  };

  const moveVariantImage = (variantIndex, image, direction) => {
    const variantImages = getVariantImageAssets(variants[variantIndex]);
    const currentIndex = variantImages.findIndex((variantImage) => getAssetKey(variantImage) === getAssetKey(image));
    const nextIndex = currentIndex + direction;

    if (currentIndex < 0 || nextIndex < 0 || nextIndex >= variantImages.length) {
      return;
    }

    const nextImages = [...variantImages];
    [nextImages[currentIndex], nextImages[nextIndex]] = [nextImages[nextIndex], nextImages[currentIndex]];
    updateVariantImages(variantIndex, nextImages);
  };

  const setPrimaryVariantImage = (variantIndex, image) => {
    const variantImages = getVariantImageAssets(variants[variantIndex]);
    updateVariantImages(
      variantIndex,
      [image, ...variantImages.filter((variantImage) => getAssetKey(variantImage) !== getAssetKey(image))]
    );
  };

  const updateSizeOption = (sizeIndex, fields) => {
    setError('');
    setSuccess('');
    setForm((currentForm) => {
      const nextSizes = [...(currentForm.sizes || [])];
      nextSizes[sizeIndex] = {
        ...nextSizes[sizeIndex],
        ...fields,
      };

      return {
        ...currentForm,
        sizes: nextSizes,
      };
    });
  };

  const addSizeOption = (size = '') => {
    setForm((currentForm) => ({
      ...currentForm,
      hasSizes: true,
      sizes: [
        ...(currentForm.sizes || []),
        {
          size,
          price: Number(currentForm.price || 0),
          countInStock: 0,
          colors: [],
        },
      ],
    }));
  };

  const setSizePreset = (sizes) => {
    setForm((currentForm) => ({
      ...currentForm,
      hasSizes: true,
      sizes: sizes.map((size) => ({
        size,
        price: Number(currentForm.price || 0),
        countInStock: 0,
        colors: [],
      })),
    }));
  };

  const getSizesForColor = (colorName) =>
    variants
      .filter((variant) =>
        String(variant.color || variant.label || '').trim().toLowerCase() === String(colorName || '').trim().toLowerCase() &&
          String(variant.size || '').trim()
      )
      .map((variant) => variant.size);

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
        const { data } = await axios.put(`/api/products/${id}`, payload, config);
        const { form: nextForm, replacedCategory } = reconcileProductCategorySelection(
          buildProductFormFromProduct(data),
          categories
        );
        setForm(nextForm);
        setCategoryNotice(
          replacedCategory
            ? replacedCategory === 'missing primary category'
              ? 'Saved primary category was missing, so a valid assigned category was selected.'
              : `Saved primary category "${replacedCategory}" no longer exists, so a valid assigned category was selected.`
            : ''
        );
        setPersistedImagePublicIds(new Set(getFormPublicIds(nextForm)));
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
      <div className="flex min-h-[70vh] flex-col items-center justify-center bg-[#fff7ee]">
        <div className="h-14 w-14 animate-spin rounded-full border-b-2 border-t-2 border-brand-accent" />
        <p className="mt-4 font-serif text-xl text-brand-dark">
          {isEditMode ? 'Loading product editor...' : 'Preparing a new product form...'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff7ee] pt-4 md:pt-6 pb-16">
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
              to={buildProductPath({ _id: id, slug: form.slug, name: form.name })}
              className="inline-flex items-center rounded-full border border-brand-primary/20 px-4 py-2 text-sm font-semibold uppercase tracking-[0.16em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
            >
              View Public Product
            </Link>
          )}
        </div>

        <div className="rounded-2xl bg-brand-dark px-5 py-4 text-white shadow-lg sm:px-8 sm:py-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-brand-accent sm:text-xs">
            {isEditMode ? 'Edit Product' : 'Add Product'}
          </p>
          <h1 className="mt-1 font-serif text-2xl font-bold sm:text-3xl">
            {isEditMode ? 'Refine product details' : 'Launch a new product'}
          </h1>
        </div>

        <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <form
            onSubmit={submitHandler}
            className="space-y-8 rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(53, 26, 17,0.08)] sm:p-8"
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
                    className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
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
                    className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-gray-400 focus:border-brand-accent"
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
                      setCategoryNotice('');
                      setForm((currentForm) => ({
                        ...currentForm,
                        category: nextValue,
                        categories: getUniqueCategoryNames([
                          nextValue,
                          ...(currentForm.categories || []).filter((categoryName) => categoryName !== currentForm.category),
                        ]),
                      }));
                    }}
                    options={categorySelectOptions}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Primary category controls the product breadcrumb and main catalog label.
                  </p>
                  {categoryNotice ? (
                    <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      {categoryNotice}
                    </p>
                  ) : null}
                </div>

                <div className="md:col-span-2">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-sm font-semibold text-brand-dark">
                      Additional Categories
                    </label>
                    <span className="text-xs text-gray-500">
                      {Math.max(assignedCategoryNames.size - (form.category ? 1 : 0), 0)} extra selected
                    </span>
                  </div>
                  <div className="grid gap-2 rounded-2xl border border-gray-200 bg-[#fff7ee] p-3 sm:grid-cols-2">
                    {additionalCategoryOptions.length > 0 ? (
                      additionalCategoryOptions.map((category) => {
                        const isChecked = assignedCategoryNames.has(category.name);
                        const fullPath = categoryPathMap.get(category._id) || category.name;

                        return (
                          <label
                            key={category._id}
                            className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition-colors ${
                              isChecked
                                ? 'border-brand-primary bg-white text-brand-dark'
                                : 'border-transparent bg-white/50 text-gray-600 hover:border-brand-accent/40 hover:bg-white'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(event) => {
                                setError('');
                                setSuccess('');
                                setForm((currentForm) => {
                                  const currentCategories = getUniqueCategoryNames([
                                    currentForm.category,
                                    ...(currentForm.categories || []),
                                  ]);
                                  const nextCategories = event.target.checked
                                    ? getUniqueCategoryNames([...currentCategories, category.name])
                                    : currentCategories.filter((categoryName) => categoryName !== category.name);

                                  return {
                                    ...currentForm,
                                    categories: nextCategories,
                                  };
                                });
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-accent"
                            />
                            <span className="min-w-0 flex-1 truncate">
                              {fullPath}{category.isActive ? '' : ' (Inactive)'}
                            </span>
                          </label>
                        );
                      })
                    ) : (
                      <p className="rounded-xl bg-white px-3 py-4 text-sm text-gray-500">
                        Add more categories first to attach this product to multiple places.
                      </p>
                    )}
                  </div>
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
                    className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
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
                    className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
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
                    className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
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
                    className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
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
                    className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
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
                    className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
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
                    className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                  />
                </div>
              </div>
            </section>

            <section className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Media & Story</p>
                <h2 className="mt-2 font-serif text-2xl font-bold text-brand-dark">Visuals and selling copy</h2>
              </div>

              <div className="rounded-[24px] border border-[#ead6c6] bg-[#fffaf4] p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-brand-dark">Product Image Gallery</p>
                    <p className="mt-1 text-xs leading-6 text-gray-500">
                      Upload optimized product photos or add image URLs. The first image is the primary storefront image.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-brand-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors duration-200 hover:bg-brand-dark">
                      <UploadCloud size={16} className="mr-2" />
                      Upload
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleGalleryUpload}
                        className="sr-only"
                      />
                    </label>
                    <span className="text-xs font-semibold text-gray-500">
                      {galleryImages.length}/{MAX_GALLERY_IMAGES} images
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                  <input
                    type="url"
                    value={imageUrlInput}
                    onChange={(event) => setImageUrlInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void addGalleryUrl();
                      }
                    }}
                    placeholder="Paste an image URL and add it to the gallery"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-brand-dark outline-none transition placeholder:text-gray-400 focus:border-brand-accent"
                  />
                  <button
                    type="button"
                    onClick={() => void addGalleryUrl()}
                    className="inline-flex items-center justify-center rounded-xl border border-brand-primary/20 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                  >
                    <ImagePlus size={16} className="mr-2" />
                    Add URL
                  </button>
                </div>

                {uploadStatus && (
                  <p className="mt-3 rounded-xl bg-[#f5e7da] px-4 py-2 text-xs font-semibold text-[#744126]">
                    {uploadStatus}
                  </p>
                )}

                <div className="mt-5">
                  {galleryImages.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {galleryImages.map((image, index) => {
                        const imageUrl = getProductImageUrl(image);
                        const imageKey = getAssetKey(image);

                        return (
                        <article
                          key={imageKey}
                          className="overflow-hidden rounded-[20px] border border-[#ead6c6] bg-white shadow-sm"
                        >
                          <div className="relative aspect-[4/3] bg-[#f4e7db]">
                            <img
                              src={imageUrl}
                              alt={`${form.name || 'Product'} gallery image ${index + 1}`}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                            {index === 0 && (
                              <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-brand-primary px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white shadow">
                                <Star size={12} className="mr-1" />
                                Primary
                              </span>
                            )}
                          </div>

                          <div className="grid grid-cols-5 gap-2 p-3">
                            <button
                              type="button"
                              onClick={() => setPrimaryGalleryImage(image)}
                              disabled={index === 0}
                              title="Set as primary image"
                              className="inline-flex h-10 items-center justify-center rounded-lg border border-[#ead6c6] text-brand-primary transition-colors hover:bg-[#fff7ee] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Star size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveGalleryImage(image, -1)}
                              disabled={index === 0}
                              title="Move image up"
                              className="inline-flex h-10 items-center justify-center rounded-lg border border-[#ead6c6] text-brand-primary transition-colors hover:bg-[#fff7ee] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ArrowUp size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveGalleryImage(image, 1)}
                              disabled={index === galleryImages.length - 1}
                              title="Move image down"
                              className="inline-flex h-10 items-center justify-center rounded-lg border border-[#ead6c6] text-brand-primary transition-colors hover:bg-[#fff7ee] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <ArrowDown size={15} />
                            </button>
                            <a
                              href={imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Open image"
                              className="inline-flex h-10 items-center justify-center rounded-lg border border-[#ead6c6] text-brand-primary transition-colors hover:bg-[#fff7ee]"
                            >
                              <Sparkles size={15} />
                            </a>
                            <button
                              type="button"
                              onClick={() => void removeGalleryImage(image)}
                              title="Remove image"
                              className="inline-flex h-10 items-center justify-center rounded-lg border border-red-100 text-red-600 transition-colors hover:bg-red-50"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </article>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-brand-accent/30 bg-white px-4 py-10 text-center text-sm text-gray-500">
                      Upload product images or add URLs to build the gallery.
                    </div>
                  )}
                </div>
              </div>

              {/* Product Sizes Management Section */}
              <div className="rounded-[24px] border border-[#ead6c6] bg-[#fffaf4] p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Size Options</p>
                    <h3 className="mt-1 font-serif text-xl font-bold text-brand-dark">Dedicated size pricing and stock</h3>
                    <p className="mt-1 text-xs leading-6 text-gray-500">
                      Each size has its own storefront price, stock quantity, and available colors.
                    </p>
                  </div>

                  <label className="inline-flex shrink-0 items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-wider text-brand-dark shadow-xs cursor-pointer">
                    <input
                      type="checkbox"
                      name="hasSizes"
                      checked={Boolean(form.hasSizes)}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setForm((prev) => ({
                          ...prev,
                          hasSizes: isChecked,
                          sizes: isChecked && (!prev.sizes || prev.sizes.length === 0)
                            ? [
                                { size: 'S', price: Number(prev.price || 0), countInStock: 10, colors: [] },
                                { size: 'M', price: Number(prev.price || 0), countInStock: 15, colors: [] },
                                { size: 'L', price: Number(prev.price || 0), countInStock: 10, colors: [] },
                              ]
                            : prev.sizes || [],
                        }));
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-accent"
                    />
                    Enable Size Selection
                  </label>
                </div>

                {form.hasSizes && (
                  <div className="mt-5 border-t border-[#ead6c6] pt-5">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-600">Quick Presets</span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setSizePreset(['S', 'M', 'L', 'XL', 'XXL'])}
                          className="rounded-full border border-brand-primary/30 bg-white px-3 py-1 text-xs font-semibold text-brand-primary hover:bg-brand-primary hover:text-white transition"
                        >
                          Clothing (S - XXL)
                        </button>
                        <button
                          type="button"
                          onClick={() => setSizePreset(['IND-4', 'IND-5', 'IND-6', 'IND-7', 'IND-8', 'IND-9'])}
                          className="rounded-full border border-brand-primary/30 bg-white px-3 py-1 text-xs font-semibold text-brand-primary hover:bg-brand-primary hover:text-white transition"
                        >
                          Shoes (IND 4 - 9)
                        </button>
                        <button
                          type="button"
                          onClick={() => addSizeOption()}
                          className="inline-flex items-center rounded-full bg-brand-primary px-3 py-1 text-xs font-semibold text-white hover:bg-brand-dark transition"
                        >
                          <Plus size={14} className="mr-1" /> Add Custom Size
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {(form.sizes || []).map((sizeItem, sizeIndex) => (
                        <div
                          key={`size-${sizeIndex}`}
                          className="rounded-2xl border border-gray-200 bg-white p-4 shadow-xs space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-gray-100 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Size:</span>
                              <input
                                type="text"
                                placeholder="e.g. S / IND-6"
                                value={sizeItem.size}
                                onChange={(e) => {
                                  const newSizeVal = e.target.value;
                                  updateSizeOption(sizeIndex, { size: newSizeVal });
                                }}
                                className="w-32 rounded-xl border border-gray-200 bg-[#fff7ee] px-3 py-1.5 text-xs font-bold text-brand-dark outline-none focus:border-brand-accent"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setForm((prev) => ({
                                  ...prev,
                                  sizes: (prev.sizes || []).filter((_, idx) => idx !== sizeIndex),
                                }));
                              }}
                              className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition"
                              title="Remove size"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                Size Price (LKR)
                              </span>
                              <input
                                type="number"
                                min="0"
                                placeholder={`Base: ${form.price || 0}`}
                                value={sizeItem.price || ''}
                                onChange={(e) => {
                                  const val = Number(e.target.value) || 0;
                                  updateSizeOption(sizeIndex, { price: val });
                                }}
                                className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-3 py-2 text-xs font-bold text-brand-dark outline-none focus:border-brand-accent"
                              />
                            </label>

                            <label className="block">
                              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                Stock Quantity
                              </span>
                              <input
                                type="number"
                                min="0"
                                value={sizeItem.countInStock ?? 0}
                                onChange={(e) => {
                                  const val = Math.max(0, Number(e.target.value) || 0);
                                  updateSizeOption(sizeIndex, { countInStock: val });
                                }}
                                className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-3 py-2 text-xs font-bold text-brand-dark outline-none focus:border-brand-accent"
                              />
                            </label>
                          </div>

                          <div>
                            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                              Linked Colors
                            </span>
                            <p className="rounded-xl border border-gray-200 bg-[#fff7ee] px-3 py-2 text-xs font-semibold text-brand-dark">
                              {variants
                                .filter((variant) => String(variant.size || '') === String(sizeItem.size || ''))
                                .map((variant) => variant.color || variant.label)
                                .filter(Boolean)
                                .join(', ') || 'No colors linked yet'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-[#ead6c6] bg-[#fffaf4] p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Color Options</p>
                    <h3 className="mt-1 font-serif text-xl font-bold text-brand-dark">Colors linked to sizes</h3>
                    <p className="mt-1 text-xs leading-6 text-gray-500">
                      Keep colors separate from size pricing and stock. Link each color to the sizes where it is available.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="inline-flex items-center justify-center rounded-xl bg-brand-primary px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors duration-200 hover:bg-brand-dark"
                  >
                    <Plus size={16} className="mr-2" />
                    Add Variant
                  </button>
                </div>

                <div className="mt-5 space-y-5">
                  {colorGroups.length === 0 ? (
                    <div className="rounded-[20px] border border-dashed border-brand-accent/30 bg-white px-4 py-10 text-center text-sm text-gray-500">
                      No colors yet. Add a color option when a product has selectable colors or color-specific images.
                    </div>
                  ) : (
                    colorGroups.map((group) => {
                      const representative = variants[group.primaryIndex] || {};
                      const linkedSizes = getSizesForColor(group.color);

                      return (
                        <article
                          key={group.color}
                          className="rounded-[22px] border border-[#ead6c6] bg-white p-4 shadow-sm"
                        >
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="grid flex-1 gap-4 md:grid-cols-2">
                              <label className="block">
                                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                                  Color Name
                                </span>
                                <input
                                  type="text"
                                  value={representative.color || representative.label || ''}
                                  onChange={(event) => updateColorGroupField(group, 'color', event.target.value)}
                                  placeholder="Pink, Black, Tan..."
                                  className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
                                />
                              </label>

                              <div>
                                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.18em] text-gray-500">
                                  Available Sizes
                                </span>
                                {(form.sizes || []).length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {(form.sizes || []).map((sizeOption) => {
                                      const isLinked = linkedSizes.some((size) => size === sizeOption.size);

                                      return (
                                        <button
                                          key={`${group.color}-${sizeOption.size}`}
                                          type="button"
                                          disabled={!String(representative.color || representative.label || '').trim()}
                                          onClick={() => toggleCombinationForColor(group, sizeOption.size)}
                                          className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                                            isLinked
                                              ? 'border-brand-primary bg-brand-primary text-white'
                                              : 'border-gray-200 bg-[#fff7ee] text-brand-dark hover:border-brand-primary'
                                          } disabled:cursor-not-allowed disabled:opacity-50`}
                                        >
                                          {sizeOption.size}
                                        </button>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="rounded-xl border border-dashed border-brand-accent/30 bg-[#fff7ee] px-4 py-3 text-xs text-gray-500">
                                    Add size options first to link this color to available sizes.
                                  </p>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => {
                                updateVariants((currentVariants) =>
                                  currentVariants.filter((_, index) => !group.variants.some((entry) => entry.index === index))
                                );
                              }}
                              className="inline-flex items-center justify-center rounded-xl border border-red-100 px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-red-600 transition-colors hover:bg-red-50"
                            >
                              <Trash2 size={15} className="mr-2" />
                              Remove Color
                            </button>
                          </div>

                          <div className="mt-5 space-y-4">
                            {group.variants.filter(({ variant }) => variant.size).length > 0 ? (
                              group.variants
                                .filter(({ variant }) => variant.size)
                                .map(({ variant, index: variantIndex }) => {
                                  const variantImages = getVariantImageAssets(variant);

                                  return (
                                    <div
                                      key={variant._id || `${group.color}-${variant.size}`}
                                      className="rounded-[20px] border border-[#ead6c6] bg-[#fffaf4] p-4"
                                    >
                                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-accent">
                                            {group.color} / {variant.size}
                                          </p>
                                          <p className="mt-1 text-xs text-gray-500">
                                            Define overrides for this exact purchasable option.
                                          </p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => toggleCombinationForColor(group, variant.size)}
                                          className="inline-flex items-center justify-center rounded-xl border border-red-100 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-red-600 transition-colors hover:bg-red-50"
                                        >
                                          <Trash2 size={14} className="mr-2" />
                                          Remove
                                        </button>
                                      </div>

                                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                                        <label className="block">
                                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                            Price
                                          </span>
                                          <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={variant.price ?? ''}
                                            onChange={(event) =>
                                              updateCombinationField(variantIndex, 'price', Number(event.target.value) || 0)
                                            }
                                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-brand-dark outline-none focus:border-brand-accent"
                                          />
                                        </label>

                                        <label className="block">
                                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                            Stock
                                          </span>
                                          <input
                                            type="number"
                                            min="0"
                                            value={variant.countInStock ?? 0}
                                            onChange={(event) =>
                                              updateCombinationField(variantIndex, 'countInStock', Math.max(0, Number(event.target.value) || 0))
                                            }
                                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-brand-dark outline-none focus:border-brand-accent"
                                          />
                                        </label>

                                        <label className="block">
                                          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                            SKU
                                          </span>
                                          <input
                                            type="text"
                                            value={variant.sku || ''}
                                            onChange={(event) => updateCombinationField(variantIndex, 'sku', event.target.value)}
                                            placeholder="SKU-PNK-IND5"
                                            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-brand-dark outline-none focus:border-brand-accent"
                                          />
                                        </label>
                                      </div>

                                      <div className="mt-4 rounded-[18px] bg-white p-3">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                          <div>
                                            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-accent">
                                              Combination Images
                                            </p>
                                            <p className="mt-1 text-xs text-gray-500">
                                              {variantImages.length}/{MAX_VARIANT_IMAGES} images for this size and color.
                                            </p>
                                          </div>
                                          <label className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-white transition-colors duration-200 hover:bg-brand-dark">
                                            <UploadCloud size={16} className="mr-2" />
                                            Upload
                                            <input
                                              type="file"
                                              accept="image/*"
                                              multiple
                                              onChange={(event) => void handleVariantImageUpload(variantIndex, event)}
                                              className="sr-only"
                                            />
                                          </label>
                                        </div>

                                        <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                                          <input
                                            type="url"
                                            value={variantImageUrlInputs[variantIndex] || ''}
                                            onChange={(event) =>
                                              setVariantImageUrlInputs((currentInputs) => ({
                                                ...currentInputs,
                                                [variantIndex]: event.target.value,
                                              }))
                                            }
                                            onKeyDown={(event) => {
                                              if (event.key === 'Enter') {
                                                event.preventDefault();
                                                void addVariantImageUrl(variantIndex);
                                              }
                                            }}
                                            placeholder="Paste an image URL for this combination"
                                            className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-3 py-2 text-xs text-brand-dark outline-none placeholder:text-gray-400 focus:border-brand-accent"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => void addVariantImageUrl(variantIndex)}
                                            className="inline-flex items-center justify-center rounded-xl border border-brand-primary/20 px-4 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-brand-primary transition-colors duration-200 hover:bg-brand-primary hover:text-white"
                                          >
                                            <ImagePlus size={16} className="mr-2" />
                                            Add URL
                                          </button>
                                        </div>

                                        {variantImages.length > 0 && (
                                          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                            {variantImages.map((image, imageIndex) => {
                                              const imageUrl = getProductImageUrl(image);
                                              const imageKey = getAssetKey(image);

                                              return (
                                                <article
                                                  key={imageKey}
                                                  className="overflow-hidden rounded-[16px] border border-[#ead6c6] bg-white"
                                                >
                                                  <div className="relative aspect-square bg-[#f4e7db]">
                                                    <img
                                                      src={imageUrl}
                                                      alt={`${variant.label || 'Combination'} image ${imageIndex + 1}`}
                                                      loading="lazy"
                                                      className="h-full w-full object-cover"
                                                    />
                                                    {imageIndex === 0 && (
                                                      <span className="absolute left-2 top-2 rounded-full bg-brand-primary px-2 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white">
                                                        Primary
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="grid grid-cols-4 gap-1.5 p-2">
                                                    <button
                                                      type="button"
                                                      onClick={() => setPrimaryVariantImage(variantIndex, image)}
                                                      disabled={imageIndex === 0}
                                                      title="Set as primary image"
                                                      className="inline-flex h-8 items-center justify-center rounded-lg border border-[#ead6c6] text-brand-primary hover:bg-[#fff7ee] disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                      <Star size={13} />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => moveVariantImage(variantIndex, image, -1)}
                                                      disabled={imageIndex === 0}
                                                      title="Move image up"
                                                      className="inline-flex h-8 items-center justify-center rounded-lg border border-[#ead6c6] text-brand-primary hover:bg-[#fff7ee] disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                      <ArrowUp size={13} />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => moveVariantImage(variantIndex, image, 1)}
                                                      disabled={imageIndex === variantImages.length - 1}
                                                      title="Move image down"
                                                      className="inline-flex h-8 items-center justify-center rounded-lg border border-[#ead6c6] text-brand-primary hover:bg-[#fff7ee] disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                      <ArrowDown size={13} />
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => void removeVariantImage(variantIndex, image)}
                                                      title="Remove image"
                                                      className="inline-flex h-8 items-center justify-center rounded-lg border border-red-100 text-red-600 hover:bg-red-50"
                                                    >
                                                      <Trash2 size={13} />
                                                    </button>
                                                  </div>
                                                </article>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })
                            ) : (
                              <div className="rounded-[18px] border border-dashed border-brand-accent/30 bg-[#fff7ee] px-4 py-8 text-center text-xs text-gray-500">
                                Select one or more sizes for this color to create purchasable combinations.
                              </div>
                            )}
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
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
                  className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
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
                  className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
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
                    className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
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
                    className="w-full rounded-xl border border-gray-200 bg-[#fff7ee] px-4 py-3 text-sm text-brand-dark outline-none transition focus:border-brand-accent"
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
                    className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-[#fff7ee] px-4 py-4 text-sm font-semibold text-brand-dark"
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
            <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(53, 26, 17,0.08)]">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-accent">Live Preview</p>
              <h2 className="mt-2 font-serif text-2xl font-bold text-brand-dark">Storefront impression</h2>

              <div className="mt-5 overflow-hidden rounded-[24px] border border-[#ead6c6] bg-[#f8efe6]">
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
                    <span className="rounded-full bg-[#f0dfd0] px-3 py-1 text-xs font-semibold text-[#744126]">
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

            <section className="rounded-[28px] bg-white p-6 shadow-[0_18px_40px_rgba(53, 26, 17,0.08)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#f5e7da] text-brand-primary">
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
