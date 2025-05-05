const express = require("express");
const router = express.Router();
const multer = require("multer");
const xlsx = require("xlsx");
const fs = require("fs");
const Bill = require("../models/Bill");
const Collection = require("../models/Collection");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = "uploads/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Create new bill
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const {
      billNumber,
      retailer,
      amount,
      dueAmount,
      dueDate,
      billDate,
      status,
    } = req.body;

    const newBill = new Bill({
      billNumber,
      retailer,
      amount,
      dueAmount: dueAmount || amount, // Default to full amount if not specified
      dueDate,
      billDate,
      status: status || "Unpaid",
    });

    await newBill.save();
    res.status(201).json(newBill);
  } catch (err) {
    res.status(500).json({ message: "Failed to add bill", error: err.message });
  }
});

// Assign bill to staff
router.put("/:billId/assign", protect, adminOnly, async (req, res) => {
  try {
    const { staffId } = req.body;
    if (!staffId) {
      return res.status(400).json({ message: "Staff ID is required" });
    }

    const bill = await Bill.findByIdAndUpdate(
      req.params.billId,
      {
        assignedTo: staffId,
        assignedDate: new Date(),
      },
      { new: true }
    ).populate("assignedTo", "name");

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.json({
      _id: bill._id,
      billNumber: bill.billNumber,
      retailer: bill.retailer,
      amount: bill.amount,
      dueDate: bill.dueDate,
      status: bill.status,
      assignedTo: bill.assignedTo?._id || null,
      assignedToName: bill.assignedTo?.name || null,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to assign bill", error: err.message });
  }
});

// Get all bills with collections data
router.get("/", protect, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== "admin") {
      query.assignedTo = req.user._id;
    }

    const bills = await Bill.find(query)
      .populate("assignedTo", "name")
      .populate({
        path: "collections",
        select: "amountCollected paymentDate paymentMode",
      })
      .sort({ dueDate: 1 })
      .lean();

    // Calculate collected and due amounts for each bill
    const processedBills = bills.map((bill) => {
      const collectedAmount =
        bill.collections.reduce(
          (sum, collection) => sum + (collection.amountCollected || 0),
          0
        ) || 0;

      const dueAmount = Math.max(0, bill.amount - collectedAmount);

      let status = bill.status;
      if (collectedAmount >= bill.amount) {
        status = "Paid";
      } else if (collectedAmount > 0) {
        status = "Partially Paid";
      }

      return {
        ...bill,
        amountCollected: collectedAmount,
        dueAmount,
        status,
        assignedTo: bill.assignedTo?._id || null,
        assignedToName: bill.assignedTo?.name || null,
      };
    });

    res.json(processedBills);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch bills", error: err.message });
  }
});

// Update bill status and due amount
router.put("/:id", protect, async (req, res) => {
  try {
    const { status, dueAmount } = req.body;

    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    // Prevent negative due amounts
    if (dueAmount !== undefined && dueAmount < 0) {
      return res.status(400).json({ message: "Due amount cannot be negative" });
    }

    // Update fields
    if (status !== undefined) bill.status = status;
    if (dueAmount !== undefined) bill.dueAmount = dueAmount;

    await bill.save();

    res.json(bill);
  } catch (err) {
    res.status(500).json({
      message: "Failed to update bill",
      error: err.message,
    });
  }
});

// Delete bill
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    // First delete all associated collections
    await Collection.deleteMany({ bill: req.params.id });

    // Then delete the bill
    const bill = await Bill.findByIdAndDelete(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }
    res.json({ message: "Bill deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete bill", error: err.message });
  }
});
// In billRoutes.js - update the /staff/bills-assigned-today route
// In billRoutes.js - update the bills-assigned-today endpoint
router.get("/staff/bills-assigned-today", protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bills = await Bill.find({
      assignedTo: req.user._id,
      assignedDate: { $gte: today },
    })
      .populate({
        path: "collections",
        select: "amountCollected paymentDate paymentMode collectedBy",
      })
      .lean();

    const processedBills = bills.map((bill) => {
      const totalCollected = bill.collections.reduce(
        (sum, collection) => sum + (collection.amountCollected || 0),
        0
      );

      const dueAmount = Math.max(0, bill.amount - totalCollected);
      
      let status = bill.status;
      if (totalCollected >= bill.amount) {
        status = "Paid";
      } else if (totalCollected > 0) {
        status = "Partially Paid";
      } else {
        status = "Unpaid";
      }

      return {
        ...bill,
        amountCollected: totalCollected,
        dueAmount,
        status,
      };
    });

    res.json(processedBills);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch bills",
      error: err.message,
    });
  }
});

module.exports = router;
