const express = require('express');
const router = express.Router();
const Collection = require('../models/Collection');
const Bill = require('../models/Bill');
const { protect } = require('../middleware/authMiddleware');

// Create new collection (protected route)
router.post('/', protect, async (req, res) => {
  try {
    const { bill, amountCollected, paymentMode, remarks, proofImage } = req.body;
    
    // Validate required fields
    if (!bill || !amountCollected || !paymentMode) {
      return res.status(400).json({ 
        message: 'Bill ID, amount collected and payment mode are required' 
      });
    }

    // Validate amount
    const amount = parseFloat(amountCollected);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ 
        message: 'Amount must be a valid number' 
      });
    }

    // Check if bill exists
    const existingBill = await Bill.findById(bill);
    if (!existingBill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    // Create collection
    const collection = new Collection({
      bill,
      amountCollected: amount,
      paymentMode,
      paymentStatus: 'completed',
      collectedBy: req.user._id,
      remarks,
      proofImage,
      collectedOn: new Date()
    });

    await collection.save();

    // Respond with populated data
    const result = await Collection.findById(collection._id)
      .populate('bill', 'billNumber retailer amount')
      .populate('collectedBy', 'name');

    res.status(201).json(result);

  } catch (err) {
    console.error('Collection error:', err);
    res.status(500).json({ 
      message: 'Failed to record collection',
      error: err.message 
    });
  }
});

// Get all collections (protected)
router.get('/', protect, async (req, res) => {
  try {
    const collections = await Collection.find()
      .populate('bill', 'billNumber retailer')
      .populate('collectedBy', 'name')
      .sort({ collectedOn: -1 });
      
    res.json(collections);
  } catch (err) {
    res.status(500).json({ 
      message: 'Failed to fetch collections',
      error: err.message 
    });
  }
});

// Get collections for a specific bill (protected)
router.get('/bill/:billId', protect, async (req, res) => {
  try {
    const collections = await Collection.find({ bill: req.params.billId })
      .populate('collectedBy', 'name')
      .sort({ collectedOn: -1 });
      
    res.json(collections);
  } catch (err) {
    res.status(500).json({ 
      message: 'Failed to fetch bill collections',
      error: err.message 
    });
  }
});

module.exports = router;