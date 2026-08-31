import express from 'express';
import {
  getBudgets,
  createBudget,
  updateBudget,
  deleteBudget,
  getBudgetsWithSpend,
  getBudgetGuardrails,
} from '../controllers/budgetController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/with-spend', protect, getBudgetsWithSpend);
router.get('/guardrails', protect, getBudgetGuardrails);

router.route('/')
  .get(protect, getBudgets)
  .post(protect, createBudget);

router.route('/:id')
  .put(protect, updateBudget)
  .delete(protect, deleteBudget);

export default router;

