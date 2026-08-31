import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getInvestments, createInvestment, updateInvestment, deleteInvestment, updateCurrentValue, syncAllInvestments, syncSingleInvestmentPrice } from '../controllers/investmentController.js';

const router = express.Router();
router.use(protect);
router.route('/').get(getInvestments).post(createInvestment);
router.post('/sync-all', syncAllInvestments);
router.post('/:id/sync-price', syncSingleInvestmentPrice);
router.route('/:id').put(updateInvestment).delete(deleteInvestment);
router.put('/:id/value', updateCurrentValue);
export default router;
