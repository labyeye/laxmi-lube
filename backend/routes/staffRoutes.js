const express = require("express");
const router = express.Router();
const { protect, staffOnly } = require("../middleware/authMiddleware");
const Bill = require("../models/Bill");

// In staffRoutes.js - dashboard endpoint
// In staffRoutes.js - Update dashboard endpoint
router.get("/dashboard", protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get bills assigned today with their collections
    const assignedBills = await Bill.find({
      assignedTo: req.user._id,
      assignedDate: { $gte: today },
    }).populate({
      path: "collections",
      match: { collectedOn: { $gte: today } },
      select: "amountCollected",
    });

    // Calculate totals
    let todayAmountAssigned = 0;
    let todayAmountCollected = 0;
    let amountRemaining = 0;

    assignedBills.forEach((bill) => {
      const billAmount = bill.amount || 0;
      todayAmountAssigned += billAmount;

      const billCollected = bill.collections.reduce(
        (sum, coll) => sum + (coll.amountCollected || 0),
        0
      );

      todayAmountCollected += billCollected;
      amountRemaining += Math.max(0, billAmount - billCollected);
    });

    res.json({
      todayAmountAssigned,
      todayAmountCollected,
      amountRemainingToday: amountRemaining,
      billsAssignedToday: assignedBills.length,
      // ... other data
    });
  } catch (err) {
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

router.get("/bills-assigned-today", protect, staffOnly, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const bills = await Bill.find({
      assignedTo: req.user._id,
      assignedDate: { $gte: todayStart, $lte: todayEnd },
    }).populate("assignedTo");

    res.json(bills);
  } catch (err) {
    res
      .status(500)
      .json({
        message: "Error fetching bills assigned today",
        error: err.message,
      });
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
