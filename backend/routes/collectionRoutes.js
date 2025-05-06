const express = require("express");
const router = express.Router();
const Collection = require("../models/Collection");
const Bill = require("../models/Bill");
const { protect } = require("../middleware/authMiddleware");
const { format } = require("date-fns");
const exceljs = require("exceljs");

// Helper function to filter payment details by payment mode
const getFilteredPaymentDetails = (paymentMode, paymentDetails) => {
  if (!paymentDetails) {
    return paymentMode === "cash" 
      ? { receiptNumber: "Money Received" } 
      : null;
  }

  const modeSpecificDetails = {
    upi: ["upiId", "transactionId"],
    cash: ["receiptNumber"],
    cheque: ["chequeNumber", "bankName"],
    bank_transfer: ["transactionId", "bankName"],
  };

  const relevantKeys = modeSpecificDetails[paymentMode] || [];
  const filteredDetails = {};

  relevantKeys.forEach((key) => {
    if (paymentDetails[key] && paymentDetails[key] !== "undefined") {
      filteredDetails[key] = paymentDetails[key];
    }
  });

  // Special handling for cash payments
  if (paymentMode === "cash" && !filteredDetails.receiptNumber) {
    filteredDetails.receiptNumber = "Money Received";
  }

  return Object.keys(filteredDetails).length > 0 ? filteredDetails : null;
};

// Export today's collections to Excel
router.get("/export/today-collections/excel", protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's collections with populated data
    const collections = await Collection.find({
      collectedOn: {
        $gte: today,
        $lt: tomorrow,
      },
    })
      .populate("bill", "billNumber retailer amount dueAmount billDate")
      .populate("collectedBy", "name");

    // Create workbook and worksheet
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Today's Collections");

    // Set columns
    worksheet.columns = [
      { header: "Retailer", key: "retailer", width: 25 },
      { header: "Bill Number", key: "billNumber", width: 15 },
      { header: "Bill Date", key: "billDate", width: 15 },
      { header: "Collection Amount", key: "collectionAmount", width: 20 },
      { header: "Due Amount", key: "dueAmount", width: 15 },
      { header: "Payment Mode", key: "paymentMode", width: 15 },
      { header: "Payment Date", key: "paymentDate", width: 15 },
      { header: "Collected By", key: "collectedBy", width: 20 },
      { header: "Cheque No", key: "chequeNumber", width: 15 },
      { header: "Bank Name", key: "bankName", width: 20 },
      { header: "UPI ID", key: "upiId", width: 25 },
      { header: "Transaction ID", key: "transactionId", width: 25 },
      { header: "Receipt No", key: "receiptNumber", width: 15 },
    ];

    // Style headers
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4F81BD" },
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
    });

    // Add data rows
    collections.forEach((collection) => {
      const paymentDetails = collection.paymentDetails || {};
      
      worksheet.addRow({
        retailer: collection.bill?.retailer || "N/A",
        billNumber: collection.bill?.billNumber || "N/A",
        billDate: collection.bill?.billDate
          ? format(new Date(collection.bill.billDate), "dd/MM/yyyy")
          : "N/A",
        collectionAmount: collection.amountCollected,
        dueAmount: collection.bill?.dueAmount || 0,
        paymentMode: collection.paymentMode,
        paymentDate: format(new Date(collection.collectedOn), "dd/MM/yyyy"),
        collectedBy: collection.collectedBy?.name || "System",
        chequeNumber: paymentDetails.chequeNumber || "",
        bankName: paymentDetails.bankName || "",
        upiId: paymentDetails.upiId || "",
        transactionId: paymentDetails.transactionId || paymentDetails.upiTransactionId || "",
        receiptNumber: collection.paymentMode === "cash" 
          ? (paymentDetails.receiptNumber || "Money Received")
          : ""
      });
    });

    // Format currency columns
    [4, 5, 8].forEach((colNum) => {
      worksheet.columns[colNum].numFmt = "#,##0.00";
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 0;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(
        Math.max(maxLength + 2, column.header.length + 2),
        50
      );
    });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=today_collections_${format(
        new Date(),
        "yyyyMMdd"
      )}.xlsx`
    );

    // Send the workbook
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel export error:", err);
    res.status(500).json({
      message: "Failed to export today's collections",
      error: err.message,
    });
  }
});

// Create a new collection
router.post("/", protect, async (req, res) => {
  try {
    const { bill, amountCollected, paymentMode, remarks, paymentDetails } = req.body;

    // Validate required fields
    if (!bill || !amountCollected || !paymentMode) {
      return res.status(400).json({
        message: "Bill ID, amount collected and payment mode are required",
      });
    }

    // Validate amount
    const amount = parseFloat(amountCollected);
    if (isNaN(amount) || amount <= 0 || amount > 1000000) {
      return res.status(400).json({
        message: "Amount must be a positive number less than 1,000,000",
      });
    }

    // Validate decimal places
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
        message: `Amount cannot exceed due amount of ${existingBill.dueAmount.toFixed(2)}`,
      });
    }

    // Validate payment details based on payment mode
    let validationError;
    switch (paymentMode) {
      case "upi":
        if (!paymentDetails?.upiId) {
          validationError = "UPI ID is required for UPI payments";
        }
        break;
      case "cheque":
        if (!paymentDetails?.chequeNumber || !paymentDetails?.bankName) {
          validationError = "Cheque number and bank name are required for cheque payments";
        }
        break;
      case "bank_transfer":
        if (!paymentDetails?.transactionId || !paymentDetails?.bankName) {
          validationError = "Transaction ID and bank name are required for bank transfers";
        }
        break;
    }

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    // Create collection with properly structured paymentDetails
    const collection = new Collection({
      bill,
      amountCollected: amount,
      paymentMode,
      paymentDetails: paymentMode === "cash" 
        ? { receiptNumber: paymentDetails?.receiptNumber || "Money Received" }
        : paymentDetails,
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