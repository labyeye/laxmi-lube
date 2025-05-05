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
      dueAmount: dueAmount || amount, 
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

router.put("/:id", protect, async (req, res) => {
  try {
    const { status, dueAmount } = req.body;

    const bill = await Bill.findById(req.params.id);
    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    if (dueAmount !== undefined && dueAmount < 0) {
      return res.status(400).json({ message: "Due amount cannot be negative" });
    }
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

router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    await Collection.deleteMany({ bill: req.params.id });
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
router.post("/import", protect, adminOnly, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const workbook = xlsx.readFile(req.file.path);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);

    const errors = [];
    const importedBills = [];

    // Process each row
    for (const [index, row] of jsonData.entries()) {
      try {
        // Validate required fields
        if (!row.billNumber || !row.retailer || !row.amount || !row.dueDate || !row.billDate) {
          errors.push(`Row ${index + 2}: Missing required fields`);
          continue;
        }

        // Fix date parsing - handle both string dates and Excel serial numbers
        const parseExcelDate = (excelDate) => {
          if (typeof excelDate === 'number') {
            // Convert Excel serial number to JS date
            const utcDays = Math.floor(excelDate - 25569);
            const utcValue = utcDays * 86400;
            return new Date(utcValue * 1000);
          }
          return new Date(excelDate);
        };

        // Create new bill with properly parsed dates
        const newBill = new Bill({
          billNumber: row.billNumber,
          retailer: row.retailer,
          amount: parseFloat(row.amount),
          dueAmount: parseFloat(row.dueAmount || row.amount),
          dueDate: parseExcelDate(row.dueDate),
          billDate: parseExcelDate(row.billDate),
          status: row.status || "Unpaid",
        });

        await newBill.save();
        importedBills.push(newBill);
      } catch (error) {
        errors.push(`Row ${index + 2}: ${error.message}`);
      }
    }

    // Clean up - delete the uploaded file
    fs.unlinkSync(req.file.path);

    if (errors.length > 0) {
      return res.status(207).json({
        message: "Partial success - some rows had errors",
        importedCount: importedBills.length,
        errors,
      });
    }

    res.json({
      message: "Bills imported successfully",
      count: importedBills.length,
    });
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path); // Clean up file on error
    }
    res.status(500).json({
      message: "Failed to import bills",
      error: error.message,
    });
  }
});
router.get("/staff/bills-assigned-today", protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bills = await Bill.find({
      assignedTo: req.user._id,
      assignedDate: { $gte: today }
    })
      .populate("collections")
      .lean();

    // Filter out fully paid bills if you want to hide them
    const visibleBills = bills.filter(bill => bill.dueAmount > 0);

    res.json(visibleBills);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch bills", error: err.message });
  }
});

module.exports = router;