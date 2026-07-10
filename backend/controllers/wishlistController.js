import WishlistItem from '../models/wishlistModel.js';
import Product from '../models/productModel.js';

const getWishlist = async (req, res) => {
  try {
    const items = await WishlistItem.find({ user: req.user._id })
      .populate('product')
      .sort({ createdAt: -1 });

    res.json(items.filter((item) => item.product));
  } catch (error) {
    console.error('[wishlistController:getWishlist]', error);
    res.status(500).json({ message: 'Unable to load wishlist right now' });
  }
};

const addWishlistItem = async (req, res) => {
  const { productId = '' } = req.body;

  try {
    const product = await Product.findById(productId);

    if (!product || product.isActive === false) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await WishlistItem.updateOne(
      { user: req.user._id, product: product._id },
      { $setOnInsert: { user: req.user._id, product: product._id } },
      { upsert: true }
    );

    const items = await WishlistItem.find({ user: req.user._id })
      .populate('product')
      .sort({ createdAt: -1 });

    res.status(201).json(items.filter((item) => item.product));
  } catch (error) {
    console.error('[wishlistController:addWishlistItem]', error);
    res.status(500).json({ message: 'Unable to save wishlist item right now' });
  }
};

const removeWishlistItem = async (req, res) => {
  try {
    await WishlistItem.deleteOne({ user: req.user._id, product: req.params.productId });
    const items = await WishlistItem.find({ user: req.user._id })
      .populate('product')
      .sort({ createdAt: -1 });

    res.json(items.filter((item) => item.product));
  } catch (error) {
    console.error('[wishlistController:removeWishlistItem]', error);
    res.status(500).json({ message: 'Unable to remove wishlist item right now' });
  }
};

export { getWishlist, addWishlistItem, removeWishlistItem };
