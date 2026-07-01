const express = require("express");
const router = express.Router();
const CashAndSale = require("../models/CashAndSale");
const Bill = require("../models/Bill");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// GET /api/cash-and-sale — list all entries (newest first)
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const entries = await CashAndSale.find()
      .populate("createdBy", "name")
      .populate("adjustedBy", "name")
      .populate("adjustedBill", "billNumber retailer amount dueAmount status")
      .sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch entries", error: err.message });
  }
});

// POST /api/cash-and-sale — create new entry
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { billNumber, amount, personName, notes } = req.body;
    if (!billNumber || !amount || !personName) {
      return res.status(400).json({ message: "billNumber, amount and personName are required" });
    }
    const entry = await CashAndSale.create({
      billNumber: billNumber.toString().trim().toUpperCase(),
      amount: parseFloat(amount),
      personName: personName.trim(),
      notes: notes?.trim() || undefined,
      createdBy: req.user._id,
    });
    res.status(201).json(entry);
  } catch (err) {
    res.status(500).json({ message: "Failed to create entry", error: err.message });
  }
});

// GET /api/cash-and-sale/check-bill/:billNumber — check if bill exists
router.get("/check-bill/:billNumber", protect, adminOnly, async (req, res) => {
  try {
    const bill = await Bill.findOne({
      billNumber: req.params.billNumber.trim().toUpperCase(),
      deleted: { $ne: true },
    });
    if (!bill) {
      return res.json({ found: false });
    }
    res.json({
      found: true,
      bill: {
        _id: bill._id,
        billNumber: bill.billNumber,
        retailer: bill.retailer,
        amount: bill.amount,
        dueAmount: bill.dueAmount,
        status: bill.status,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to check bill", error: err.message });
  }
});

// PATCH /api/cash-and-sale/:id/adjust — adjust the bill's dueAmount
router.patch("/:id/adjust", protect, adminOnly, async (req, res) => {
  try {
    const entry = await CashAndSale.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    if (entry.status === "adjusted") {
      return res.status(400).json({ message: "This entry has already been adjusted" });
    }

    const bill = await Bill.findOne({
      billNumber: entry.billNumber,
      deleted: { $ne: true },
    });
    if (!bill) {
      return res.status(404).json({ message: `Bill #${entry.billNumber} not found in database` });
    }

    const prevDue = bill.dueAmount;
    bill.dueAmount = Math.max(0, parseFloat((bill.dueAmount - entry.amount).toFixed(2)));
    bill.history = bill.history || [];
    bill.history.push({
      action: "cash_and_sale_adjustment",
      changedBy: req.user._id,
      changedAt: new Date(),
      changes: {
        cashAndSaleId: entry._id,
        amountAdjusted: entry.amount,
        dueAmountBefore: prevDue,
        dueAmountAfter: bill.dueAmount,
      },
    });
    await bill.save();

    entry.status = "adjusted";
    entry.adjustedBill = bill._id;
    entry.adjustedAt = new Date();
    entry.adjustedBy = req.user._id;
    await entry.save();

    res.json({
      entry,
      bill: {
        _id: bill._id,
        billNumber: bill.billNumber,
        retailer: bill.retailer,
        amount: bill.amount,
        dueAmount: bill.dueAmount,
        status: bill.status,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Adjustment failed", error: err.message });
  }
});

// DELETE /api/cash-and-sale/:id — delete a pending entry
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const entry = await CashAndSale.findById(req.params.id);
    if (!entry) return res.status(404).json({ message: "Entry not found" });
    if (entry.status === "adjusted") {
      return res.status(400).json({ message: "Cannot delete an already-adjusted entry" });
    }
    await entry.deleteOne();
    res.json({ message: "Entry deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete entry", error: err.message });
  }
});

module.exports = router;
