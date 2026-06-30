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

const getValue = (obj, possibleNames) => {
  const key = Object.keys(obj).find((k) =>
    possibleNames.some((name) => k.toLowerCase() === name.toLowerCase()),
  );
  return key ? obj[key] : null;
};

const CASH_UPI_MODES = ["cash", "upi"];

// Compare the staff's locally maintained collection Excel against what's
// actually recorded in the app. Bills with any non-cash/UPI collection
// (cheque, bank transfer) are skipped since the local sheet isn't a
// reliable comparison source for those payment modes.
router.post(
  "/check",
  protect,
  adminOnly,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const workbook = xlsx.readFile(req.file.path, { cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, {
        raw: false,
        defval: null,
      });

      if (!jsonData || jsonData.length === 0) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ message: "No data found in the file" });
      }

      const TOLERANCE = 1; // rupees, to absorb rounding

      const results = [];
      const errors = [];

      for (const [index, row] of jsonData.entries()) {
        try {
          if (
            index === 0 &&
            (row.CustName === "CustName" || row.BillNo === "BillNo")
          ) {
            continue;
          }

          const custName = getValue(row, ["custname", "customer", "retailer"]);
          const billNo = getValue(row, ["billno", "billnumber", "bill no"]);
          const billRec = getValue(row, ["billrec", "received amount"]);

          if (!custName && !billNo) continue;

          if (!custName || !billNo) {
            errors.push(`Row ${index + 2}: Missing customer name or bill number`);
            continue;
          }

          const localReceived =
            parseFloat(String(billRec ?? 0).replace(/,/g, "")) || 0;

          const bill = await Bill.findOne({
            billNumber: billNo,
            retailer: custName,
            deleted: false,
          })
            .populate("assignedTo", "name")
            .populate("collections")
            .lean();

          if (!bill) {
            results.push({
              billNumber: billNo,
              retailer: custName,
              status: "not_found",
              localReceived,
              appCollected: null,
              difference: null,
              assignedToName: null,
            });
            continue;
          }

          const collections = bill.collections || [];
          const hasNonCashUpi = collections.some(
            (c) => !CASH_UPI_MODES.includes((c.paymentMode || "").toLowerCase()),
          );

          if (hasNonCashUpi) {
            results.push({
              billNumber: bill.billNumber,
              retailer: bill.retailer,
              status: "skipped_non_cash_upi",
              localReceived,
              appCollected: null,
              difference: null,
              assignedToName: bill.assignedTo?.name || bill.assignedToName || null,
            });
            continue;
          }

          const appCollected = collections.reduce(
            (sum, c) => sum + (c.amountCollected || 0),
            0,
          );

          const difference = parseFloat((localReceived - appCollected).toFixed(2));
          const match = Math.abs(difference) <= TOLERANCE;

          results.push({
            billNumber: bill.billNumber,
            retailer: bill.retailer,
            status: match ? "match" : "mismatch",
            localReceived,
            appCollected,
            difference,
            assignedToName: bill.assignedTo?.name || bill.assignedToName || null,
          });
        } catch (rowErr) {
          errors.push(`Row ${index + 2}: ${rowErr.message}`);
        }
      }

      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        total: results.length,
        mismatchCount: results.filter((r) => r.status === "mismatch").length,
        notFoundCount: results.filter((r) => r.status === "not_found").length,
        skippedCount: results.filter(
          (r) => r.status === "skipped_non_cash_upi",
        ).length,
        results,
        errors,
      });
    } catch (err) {
      console.error("Reconciliation check error:", err);
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({
        success: false,
        message: "Failed to process reconciliation file",
        error: err.message,
      });
    }
  },
);

module.exports = router;
