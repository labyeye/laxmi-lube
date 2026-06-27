// routes/retailerDashboardRoutes.js
const express = require("express");
const router = express.Router();
const { protect, retailerOnly } = require("../middleware/authMiddleware");
const Bill = require("../models/Bill");
const Order = require("../models/Order");
const Collection = require("../models/Collection");
const Retailer = require("../models/Retailer");

// Retailer Dashboard - Financial Summary
router.get("/dashboard", protect, retailerOnly, async (req, res) => {
  try {
    const user = req.user;

    if (!user.retailerId) {
      return res
        .status(400)
        .json({ message: "Retailer account not properly configured" });
    }

    const retailer = await Retailer.findById(user.retailerId).populate(
      "assignedTo",
      "name email",
    );

    if (!retailer) {
      return res.status(404).json({ message: "Retailer not found" });
    }

    // Get all bills for this retailer
    const bills = await Bill.find({ retailer: retailer.name });

    // Calculate financial summary
    const totalBillAmount = bills.reduce((sum, bill) => sum + bill.amount, 0);
    const totalDueAmount = bills.reduce((sum, bill) => sum + bill.dueAmount, 0);
    const totalPaidAmount = totalBillAmount - totalDueAmount;

    // Get last payment date
    const paidBills = bills
      .filter((bill) => bill.paymentDate)
      .sort((a, b) => b.paymentDate - a.paymentDate);
    const lastPaymentDate =
      paidBills.length > 0 ? paidBills[0].paymentDate : null;

    // Get upcoming collection days
    const upcomingCollectionDays = retailer.collectionDays || [];

    // Get recent bills
    const recentBills = bills
      .sort((a, b) => b.billDate - a.billDate)
      .slice(0, 5);

    res.json({
      success: true,
      dashboard: {
        retailerInfo: {
          name: retailer.name,
          address: `${retailer.address1}${retailer.address2 ? ", " + retailer.address2 : ""}`,
          assignedStaff: retailer.assignedTo?.name || "Not assigned",
          collectionDays: upcomingCollectionDays,
        },
        financialSummary: {
          totalBillAmount: totalBillAmount.toFixed(2),
          totalPaidAmount: totalPaidAmount.toFixed(2),
          outstandingBalance: totalDueAmount.toFixed(2),
          lastPaymentDate: lastPaymentDate,
          upcomingCollectionDays: upcomingCollectionDays,
        },
        recentBills: recentBills.map((bill) => ({
          billNumber: bill.billNumber,
          amount: bill.amount,
          dueAmount: bill.dueAmount,
          status: bill.status,
          billDate: bill.billDate,
          collectionDay: bill.collectionDay,
        })),
      },
    });
  } catch (err) {
    console.error("Error fetching retailer dashboard:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Retailer Billing History
router.get("/bills", protect, retailerOnly, async (req, res) => {
  try {
    const user = req.user;

    if (!user.retailerId) {
      return res
        .status(400)
        .json({ message: "Retailer account not properly configured" });
    }

    const retailer = await Retailer.findById(user.retailerId);
    if (!retailer) {
      return res.status(404).json({ message: "Retailer not found" });
    }

    // Get all bills for this retailer
    const bills = await Bill.find({ retailer: retailer.name })
      .populate("collections")
      .sort({ billDate: -1 });

    res.json({
      success: true,
      count: bills.length,
      bills: bills.map((bill) => ({
        id: bill._id,
        billNumber: bill.billNumber,
        amount: bill.amount,
        dueAmount: bill.dueAmount,
        paidAmount: bill.amount - bill.dueAmount,
        status: bill.status,
        billDate: bill.billDate,
        paymentDate: bill.paymentDate,
        collectionDay: bill.collectionDay,
        notes: bill.notes,
      })),
    });
  } catch (err) {
    console.error("Error fetching bills:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Retailer Payment History
router.get("/payments", protect, retailerOnly, async (req, res) => {
  try {
    const user = req.user;

    if (!user.retailerId) {
      return res
        .status(400)
        .json({ message: "Retailer account not properly configured" });
    }

    const retailer = await Retailer.findById(user.retailerId);
    if (!retailer) {
      return res.status(404).json({ message: "Retailer not found" });
    }

    // Get all bills for this retailer
    const bills = await Bill.find({ retailer: retailer.name })
      .populate({
        path: "collections",
        populate: { path: "collectedBy", select: "name" },
      })
      .sort({ billDate: -1 });

    // Extract all collections
    const allCollections = [];
    bills.forEach((bill) => {
      if (bill.collections && bill.collections.length > 0) {
        bill.collections.forEach((collection) => {
          allCollections.push({
            id: collection._id,
            billNumber: bill.billNumber,
            amountCollected: collection.amountCollected,
            paymentMode: collection.paymentMode,
            collectedBy: collection.collectedBy?.name || "Unknown",
            collectedOn: collection.collectedOn,
            remarks: collection.remarks,
          });
        });
      }
    });

    // Sort by collection date
    allCollections.sort((a, b) => b.collectedOn - a.collectedOn);

    res.json({
      success: true,
      count: allCollections.length,
      payments: allCollections,
    });
  } catch (err) {
    console.error("Error fetching payments:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Retailer Collection History - Detailed view
router.get("/collections", protect, retailerOnly, async (req, res) => {
  try {
    const user = req.user;

    if (!user.retailerId) {
      return res
        .status(400)
        .json({ message: "Retailer account not properly configured" });
    }

    const retailer = await Retailer.findById(user.retailerId);
    if (!retailer) {
      return res.status(404).json({ message: "Retailer not found" });
    }

    // Get all bills for this retailer with collections
    const bills = await Bill.find({ retailer: retailer.name })
      .populate({
        path: "collections",
        populate: { path: "collectedBy", select: "name" },
      })
      .sort({ billDate: -1 });

    // Extract all collections with additional details
    const allCollections = [];
    bills.forEach((bill) => {
      if (bill.collections && bill.collections.length > 0) {
        bill.collections.forEach((collection) => {
          allCollections.push({
            _id: collection._id,
            billNumber: bill.billNumber,
            amountCollected: collection.amountCollected,
            paymentMode: collection.paymentMode,
            collectedBy: collection.collectedBy?.name || "Unknown",
            collectionDate: collection.collectedOn,
            collectionDay: bill.collectionDay,
            remarks: collection.remarks || "",
          });
        });
      }
    });

    // Sort by collection date (most recent first)
    allCollections.sort(
      (a, b) => new Date(b.collectionDate) - new Date(a.collectionDate),
    );

    res.json({
      success: true,
      count: allCollections.length,
      collections: allCollections,
    });
  } catch (err) {
    console.error("Error fetching collection history:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Retailer Orders - View own orders
router.get("/orders", protect, retailerOnly, async (req, res) => {
  try {
    const user = req.user;

    if (!user.retailerId) {
      return res
        .status(400)
        .json({ message: "Retailer account not properly configured" });
    }

    const orders = await Order.find({ retailer: user.retailerId })
      .populate("items.product", "name code")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      orders: orders.map((order) => ({
        id: order._id,
        retailerName: order.retailerName,
        items: order.items,
        totalOrderValue: order.totalOrderValue,
        totalLitres: order.totalLitres,
        status: order.status,
        createdAt: order.createdAt,
      })),
    });
  } catch (err) {
    console.error("Error fetching orders:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Retailer - Place new order
router.post("/orders", protect, retailerOnly, async (req, res) => {
  try {
    const user = req.user;
    const { items, notes } = req.body;

    if (!user.retailerId) {
      return res
        .status(400)
        .json({ message: "Retailer account not properly configured" });
    }

    const retailer = await Retailer.findById(user.retailerId);
    if (!retailer) {
      return res.status(404).json({ message: "Retailer not found" });
    }

    if (!items || items.length === 0) {
      return res
        .status(400)
        .json({ message: "Order must contain at least one item" });
    }

    // Calculate totals
    const totalOrderValue = items.reduce(
      (sum, item) => sum + item.totalSale,
      0,
    );
    const totalLitres = items.reduce((sum, item) => sum + item.totalLitres, 0);

    const order = new Order({
      retailer: user.retailerId,
      retailerName: retailer.name,
      items,
      totalOrderValue,
      totalLitres,
      createdBy: user._id,
      createdByName: user.name,
      status: "Pending",
    });

    await order.save();

    res.status(201).json({
      success: true,
      message: "Order placed successfully. Awaiting admin approval.",
      order,
    });
  } catch (err) {
    console.error("Error placing order:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Retailer Profile
router.get("/profile", protect, retailerOnly, async (req, res) => {
  try {
    const user = req.user;

    if (!user.retailerId) {
      return res
        .status(400)
        .json({ message: "Retailer account not properly configured" });
    }

    const retailer = await Retailer.findById(user.retailerId).populate(
      "assignedTo",
      "name email",
    );

    if (!retailer) {
      return res.status(404).json({ message: "Retailer not found" });
    }

    res.json({
      success: true,
      profile: {
        shopName: retailer.name,
        address1: retailer.address1,
        address2: retailer.address2,
        email: user.email,
        assignedStaff: retailer.assignedTo
          ? {
              name: retailer.assignedTo.name,
              email: retailer.assignedTo.email,
            }
          : null,
        collectionDays: retailer.collectionDays,
        status: retailer.status,
        createdAt: retailer.createdAt,
      },
    });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;
