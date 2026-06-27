const express = require("express");
const router = express.Router();
const Delivery = require("../models/Delivery");
const Order = require("../models/Order");
const Retailer = require("../models/Retailer");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");

// @route   POST /api/deliveries
// @desc    Create a new delivery
// @access  Private
router.post("/", protect, async (req, res) => {
  try {
    const {
      vehicleNumber,
      vehicleType,
      driverName,
      driverMobile,
      driverId,
      retailerId,
      orders,
      totalQuantity,
      totalWeight,
      dispatchDateTime,
      expectedDeliveryDate,
      remarks,
    } = req.body;

    // Validate retailer exists
    const retailer = await Retailer.findById(retailerId);
    if (!retailer) {
      return res.status(404).json({ message: "Retailer not found" });
    }

    // Validate orders exist
    if (!orders || orders.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one order is required" });
    }

    // Validate each order and handle partial delivery quantities
    const validatedOrders = [];
    for (const orderData of orders) {
      const order = await Order.findById(orderData.orderId);
      if (!order) {
        return res
          .status(404)
          .json({ message: `Order ${orderData.orderNumber} not found` });
      }

      // Build deliveredItems — use frontend-provided partial qtys or fall back to full order
      let deliveredItems = [];
      let orderAmount = 0;

      if (orderData.deliveredItems && orderData.deliveredItems.length > 0) {
        deliveredItems = orderData.deliveredItems.map((di) => {
          const total = (di.deliverQty || 0) * (di.netPrice || 0);
          orderAmount += total;
          return {
            productId: di.productId || null,
            name: di.name,
            code: di.code || "",
            orderedQty: di.orderedQty,
            deliverQty: di.deliverQty,
            netPrice: di.netPrice,
            totalSale: total,
          };
        });
      } else {
        // No partial info — use full order items
        orderAmount = order.totalOrderValue;
        deliveredItems = (order.items || []).map((item) => ({
          productId: item.product,
          name: item.name,
          code: item.code || "",
          orderedQty: item.quantity,
          deliverQty: item.quantity,
          netPrice: item.netPrice,
          totalSale: item.totalSale,
        }));
      }

      validatedOrders.push({
        orderId: order._id,
        orderNumber: order._id.toString().slice(-6),
        orderAmount,
        deliveredItems,
      });
    }

    // Create delivery
    const delivery = new Delivery({
      vehicleNumber,
      vehicleType,
      driverName,
      driverMobile,
      driverId: driverId || null,
      retailerId,
      retailerName: retailer.name,
      retailerAddress: `${retailer.address1}${
        retailer.address2 ? ", " + retailer.address2 : ""
      }`,
      orders: validatedOrders,
      totalQuantity: totalQuantity || 0,
      totalWeight: totalWeight || 0,
      dispatchDateTime: dispatchDateTime || new Date(),
      expectedDeliveryDate,
      deliveryStatus: "Pending",
      remarks: remarks || "",
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    await delivery.save();

    // Populate references
    await delivery.populate([
      { path: "retailerId", select: "name address1 address2" },
      { path: "driverId", select: "name email" },
      { path: "createdBy", select: "name email" },
    ]);

    res.status(201).json({
      message: "Delivery created successfully",
      delivery,
    });
  } catch (error) {
    console.error("Error creating delivery:", error);
    res.status(500).json({
      message: "Error creating delivery",
      error: error.message,
    });
  }
});

// @route   GET /api/deliveries
// @desc    Get all deliveries with filters
// @access  Private
router.get("/", protect, async (req, res) => {
  try {
    const {
      status,
      vehicleNumber,
      driverId,
      retailerId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    // Build filter object
    const filter = {};

    if (status) {
      filter.deliveryStatus = status;
    }

    if (vehicleNumber) {
      filter.vehicleNumber = new RegExp(vehicleNumber, "i");
    }

    if (driverId) {
      filter.driverId = driverId;
    }

    if (retailerId) {
      filter.retailerId = retailerId;
    }

    if (startDate || endDate) {
      filter.dispatchDateTime = {};
      if (startDate) {
        filter.dispatchDateTime.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.dispatchDateTime.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get deliveries
    const deliveries = await Delivery.find(filter)
      .populate("retailerId", "name address1 address2")
      .populate("driverId", "name email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .sort({ dispatchDateTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const total = await Delivery.countDocuments(filter);

    res.json({
      deliveries,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching deliveries:", error);
    res.status(500).json({
      message: "Error fetching deliveries",
      error: error.message,
    });
  }
});

// @route   GET /api/deliveries/my-deliveries
// @desc    Get deliveries assigned to the logged-in staff member
// @access  Private (Staff only)
router.get("/my-deliveries", protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Find deliveries where the logged-in user is the driver
    const deliveries = await Delivery.find({ driverId: userId })
      .populate("retailerId", "name address1 address2 mobile")
      .populate("orders.orderId")
      .sort({ dispatchDateTime: -1 });

    res.json({
      deliveries,
      total: deliveries.length,
    });
  } catch (error) {
    console.error("Error fetching staff deliveries:", error);
    res.status(500).json({
      message: "Error fetching your deliveries",
      error: error.message,
    });
  }
});

// @route   GET /api/deliveries/:id
// @desc    Get single delivery by ID
// @access  Private
router.get("/:id", protect, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate("retailerId", "name address1 address2")
      .populate("driverId", "name email")
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .populate("statusHistory.updatedBy", "name email");

    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    res.json(delivery);
  } catch (error) {
    console.error("Error fetching delivery:", error);
    res.status(500).json({
      message: "Error fetching delivery",
      error: error.message,
    });
  }
});

// @route   PUT /api/deliveries/:id
// @desc    Update delivery
// @access  Private
router.put("/:id", protect, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    const {
      vehicleNumber,
      vehicleType,
      driverName,
      driverMobile,
      driverId,
      totalQuantity,
      totalWeight,
      expectedDeliveryDate,
      remarks,
    } = req.body;

    // Update fields
    if (vehicleNumber) delivery.vehicleNumber = vehicleNumber;
    if (vehicleType) delivery.vehicleType = vehicleType;
    if (driverName) delivery.driverName = driverName;
    if (driverMobile) delivery.driverMobile = driverMobile;
    if (driverId !== undefined) delivery.driverId = driverId;
    if (totalQuantity !== undefined) delivery.totalQuantity = totalQuantity;
    if (totalWeight !== undefined) delivery.totalWeight = totalWeight;
    if (expectedDeliveryDate)
      delivery.expectedDeliveryDate = expectedDeliveryDate;
    if (remarks !== undefined) delivery.remarks = remarks;

    delivery.updatedBy = req.user._id;

    await delivery.save();

    await delivery.populate([
      { path: "retailerId", select: "name address1 address2" },
      { path: "driverId", select: "name email" },
      { path: "updatedBy", select: "name email" },
    ]);

    res.json({
      message: "Delivery updated successfully",
      delivery,
    });
  } catch (error) {
    console.error("Error updating delivery:", error);
    res.status(500).json({
      message: "Error updating delivery",
      error: error.message,
    });
  }
});

// @route   PUT /api/deliveries/:id/status
// @desc    Update delivery status
// @access  Private
router.put("/:id/status", protect, async (req, res) => {
  try {
    const { status, remarks } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const validStatuses = [
      "Pending",
      "Assigned",
      "Out for Delivery",
      "In Transit",
      "Reached Outlet",
      "Delivered",
      "Failed",
      "Returned",
      "Cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    await delivery.updateStatus(status, req.user._id, remarks);

    await delivery.populate([
      { path: "retailerId", select: "name address1 address2" },
      { path: "driverId", select: "name email" },
      { path: "updatedBy", select: "name email" },
    ]);

    res.json({
      message: "Delivery status updated successfully",
      delivery,
    });
  } catch (error) {
    console.error("Error updating delivery status:", error);
    res.status(500).json({
      message: "Error updating delivery status",
      error: error.message,
    });
  }
});

// @route   DELETE /api/deliveries/:id
// @desc    Delete delivery
// @access  Private (Admin only)
router.delete("/:id", protect, async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    // Only allow deletion if status is Pending
    if (delivery.deliveryStatus !== "Pending") {
      return res.status(400).json({
        message: "Only pending deliveries can be deleted",
      });
    }

    await Delivery.findByIdAndDelete(req.params.id);

    res.json({ message: "Delivery deleted successfully" });
  } catch (error) {
    console.error("Error deleting delivery:", error);
    res.status(500).json({
      message: "Error deleting delivery",
      error: error.message,
    });
  }
});

// @route   GET /api/deliveries/stats/summary
// @desc    Get delivery statistics
// @access  Private
router.get("/stats/summary", protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.dispatchDateTime = {};
      if (startDate) {
        filter.dispatchDateTime.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.dispatchDateTime.$lte = new Date(endDate);
      }
    }

    const stats = await Delivery.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$deliveryStatus",
          count: { $sum: 1 },
          totalOrders: { $sum: { $size: "$orders" } },
        },
      },
    ]);

    const summary = {
      total: 0,
      pending: 0,
      inTransit: 0,
      delivered: 0,
      cancelled: 0,
      totalOrders: 0,
    };

    stats.forEach((stat) => {
      summary.total += stat.count;
      summary.totalOrders += stat.totalOrders;

      switch (stat._id) {
        case "Pending":
          summary.pending = stat.count;
          break;
        case "In Transit":
          summary.inTransit = stat.count;
          break;
        case "Delivered":
          summary.delivered = stat.count;
          break;
        case "Cancelled":
          summary.cancelled = stat.count;
          break;
      }
    });

    res.json(summary);
  } catch (error) {
    console.error("Error fetching delivery stats:", error);
    res.status(500).json({
      message: "Error fetching delivery stats",
      error: error.message,
    });
  }
});

// @route   GET /api/deliveries/vehicle/:vehicleNumber
// @desc    Get deliveries by vehicle number
// @access  Private
router.get("/vehicle/:vehicleNumber", protect, async (req, res) => {
  try {
    const deliveries = await Delivery.find({
      vehicleNumber: new RegExp(req.params.vehicleNumber, "i"),
    })
      .populate("retailerId", "name address1 address2")
      .populate("driverId", "name email")
      .sort({ dispatchDateTime: -1 })
      .limit(20);

    res.json(deliveries);
  } catch (error) {
    console.error("Error fetching vehicle deliveries:", error);
    res.status(500).json({
      message: "Error fetching vehicle deliveries",
      error: error.message,
    });
  }
});

// @route   GET /api/deliveries/order/:orderNumber
// @desc    Track delivery by order number
// @access  Private
router.get("/order/:orderNumber", protect, async (req, res) => {
  try {
    const deliveries = await Delivery.find({
      "orders.orderNumber": new RegExp(req.params.orderNumber, "i"),
    })
      .populate("retailerId", "name address1 address2")
      .populate("driverId", "name email")
      .sort({ dispatchDateTime: -1 });

    res.json(deliveries);
  } catch (error) {
    console.error("Error tracking order:", error);
    res.status(500).json({
      message: "Error tracking order",
      error: error.message,
    });
  }
});

// @route   PUT /api/deliveries/:deliveryId/order/:orderId/status
// @desc    Update order status within a delivery
// @access  Private
router.put("/:deliveryId/order/:orderId/status", protect, async (req, res) => {
  try {
    const { deliveryId, orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const validStatuses = ["Pending", "Completed", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    // Find the delivery
    const delivery = await Delivery.findById(deliveryId);
    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    // Update the order status in the Order collection
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    order.status = status;
    await order.save();

    // Populate delivery details
    await delivery.populate([
      { path: "retailerId", select: "name address1 address2 mobile" },
      { path: "driverId", select: "name email" },
      { path: "orders.orderId" },
    ]);

    res.json({
      message: "Order status updated successfully",
      order,
      delivery,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({
      message: "Error updating order status",
      error: error.message,
    });
  }
});

module.exports = router;
