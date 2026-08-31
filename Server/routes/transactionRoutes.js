import express from 'express';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  previewCSVStatement,
  importCSVStatement,
  scanReceipt,
} from '../controllers/transactionController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/preview-csv', protect, previewCSVStatement);
router.post('/import-csv', protect, importCSVStatement);
router.post('/scan-receipt', protect, scanReceipt);

router.route('/')
  .get(protect, getTransactions)
  .post(protect, createTransaction);

router.route('/:id')
  .put(protect, updateTransaction)
  .delete(protect, deleteTransaction);

export default router;


