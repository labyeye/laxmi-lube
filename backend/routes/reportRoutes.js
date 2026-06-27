const express = require("express");
const router = express.Router();
const Bill = require("../models/Bill");
const Collection = require("../models/Collection");
const Delivery = require("../models/Delivery");
const Retailer = require("../models/Retailer");
const User = require("../models/User");
const Attendance = require("../models/Attendance");
const Salary = require("../models/Salary");
const Advance = require("../models/Advance");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const exceljs = require("exceljs");
const PDFDocument = require("pdfkit");
const { format } = require("date-fns");
// Update the getFilteredPaymentDetails function:
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

  return Object.keys(filteredDetails).length > 0 ? filteredDetails : null;
};

function endOfDay(date) {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
}

function startOfDay(date) {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}
// Get collections for a date range
router.get("/date-collections", protect, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 15 } = req.query;
    
    // If no dates provided, default to today
    const start = startDate ? startOfDay(new Date(startDate)) : startOfDay(new Date());
    const end = endDate ? endOfDay(new Date(endDate)) : endOfDay(new Date());

    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Find collections for the date range
    const collections = await Collection.find({
      collectedOn: {
        $gte: start,
        $lte: end,
      },
    })
      .populate("collectedBy", "name")
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalCollections = await Collection.countDocuments({
      collectedOn: {
        $gte: start,
        $lte: end,
      },
    });

    // Find bills associated with these collections
    const billIds = collections.map((c) => c.bill);
    const reports = await Bill.find({
      _id: { $in: billIds },
    })
      .populate("assignedTo", "name")
      .sort({ billDate: -1 });

    // Combine the data
    const formattedReports = reports.map((report) => {
      const billCollections = collections.filter(
        (c) => c.bill.toString() === report._id.toString()
      );

      return {
        _id: report._id,
        retailer: report.retailer,
        billNumber: report.billNumber,
        billDate: report.billDate,
        dueAmount: report.dueAmount,
        collections: billCollections.map((collection) => ({
          _id: collection._id,
          amountCollected: collection.amountCollected,
          paymentMode: collection.paymentMode
            ? collection.paymentMode.charAt(0).toUpperCase() +
              collection.paymentMode.slice(1).toLowerCase()
            : "N/A",
          paymentDate: collection.collectedOn,
          paymentDetails: collection.paymentDetails,
          collectedByName: collection.collectedBy?.name || "System",
        })),
      };
    });

    res.json({
      reports: formattedReports,
      total: totalCollections,
      page: parseInt(page),
      pages: Math.ceil(totalCollections / limit),
      limit: parseInt(limit),
      startDate: start,
      endDate: end,
    });
  } catch (err) {
    console.error("Date range collections error:", err);
    res.status(500).json({
      message: "Error fetching date range collections",
      error: err.message,
    });
  }
});

router.get(
  "/export/date-collections/excel",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      // If no dates provided, default to today
      const start = startDate ? startOfDay(new Date(startDate)) : startOfDay(new Date());
      const end = endDate ? endOfDay(new Date(endDate)) : endOfDay(new Date());

      const collections = await Collection.find({
        collectedOn: {
          $gte: start,
          $lte: end,
        },
      })
        .populate({
          path: "bill",
          select:
            "billNumber retailer amount dueAmount status billDate assignedTo",
          populate: {
            path: "assignedTo",
            select: "name",
          },
        })
        .populate("collectedBy", "name");

      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet("Collections");

      worksheet.columns = [
        { header: "Retailer Name", key: "retailer", width: 25 },
        { header: "Inv No", key: "billNumber", width: 15 },
        { header: "Inv Date", key: "billDate", width: 15 },
        { header: "Collection Amount", key: "collectionAmount", width: 20 },
        { header: "Due Amount", key: "dueAmount", width: 15 },
        { header: "Payment Mode", key: "paymentMode", width: 15 },
        { header: "Payment Date", key: "paymentDate", width: 15 },
        { header: "DSR Name", key: "collectedBy", width: 20 },
        { header: "M.R.No", key: "receiptNumber", width: 15 },
        { header: "UPI ID", key: "upiId", width: 25 },
        { header: "Transaction ID", key: "transactionId", width: 25 },
        { header: "Cheque No", key: "chequeNumber", width: 15 },
        { header: "Bank Name", key: "bankName", width: 20 },
      ];

      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4F81BD" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });

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
          receiptNumber:
            collection.paymentMode?.toLowerCase() === "cash"
              ? paymentDetails.receiptNumber || "Money Received"
              : "",
          upiId: paymentDetails.upiId || "",
          transactionId:
            paymentDetails.transactionId ||
            paymentDetails.upiTransactionId ||
            "",
          chequeNumber: paymentDetails.chequeNumber || "",
          bankName: paymentDetails.bankName || "",
        });
      });

      [4, 5, 8].forEach((colNum) => {
        worksheet.columns[colNum].numFmt = "#,##0.00";
      });

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

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=collections_${format(
          start,
          "yyyyMMdd"
        )}_to_${format(end, "yyyyMMdd")}.xlsx`
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error("Excel export error:", err);
      res.status(500).json({
        message: "Failed to export date collections",
        error: err.message,
      });
    }
  }
);

function endOfDay(date) {
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
}
function startOfDay(date) {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}// Add this route to collectionRoutes.js
router.get("/dsr-summary", protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "Both startDate and endDate are required"
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Adjust end date to include the entire day
    end.setHours(23, 59, 59, 999);

    // Aggregate collections by DSR for the date range
    const summary = await Collection.aggregate([
      {
        $match: {
          collectedOn: {
            $gte: start,
            $lte: end
          }
        }
      },
      {
        $group: {
          _id: "$collectedBy",
          total: { $sum: "$amountCollected" },
          cash: { 
            $sum: { 
              $cond: [{ $eq: ["$paymentMode", "cash"] }, "$amountCollected", 0] 
            } 
          },
          cashTrc: { 
            $sum: { 
              $cond: [{ $eq: ["$paymentMode", "cash"] }, 1, 0] 
            } 
          },
          upi: { 
            $sum: { 
              $cond: [{ $eq: ["$paymentMode", "upi"] }, "$amountCollected", 0] 
            } 
          },
          upiTrc: { 
            $sum: { 
              $cond: [{ $eq: ["$paymentMode", "upi"] }, 1, 0] 
            } 
          },
          cheque: { 
            $sum: { 
              $cond: [{ $eq: ["$paymentMode", "cheque"] }, "$amountCollected", 0] 
            } 
          },
          chequeTrc: { 
            $sum: { 
              $cond: [{ $eq: ["$paymentMode", "cheque"] }, 1, 0] 
            } 
          },
          bankTransfer: { 
            $sum: { 
              $cond: [{ $eq: ["$paymentMode", "bank_transfer"] }, "$amountCollected", 0] 
            } 
          },
          bankTransferTrc: { 
            $sum: { 
              $cond: [{ $eq: ["$paymentMode", "bank_transfer"] }, 1, 0] 
            } 
          },
          collectionCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $unwind: "$user"
      },
      {
        $project: {
          staffName: "$user.name",
          total: 1,
          cash: 1,
          cashTrc: 1,
          upi: 1,
          upiTrc: 1,
          cheque: 1,
          chequeTrc: 1,
          bankTransfer: 1,
          bankTransferTrc: 1,
          collectionCount: 1
        }
      }
    ]);

    // Get assigned retailers count (you'll need to implement this based on your business logic)
    // This is just a placeholder - you'll need to replace it with your actual logic
    const assignedRetailers = await getAssignedRetailersCount(start, end);

    // Merge assigned retailers data with summary
    const result = summary.map(item => ({
      ...item,
      assignedRetailers: assignedRetailers[item._id] || 0,
      collectedRetailers: item.collectionCount
    }));

    res.json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error("DSR Summary error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to generate DSR summary",
      error: err.message
    });
  }
});

// Placeholder function - replace with your actual implementation
async function getAssignedRetailersCount(startDate, endDate) {
  // This should return an object like { userId1: count1, userId2: count2 }
  // You'll need to implement this based on how retailers are assigned to DSRs in your system
  return {};
}

// Export DSR summary to Excel
router.get(
  "/export/dsr-summary/excel",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Both startDate and endDate are required"
        });
      }

      const start = startOfDay(new Date(startDate));
      const end = endOfDay(new Date(endDate));

      // Aggregate collections by DSR for the date range
      const summary = await Collection.aggregate([
        {
          $match: {
            collectedOn: {
              $gte: start,
              $lte: end
            }
          }
        },
        {
          $group: {
            _id: "$collectedBy",
            total: { $sum: "$amountCollected" },
            cash: { 
              $sum: { 
                $cond: [{ $eq: ["$paymentMode", "cash"] }, "$amountCollected", 0] 
              } 
            },
            cashTrc: { 
              $sum: { 
                $cond: [{ $eq: ["$paymentMode", "cash"] }, 1, 0] 
              } 
            },
            upi: { 
              $sum: { 
                $cond: [{ $eq: ["$paymentMode", "upi"] }, "$amountCollected", 0] 
              } 
            },
            upiTrc: { 
              $sum: { 
                $cond: [{ $eq: ["$paymentMode", "upi"] }, 1, 0] 
              } 
            },
            cheque: { 
              $sum: { 
                $cond: [{ $eq: ["$paymentMode", "cheque"] }, "$amountCollected", 0] 
              } 
            },
            chequeTrc: { 
              $sum: { 
                $cond: [{ $eq: ["$paymentMode", "cheque"] }, 1, 0] 
              } 
            },
            bankTransfer: { 
              $sum: { 
                $cond: [{ $eq: ["$paymentMode", "bank_transfer"] }, "$amountCollected", 0] 
              } 
            },
            bankTransferTrc: { 
              $sum: { 
                $cond: [{ $eq: ["$paymentMode", "bank_transfer"] }, 1, 0] 
              } 
            },
            collectionCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user"
          }
        },
        { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            staffId: "$_id",
            staffName: "$user.name",
            total: 1,
            cash: 1,
            cashTrc: 1,
            upi: 1,
            upiTrc: 1,
            cheque: 1,
            chequeTrc: 1,
            bankTransfer: 1,
            bankTransferTrc: 1,
            collectionCount: 1
          }
        },
        { $sort: { total: -1 } }
      ]);

      const assignedRetailers = await getAssignedRetailersCount(start, end);

      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet('DSR Summary');

      worksheet.columns = [
        { header: 'DSR Name', key: 'staffName', width: 30 },
        { header: 'Total Collected', key: 'total', width: 18 },
        { header: 'Cash Amount', key: 'cash', width: 15 },
        { header: 'Cash Trx', key: 'cashTrc', width: 12 },
        { header: 'UPI Amount', key: 'upi', width: 15 },
        { header: 'UPI Trx', key: 'upiTrc', width: 12 },
        { header: 'Cheque Amount', key: 'cheque', width: 15 },
        { header: 'Cheque Trx', key: 'chequeTrc', width: 12 },
        { header: 'Bank Transfer Amount', key: 'bankTransfer', width: 18 },
        { header: 'Bank Transfer Trx', key: 'bankTransferTrc', width: 15 },
        { header: 'Assigned Retailers', key: 'assignedRetailers', width: 18 },
        { header: 'Collected Retailers', key: 'collectedRetailers', width: 18 }
      ];

      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      });

      summary.forEach((row) => {
        worksheet.addRow({
          staffName: row.staffName || 'Unknown',
          total: row.total || 0,
          cash: row.cash || 0,
          cashTrc: row.cashTrc || 0,
          upi: row.upi || 0,
          upiTrc: row.upiTrc || 0,
          cheque: row.cheque || 0,
          chequeTrc: row.chequeTrc || 0,
          bankTransfer: row.bankTransfer || 0,
          bankTransferTrc: row.bankTransferTrc || 0,
          assignedRetailers: assignedRetailers[row.staffId] || 0,
          collectedRetailers: row.collectionCount || 0
        });
      });

      // Format numeric columns
      [2,3,5,7,9].forEach((colIndex) => {
        worksheet.getColumn(colIndex).numFmt = '#,##0.00';
      });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=dsr_summary_${format(start, 'yyyyMMdd')}_to_${format(end, 'yyyyMMdd')}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error('DSR Excel export error:', err);
      res.status(500).json({
        success: false,
        message: 'Failed to export DSR summary',
        error: err.message
      });
    }
  }
);
router.get("/dsr-daily-retailers", protect, adminOnly, async (req, res) => {
  try {
    const { date } = req.query;
    const selectedDate = date ? new Date(date) : new Date();
    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });

    // 1. Get all bills assigned for today (by collection day OR assigned today)
    const assignedBills = await Bill.find({
      $or: [
        { collectionDay: dayOfWeek, assignedTo: { $exists: true } },
        { 
          assignedDate: { 
            $gte: startOfDay(selectedDate), 
            $lte: endOfDay(selectedDate) 
          } 
        }
      ],
      assignedTo: { $exists: true, $ne: null }
    }).populate("assignedTo", "name");

    // 2. Get today's collections
    const todayCollections = await Collection.find({
      collectedOn: { 
        $gte: startOfDay(selectedDate), 
        $lte: endOfDay(selectedDate) 
      }
    }).populate("bill", "retailer assignedTo");

    // 3. Count unique assigned retailers per DSR
    const assignedRetailersMap = new Map(); // { staffId: { name, retailers: Set() } }

    assignedBills.forEach(bill => {
      if (!bill.assignedTo) return;
      
      const staffId = bill.assignedTo._id;
      if (!assignedRetailersMap.has(staffId)) {
        assignedRetailersMap.set(staffId, {
          name: bill.assignedTo.name,
          retailers: new Set()
        });
      }
      assignedRetailersMap.get(staffId).retailers.add(bill.retailer);
    });

    // 4. Count unique collected retailers per DSR
    const collectedRetailersMap = new Map(); // { staffId: Set(retailers) }

    todayCollections.forEach(collection => {
      if (!collection.bill?.assignedTo) return;
      
      const staffId = collection.bill.assignedTo;
      if (!collectedRetailersMap.has(staffId)) {
        collectedRetailersMap.set(staffId, new Set());
      }
      collectedRetailersMap.get(staffId).add(collection.bill.retailer);
    });

    // 5. Prepare final result
    const result = Array.from(assignedRetailersMap.entries()).map(([staffId, data]) => ({
      staffId,
      staffName: data.name,
      assignedRetailers: data.retailers.size,
      collectedRetailers: collectedRetailersMap.get(staffId)?.size || 0
    }));

    res.json({
      success: true,
      data: result,
      date: selectedDate.toISOString().split('T')[0],
      day: dayOfWeek
    });

  } catch (err) {
    console.error("DSR Daily Retailers error:", err);
    res.status(500).json({
      success: false,
      message: "Error fetching DSR retailer counts",
      error: err.message
    });
  }
});

router.get(
  "/export/today-collections/excel",
  protect,
  adminOnly,
  async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const cleanPaymentDetails = (paymentDetails) => {
        if (!paymentDetails) return {};

        const cleaned = {};
        Object.entries(paymentDetails).forEach(([key, value]) => {
          if (value && value !== "undefined" && value !== "null") {
            cleaned[key] = value;
          }
        });
        return cleaned;
      };
      const collections = await Collection.find({
        collectedOn: {
          $gte: today,
          $lt: tomorrow,
        },
      })
        .populate({
          path: "bill",
          select:
            "billNumber retailer amount dueAmount status billDate assignedTo",
          populate: {
            path: "assignedTo",
            select: "name",
          },
        })
        .populate("collectedBy", "name");
      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet("Today's Collections");

      worksheet.columns = [
        { header: "Retailer Name", key: "retailer", width: 25 },
        { header: "Inv No", key: "billNumber", width: 15 },
        { header: "Inv Date", key: "billDate", width: 15 },
        { header: "Collection Amount", key: "collectionAmount", width: 20 },
        { header: "Due Amount", key: "dueAmount", width: 15 },
        { header: "Payment Mode", key: "paymentMode", width: 15 },
        { header: "Payment Date", key: "paymentDate", width: 15 },
        { header: "DSR Name", key: "collectedBy", width: 20 },
        { header: "M.R.No", key: "receiptNumber", width: 15 },
        { header: "UPI ID", key: "upiId", width: 25 },
        { header: "Transaction ID", key: "transactionId", width: 25 },
        { header: "Cheque No", key: "chequeNumber", width: 15 },
        { header: "Bank Name", key: "bankName", width: 20 },
      ];

      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4F81BD" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });

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
          receiptNumber:
            collection.paymentMode?.toLowerCase() === "cash"
              ? paymentDetails.receiptNumber || "Money Received"
              : "",
          upiId: paymentDetails.upiId || "",
          transactionId:
            paymentDetails.transactionId ||
            paymentDetails.upiTransactionId ||
            "",
          chequeNumber: paymentDetails.chequeNumber || "",
          bankName: paymentDetails.bankName || "",
        });
      });

      [4, 5, 8].forEach((colNum) => {
        worksheet.columns[colNum].numFmt = "#,##0.00";
      });

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

      await workbook.xlsx.write(res);
      res.end();
    } catch (err) {
      console.error("Excel export error:", err);
      res.status(500).json({
        message: "Failed to export today's collections",
        error: err.message,
      });
    }
  }
);
// Add a new route for today's collections
router.get("/today-collections", protect, adminOnly, async (req, res) => {
  try {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // First find collections for today
    const todayCollections = await Collection.find({
      collectedOn: {
        $gte: todayStart,
        $lte: todayEnd,
      },
    }).populate("collectedBy", "name");

    // Then find bills associated with these collections
    const billIds = todayCollections.map((c) => c.bill);
    const reports = await Bill.find({
      _id: { $in: billIds },
    })
      .populate("assignedTo", "name")
      .sort({ billDate: -1 });

    // Combine the data
    const formattedReports = reports.map((report) => {
      const billCollections = todayCollections.filter(
        (c) => c.bill.toString() === report._id.toString()
      );

      return {
        _id: report._id,
        retailer: report.retailer,
        billNumber: report.billNumber,
        billDate: report.billDate,
        dueAmount: report.dueAmount,
        collections: billCollections.map((collection) => ({
          _id: collection._id,
          amountCollected: collection.amountCollected,
          paymentMode: collection.paymentMode
            ? collection.paymentMode.charAt(0).toUpperCase() +
              collection.paymentMode.slice(1).toLowerCase()
            : "N/A",
          paymentDate: collection.collectedOn,
          paymentDetails: collection.paymentDetails,
          collectedByName: collection.collectedBy?.name || "System",
        })),
      };
    });

    res.json(formattedReports);
  } catch (err) {
    console.error("Today collections error:", err);
    res.status(500).json({
      message: "Error fetching today's collections",
      error: err.message,
    });
  }
});
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        billDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    }

    const reports = await Bill.find(dateFilter)
      .populate("assignedTo", "name")
      .populate({
        path: "collections",
        populate: {
          path: "collectedBy",
          select: "name",
        },
      })
      .sort({ billDate: -1 });

    const formattedReports = reports.map((report) => ({
      _id: report._id,
      retailer: report.retailer,
      billNumber: report.billNumber,
      billDate: report.billDate,
      collections: report.collections.map((collection) => ({
        _id: collection._id,
        amountCollected: collection.amountCollected,
        paymentMode: collection.paymentMode
          ? collection.paymentMode.charAt(0).toUpperCase() +
            collection.paymentMode.slice(1).toLowerCase()
          : "N/A",
        paymentDate: collection.collectedOn,
        paymentDetails: collection.paymentDetails,
        collectedByName: collection.collectedBy?.name || "System",
      })),
      dueAmount: report.dueAmount,
    }));

    res.json(formattedReports);
  } catch (err) {
    console.error("Report error:", err);
    res.status(500).json({
      message: "Error generating report",
      error: err.message,
    });
  }
});

// Export to Excel
router.get("/export/excel", protect, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        billDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    }

    const reports = await Bill.find(dateFilter)
      .populate("assignedTo", "name")
      .populate({
        path: "collections",
        populate: {
          path: "collectedBy",
          select: "name",
        },
      })
      .sort({ billDate: -1 });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Collections Report");

    // Add headers
    worksheet.columns = [
      { header: "Retailer Name", key: "retailer", width: 25 },
      { header: "Bill Number", key: "billNumber", width: 15 },
      { header: "Bill Date", key: "billDate", width: 15 },
      { header: "Collection Amount", key: "collectionAmount", width: 20 },
      { header: "Due Amount", key: "dueAmount", width: 15 },
      { header: "Payment Mode", key: "paymentMode", width: 15 },
      { header: "Payment Date", key: "paymentDate", width: 15 },
      { header: "Collected By", key: "collectedBy", width: 20 },
      { header: "Payment Details", key: "paymentDetails", width: 30 },
    ];

    // Add data
    reports.forEach((report) => {
      if (report.collections.length > 0) {
        report.collections.forEach((collection) => {
          let paymentDetails = "";
          if (collection.paymentDetails) {
            paymentDetails = Object.entries(collection.paymentDetails)
              .map(([key, value]) => `${key}: ${value}`)
              .join("\n");
          }

          worksheet.addRow({
            retailer: report.retailer,
            billNumber: report.billNumber,
            billDate: format(new Date(report.billDate), "dd/MM/yyyy"),
            collectionAmount: collection.amountCollected,
            dueAmount: report.dueAmount,
            paymentMode: collection.paymentMode
              ? collection.paymentMode.charAt(0).toUpperCase() +
                collection.paymentMode.slice(1).toLowerCase()
              : "N/A",
            paymentDate: format(new Date(collection.collectedOn), "dd/MM/yyyy"),
            collectedBy: collection.collectedBy?.name || "System",
            paymentDetails: getFilteredPaymentDetails(
              collection.paymentMode,
              collection.paymentDetails
            ),
          });
        });
      } else {
        worksheet.addRow({
          retailer: report.retailer,
          billNumber: report.billNumber,
          billDate: format(new Date(report.billDate), "dd/MM/yyyy"),
          collectionAmount: collection.amountCollected,
          dueAmount: report.dueAmount,
          paymentMode: collection.paymentMode
            ? collection.paymentMode.charAt(0).toUpperCase() +
              collection.paymentMode.slice(1).toLowerCase()
            : "N/A",
          paymentDate: format(new Date(collection.collectedOn), "dd/MM/yyyy"),
          collectedBy: collection.collectedBy?.name || "System",
          paymentDetails: getFilteredPaymentDetails(
            collection.paymentMode,
            collection.paymentDetails
          ),
        });
      }
    });

    // Style headers
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD3D3D3" },
      };
    });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=collections_report.xlsx"
    );

    // Send the workbook
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel export error:", err);
    res.status(500).json({
      message: "Error exporting to Excel",
      error: err.message,
    });
  }
});
// In reportRoutes.js - modify the Excel export route
router.get("/export/excel", protect, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        billDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      };
    }

    const reports = await Bill.find(dateFilter)
      .populate("assignedTo", "name")
      .populate({
        path: "collections",
        populate: {
          path: "collectedBy",
          select: "name",
        },
      })
      .sort({ billDate: -1 });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Collections Report");

    // Add headers with styling
    worksheet.columns = [
      { header: "Bill Number", key: "billNumber", width: 20 },
      { header: "Retailer", key: "retailer", width: 30 },
      { header: "Bill Date", key: "billDate", width: 15 },
      {
        header: "Bill Amount",
        key: "amount",
        width: 15,
        style: { numFmt: "#,##0.00" },
      },
      {
        header: "Due Amount",
        key: "dueAmount",
        width: 15,
        style: { numFmt: "#,##0.00" },
      },
      { header: "Status", key: "status", width: 15 },
      { header: "Assigned To", key: "assignedTo", width: 20 },
      {
        header: "Collection Amount",
        key: "collectionAmount",
        width: 20,
        style: { numFmt: "#,##0.00" },
      },
      { header: "Payment Mode", key: "paymentMode", width: 15 },
      { header: "Payment Date", key: "paymentDate", width: 15 },
      { header: "Collected By", key: "collectedBy", width: 20 },
      { header: "Payment Details", key: "paymentDetails", width: 40 },
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
    reports.forEach((report) => {
      if (report.collections.length > 0) {
        report.collections.forEach((collection) => {
          let paymentDetails = "";
          if (collection.paymentDetails) {
            paymentDetails = Object.entries(collection.paymentDetails)
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ");
          }

          worksheet.addRow({
            retailer: report.retailer,
            billNumber: report.billNumber,
            billDate: format(new Date(report.billDate), "dd/MM/yyyy"),
            collectionAmount: collection.amountCollected,
            dueAmount: report.dueAmount,
            paymentMode: collection.paymentMode
              ? collection.paymentMode.charAt(0).toUpperCase() +
                collection.paymentMode.slice(1).toLowerCase()
              : "N/A",
            paymentDate: format(new Date(collection.collectedOn), "dd/MM/yyyy"),
            collectedBy: collection.collectedBy?.name || "System",
            paymentDetails,
          });
        });
      } else {
        worksheet.addRow({
          retailer: report.retailer,
          billNumber: report.billNumber,
          billDate: format(new Date(report.billDate), "dd/MM/yyyy"),
          dueAmount: report.dueAmount,
          collectionAmount: 0,
          paymentMode: "N/A",
          paymentDate: "N/A",
          collectedBy: "N/A",
          paymentDetails: "No collections",
        });
      }
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
      column.width = Math.min(Math.max(maxLength + 2, 10), 50);
    });

    // Set response headers
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=collections_report_${format(
        new Date(),
        "yyyyMMdd_HHmmss"
      )}.xlsx`
    );

    // Send the workbook
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("Excel export error:", err);
    res.status(500).json({
      message: "Error exporting to Excel",
      error: err.message,
    });
  }
});


// ─────────────────────────────────────────────────────────────────────────────
// TALLY-STYLE REPORT ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/reports/tally/retailers  – list all retailers for selector
router.get("/tally/retailers", protect, adminOnly, async (req, res) => {
  try {
    const retailers = await Retailer.find({ status: "ACTIVE" })
      .select("_id name address1")
      .sort({ name: 1 });
    res.json({ success: true, data: retailers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/tally/staff  – list all staff for selector
router.get("/tally/staff", protect, adminOnly, async (req, res) => {
  try {
    const staff = await User.find({ role: "staff", isActive: true })
      .select("_id name email")
      .sort({ name: 1 });
    res.json({ success: true, data: staff });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/tally/retailer-report?retailerId=&startDate=&endDate=
router.get("/tally/retailer-report", protect, adminOnly, async (req, res) => {
  try {
    const { retailerId, startDate, endDate } = req.query;
    if (!retailerId) return res.status(400).json({ success: false, message: "retailerId required" });

    const start = startDate ? startOfDay(new Date(startDate)) : startOfDay(new Date());
    const end = endDate ? endOfDay(new Date(endDate)) : endOfDay(new Date());

    const retailer = await Retailer.findById(retailerId).lean();
    if (!retailer) return res.status(404).json({ success: false, message: "Retailer not found" });

    const bills = await Bill.find({
      retailer: retailer.name,
      billDate: { $gte: start, $lte: end },
    })
      .populate("assignedTo", "name")
      .populate({
        path: "collections",
        populate: { path: "collectedBy", select: "name" },
      })
      .sort({ billDate: 1 })
      .lean();

    let totalBillAmount = 0;
    let totalCollected = 0;
    let totalDue = 0;

    const rows = bills.map((bill) => {
      const collected = (bill.collections || []).reduce((s, c) => s + (c.amountCollected || 0), 0);
      totalBillAmount += bill.amount || 0;
      totalCollected += collected;
      totalDue += bill.dueAmount || 0;
      return {
        billNumber: bill.billNumber,
        billDate: bill.billDate,
        amount: bill.amount || 0,
        collected,
        dueAmount: bill.dueAmount || 0,
        status: bill.status,
        assignedTo: bill.assignedTo?.name || "N/A",
        collections: (bill.collections || []).map((c) => ({
          date: c.collectedOn,
          amount: c.amountCollected,
          mode: c.paymentMode,
          collectedBy: c.collectedBy?.name || "N/A",
        })),
      };
    });

    res.json({
      success: true,
      retailer: { name: retailer.name, address: retailer.address1 },
      period: { start, end },
      summary: { totalBillAmount, totalCollected, totalDue },
      data: rows,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/tally/staff-report?staffId=&startDate=&endDate=
router.get("/tally/staff-report", protect, adminOnly, async (req, res) => {
  try {
    const { staffId, startDate, endDate } = req.query;
    if (!staffId) return res.status(400).json({ success: false, message: "staffId required" });

    const start = startDate ? startOfDay(new Date(startDate)) : startOfDay(new Date());
    const end = endDate ? endOfDay(new Date(endDate)) : endOfDay(new Date());

    const staff = await User.findById(staffId).select("name email").lean();
    if (!staff) return res.status(404).json({ success: false, message: "Staff not found" });

    // Bills assigned to this staff
    const bills = await Bill.find({
      assignedTo: staffId,
      billDate: { $gte: start, $lte: end },
    })
      .populate({
        path: "collections",
        populate: { path: "collectedBy", select: "name" },
      })
      .sort({ billDate: 1 })
      .lean();

    // Collections made by this staff
    const collections = await Collection.find({
      collectedBy: staffId,
      collectedOn: { $gte: start, $lte: end },
    })
      .populate({ path: "bill", select: "billNumber retailer amount dueAmount billDate" })
      .sort({ collectedOn: 1 })
      .lean();

    let totalAssigned = bills.length;
    let totalCollectedAmount = 0;
    let cash = 0, upi = 0, cheque = 0, bankTransfer = 0;

    const collectionRows = collections.map((c) => {
      totalCollectedAmount += c.amountCollected || 0;
      const mode = (c.paymentMode || "").toLowerCase();
      if (mode === "cash") cash += c.amountCollected || 0;
      else if (mode === "upi") upi += c.amountCollected || 0;
      else if (mode === "cheque") cheque += c.amountCollected || 0;
      else if (mode === "bank_transfer") bankTransfer += c.amountCollected || 0;
      return {
        date: c.collectedOn,
        retailer: c.bill?.retailer || "N/A",
        billNumber: c.bill?.billNumber || "N/A",
        amount: c.amountCollected,
        mode: c.paymentMode,
        paymentDetails: c.paymentDetails,
      };
    });

    const billRows = bills.map((b) => ({
      billNumber: b.billNumber,
      retailer: b.retailer,
      billDate: b.billDate,
      amount: b.amount || 0,
      dueAmount: b.dueAmount || 0,
      status: b.status,
    }));

    res.json({
      success: true,
      staff: { name: staff.name, email: staff.email },
      period: { start, end },
      summary: {
        totalAssigned,
        totalCollectedAmount,
        cash,
        upi,
        cheque,
        bankTransfer,
      },
      collections: collectionRows,
      bills: billRows,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/tally/collection-report?startDate=&endDate=
router.get("/tally/collection-report", protect, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? startOfDay(new Date(startDate)) : startOfDay(new Date());
    const end = endDate ? endOfDay(new Date(endDate)) : endOfDay(new Date());

    const collections = await Collection.find({
      collectedOn: { $gte: start, $lte: end },
    })
      .populate({ path: "bill", select: "billNumber retailer amount dueAmount billDate assignedTo" })
      .populate("collectedBy", "name")
      .sort({ collectedOn: 1 })
      .lean();

    let totalAmount = 0, cash = 0, upi = 0, cheque = 0, bankTransfer = 0;

    const rows = collections.map((c) => {
      const amt = c.amountCollected || 0;
      totalAmount += amt;
      const mode = (c.paymentMode || "").toLowerCase();
      if (mode === "cash") cash += amt;
      else if (mode === "upi") upi += amt;
      else if (mode === "cheque") cheque += amt;
      else if (mode === "bank_transfer") bankTransfer += amt;
      return {
        date: c.collectedOn,
        retailer: c.bill?.retailer || "N/A",
        billNumber: c.bill?.billNumber || "N/A",
        amount: amt,
        mode: c.paymentMode || "N/A",
        collectedBy: c.collectedBy?.name || "System",
        paymentDetails: c.paymentDetails || {},
      };
    });

    res.json({
      success: true,
      period: { start, end },
      summary: { totalAmount, cash, upi, cheque, bankTransfer, count: rows.length },
      data: rows,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/reports/tally/delivery-report?startDate=&endDate=
router.get("/tally/delivery-report", protect, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? startOfDay(new Date(startDate)) : startOfDay(new Date());
    const end = endDate ? endOfDay(new Date(endDate)) : endOfDay(new Date());

    const deliveries = await Delivery.find({
      dispatchDateTime: { $gte: start, $lte: end },
    })
      .sort({ dispatchDateTime: 1 })
      .lean();

    let totalDeliveries = deliveries.length;
    let delivered = 0, inTransit = 0, pending = 0, cancelled = 0;
    let totalOrderAmount = 0;

    const rows = deliveries.map((d) => {
      const orderAmt = (d.orders || []).reduce((s, o) => s + (o.orderAmount || 0), 0);
      totalOrderAmount += orderAmt;
      const status = d.deliveryStatus || "Pending";
      if (status === "Delivered") delivered++;
      else if (status === "In Transit") inTransit++;
      else if (status === "Cancelled") cancelled++;
      else pending++;
      return {
        dispatchDate: d.dispatchDateTime,
        expectedDate: d.expectedDeliveryDate,
        actualDate: d.actualDeliveryDateTime,
        retailer: d.retailerName,
        retailerAddress: d.retailerAddress,
        driverName: d.driverName,
        vehicleNumber: d.vehicleNumber,
        vehicleType: d.vehicleType,
        orders: (d.orders || []).map((o) => ({
          orderNumber: o.orderNumber,
          amount: o.orderAmount,
          orderAmount: o.orderAmount,
          deliveredItems: o.deliveredItems || [],
        })),
        totalOrderAmount: orderAmt,
        status,
        remarks: d.remarks,
      };
    });

    res.json({
      success: true,
      period: { start, end },
      summary: { totalDeliveries, delivered, inTransit, pending, cancelled, totalOrderAmount },
      data: rows,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/reports/tally/attendance-report ────────────────────────────────
router.get("/tally/attendance-report", protect, adminOnly, async (req, res) => {
  try {
    const { staffId, startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const query = { attendanceDate: { $gte: start, $lte: end } };
    if (staffId) query.staffId = staffId;

    const records = await Attendance.find(query).sort({ attendanceDate: 1, staffName: 1 }).lean();

    const totals = { Present: 0, Absent: 0, "Half Day": 0, Leave: 0, totalHours: 0 };
    records.forEach((r) => {
      if (totals[r.status] !== undefined) totals[r.status]++;
      totals.totalHours += r.workingHours || 0;
    });

    // group by staff if no staffId filter
    const staffMap = {};
    records.forEach((r) => {
      if (!staffMap[r.staffName]) staffMap[r.staffName] = { name: r.staffName, records: [] };
      staffMap[r.staffName].records.push({
        date: r.attendanceDate,
        status: r.status,
        inTime: r.inTime,
        outTime: r.outTime,
        workingHours: r.workingHours,
        remarks: r.remarks,
      });
    });

    res.json({
      success: true,
      period: { start, end },
      summary: totals,
      data: Object.values(staffMap),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/reports/tally/salary-report ────────────────────────────────────
router.get("/tally/salary-report", protect, adminOnly, async (req, res) => {
  try {
    const { staffId, month, year } = req.query;
    const query = {};
    if (staffId) query.staffId = staffId;
    if (month) query.salaryMonth = Number(month);
    if (year) query.salaryYear = Number(year);

    const salaries = await Salary.find(query).sort({ salaryYear: -1, salaryMonth: -1, staffName: 1 }).lean();
    const advances = staffId
      ? await Advance.find({ staffId }).sort({ advanceDate: -1 }).lean()
      : await Advance.find(month && year ? { adjustedMonth: Number(month), adjustedYear: Number(year) } : {}).sort({ advanceDate: -1 }).lean();

    const totals = { basicSalary: 0, advanceDeducted: 0, netPayable: 0, paidAmount: 0, pending: 0 };
    salaries.forEach((s) => {
      totals.basicSalary += s.basicSalary || 0;
      totals.advanceDeducted += s.advanceDeducted || 0;
      totals.netPayable += s.netSalaryPayable || 0;
      totals.paidAmount += s.paidAmount || 0;
      totals.pending += (s.netSalaryPayable || 0) - (s.paidAmount || 0);
    });

    res.json({
      success: true,
      summary: totals,
      data: salaries.map((s) => ({
        staffName: s.staffName,
        month: s.salaryMonth,
        year: s.salaryYear,
        basicSalary: s.basicSalary,
        advanceDeducted: s.advanceDeducted,
        netSalaryPayable: s.netSalaryPayable,
        paidAmount: s.paidAmount,
        paymentStatus: s.paymentStatus,
        paymentMode: s.paymentMode,
        paidDate: s.paidDate,
        remarks: s.remarks,
      })),
      advances: advances.map((a) => ({
        staffName: a.staffName,
        date: a.advanceDate,
        amount: a.advanceAmount,
        reason: a.reason,
        status: a.status,
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/reports/tally/logistics-report ─────────────────────────────────
router.get("/tally/logistics-report", protect, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate, vehicleType } = req.query;
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const query = { dispatchDateTime: { $gte: start, $lte: end } };
    if (vehicleType) query.vehicleType = vehicleType;

    const deliveries = await Delivery.find(query).sort({ dispatchDateTime: 1 }).lean();

    const summary = { total: 0, delivered: 0, inTransit: 0, pending: 0, cancelled: 0, totalOrderValue: 0 };
    const driverMap = {};

    deliveries.forEach((d) => {
      const orderAmt = (d.orders || []).reduce((s, o) => s + (o.orderAmount || 0), 0);
      summary.total++;
      summary.totalOrderValue += orderAmt;
      const st = d.deliveryStatus || "Pending";
      if (st === "Delivered") summary.delivered++;
      else if (st === "In Transit") summary.inTransit++;
      else if (st === "Cancelled") summary.cancelled++;
      else summary.pending++;

      if (!driverMap[d.driverName]) {
        driverMap[d.driverName] = { name: d.driverName, mobile: d.driverMobile, trips: 0, value: 0, vehicles: new Set() };
      }
      driverMap[d.driverName].trips++;
      driverMap[d.driverName].value += orderAmt;
      driverMap[d.driverName].vehicles.add(d.vehicleNumber);
    });

    res.json({
      success: true,
      period: { start, end },
      summary,
      data: deliveries.map((d) => ({
        dispatchDate: d.dispatchDateTime,
        expectedDate: d.expectedDeliveryDate,
        actualDate: d.actualDeliveryDateTime,
        retailer: d.retailerName,
        retailerAddress: d.retailerAddress,
        driverName: d.driverName,
        driverMobile: d.driverMobile,
        vehicleNumber: d.vehicleNumber,
        vehicleType: d.vehicleType,
        orders: d.orders || [],
        totalOrderAmount: (d.orders || []).reduce((s, o) => s + (o.orderAmount || 0), 0),
        status: d.deliveryStatus,
        remarks: d.remarks,
      })),
      driverSummary: Object.values(driverMap).map((d) => ({
        name: d.name,
        mobile: d.mobile,
        trips: d.trips,
        value: d.value,
        vehicles: Array.from(d.vehicles).join(", "),
      })),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
