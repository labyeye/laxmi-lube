const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const Bill = require('../models/Bill');
const { protect, adminOnly } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const { billNumber, retailer, amount, dueAmount, dueDate, billDate, status } = req.body;

    const newBill = new Bill({
      billNumber,
      retailer,
      amount,
      dueAmount,
      dueDate,
      billDate,
      status: status || 'Unpaid',
    });

    await newBill.save();
    res.status(201).json(newBill);
  } catch (err) {
    res.status(500).json({ message: 'Failed to add bill', error: err.message });
  }
});

router.put('/:billId/assign', protect, adminOnly, async (req, res) => {
  try {
    const { staffId } = req.body;
    if (!staffId) {
      return res.status(400).json({ message: 'Staff ID is required' });
    }

    const bill = await Bill.findByIdAndUpdate(
      req.params.billId,
      { 
        assignedTo: staffId,
        assignedDate: new Date()
      },
      { new: true } // Return the updated document
    ).populate('assignedTo', 'name'); // Only populate the name field

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    // Return a consistent response format
    res.json({
      _id: bill._id,
      billNumber: bill.billNumber,
      retailer: bill.retailer,
      amount: bill.amount,
      dueDate: bill.dueDate,
      status: bill.status,
      assignedTo: bill.assignedTo?._id || null,
      assignedToName: bill.assignedTo?.name || null
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to assign bill', error: err.message });
  }
});

router.get('/', protect, async (req, res) => {
  try {
    let bills;
    if (req.user.role === 'admin') {
      bills = await Bill.find()
        .populate('assignedTo', 'name') // Only populate necessary fields
        .sort({ dueDate: 1 })
        .lean(); // Convert to plain JavaScript objects
    } else {
      bills = await Bill.find({ assignedTo: req.user._id })
        .populate('assignedTo', 'name')
        .sort({ dueDate: 1 })
        .lean();
    }

    // Format the response consistently
    const formattedBills = bills.map(bill => ({
      ...bill,
      assignedTo: bill.assignedTo?._id || null,
      assignedToName: bill.assignedTo?.name || null
    }));

    res.json(formattedBills);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch bills', error: err.message });
  }
});
// Add this to your existing billRoutes.js
// In your billRoutes.js
router.put('/:id', protect, async (req, res) => {
  try {
    const { status, dueAmount } = req.body;
    
    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    // Update the fields if they're provided
    if (status !== undefined) bill.status = status;
    if (dueAmount !== undefined) bill.dueAmount = dueAmount;

    await bill.save();
    
    res.json(bill);
  } catch (err) {
    res.status(500).json({ 
      message: 'Failed to update bill',
      error: err.message 
    });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const bill = await Bill.findByIdAndDelete(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }
    res.json({ message: 'Bill deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete bill', error: err.message });
  }
});

module.exports = router;