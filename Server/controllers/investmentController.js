import Investment from '../models/Investment.js';

export const getInvestments = async (req, res) => {
  try {
    const investments = await Investment.find({ user: req.user._id, isActive: true }).sort({ createdAt: -1 });
    res.json(investments);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const createInvestment = async (req, res) => {
  try {
    const inv = await Investment.create({ ...req.body, user: req.user._id });
    // Seed initial value history entry
    inv.valueHistory.push({ date: inv.purchaseDate || new Date(), value: inv.currentValue });
    await inv.save();
    res.status(201).json(inv);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateInvestment = async (req, res) => {
  try {
    const inv = await Investment.findOne({ _id: req.params.id, user: req.user._id });
    if (!inv) return res.status(404).json({ message: 'Investment not found' });
    Object.assign(inv, req.body);
    await inv.save();
    res.json(inv);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deleteInvestment = async (req, res) => {
  try {
    const inv = await Investment.findOne({ _id: req.params.id, user: req.user._id });
    if (!inv) return res.status(404).json({ message: 'Investment not found' });
    inv.isActive = false;
    await inv.save();
    res.json({ message: 'Investment archived' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// PUT /:id/value — update the current value (marks a new data point in history)
export const updateCurrentValue = async (req, res) => {
  try {
    const { currentValue, note } = req.body;
    if (currentValue == null || currentValue < 0)
      return res.status(400).json({ message: 'Valid currentValue is required' });

    const inv = await Investment.findOne({ _id: req.params.id, user: req.user._id });
    if (!inv) return res.status(404).json({ message: 'Investment not found' });

    inv.currentValue = currentValue;
    inv.valueHistory.push({ date: new Date(), value: currentValue });
    await inv.save();
    res.json(inv);
  } catch (error) { res.status(500).json({ message: error.message }); }
};
