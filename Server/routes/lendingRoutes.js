import express from 'express';
import { getLendings, createLending, updateLending, deleteLending, addRepayment, settleLending } from '../controllers/lendingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.route('/').get(protect, getLendings).post(protect, createLending);
router.route('/:id').put(protect, updateLending).delete(protect, deleteLending);
router.post('/:id/repay', protect, addRepayment);
router.post('/:id/settle', protect, settleLending);
export default router;
