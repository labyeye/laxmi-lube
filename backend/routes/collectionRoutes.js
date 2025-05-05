const express = require("express");
const router = express.Router();
const Collection = require("../models/Collection");
const Bill = require("../models/Bill");
const { protect } = require("../middleware/authMiddleware");

// Create new collection (protected route)
router.post("/", protect, async (req, res) => {
  try {
    const { bill, amountCollected, paymentMode, remarks, paymentDetails } =
      req.body;

    // Validate required fields
    if (!bill || !amountCollected || !paymentMode) {
      return res.status(400).json({
        message: "Bill ID, amount collected and payment mode are required",
      });
    }

    // Validate amount
    // Replace the existing amount validation with:
    const amount = parseFloat(amountCollected);
    if (isNaN(amount) || amount <= 0 || amount > 1000000) {
      return res.status(400).json({
        message: "Amount must be a positive number less than 1,000,000",
      });
    }

    // Add decimal places validation separately
    if (!/^\d+(\.\d{1,2})?$/.test(amountCollected)) {
      return res.status(400).json({
        message: "Amount must have up to 2 decimal places",
      });
    }
    // Check if bill exists
    const existingBill = await Bill.findById(bill);
    if (!existingBill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    // Validate amount against due amount
    if (amount > existingBill.dueAmount) {
      return res.status(400).json({
        message: `Amount cannot exceed due amount of ${existingBill.dueAmount.toFixed(
          2
        )}`,
      });
    }

    // Validate payment details based on payment mode
    let validationError;
    switch (paymentMode) {
      case "upi":
        if (!paymentDetails?.upiId || !paymentDetails?.upiTransactionId) {
          validationError =
            "UPI ID and Transaction ID are required for UPI payments";
        }
        break;
      case "cheque":
        if (!paymentDetails?.bankName || !paymentDetails?.chequeNumber) {
          validationError =
            "Bank name and cheque number are required for cheque payments";
        }
        break;
      case "bank_transfer":
        if (!paymentDetails?.bankName || !paymentDetails?.bankTransactionId) {
          validationError =
            "Bank name and transaction ID are required for bank transfers";
        }
        break;
    }

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    // Create collection
    const collection = new Collection({
      bill,
      amountCollected: amount,
      paymentMode,
      paymentDetails: paymentMode === "cash" ? null : paymentDetails,
      collectedBy: req.user._id,
      remarks,
      collectedOn: new Date(),
    });

    await collection.save();

    // Update bill status
    const newDueAmount = existingBill.dueAmount - amount;
    await Bill.findByIdAndUpdate(bill, {
      dueAmount: newDueAmount,
      status: newDueAmount <= 0 ? "Paid" : "Partially Paid",
    });

    // Respond with populated data
    const result = await Collection.findById(collection._id)
      .populate("bill", "billNumber retailer amount")
      .populate("collectedBy", "name");

    res.status(201).json(result);
  } catch (err) {
    console.error("Collection error:", err);
    res.status(500).json({
      message: "Failed to record collection",
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// Get all collections (protected)
router.get("/", protect, async (req, res) => {
  try {
    const collections = await Collection.find()
      .populate("bill", "billNumber retailer")
      .populate("collectedBy", "name")
      .sort({ collectedOn: -1 });

    res.json(collections);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch collections",
      error: err.message,
    });
  }
});

// Get collections for a specific bill (protected)
router.get("/bill/:billId", protect, async (req, res) => {
  try {
    const collections = await Collection.find({ bill: req.params.billId })
      .populate("collectedBy", "name")
      .sort({ collectedOn: -1 });

    res.json(collections);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch bill collections",
      error: err.message,
    });
  }
});

module.exports = router;
