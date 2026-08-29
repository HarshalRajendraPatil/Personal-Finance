import express from 'express';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getCreditCardStatement,
  payCreditCardBill,
} from '../controllers/accountController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:id/statement', protect, getCreditCardStatement);
router.post('/:id/pay-bill', protect, payCreditCardBill);

router.route('/')
  .get(protect, getAccounts)
  .post(protect, createAccount);

router.route('/:id')
  .put(protect, updateAccount)
  .delete(protect, deleteAccount);

export default router;
