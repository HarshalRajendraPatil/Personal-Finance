import express from 'express';
import { getTaxRecords, getTaxRecordByYear, updateTaxRecord, deleteTaxRecord } from '../controllers/taxController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
  .get(protect, getTaxRecords);

router.route('/:year')
  .get(protect, getTaxRecordByYear)
  .put(protect, updateTaxRecord);

router.route('/record/:id')
  .delete(protect, deleteTaxRecord);

export default router;
