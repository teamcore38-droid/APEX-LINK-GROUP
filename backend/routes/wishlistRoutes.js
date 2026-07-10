import express from 'express';
import {
  addWishlistItem,
  getWishlist,
  removeWishlistItem,
} from '../controllers/wishlistController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/').get(protect, getWishlist).post(protect, addWishlistItem);
router.route('/:productId').delete(protect, removeWishlistItem);

export default router;
