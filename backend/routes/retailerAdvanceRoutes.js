const express = require("express");
const router = express.Router();
const RetailerAdvance = require("../models/RetailerAdvance");
const Bill = require("../models/Bill");
const Collection = require("../models/Collection");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// GET all advances (with optional retailer filter)
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.retailer) {
      filter.retailerName = { $regex: req.query.retailer, $options: "i" };
    }
    const advances = await RetailerAdvance.find(filter).sort({ date: -1 });
    res.json(advances);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET matching unpaid bills for a retailer name (for the adjust modal)
router.get("/bills-for-retailer", protect, adminOnly, async (req, res) => {
  try {
    const { retailerName } = req.query;
    if (!retailerName)
      return res.status(400).json({ message: "retailerName required" });

    const bills = await Bill.find({
      retailer: { $regex: `^${retailerName.trim()}$`, $options: "i" },
      dueAmount: { $gt: 0 },
    })
      .select("billNumber amount dueAmount billDate status")
      .sort({ billDate: 1 })
      .lean();

    res.json(bills);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create new advance
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { retailerName, retailerId, amount, date, remarks } = req.body;
    if (!retailerName || !amount)
      return res.status(400).json({ message: "retailerName and amount required" });

    const advance = new RetailerAdvance({
      retailerName: retailerName.trim(),
      retailerId: retailerId || undefined,
      amount: Number(amount),
      remainingAmount: Number(amount),
      date: date || new Date(),
      remarks,
      createdBy: req.user._id,
    });
    const saved = await advance.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST apply advance amount to a specific bill
router.post("/:id/apply", protect, adminOnly, async (req, res) => {
  try {
    const { billId, amountToApply } = req.body;
    const applyAmt = Number(amountToApply);

    if (!billId || isNaN(applyAmt) || applyAmt <= 0)
      return res.status(400).json({ message: "billId and positive amountToApply required" });

    const advance = await RetailerAdvance.findById(req.params.id);
    if (!advance) return res.status(404).json({ message: "Advance not found" });

    if (applyAmt > advance.remainingAmount)
      return res.status(400).json({
        message: `Cannot apply ₹${applyAmt} — only ₹${advance.remainingAmount} remaining`,
      });

    const bill = await Bill.findById(billId);
    if (!bill) return res.status(404).json({ message: "Bill not found" });

    if (applyAmt > bill.dueAmount)
      return res.status(400).json({
        message: `Cannot apply ₹${applyAmt} — bill due is only ₹${bill.dueAmount}`,
      });

    // Create collection record for audit trail
    const collection = new Collection({
      bill: bill._id,
      amountCollected: applyAmt,
      paymentMode: "Advance Adjustment",
      paymentDetails: JSON.stringify({
        advanceId: advance._id,
        advanceDate: advance.date,
        retailerName: advance.retailerName,
      }),
      collectedBy: req.user._id,
      collectedOn: new Date(),
      remarks: `Advance adjustment — ${advance.remarks || advance.retailerName}`,
      status: "Verified",
    });
    await collection.save();

    // Reduce bill due amount
    bill.dueAmount = Math.max(0, bill.dueAmount - applyAmt);
    if (bill.dueAmount <= 0) bill.status = "Paid";
    else if (bill.dueAmount < bill.amount) bill.status = "Partially Paid";
    await bill.save();

    // Record adjustment on the advance
    advance.adjustments.push({
      bill: bill._id,
      billNumber: bill.billNumber,
      amountApplied: applyAmt,
      appliedAt: new Date(),
    });
    advance.remainingAmount = Math.max(0, advance.remainingAmount - applyAmt);
    if (advance.remainingAmount <= 0) advance.status = "Applied";
    else if (advance.adjustments.length > 0) advance.status = "Partial";
    await advance.save();

    res.json({ advance, bill: { _id: bill._id, dueAmount: bill.dueAmount, status: bill.status } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE advance (only if Open and no adjustments made)
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const advance = await RetailerAdvance.findById(req.params.id);
    if (!advance) return res.status(404).json({ message: "Advance not found" });

    if (advance.adjustments.length > 0)
      return res.status(400).json({
        message: "Cannot delete — adjustments have already been applied to bills",
      });

    await advance.deleteOne();
    res.json({ message: "Advance deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
