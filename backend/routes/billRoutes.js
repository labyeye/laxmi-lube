const express = require("express");
const router = express.Router();
const multer = require("multer");
const xlsx = require("xlsx");
const fs = require("fs");
const Bill = require("../models/Bill");
const Collection = require("../models/Collection");

const {
  protect,
  adminOnly,
  staffOnly,
} = require("../middleware/authMiddleware");

// Map first character of bill number → brand
const getBrandFromBillNumber = (billNumber) => {
  if (!billNumber) return "Other";
  const prefix = String(billNumber).trim().toUpperCase()[0];
  const map = { A: "Amaron", S: "Shell", P: "Amaron", G: "Gulf" };
  return map[prefix] || "Other";
};

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
      billDate,
      status,
      collectionDay,
    } = req.body;

    // Validate required fields
    if (!billNumber || !retailer || !amount || !billDate || !collectionDay) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
        error:
          "Bill number, retailer, amount, bill date, and collection day are required",
      });
    }

    const newBill = new Bill({
      billNumber,
      retailer,
      amount: parseFloat(amount),
      dueAmount: dueAmount ? parseFloat(dueAmount) : parseFloat(amount),
      billDate,
      collectionDay,
      status: status || "Unpaid",
    });

    await newBill.save();
    res.status(201).json({ success: true, data: newBill });
  } catch (err) {
    console.error("Error creating bill:", err);

    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Bill number already exists",
        error: "A bill with this number already exists in the system",
      });
    }

    // Handle validation errors
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: messages.join(", "),
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to add bill",
      error: err.message,
    });
  }
});
router.post("/collections", protect, async (req, res) => {
  try {
    const collectionData = {
      ...req.body,
      collectedBy: req.user._id,
    };

    const newCollection = new Collection(collectionData);
    await newCollection.save();

    res.status(201).json(newCollection);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to create collection", error: err.message });
  }
});

// Update a bill
router.put("/:billId", protect, adminOnly, async (req, res) => {
  try {
    const {
      billNumber,
      retailer,
      amount,
      dueAmount,
      billDate,
      status,
      collectionDay,
    } = req.body;

    // Find the bill
    const bill = await Bill.findById(req.params.billId);

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
      });
    }

    // Update fields
    if (billNumber) bill.billNumber = billNumber;
    if (retailer) bill.retailer = retailer;
    if (amount !== undefined) bill.amount = parseFloat(amount);
    if (dueAmount !== undefined) bill.dueAmount = parseFloat(dueAmount);
    if (billDate) bill.billDate = billDate;
    if (status) bill.status = status;
    if (collectionDay) bill.collectionDay = collectionDay;

    await bill.save();

    res.json(bill);
  } catch (err) {
    console.error("Error updating bill:", err);

    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Bill number already exists",
        error: "A bill with this number already exists in the system",
      });
    }

    // Handle validation errors
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        error: messages.join(", "),
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update bill",
      error: err.message,
    });
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
      { new: true },
    ).populate("assignedTo", "name");

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.json({
      _id: bill._id,
      billNumber: bill.billNumber,
      retailer: bill.retailer,
      amount: bill.amount,
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
    let query = { deleted: false };
    if (req.user.role !== "admin") {
      query.assignedTo = req.user._id;
    }

    const bills = await Bill.find(query)
      .populate("assignedTo", "name")
      .populate({
        path: "collections",
        select: "amountCollected paymentDate paymentMode",
      })
      .lean();

    const processedBills = bills.map((bill) => {
      const collectedAmount =
        bill.collections.reduce(
          (sum, collection) => sum + (collection.amountCollected || 0),
          0,
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
    const bill = await Bill.findByIdAndUpdate(
      req.params.id,
      {
        deleted: true,
        deletedAt: new Date(),
        deletedBy: req.user._id, // Optional: Track who deleted it
      },
      { new: true },
    );

    if (!bill) {
      return res.status(404).json({ message: "Bill not found" });
    }

    res.json({ message: "Bill marked as deleted", bill });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete bill", error: err.message });
  }
});
router.post(
  "/import",
  protect,
  adminOnly,
  upload.single("file"),
  async (req, res) => {
    const errors = [];
    const staffMap = new Map();

    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const dayAbbreviations = {
        MON: "Monday",
        TUE: "Tuesday",
        WED: "Wednesday",
        THU: "Thursday",
        FRI: "Friday",
        SAT: "Saturday",
        SUN: "Sunday",
      };

      const workbook = xlsx.readFile(req.file.path, { cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: null,
      });

      if (!jsonData || jsonData.length === 0) {
        return res.status(400).json({ message: "No data found in the file" });
      }

      let defaultStaffId = null;
      try {
        const User = require("../models/User");
        const staffMembers = await User.find({ role: { $in: ["staff", "admin"] } }).lean();
        staffMembers.forEach((staff) => {
          staffMap.set(staff.name.toUpperCase(), staff._id);
        });
        // Default fallback: "Office Sale" user
        defaultStaffId = staffMap.get("OFFICE SALE") || null;
      } catch (err) {
        console.warn("Could not load staff members:", err.message);
      }

      const getValue = (obj, possibleNames) => {
        const key = Object.keys(obj).find((k) =>
          possibleNames.some((name) => k.toLowerCase() === name.toLowerCase()),
        );
        return key ? obj[key] : null;
      };

      // ── Pass 1: parse & validate all rows ────────────────────────────────────
      const validBills = [];
      const seenKeys = new Set();

      for (const [index, row] of jsonData.entries()) {
        if (
          index === 0 &&
          (row.CustName === "CustName" || row.BillNo === "BillNo")
        )
          continue;

        const custName = getValue(row, ["custname", "customer", "retailer"]);
        const billNo = getValue(row, ["billno", "billnumber", "bill no"]);
        const billDateValue = getValue(row, ["billdate", "date"]);
        const billAmt = getValue(row, ["billamt", "amount"]);
        const billRec = getValue(row, ["billrec", "received amount"]);
        const billBalance = getValue(row, ["billbalance", "balance"]);
        const staffName = getValue(row, ["staff name", "staff"]);
        const collectionDayInput = getValue(row, ["day", "collectionday"]);

        if (!custName && !billAmt) continue;

        if (!custName || !billAmt || !billDateValue) {
          errors.push(
            `Row ${index + 2}: Missing required fields (retailer, amount, date)`,
          );
          continue;
        }

        const billKey = `${custName}_${billDateValue}_${billAmt}`.toUpperCase();
        if (seenKeys.has(billKey)) {
          errors.push(
            `Row ${index + 2}: Duplicate entry for ${custName} on ${billDateValue} with amount ${billAmt}`,
          );
          continue;
        }
        seenKeys.add(billKey);

        let collectionDay = "Sunday";
        if (collectionDayInput) {
          const upper = collectionDayInput.toUpperCase();
          if (dayAbbreviations[upper]) {
            collectionDay = dayAbbreviations[upper];
          } else if (
            [
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ].includes(collectionDayInput)
          ) {
            collectionDay = collectionDayInput;
          } else {
            errors.push(
              `Row ${index + 2}: Invalid collection day "${collectionDayInput}" - defaulting to Sunday`,
            );
          }
        }

        let billDate;
        if (billDateValue instanceof Date) {
          billDate = billDateValue;
        } else if (typeof billDateValue === "number") {
          billDate = new Date((billDateValue - (25567 + 1)) * 86400 * 1000);
        } else {
          billDate = new Date(billDateValue);
          if (isNaN(billDate.getTime())) {
            billDate = new Date(
              billDateValue.replace(/(\d{2})-(\d{2})-(\d{4})/, "$2/$1/$3"),
            );
          }
        }

        if (isNaN(billDate.getTime())) {
          errors.push(
            `Row ${index + 2}: Invalid date format for ${billDateValue}`,
          );
          continue;
        }

        const amount = parseFloat(String(billAmt).replace(/,/g, "")) || 0;
        const received =
          parseFloat(String(billRec || "0").replace(/,/g, "")) || 0;
        const balance =
          parseFloat(String(billBalance || "0").replace(/,/g, "")) ||
          amount - received;

        if (isNaN(amount) || amount <= 0) {
          errors.push(`Row ${index + 2}: Invalid amount`);
          continue;
        }

        let status = "Unpaid";
        if (balance <= 0) status = "Paid";
        else if (received > 0) status = "Partially Paid";

        validBills.push({
          rowIndex: index + 2,
          billNumber: billNo,
          retailer: custName,
          amount,
          dueAmount: balance,
          billDate,
          collectionDay,
          status,
          brand: getBrandFromBillNumber(billNo),
          assignedTo: staffName ? (staffMap.get(staffName.toUpperCase()) || defaultStaffId) : defaultStaffId,
        });
      }

      // ── Pass 2: single query to find all already-existing bills ──────────────
      const retailerNames = validBills.map((b) => b.retailer);
      const existingBills = await Bill.find({
        retailer: { $in: retailerNames },
      })
        .select("retailer billDate amount")
        .lean();

      const existingKeys = new Set(
        existingBills.map((b) =>
          `${b.retailer}_${new Date(b.billDate).toISOString().slice(0, 10)}_${b.amount}`.toUpperCase(),
        ),
      );

      const toInsert = [];
      let alreadyExistsCount = 0;
      for (const bill of validBills) {
        const key =
          `${bill.retailer}_${new Date(bill.billDate).toISOString().slice(0, 10)}_${bill.amount}`.toUpperCase();
        if (existingKeys.has(key)) {
          alreadyExistsCount++;
          errors.push(
            `Row ${bill.rowIndex}: ${bill.retailer} on ${new Date(bill.billDate).toLocaleDateString("en-IN")} for ₹${bill.amount} already exists in DB`,
          );
        } else {
          const { rowIndex, ...billData } = bill;
          toInsert.push(billData);
        }
      }

      // ── Pass 3: bulk insert all new bills in one shot ─────────────────────────
      let insertedCount = 0;
      if (toInsert.length > 0) {
        const inserted = await Bill.insertMany(toInsert, { ordered: false });
        insertedCount = inserted.length;
      }

      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.setHeader("Content-Type", "application/x-ndjson");
      res.write(
        JSON.stringify({
          type: "result",
          importedCount: insertedCount,
          alreadyExistsCount,
          errorCount: errors.length,
          errors: errors.slice(0, 10),
        }) + "\n",
      );
      res.end();
    } catch (error) {
      console.error("Import error:", error);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.setHeader("Content-Type", "application/x-ndjson");
      res.write(
        JSON.stringify({
          type: "error",
          message: "Failed to import bills",
          error: error.message,
        }) + "\n",
      );
      res.end();
    }
  },
);
router.get("/assigned-customers", protect, staffOnly, async (req, res) => {
  try {
    const viewableStaff = req.user.permissions?.collections?.viewableStaff || [];
    const allowedIds = [req.user._id, ...viewableStaff];
    // If user can see other staff's bills, also include unassigned (null) bills
    const assignedFilter = viewableStaff.length > 0
      ? { $or: [{ assignedTo: { $in: allowedIds } }, { assignedTo: null }, { assignedTo: { $exists: false } }] }
      : { assignedTo: { $in: allowedIds } };
    const bills = await Bill.find(assignedFilter).distinct("retailer");
    res.json(bills);
  } catch (err) {
    res.status(500).json({
      message: "Failed to fetch assigned customers",
      error: err.message,
    });
  }
});

router.get("/by-collection-day/:day", protect, async (req, res) => {
  try {
    const bills = await Bill.find({
      collectionDay: req.params.day,
      assignedTo: req.user._id,
      status: { $ne: "Paid" },
    })
      .populate("collections")
      .lean();

    res.json(bills);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch bills", error: err.message });
  }
});
router.get("/bills-assigned-today", protect, staffOnly, async (req, res) => {
  try {
    console.log(
      "[DEBUG] /bills-assigned-today called by user:",
      req.user?._id,
      "role:",
      req.user?.role,
      "query:",
      req.query,
    );
    const viewableStaff = req.user.permissions?.collections?.viewableStaff || [];
    const allowedIds = [req.user._id, ...viewableStaff];

    // If user can see other staff's bills, also include bills with no assignedTo
    const assignedFilter = viewableStaff.length > 0
      ? { $or: [{ assignedTo: { $in: allowedIds } }, { assignedTo: null }, { assignedTo: { $exists: false } }] }
      : { assignedTo: { $in: allowedIds } };

    const query = {
      ...assignedFilter,
      status: { $ne: "Paid" },
    };

    // Only add collectionDay filter if specific day is requested
    if (req.query.collectionDay && req.query.collectionDay !== "All") {
      query.collectionDay = req.query.collectionDay;
    }

    const bills = await Bill.find(query).populate("assignedTo", "name").lean();

    res.json(bills);
  } catch (err) {
    res.status(500).json({
      message: "Error fetching bills assigned today",
      error: err.message,
    });
  }
});

module.exports = router;
