import NetWorthSnapshot from '../models/NetWorthSnapshot.js';
import { computeLiveNetWorth, captureAutomatedSnapshotForUser } from '../cron/jobs/netWorthJob.js';

export const getCurrentNetWorth = async (req, res) => {
  try {
    const data = await computeLiveNetWorth(req.user._id);
    res.json(data);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getHistory = async (req, res) => {
  try {
    let snapshots = await NetWorthSnapshot.find({ user: req.user._id }).sort({ date: 1 }).limit(24).lean();
    
    // If no history exists yet, auto-capture the first baseline snapshot
    if (snapshots.length === 0) {
      try {
        const initialSnap = await captureAutomatedSnapshotForUser(req.user._id, '[Initial Baseline] Auto-Captured');
        if (initialSnap) snapshots = [initialSnap];
      } catch (err) {
        // Non-fatal
      }
    }

    res.json(snapshots);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const takeSnapshot = async (req, res) => {
  try {
    const data = await computeLiveNetWorth(req.user._id);
    const snapshot = await NetWorthSnapshot.create({
      user: req.user._id,
      date: new Date(),
      ...data,
      notes: req.body.notes || 'Manual Snapshot',
      isAutomated: false,
    });
    res.status(201).json(snapshot);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// POST /auto-capture — trigger or verify automated snapshot for current cycle
export const triggerAutoSnapshot = async (req, res) => {
  try {
    const snapshot = await captureAutomatedSnapshotForUser(req.user._id, req.body.notes || '[Auto-Sync] Wealth Snapshot');
    res.status(201).json({ message: 'Autonomous net worth snapshot updated.', snapshot });
  } catch (error) { res.status(500).json({ message: error.message }); }
};
