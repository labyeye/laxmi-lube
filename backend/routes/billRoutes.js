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
// Update the import route in billRoutes.js
router.post(
  "/import",
  protect,
  adminOnly,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Read file with cellDates option to properly handle Excel dates
      const workbook = xlsx.readFile(req.file.path, { cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: null,
      });

      const errors = [];
      const importedBills = [];
      const staffMap = new Map();

      try {
        const User = require("../models/User");
        const staffMembers = await User.find({ role: "staff" }).lean();
        staffMembers.forEach((staff) => {
          staffMap.set(staff.name.toUpperCase(), staff._id);
        });
      } catch (err) {
        console.warn("Could not load staff members:", err.message);
      }

      for (const [index, row] of jsonData.entries()) {
        try {
          // Get values with case-insensitive field names
          const getValue = (obj, possibleNames) => {
            const key = Object.keys(obj).find((k) =>
              possibleNames.some(
                (name) => k.toLowerCase() === name.toLowerCase()
              )
            );
            return key ? obj[key] : null;
          };

          const custName = getValue(row, ["custname", "customer", "retailer"]);
          const billNo = getValue(row, ["billno", "billnumber", "bill no"]);
          const billDateValue = getValue(row, ["billdate", "date"]);
          const billAmt = getValue(row, ["billamt", "amount"]);
          const billRec = getValue(row, ["billrec", "received amount"]);
          const billBalance = getValue(row, ["billbalance", "balance"]);
          const staffName = getValue(row, ["staff name", "staff"]);

          // Validate required fields
          if (!custName || !billNo || !billAmt || !billDateValue) {
            errors.push(`Row ${index + 2}: Missing required fields`);
            continue;
          }

          // Parse date - handle Excel date objects and strings
          let billDate;
          if (billDateValue instanceof Date) {
            billDate = billDateValue;
          } else if (typeof billDateValue === "number") {
            // Handle Excel serial dates
            billDate = new Date((billDateValue - (25567 + 1)) * 86400 * 1000);
          } else {
            // Try parsing as string
            billDate = new Date(billDateValue);
          }

          if (isNaN(billDate.getTime())) {
            errors.push(`Row ${index + 2}: Invalid date format`);
            continue;
          }

          // Parse amounts
          const amount = parseFloat(String(billAmt).replace(/,/g, "")) || 0;
          const received = parseFloat(String(billRec).replace(/,/g, "")) || 0;
          const balance =
            parseFloat(String(billBalance).replace(/,/g, "")) ||
            amount - received;

          if (isNaN(amount) || amount <= 0) {
            errors.push(`Row ${index + 2}: Invalid amount`);
            continue;
          }

          // Determine status
          let status = "Unpaid";
          if (balance <= 0) {
            status = "Paid";
          } else if (received > 0) {
            status = "Partially Paid";
          }

          // Create bill
          const newBill = new Bill({
            billNumber: billNo,
            retailer: custName,
            amount: amount,
            dueAmount: balance,
            billDate: billDate,
            dueDate: billDate, // Same as bill date unless specified
            status: status,
            assignedTo: staffName
              ? staffMap.get(staffName.toUpperCase())
              : null,
          });

          await newBill.save();
          importedBills.push(newBill);
        } catch (error) {
          errors.push(`Row ${index + 2}: ${error.message}`);
        }
      }

      // Clean up file
      fs.unlinkSync(req.file.path);

      if (errors.length > 0) {
        return res.status(207).json({
          message: `Imported ${importedBills.length} bills with ${errors.length} errors`,
          importedCount: importedBills.length,
          errorCount: errors.length,
          errors: errors.slice(0, 10), // Return first 10 errors
        });
      }

      res.json({
        message: "Bills imported successfully",
        count: importedBills.length,
        importedCount: importedBills.length,
      });
    } catch (error) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({
        message: "Failed to import bills",
        error: error.message,
      });
    }
  }
);
router.get("/staff/bills-assigned-today", protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bills = await Bill.find({
      assignedTo: req.user._id,
      assignedDate: { $gte: today },
    })
      .populate("collections")
      .lean();

    // Filter out fully paid bills if you want to hide them
    const visibleBills = bills.filter((bill) => bill.dueAmount > 0);

    res.json(visibleBills);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch bills", error: err.message });
  }
});

module.exports = router;
