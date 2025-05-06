const express = require("express");
const router = express.Router();
const Collection = require("../models/Collection");
const Bill = require("../models/Bill");
const { protect } = require("../middleware/authMiddleware");
const { format } = require("date-fns");
const { exceljs } = require("exceljs");
router.get("/export/today-collections/excel", protect, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's collections
    const collections = await Collection.find({
      collectedOn: {
        $gte: today,
        $lt: tomorrow,
      },
    })
      .populate("bill", "billNumber retailer amount")
      .populate("collectedBy", "name");

    // Create workbook
    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Today's Collections");

    // Set headers with styling
    worksheet.columns = [
      { header: "Bill Number", key: "billNumber", width: 15 },
      { header: "Retailer", key: "retailer", width: 25 },
      { header: "Bill Date", key: "billDate", width: 15 },
      { header: "Amount", key: "amount", width: 15 },
      { header: "Due Amount", key: "dueAmount", width: 15 },
      { header: "Status", key: "status", width: 15 },
      { header: "Assigned To", key: "assignedTo", width: 20 },
      { header: "Collection Amount", key: "collectionAmount", width: 20 },
      { header: "Payment Mode", key: "paymentMode", width: 15 },
      { header: "Payment Date", key: "paymentDate", width: 15 },
      { header: "Collected By", key: "collectedBy", width: 20 },
      { header: "Payment Details", key: "paymentDetails", width: 30 },
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
      let paymentDetails = "";
      if (collection.paymentDetails) {
        paymentDetails = Object.entries(collection.paymentDetails)
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ");
      }

      worksheet.addRow({
        billNumber: collection.bill?.billNumber || "N/A",
        retailer: collection.bill?.retailer || "N/A",
        billDate: collection.bill?.billDate
          ? format(collection.bill.billDate, "dd/MM/yyyy")
          : "N/A",
        amount: collection.bill?.amount || 0,
        dueAmount: collection.bill?.dueAmount || 0,
        status: collection.bill?.status || "N/A",
        assignedTo: collection.bill?.assignedTo || "N/A",
        collectionAmount: collection.amountCollected,
        paymentMode: collection.paymentMode,
        paymentDate: format(collection.collectedOn, "dd/MM/yyyy"),
        collectedBy: collection.collectedBy?.name || "System",
        paymentDetails,
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
      // In the POST route validation section
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
