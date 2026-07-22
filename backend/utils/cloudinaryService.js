import { Readable } from 'stream';
import { v2 as cloudinary } from 'cloudinary';

const getProductImageFolder = () => process.env.CLOUDINARY_PRODUCT_FOLDER || 'apex-fashion/products';

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

const configureCloudinary = () => {
  if (!isCloudinaryConfigured()) {
    return false;
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  return true;
};

const buildOptimizedImageUrl = (uploadResult) =>
  cloudinary.url(uploadResult.public_id, {
    secure: true,
    version: uploadResult.version,
    transformation: [{ fetch_format: 'auto', quality: 'auto' }],
  });

const uploadStream = (input, options = {}) =>
  new Promise((resolve, reject) => {
    if (!configureCloudinary()) {
      reject(new Error('Cloudinary is not configured'));
      return;
    }

    const stream = cloudinary.uploader.upload_stream(
      {
        folder: getProductImageFolder(),
        resource_type: 'image',
        overwrite: false,
        unique_filename: true,
        use_filename: true,
        ...options,
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(result);
      }
    );

    if (Buffer.isBuffer(input)) {
      Readable.from(input).pipe(stream);
      return;
    }

    stream.end(input);
  });

const formatUploadResult = (result) => ({
  url: buildOptimizedImageUrl(result),
  publicId: result.public_id,
  secureUrl: result.secure_url,
  width: result.width || 0,
  height: result.height || 0,
  bytes: result.bytes || 0,
  format: result.format || '',
});

const uploadProductImageBuffer = async (buffer, { originalName = '' } = {}) => {
  const result = await uploadStream(buffer, {
    public_id: originalName ? originalName.replace(/\.[^.]+$/, '') : undefined,
    tags: ['product', 'apex-fashion'],
  });

  return formatUploadResult(result);
};

const uploadProductImageUrl = async (sourceUrl) => {
  if (!configureCloudinary()) {
    throw new Error('Cloudinary is not configured');
  }

  const result = await cloudinary.uploader.upload(sourceUrl, {
    folder: getProductImageFolder(),
    resource_type: 'image',
    overwrite: false,
    unique_filename: true,
    tags: ['product', 'apex-fashion', 'remote-import'],
  });

  return formatUploadResult(result);
};

const destroyProductImage = async (publicId) => {
  if (!publicId || !configureCloudinary()) {
    return null;
  }

  return cloudinary.uploader.destroy(publicId, {
    resource_type: 'image',
    invalidate: true,
  });
};

const destroyProductImages = async (publicIds = []) => {
  const uniquePublicIds = [...new Set(publicIds.map((publicId) => String(publicId || '').trim()).filter(Boolean))];

  if (uniquePublicIds.length === 0) {
    return [];
  }

  return Promise.allSettled(uniquePublicIds.map((publicId) => destroyProductImage(publicId)));
};

export {
  destroyProductImage,
  destroyProductImages,
  getProductImageFolder,
  isCloudinaryConfigured,
  uploadProductImageBuffer,
  uploadProductImageUrl,
};
