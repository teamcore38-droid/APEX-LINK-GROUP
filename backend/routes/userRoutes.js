import express from 'express';
import {
  authUser,
  verifyAdminTwoFactorLogin,
  refreshAccessToken,
  logoutUser,
  registerUser,
  getUserProfile,
  getSecurityEvents,
  updateAdminTwoFactor,
  updateUserProfile,
  getUserAddresses,
  createUserAddress,
  updateUserAddress,
  deleteUserAddress,
  setDefaultUserAddress,
  changePassword,
  forgotPassword,
  resetPassword,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import {
  authLoginLimiter,
  authRegisterLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} from '../middleware/rateLimiters.js';

const router = express.Router();

router.route('/').post(authRegisterLimiter, registerUser);
router.post('/login', authLoginLimiter, authUser);
router.post('/login/2fa', authLoginLimiter, verifyAdminTwoFactorLogin);
router.post('/refresh', refreshAccessToken);
router.post('/logout', protect, logoutUser);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.route('/security/events').get(protect, getSecurityEvents);
router.route('/security/2fa').put(protect, updateAdminTwoFactor);
router
  .route('/addresses')
  .get(protect, getUserAddresses)
  .post(protect, createUserAddress);
router
  .route('/addresses/:addressId')
  .put(protect, updateUserAddress)
  .delete(protect, deleteUserAddress);
router.put('/addresses/:addressId/default', protect, setDefaultUserAddress);
router.put('/change-password', protect, changePassword);
router.post('/forgot-password', forgotPasswordLimiter, forgotPassword);
router.post('/reset-password/:token', resetPasswordLimiter, resetPassword);

export default router;
