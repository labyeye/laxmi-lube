const express = require("express");
const router = express.Router();
const { protect, staffOnly } = require("../middleware/authMiddleware");
const Bill = require("../models/Bill");
const Collection = require("../models/Collection");

router.get("/dashboard", protect, async (req, res) => {
  try {
    const today = new Date();
    const dayOfWeek = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][today.getDay()];
    today.setHours(0, 0, 0, 0);

    // Get bills assigned today AND matching collection day
    const bills = await Bill.find({
      assignedTo: req.user._id,
      collectionDay: dayOfWeek,
      assignedDate: { $gte: today }
    }).lean();

    // Get today's collections
    const collections = await Collection.find({
      collectedOn: { $gte: today },
      collectedBy: req.user._id
    });

    // Calculate totals
    const todayAmountAssigned = bills.reduce(
      (sum, bill) => sum + (bill.amount || 0), 
      0
    );
    
    const totalCollected = collections.reduce(
      (sum, c) => sum + (c.amountCollected || 0), 
      0
    );

    // Get number of bills with outstanding amounts
    const billsWithDueAmount = bills.filter(bill => 
      (bill.dueAmount || bill.amount) > 0
    ).length;

    // Get overdue bills count (bills with due date before today)
    const overdueBillsCount = await Bill.countDocuments({
      assignedTo: req.user._id,
      collectionDay: dayOfWeek,
      dueDate: { $lt: today },
      dueAmount: { $gt: 0 }
    });

    // Format collections for frontend display
    const collectionsAssignedToday = collections.map(c => ({
      billNumber: c.bill?.billNumber || "Unknown",
      retailer: c.bill?.retailer || "Unknown",
      amount: c.amountCollected || 0,
      status: "Completed",
      dueDate: c.bill?.dueDate || new Date()
    }));

    // Get recent collection history (last 5)
    const recentCollections = await Collection.find({
      collectedBy: req.user._id
    })
    .sort({ collectedOn: -1 })
    .limit(5)
    .populate('bill', 'billNumber retailer');

    const collectionsHistory = recentCollections.map(c => ({
      billNumber: c.bill?.billNumber || "Unknown",
      retailer: c.bill?.retailer || "Unknown",
      amount: c.amountCollected || 0,
      collectionDate: c.collectedOn
    }));

    res.json({
      todayAmountAssigned,
      todayAmountCollected: totalCollected,
      amountRemainingToday: todayAmountAssigned - totalCollected,
      billsAssignedToday: billsWithDueAmount,
      overdueBillsCount,
      collectionsAssignedToday,
      collectionsHistory
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/bills-history", protect, staffOnly, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = { assignedTo: req.user._id };

    if (status) filter.status = status;

    const bills = await Bill.find(filter)
      .populate("assignedTo")
      .sort({ dueDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Bill.countDocuments(filter);

    res.json({
      bills,
      totalPages: Math.ceil(count / limit),
      currentPage: Number(page),
      totalBills: count,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Error fetching bills history", error: err.message });
  }
});


router.put("/mark-paid/:id", protect, staffOnly, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (bill.assignedTo.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Not authorized to update this bill" });
    }

    bill.status = "Paid";
    bill.paymentDate = new Date();
    await bill.save();

    res.json({ message: "Bill marked as paid", bill });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to update bill status", error: err.message });
  }
});

module.exports = router;