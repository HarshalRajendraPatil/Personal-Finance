import express from 'express';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../controllers/accountController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getAccounts)
  .post(protect, createAccount);

router.route('/:id')
  .put(protect, updateAccount)
  .delete(protect, deleteAccount);

export default router;
