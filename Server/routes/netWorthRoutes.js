import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getCurrentNetWorth, getHistory, takeSnapshot } from '../controllers/netWorthController.js';

const router = express.Router();
router.use(protect);
router.get('/current', getCurrentNetWorth);
router.get('/history', getHistory);
router.post('/snapshot', takeSnapshot);
export default router;
