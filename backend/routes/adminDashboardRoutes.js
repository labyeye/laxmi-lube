const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const Collection = require('../models/Collection');
const User = require('../models/User');

router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const billsDueToday = await Bill.find({ dueDate: { $gte: startOfDay, $lte: endOfDay } });
    const collectionsToday = await Collection.find({ collectedOn: { $gte: startOfDay, $lte: endOfDay } }).populate('bill');

    let totalBillAmount = 0;
    let totalPaidAmount = 0;
    let totalRemainingAmount = 0;

    collectionsToday.forEach((collection) => {
      totalPaidAmount += collection.amountCollected;
    });

    billsDueToday.forEach((bill) => {
      totalBillAmount += bill.amount;
      totalRemainingAmount += bill.dueAmount;
    });

    const totalStaff = await User.countDocuments({ role: 'staff' });

    const recentCollections = await Collection.find()
      .sort({ collectedOn: -1 })
      .limit(5)
      .populate('bill collectedBy');

    res.json({
      totalBillAmount,
      totalPaidAmount,
      totalRemainingAmount,
      totalStaff,
      recentCollections,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error fetching dashboard data' });
  }
});

module.exports = router;
