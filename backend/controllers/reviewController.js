import Product from '../models/productModel.js';
import Review from '../models/reviewModel.js';

const recalculateProductRating = async (productId) => {
  const approvedReviews = await Review.find({ product: productId, status: 'Approved' });
  const numReviews = approvedReviews.length;
  const rating =
    numReviews > 0
      ? approvedReviews.reduce((total, review) => total + Number(review.rating || 0), 0) / numReviews
      : 0;

  await Product.updateOne(
    { _id: productId },
    {
      $set: {
        rating: Number(rating.toFixed(1)),
        numReviews,
      },
    }
  );
};

const getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      product: req.params.productId,
      status: req.user?.isAdmin ? { $in: ['Pending', 'Approved', 'Rejected'] } : 'Approved',
    }).sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('[reviewController:getProductReviews]', error);
    res.status(500).json({ message: 'Unable to load reviews right now' });
  }
};

const createProductReview = async (req, res) => {
  const { rating, comment = '' } = req.body;

  try {
    const product = await Product.findById(req.params.productId);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const parsedRating = Number(rating);

    if (!Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    if (!String(comment).trim()) {
      return res.status(400).json({ message: 'Review comment is required' });
    }

    const review = await Review.findOneAndUpdate(
      { product: product._id, user: req.user._id },
      {
        product: product._id,
        user: req.user._id,
        name: req.user.name,
        rating: parsedRating,
        comment: String(comment).trim(),
        status: 'Pending',
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json(review);
  } catch (error) {
    console.error('[reviewController:createProductReview]', error);
    res.status(500).json({ message: 'Unable to submit review right now' });
  }
};

const getReviewsForModeration = async (req, res) => {
  try {
    const { status = 'Pending' } = req.query;
    const filter = status ? { status } : {};
    const reviews = await Review.find(filter)
      .populate('product', 'name image')
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error('[reviewController:getReviewsForModeration]', error);
    res.status(500).json({ message: 'Unable to load review queue right now' });
  }
};

const moderateReview = async (req, res) => {
  const { status = '' } = req.body;

  try {
    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid review status' });
    }

    const review = await Review.findById(req.params.reviewId);

    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.status = status;
    review.moderatedBy = req.user._id;
    review.moderatedAt = new Date();
    await review.save();
    await recalculateProductRating(review.product);

    res.json(review);
  } catch (error) {
    console.error('[reviewController:moderateReview]', error);
    res.status(500).json({ message: 'Unable to moderate review right now' });
  }
};

export {
  getProductReviews,
  createProductReview,
  getReviewsForModeration,
  moderateReview,
  recalculateProductRating,
};
