import mongoose from 'mongoose';

const categorySchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    image: {
      type: String,
      default: '',
      trim: true,
    },
    imagePublicId: {
      type: String,
      default: '',
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    displayOrder: {
      type: Number,
      default: 0,
    },
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
    },
    seo: {
      title: { type: String, default: '', trim: true },
      description: { type: String, default: '', trim: true },
      keywords: { type: [String], default: [] },
      canonicalUrl: { type: String, default: '', trim: true },
      ogImage: { type: String, default: '', trim: true },
    },
  },
  {
    timestamps: true,
  }
);

categorySchema.index({ isActive: 1, displayOrder: 1, name: 1 });
categorySchema.index({ parentCategory: 1, isActive: 1, displayOrder: 1 });

const Category = mongoose.model('Category', categorySchema);

export default Category;
