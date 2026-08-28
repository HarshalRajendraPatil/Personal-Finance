import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getInvestments, createInvestment, updateInvestment, deleteInvestment, updateCurrentValue } from '../controllers/investmentController.js';

const router = express.Router();
router.use(protect);
router.route('/').get(getInvestments).post(createInvestment);
router.route('/:id').put(updateInvestment).delete(deleteInvestment);
router.put('/:id/value', updateCurrentValue);
export default router;
