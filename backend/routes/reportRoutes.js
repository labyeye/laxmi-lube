const express = require("express");
const router = express.Router();
const Bill = require("../models/Bill");
const Collection = require("../models/Collection");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const exceljs = require("exceljs");
const PDFDocument = require("pdfkit");
const { format } = require("date-fns");
// Add this near the startOfDay function in reportRoutes.js
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

      // Get today's collections with proper population
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
      // Create workbook
      const workbook = new exceljs.Workbook();
      const worksheet = workbook.addWorksheet("Today's Collections");

      // Set headers with styling
      worksheet.columns = [
        { header: "Retailer", key: "retailer", width: 25 },
        { header: "Bill Number", key: "billNumber", width: 15 },
        { header: "Bill Date", key: "billDate", width: 15 },
        // { header: "Amount", key: "amount", width: 15 },
        { header: "Collection Amount", key: "collectionAmount", width: 20 },
        { header: "Due Amount", key: "dueAmount", width: 15 },
        // { header: "Status", key: "status", width: 15 },
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
  }
);
// Add a new route for today's collections
router.get('/today-collections', protect, adminOnly, async (req, res) => {
  try {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    // First find collections for today
    const todayCollections = await Collection.find({
      collectedOn: {
        $gte: todayStart,
        $lte: todayEnd
      }
    }).populate('collectedBy', 'name');

    // Then find bills associated with these collections
    const billIds = todayCollections.map(c => c.bill);
    const reports = await Bill.find({
      _id: { $in: billIds }
    })
    .populate('assignedTo', 'name')
    .sort({ billDate: -1 });

    // Combine the data
    const formattedReports = reports.map(report => {
      const billCollections = todayCollections.filter(c => c.bill.toString() === report._id.toString());
      
      return {
        _id: report._id,
        billNumber: report.billNumber,
        retailer: report.retailer,
        billDate: report.billDate,
        amount: report.amount,
        dueAmount: report.dueAmount,
        status: report.status,
        assignedToName: report.assignedTo?.name || null,
        collections: billCollections.map(collection => ({
          _id: collection._id,
          amountCollected: collection.amountCollected,
          paymentMode: collection.paymentMode,
          paymentDate: collection.collectedOn,
          paymentDetails: collection.paymentDetails,
          collectedByName: collection.collectedBy?.name || 'System',
        })),
      };
    });

    res.json(formattedReports);
  } catch (err) {
    console.error('Today collections error:', err);
    res.status(500).json({ 
      message: 'Error fetching today\'s collections',
      error: err.message 
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
      billNumber: report.billNumber,
      retailer: report.retailer,
      billDate: report.billDate,
      amount: report.amount,
      dueAmount: report.dueAmount,
      status: report.status,
      assignedToName: report.assignedTo?.name || null,
      collections: report.collections.map((collection) => ({
        _id: collection._id,
        amountCollected: collection.amountCollected,
        paymentMode: collection.paymentMode,
        paymentDate: collection.collectedOn,
        paymentDetails: collection.paymentDetails,
        collectedByName: collection.collectedBy?.name || "System",
      })),
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
            billNumber: report.billNumber,
            retailer: report.retailer,
            billDate: format(new Date(report.billDate), "dd/MM/yyyy"),
            amount: report.amount,
            dueAmount: report.dueAmount,
            status: report.status,
            assignedTo: report.assignedTo?.name || "Not assigned",
            collectionAmount: collection.amountCollected,
            paymentMode: collection.paymentMode,
            paymentDate: format(new Date(collection.collectedOn), "dd/MM/yyyy"),
            collectedBy: collection.collectedBy?.name || "System",
            paymentDetails,
          });
        });
      } else {
        worksheet.addRow({
          billNumber: report.billNumber,
          retailer: report.retailer,
          billDate: format(new Date(report.billDate), "dd/MM/yyyy"),
          amount: report.amount,
          dueAmount: report.dueAmount,
          status: report.status,
          assignedTo: report.assignedTo?.name || "Not assigned",
          collectionAmount: "No collections",
          paymentMode: "",
          paymentDate: "",
          collectedBy: "",
          paymentDetails: "",
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
            billNumber: report.billNumber,
            retailer: report.retailer,
            billDate: format(new Date(report.billDate), "dd/MM/yyyy"),
            amount: report.amount,
            dueAmount: report.dueAmount,
            status: report.status,
            assignedTo: report.assignedTo?.name || "Not assigned",
            collectionAmount: collection.amountCollected,
            paymentMode: collection.paymentMode,
            paymentDate: format(new Date(collection.collectedOn), "dd/MM/yyyy"),
            collectedBy: collection.collectedBy?.name || "System",
            paymentDetails,
          });
        });
      } else {
        worksheet.addRow({
          billNumber: report.billNumber,
          retailer: report.retailer,
          billDate: format(new Date(report.billDate), "dd/MM/yyyy"),
          amount: report.amount,
          dueAmount: report.dueAmount,
          status: report.status,
          assignedTo: report.assignedTo?.name || "Not assigned",
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

module.exports = router;
