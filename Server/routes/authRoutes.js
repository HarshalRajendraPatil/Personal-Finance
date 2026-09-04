import express from 'express';
import {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile,
  googleAuth,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerificationEmail,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', logoutUser);
router.post('/google', googleAuth);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerificationEmail);

router
  .route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

export default router;
