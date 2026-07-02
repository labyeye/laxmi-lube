const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");

// Parse collectedOn: if date-only string, use actual current time (for today) or midnight IST (for past dates)
function parseCollectedOn(dateStr) {
  if (!dateStr) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const todayIST = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    if (dateStr === todayIST) return new Date(); // actual current time for today
    return new Date(dateStr + "T00:00:00+05:30"); // midnight IST for past dates
  }
  return new Date(dateStr);
}
const Collection = require("../models/Collection");
const Bill = require("../models/Bill");
const Retailer = require("../models/Retailer");
const {
  protect,
  adminOnly,
  checkPermission,
} = require("../middleware/authMiddleware");
const { format } = require("date-fns");
const exceljs = require("exceljs");
const { generateReceiptPDF, generateGroupReceiptPDF } = require("../services/pdfService");
const {
  sendRetailerReceipt,
  sendAdminNotification,
} = require("../services/whatsappService");

const screenshotStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/screenshots";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `ss_${Date.now()}${ext}`);
  },
});
const uploadScreenshot = multer({
  storage: screenshotStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

// ── Shared WhatsApp trigger (used by auto-send and manual endpoint) ───────────
const PAYMENT_MODE_LABELS = {
  Cash: "Cash",
  cheque: "Cheque",
  bank_transfer: "Bank Transfer",
  upi: "UPI",
};

// Sends only the retailer's PDF receipt for one collection; does NOT notify admin.
async function sendRetailerReceiptOnly(collectionId) {
  const collection = await Collection.findById(collectionId)
    .populate("bill", "billNumber retailer amount dueAmount billDate")
    .populate("collectedBy", "name");

  if (!collection) throw new Error("Collection not found");

  const bill = collection.bill;
  const retailer = await Retailer.findOne({ name: bill?.retailer });
  const staffName = collection.collectedBy?.name || "Staff";
  const billNumber = bill?.billNumber || "N/A";
  const collectionDate = format(
    new Date(collection.collectedOn),
    "dd MMM yyyy",
  );
  const amountFormatted = parseFloat(collection.amountCollected).toFixed(2);
  const paymentModeLabel =
    PAYMENT_MODE_LABELS[collection.paymentMode] || collection.paymentMode;

  const pdfBuffer = await generateReceiptPDF(
    collection,
    bill,
    retailer,
    collection.collectedBy,
    process.env.COMPANY_NAME || "Distribution Co.",
  );
  const pdfFilename = `receipt_${billNumber}_${Date.now()}.pdf`;

  let waStatus = "no_phone";

  if (retailer?.phone) {
    await sendRetailerReceipt(
      retailer.phone,
      pdfBuffer,
      pdfFilename,
      {
        retailerName: retailer.name,
        amount: amountFormatted,
        billNumber,
        date: collectionDate,
        staffName,
      },
      collectionId.toString(),
    );
    waStatus = "sent";
  }

  await Collection.findByIdAndUpdate(collectionId, {
    whatsappStatus: waStatus,
    whatsappSentAt: waStatus === "sent" ? new Date() : undefined,
  });

  return {
    waStatus,
    retailer,
    bill,
    staffName,
    billNumber,
    collectionDate,
    amountFormatted,
    paymentModeLabel,
  };
}

// Sends exactly one admin WhatsApp notification, regardless of how many bills were paid.
async function sendAdminNotifyOnce({
  retailerName,
  retailerPhone,
  retailerAddress,
  amount,
  billNumber,
  paymentMode,
  staffName,
  date,
}) {
  const adminPhone = process.env.ADMIN_WHATSAPP_PHONE;
  if (!adminPhone) return;
  await sendAdminNotification(adminPhone, {
    retailerName,
    retailerPhone,
    retailerAddress,
    amount,
    billNumber,
    paymentMode,
    staffName,
    date,
  });
}

async function triggerWhatsApp(collectionId) {
  const r = await sendRetailerReceiptOnly(collectionId);

  await sendAdminNotifyOnce({
    retailerName: r.bill?.retailer || "N/A",
    retailerPhone: r.retailer?.phone || "N/A",
    retailerAddress:
      [r.retailer?.address1, r.retailer?.address2].filter(Boolean).join(", ") ||
      "N/A",
    amount: r.amountFormatted,
    billNumber: r.billNumber,
    paymentMode: r.paymentModeLabel,
    staffName: r.staffName,
    date: r.collectionDate,
  });

  return {
    whatsappStatus: r.waStatus,
    retailerPhone: r.retailer?.phone || null,
  };
}

// Sends ONE combined receipt to the retailer for all bills in a split-payment
// group, and ONE admin notification — never N messages per bill.
async function triggerGroupWhatsApp(paymentGroupId) {
  const members = await Collection.find({ paymentGroupId })
    .populate("bill", "billNumber retailer amount dueAmount billDate")
    .populate("collectedBy", "name");

  if (members.length === 0) throw new Error("Payment group not found");

  const first = members[0];
  const retailer = await Retailer.findOne({ name: first.bill?.retailer });
  const staffName = first.collectedBy?.name || "Staff";
  const collectionDate = format(new Date(first.collectedOn), "dd MMM yyyy");
  const totalAmount = members.reduce((sum, c) => sum + c.amountCollected, 0).toFixed(2);
  const paymentModeLabel = PAYMENT_MODE_LABELS[first.paymentMode] || first.paymentMode;

  // Combined bill string for template body: "#1042 (₹5000), #1043 (₹3000)"
  const combinedBillStr = members
    .map((m) => `#${m.bill?.billNumber} (₹${Math.round(m.amountCollected)})`)
    .join(", ");

  // Also keep a plain bill number list for the admin notification
  const combinedBillNumbers = members.map((m) => m.bill?.billNumber).join(", ");

  let waStatus = "no_phone";

  if (retailer?.phone) {
    try {
      // Generate ONE combined PDF for all bills in the group
      const pdfBuffer = await generateGroupReceiptPDF(members, retailer);
      const pdfFilename = `receipt_group_${paymentGroupId}_${Date.now()}.pdf`;

      await sendRetailerReceipt(
        retailer.phone,
        pdfBuffer,
        pdfFilename,
        {
          retailerName: retailer.name,
          amount: totalAmount,
          billNumber: combinedBillStr,
          date: collectionDate,
          staffName,
        },
        // Button payload references the group so the webhook can mark all members
        `GROUP:${paymentGroupId}`,
      );
      waStatus = "sent";
    } catch (err) {
      console.error("Group retailer receipt send failed:", err.message);
    }
  }

  // Update whatsappStatus on every member in the group
  await Collection.updateMany({ paymentGroupId }, {
    whatsappStatus: waStatus,
    ...(waStatus === "sent" ? { whatsappSentAt: new Date() } : {}),
  });

  await sendAdminNotifyOnce({
    retailerName: first.bill?.retailer || "N/A",
    retailerPhone: retailer?.phone || "N/A",
    retailerAddress:
      [retailer?.address1, retailer?.address2].filter(Boolean).join(", ") || "N/A",
    amount: totalAmount,
    billNumber: combinedBillNumbers,
    paymentMode: paymentModeLabel,
    staffName,
    date: collectionDate,
  });

  return { whatsappStatus: waStatus, retailerPhone: retailer?.phone || null };
}

// ── Helper function to filter payment details by payment mode ─────────────────
const getFilteredPaymentDetails = (paymentMode, paymentDetails) => {
  if (!paymentDetails) {
    return paymentMode === "Cash" ? { receiptNumber: "Money Received" } : null;
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
  if (paymentMode === "Cash" && !filteredDetails.receiptNumber) {
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
      { header: "Retailer Name", key: "retailer", width: 25 },
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
        paymentMode: collection.paymentMode
          ? collection.paymentMode.charAt(0).toUpperCase() +
            collection.paymentMode.slice(1).toLowerCase()
          : "N/A",
        paymentDate: format(new Date(collection.collectedOn), "dd/MM/yyyy"),
        collectedBy: collection.collectedBy?.name || "System",
        chequeNumber: paymentDetails.chequeNumber || "",
        bankName: paymentDetails.bankName || "",
        upiId: paymentDetails.upiId || "",
        transactionId:
          paymentDetails.transactionId || paymentDetails.upiTransactionId || "",
        receiptNumber:
          collection.paymentMode === "Cash"
            ? paymentDetails.receiptNumber || "Money Received"
            : "",
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
        50,
      );
    });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=today_collections_${format(
        new Date(),
        "yyyyMMdd",
      )}.xlsx`,
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

// Get next auto-generated receipt number (0001, 0002, ...)
router.get("/next-receipt-number", protect, async (req, res) => {
  try {
    const count = await Collection.countDocuments({ paymentMode: "Cash" });
    const nextNumber = String(count + 1).padStart(4, "0");
    res.json({ receiptNumber: nextNumber });
  } catch (err) {
    res.status(500).json({
      message: "Failed to generate receipt number",
      error: err.message,
    });
  }
});

// Create a new collection
router.post(
  "/",
  protect,
  uploadScreenshot.single("screenshot"),
  async (req, res) => {
    try {
      const {
        bill,
        amountCollected,
        paymentMode,
        remarks,
        paymentDetails,
        collectedOn,
      } = req.body;

      const parsedPaymentDetails =
        typeof paymentDetails === "string"
          ? JSON.parse(paymentDetails)
          : paymentDetails;

      // Validate required fields
      if (!bill || !amountCollected || !paymentMode || !collectedOn) {
        return res.status(400).json({
          message:
            "Bill ID, amount collected, payment mode and collection date are required",
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
          if (!parsedPaymentDetails?.upiId) {
            validationError = "UPI ID is required for UPI payments";
          }
          break;
        case "cheque":
          if (
            !parsedPaymentDetails?.chequeNumber ||
            !parsedPaymentDetails?.bankName
          ) {
            validationError =
              "Cheque number and bank name are required for cheque payments";
          }
          break;
        case "bank_transfer":
          if (
            !parsedPaymentDetails?.transactionId ||
            !parsedPaymentDetails?.bankName
          ) {
            validationError =
              "Transaction ID and bank name are required for bank transfers";
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
        paymentDetails:
          paymentMode === "Cash"
            ? {
                receiptNumber:
                  parsedPaymentDetails?.receiptNumber || "Money Received",
              }
            : parsedPaymentDetails,
        collectedBy: req.user._id,
        remarks,
        collectedOn: parseCollectedOn(collectedOn),
        screenshotPath: req.file ? req.file.path : null,
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
        .populate("bill", "billNumber retailer amount dueAmount billDate")
        .populate("collectedBy", "name");

      res.status(201).json(result);

      // Auto-trigger WhatsApp in background (non-blocking)
      setImmediate(() => triggerWhatsApp(collection._id).catch(() => {}));
    } catch (err) {
      console.error("Collection error:", err);
      res.status(500).json({
        message: "Failed to record collection",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },
);

// Create a collection split across multiple bills of the same retailer
router.post(
  "/split",
  protect,
  uploadScreenshot.single("screenshot"),
  async (req, res) => {
    try {
      const { allocations, paymentMode, remarks, paymentDetails, collectedOn } =
        req.body;

      const parsedAllocations =
        typeof allocations === "string" ? JSON.parse(allocations) : allocations;
      const parsedPaymentDetails =
        typeof paymentDetails === "string"
          ? JSON.parse(paymentDetails)
          : paymentDetails;

      if (
        !Array.isArray(parsedAllocations) ||
        parsedAllocations.length === 0 ||
        !paymentMode ||
        !collectedOn
      ) {
        return res.status(400).json({
          message: "Allocations, payment mode and collection date are required",
        });
      }

      // Validate payment details based on payment mode
      let validationError;
      switch (paymentMode) {
        case "upi":
          if (!parsedPaymentDetails?.upiId) {
            validationError = "UPI ID is required for UPI payments";
          }
          break;
        case "cheque":
          if (
            !parsedPaymentDetails?.chequeNumber ||
            !parsedPaymentDetails?.bankName
          ) {
            validationError =
              "Cheque number and bank name are required for cheque payments";
          }
          break;
        case "bank_transfer":
          if (
            !parsedPaymentDetails?.transactionId ||
            !parsedPaymentDetails?.bankName
          ) {
            validationError =
              "Transaction ID and bank name are required for bank transfers";
          }
          break;
      }
      if (validationError) {
        return res.status(400).json({ message: validationError });
      }

      // Validate each allocation against its bill's current due amount
      const validatedAllocations = [];
      for (const alloc of parsedAllocations) {
        const amount = parseFloat(alloc.amount);
        if (!alloc.billId || isNaN(amount) || amount <= 0) {
          return res.status(400).json({
            message: "Each allocation needs a valid bill and a positive amount",
          });
        }
        if (!/^\d+(\.\d{1,2})?$/.test(String(alloc.amount))) {
          return res.status(400).json({
            message: "Amounts must have up to 2 decimal places",
          });
        }

        const bill = await Bill.findById(alloc.billId);
        if (!bill) {
          return res
            .status(404)
            .json({ message: `Bill ${alloc.billId} not found` });
        }
        if (amount > bill.dueAmount) {
          return res.status(400).json({
            message: `Amount for bill ${bill.billNumber} cannot exceed its due of ${bill.dueAmount.toFixed(2)}`,
          });
        }

        validatedAllocations.push({ bill, amount });
      }

      const paymentGroupId = new mongoose.Types.ObjectId().toString();
      const finalPaymentDetails =
        paymentMode === "Cash"
          ? {
              receiptNumber:
                parsedPaymentDetails?.receiptNumber || "Money Received",
            }
          : parsedPaymentDetails;

      const createdCollections = [];
      for (const { bill, amount } of validatedAllocations) {
        const collection = new Collection({
          bill: bill._id,
          amountCollected: amount,
          paymentMode,
          paymentDetails: finalPaymentDetails,
          collectedBy: req.user._id,
          remarks,
          collectedOn: parseCollectedOn(collectedOn),
          screenshotPath: req.file ? req.file.path : null,
          paymentGroupId,
        });
        await collection.save();
        createdCollections.push(collection);

        const newDueAmount = bill.dueAmount - amount;
        await Bill.findByIdAndUpdate(bill._id, {
          dueAmount: newDueAmount,
          status: newDueAmount <= 0 ? "Paid" : "Partially Paid",
        });
      }

      const results = await Collection.find({
        _id: { $in: createdCollections.map((c) => c._id) },
      })
        .populate("bill", "billNumber retailer amount dueAmount billDate")
        .populate("collectedBy", "name");

      res.status(201).json({ paymentGroupId, collections: results });

      // Auto-trigger WhatsApp in background: one receipt per bill to the
      // retailer, but only ONE admin notification for the whole group.
      setImmediate(() => {
        triggerGroupWhatsApp(paymentGroupId).catch(() => {});
      });
    } catch (err) {
      console.error("Split collection error:", err);
      res.status(500).json({
        message: "Failed to record split collection",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  },
);

router.get("/", protect, async (req, res) => {
  try {
    const { search, startDate, endDate } = req.query;
    // Admins and staff with collections.verify permission see all collections
    // (they need to review everyone's work); other staff only see their own.
    const canSeeAll =
      req.user.role === "admin" ||
      req.user.permissions?.collections?.verify === true;
    const filter = canSeeAll ? {} : { collectedBy: req.user._id };

    if (search) {
      const bills = await Bill.find({
        $or: [
          { billNumber: { $regex: search, $options: "i" } },
          { retailer: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      filter.bill = { $in: bills.map((b) => b._id) };
    }

    if (startDate || endDate) {
      filter.collectedOn = {};
      if (startDate) filter.collectedOn.$gte = new Date(startDate);
      if (endDate) filter.collectedOn.$lte = new Date(endDate);
    }

    const collections = await Collection.find(filter)
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

// ── WhatsApp logs (admin) ─────────────────────────────────────────────────────
router.get("/whatsapp-logs", protect, adminOnly, async (req, res) => {
  try {
    const { status, search, page = 1, limit = 200 } = req.query;
    const filter = {};
    if (status && status !== "all") filter.whatsappStatus = status;

    if (search) {
      const matchingBills = await Bill.find({
        retailer: { $regex: search, $options: "i" },
      }).select("_id");
      filter.bill = { $in: matchingBills.map((b) => b._id) };
    }

    const collections = await Collection.find(filter)
      .populate("bill", "billNumber retailer amount dueAmount billDate")
      .populate("collectedBy", "name")
      .sort({ collectedOn: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Attach retailer phone from Retailer collection
    const retailerNames = [
      ...new Set(collections.map((c) => c.bill?.retailer).filter(Boolean)),
    ];
    const retailers = await Retailer.find({
      name: { $in: retailerNames },
    }).select("name phone");
    const phoneMap = {};
    retailers.forEach((r) => {
      phoneMap[r.name] = r.phone || null;
    });

    const enriched = collections.map((c) => ({
      _id: c._id,
      billNumber: c.bill?.billNumber || "N/A",
      retailerName: c.bill?.retailer || "Unknown",
      retailerPhone: phoneMap[c.bill?.retailer] || null,
      amount: c.amountCollected,
      paymentMode: c.paymentMode,
      collectedBy: c.collectedBy?.name || "Staff",
      collectedOn: c.collectedOn,
      whatsappStatus: c.whatsappStatus || "pending",
      whatsappSentAt: c.whatsappSentAt || null,
      whatsappConfirmedAt: c.whatsappConfirmedAt || null,
      whatsappConfirmedBy: c.whatsappConfirmedBy || null,
    }));

    res.json(enriched);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch WhatsApp logs", error: err.message });
  }
});

// ── Manual WhatsApp send / resend ─────────────────────────────────────────────
router.post("/:id/send-whatsapp", protect, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(404).json({ message: "Collection not found" });
    }

    const result = await triggerWhatsApp(req.params.id);

    res.json({
      success: true,
      whatsappStatus: result.whatsappStatus,
      hasPhone: !!result.retailerPhone,
      message: result.retailerPhone
        ? "WhatsApp receipt sent successfully"
        : "No phone number found for this retailer — please add one first",
    });
  } catch (err) {
    console.error("Manual WhatsApp send error:", err.message);
    await Collection.findByIdAndUpdate(req.params.id, {
      whatsappStatus: "pending",
    }).catch(() => {});
    res.status(500).json({
      success: false,
      message: err.message || "Failed to send WhatsApp message",
    });
  }
});

// Resend WhatsApp for an entire split-payment group in one go — sends each
// bill's receipt to the retailer but only ONE admin notification, so retrying
// a 3-bill split sends 1 admin message instead of 3.
router.post(
  "/group/:paymentGroupId/send-whatsapp",
  protect,
  async (req, res) => {
    try {
      const result = await triggerGroupWhatsApp(req.params.paymentGroupId);

      res.json({
        success: true,
        whatsappStatus: result.whatsappStatus,
        hasPhone: !!result.retailerPhone,
        message: result.retailerPhone
          ? "WhatsApp receipts sent successfully"
          : "No phone number found for this retailer — please add one first",
      });
    } catch (err) {
      console.error("Group WhatsApp send error:", err.message);
      res.status(500).json({
        success: false,
        message: err.message || "Failed to send WhatsApp message",
      });
    }
  },
);

// ── Verification of a collection (admin, or staff with collections.verify permission) ──
router.patch(
  "/:id/verify",
  protect,
  checkPermission("collections", "verify"),
  async (req, res) => {
    try {
      const { status, remarks } = req.body;
      if (!["verified", "not_verified"].includes(status)) {
        return res.status(400).json({
          message: "Status must be 'verified' or 'not_verified'",
        });
      }

      const collection = await Collection.findByIdAndUpdate(
        req.params.id,
        {
          verificationStatus: status,
          verifiedAt: new Date(),
          verifiedBy: req.user._id,
          verificationRemarks: (remarks || "").trim(),
        },
        { new: true },
      )
        .populate("bill", "billNumber retailer amount dueAmount billDate")
        .populate("collectedBy", "name")
        .populate("verifiedBy", "name");

      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }

      res.json(collection);
    } catch (err) {
      res.status(500).json({
        message: "Failed to update verification status",
        error: err.message,
      });
    }
  },
);

module.exports = router;
