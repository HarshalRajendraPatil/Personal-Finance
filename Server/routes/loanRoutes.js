import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getLoans, createLoan, updateLoan, deleteLoan, getSchedule, addPayment } from '../controllers/loanController.js';

const router = express.Router();
router.use(protect);
router.route('/').get(getLoans).post(createLoan);
router.route('/:id').put(updateLoan).delete(deleteLoan);
router.get('/:id/schedule', getSchedule);
router.post('/:id/pay', addPayment);
export default router;
