import express from 'express';
import {
  getRecurringRules,
  createRecurringRule,
  updateRecurringRule,
  deleteRecurringRule,
  payBill,
} from '../controllers/recurringController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getRecurringRules)
  .post(protect, createRecurringRule);

router.route('/:id')
  .put(protect, updateRecurringRule)
  .delete(protect, deleteRecurringRule);

router.post('/:id/pay', protect, payBill);

export default router;
