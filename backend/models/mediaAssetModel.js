import mongoose from 'mongoose';

const mediaAssetSchema = mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    altText: { type: String, default: '', trim: true },
    type: {
      type: String,
      enum: ['image', 'video', 'document', 'other'],
      default: 'image',
    },
    folder: { type: String, default: 'general', trim: true },
    tags: { type: [String], default: [] },
    mimeType: { type: String, default: '', trim: true },
    sizeBytes: { type: Number, default: 0, min: 0 },
    width: { type: Number, default: 0, min: 0 },
    height: { type: Number, default: 0, min: 0 },
    source: { type: String, default: 'url', trim: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    uploadedByName: { type: String, default: '', trim: true },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

mediaAssetSchema.index({ folder: 1, createdAt: -1 });
mediaAssetSchema.index({ tags: 1 });
mediaAssetSchema.index({ type: 1, isArchived: 1 });

const MediaAsset = mongoose.model('MediaAsset', mediaAssetSchema);

export default MediaAsset;
