const express = require('express');
const router = express.Router();
const { protect, staffOnly } = require('../middleware/authMiddleware');
const Bill = require('../models/Bill');

router.get('/dashboard', protect, staffOnly, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [dashboardData] = await Bill.aggregate([
      {
        $facet: {
          assignedToday: [
            { 
              $match: { 
                assignedTo: req.user._id,
                assignedDate: { $gte: todayStart, $lte: todayEnd }
              }
            },
            { 
              $group: { 
                _id: null, 
                totalAmount: { $sum: '$dueAmount' },
                count: { $sum: 1 }
              } 
            }
          ],
          collectedToday: [
            { 
              $match: { 
                assignedTo: req.user._id,
                status: 'Paid',
                paymentDate: { $gte: todayStart, $lte: todayEnd }
              }
            },
            { 
              $group: { 
                _id: null, 
                totalAmount: { $sum: '$amount' }
              } 
            }
          ],
          overdueBills: [
            {
              $match: {
                assignedTo: req.user._id,
                dueDate: { $lt: todayStart },
                status: { $ne: 'Paid' }
              }
            },
            { $count: "count" }
          ]
        }
      }
    ]);

    console.log('Dashboard data retrieved:', dashboardData); // Add logging
    
    const assignedToday = dashboardData.assignedToday[0] || { totalAmount: 0, count: 0 };
    const collectedToday = dashboardData.collectedToday[0] || { totalAmount: 0 };
    const overdueBills = dashboardData.overdueBills[0] ? dashboardData.overdueBills[0].count : 0;

    res.json({
      todayAmountAssigned: assignedToday.totalAmount,
      todayAmountCollected: collectedToday.totalAmount,
      amountRemainingToday: assignedToday.totalAmount - collectedToday.totalAmount,
      billsAssignedToday: assignedToday.count,
      overdueBillsCount: overdueBills
    });
  } catch (err) {
    console.error('Error in staff dashboard route:', err);
    res.status(500).json({ message: 'Error fetching staff dashboard data', error: err.message });
  }
});

router.get('/bills-history', protect, staffOnly, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = { assignedTo: req.user._id };
    
    if (status) filter.status = status;

    const bills = await Bill.find(filter)
      .populate('assignedTo')
      .sort({ dueDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Bill.countDocuments(filter);

    res.json({
      bills,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      totalBills: count
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching bills history', error: err.message });
  }
});

router.get('/bills-assigned-today', protect, staffOnly, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const bills = await Bill.find({
      assignedTo: req.user._id,
      assignedDate: { $gte: todayStart, $lte: todayEnd }
    }).populate('assignedTo');

    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching bills assigned today', error: err.message });
  }
});

router.put('/mark-paid/:id', protect, staffOnly, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    
    if (bill.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this bill' });
    }
    
    bill.status = 'Paid';
    bill.paymentDate = new Date();
    await bill.save();
    
    res.json({ message: 'Bill marked as paid', bill });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update bill status', error: err.message });
  }
});

module.exports = router;