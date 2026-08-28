import express from 'express';
import { getCalendarEvents } from '../controllers/calendarController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/events')
  .get(protect, getCalendarEvents);

export default router;
