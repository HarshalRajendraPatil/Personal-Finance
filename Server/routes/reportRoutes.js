import express from 'express';
import { getSummary, getByCategory, getMonthlyTrend, exportCSV } from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();
router.get('/summary', protect, getSummary);
router.get('/by-category', protect, getByCategory);
router.get('/monthly-trend', protect, getMonthlyTrend);
router.get('/export-csv', protect, exportCSV);
export default router;
