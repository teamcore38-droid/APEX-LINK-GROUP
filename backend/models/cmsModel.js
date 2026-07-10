import mongoose from 'mongoose';

const bannerSchema = mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '', trim: true },
    image: { type: String, default: '', trim: true },
    mobileImage: { type: String, default: '', trim: true },
    linkLabel: { type: String, default: '', trim: true },
    linkUrl: { type: String, default: '', trim: true },
    placement: { type: String, default: 'homepage', trim: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    startsAt: { type: Date },
    endsAt: { type: Date },
  },
  { timestamps: true }
);

const homepageSectionSchema = mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '', trim: true },
    body: { type: String, default: '', trim: true },
    image: { type: String, default: '', trim: true },
    sectionType: {
      type: String,
      enum: ['hero', 'collection', 'editorial', 'featured-products', 'testimonials', 'custom'],
      default: 'custom',
    },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

const faqSchema = mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    category: { type: String, default: 'General', trim: true },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const policySchema = mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    summary: { type: String, default: '', trim: true },
    isActive: { type: Boolean, default: true },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

bannerSchema.index({ placement: 1, displayOrder: 1 });
homepageSectionSchema.index({ isActive: 1, displayOrder: 1 });
faqSchema.index({ category: 1, displayOrder: 1 });

const Banner = mongoose.model('Banner', bannerSchema);
const HomepageSection = mongoose.model('HomepageSection', homepageSectionSchema);
const FAQItem = mongoose.model('FAQItem', faqSchema);
const PolicyPage = mongoose.model('PolicyPage', policySchema);

export { Banner, FAQItem, HomepageSection, PolicyPage };
