const express = require('express');
const router = express.Router();
const Collection = require('../models/Collection');
const Bill = require('../models/Bill');
const { protect } = require('../middleware/authMiddleware');
router.post('/', protect, async (req, res) => {
  try {
    const { bill: billId, amountCollected } = req.body;
    const amount = Number(amountCollected);

    // Start transaction
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // 1. Create collection
      const collection = await Collection.create([{
        bill: billId,
        amountCollected: amount,
        // ... other fields ...
      }], { session });

      // 2. Update bill's collections array and amounts
      const updatedBill = await Bill.findByIdAndUpdate(
        billId,
        {
          $push: { collections: collection[0]._id },
          $inc: { dueAmount: -amount }
        },
        { new: true, session }
      ).populate('collections');

      // 3. Calculate new status
      const totalCollected = updatedBill.collections.reduce(
        (sum, c) => sum + c.amountCollected, 0
      );
      updatedBill.status = totalCollected >= updatedBill.amount ? 'Paid' :
                         totalCollected > 0 ? 'Partially Paid' : 'Unpaid';
      await updatedBill.save({ session });

      await session.commitTransaction();
      
      res.status(201).json({
        collection: collection[0],
        bill: updatedBill
      });

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }

  } catch (err) {
    res.status(500).json({ 
      message: 'Failed to record collection',
      error: err.message 
    });
  }
});
// In collectionRoutes.js - POST endpoint
router.post('/', protect, async (req, res) => {
  try {
    const { bill: billId, amountCollected } = req.body;
    const amount = Number(amountCollected);

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // 1. Create collection record
      const collection = await Collection.create([{
        bill: billId,
        amountCollected: amount,
        collectedBy: req.user._id,
        collectedOn: new Date()
      }], { session });

      // 2. Update the bill
      const bill = await Bill.findById(billId).session(session);
      
      // Calculate new due amount
      const newDueAmount = Math.max(0, (bill.dueAmount || bill.amount) - amount);
      
      // Update bill status
      let newStatus = bill.status;
      if (newDueAmount <= 0) {
        newStatus = 'Paid';
      } else if (amount > 0) {
        newStatus = 'Partially Paid';
      }

      await Bill.findByIdAndUpdate(billId, {
        $inc: { dueAmount: -amount },  // Reduces dueAmount by collected amount
        status: newStatus,
        $push: { collections: collection[0]._id }
      }, { session });

      await session.commitTransaction();
      res.json({
        collection: collection[0],
        updatedBill: {
          dueAmount: newDueAmount,
          status: newStatus
        }
      });

    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (err) {
    res.status(500).json({ 
      message: 'Failed to record collection',
      error: err.message 
    });
  }
});

// Get collections for a specific bill (protected) with bill details
router.get('/bill/:billId', protect, async (req, res) => {
  try {
    // First verify bill exists
    const bill = await Bill.findById(req.params.billId);
    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    const collections = await Collection.find({ bill: req.params.billId })
      .populate('collectedBy', 'name')
      .sort({ collectedOn: -1 });

    // Calculate totals
    const totalCollected = collections.reduce(
      (sum, collection) => sum + collection.amountCollected, 0
    );
    const remainingDue = Math.max(0, bill.amount - totalCollected);

    res.json({
      billDetails: {
        billNumber: bill.billNumber,
        retailer: bill.retailer,
        totalAmount: bill.amount,
        totalCollected,
        remainingDue,
        status: bill.status
      },
      collections
    });
  } catch (err) {
    res.status(500).json({ 
      message: 'Failed to fetch bill collections',
      error: err.message 
    });
  }
});
// In collectionRoutes.js - update the total collected endpoint
router.get('/total-collected-today/:billId', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const collections = await Collection.find({ 
      bill: req.params.billId,
      collectedOn: { $gte: today } // Only today's collections
    }).select('amountCollected');

    const totalCollected = collections.reduce(
      (sum, collection) => sum + (collection.amountCollected || 0), 
      0
    );

    res.json({ totalCollected });
  } catch (err) {
    res.status(500).json({ 
      message: 'Failed to calculate today\'s collected amount',
      error: err.message 
    });
  }
});

// Get today's collections for the current user
router.get('/today', protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const collections = await Collection.find({
      collectedBy: req.user._id,
      collectedOn: { $gte: today }
    })
    .populate({
      path: 'bill',
      select: 'billNumber retailer'
    })
    .sort({ collectedOn: -1 });

    const totalCollected = collections.reduce(
      (sum, collection) => sum + collection.amountCollected, 0
    );

    res.json({
      count: collections.length,
      totalCollected,
      collections
    });
  } catch (err) {
    res.status(500).json({ 
      message: 'Failed to fetch today\'s collections',
      error: err.message 
    });
  }
});

module.exports = router;