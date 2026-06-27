const mongoose = require("mongoose");

const DeliverySchema = new mongoose.Schema(
  {
    // Vehicle Information
    vehicleNumber: {
      type: String,
      required: [true, "Vehicle number is required"],
      trim: true,
      uppercase: true,
      index: true,
    },
    vehicleType: {
      type: String,
      enum: ["Bike", "Tempo", "Truck"],
      required: [true, "Vehicle type is required"],
    },

    // Driver/Staff Information
    driverName: {
      type: String,
      required: [true, "Driver/Staff name is required"],
      trim: true,
    },
    driverMobile: {
      type: String,
      required: [true, "Driver/Staff mobile number is required"],
      trim: true,
      validate: {
        validator: function (v) {
          return /^[0-9]{10}$/.test(v);
        },
        message: "Mobile number must be 10 digits",
      },
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    // Retailer Information
    retailerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Retailer",
      required: [true, "Retailer is required"],
      index: true,
    },
    retailerName: {
      type: String,
      required: [true, "Retailer name is required"],
      trim: true,
    },
    retailerAddress: {
      type: String,
      required: [true, "Retailer address is required"],
      trim: true,
    },

    // Order Information
    orders: [
      {
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Order",
        },
        orderNumber: {
          type: String,
          required: true,
          trim: true,
        },
        orderAmount: {
          type: Number,
          required: true,
          min: 0,
        },
        // Partial delivery: item-wise quantities to deliver
        deliveredItems: [
          {
            productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
            name: { type: String },
            code: { type: String },
            orderedQty: { type: Number, default: 0 },
            deliverQty: { type: Number, default: 0 },
            netPrice: { type: Number, default: 0 },
            totalSale: { type: Number, default: 0 },
          },
        ],
      },
    ],

    // Delivery Details
    totalQuantity: {
      type: Number,
      min: 0,
      default: 0,
    },
    totalWeight: {
      type: Number,
      min: 0,
      default: 0,
    },
    dispatchDateTime: {
      type: Date,
      required: [true, "Dispatch date and time is required"],
      default: Date.now,
    },
    expectedDeliveryDate: {
      type: Date,
      required: [true, "Expected delivery date is required"],
    },
    actualDeliveryDateTime: {
      type: Date,
    },

    // Status Tracking
    deliveryStatus: {
      type: String,
      enum: ["Pending", "Assigned", "Out for Delivery", "In Transit", "Reached Outlet", "Delivered", "Failed", "Returned", "Cancelled"],
      default: "Pending",
      index: true,
    },

    // Additional Information
    remarks: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // History tracking
    statusHistory: [
      {
        status: String,
        updatedAt: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        remarks: String,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Virtual for total order amount
DeliverySchema.virtual("totalOrderAmount").get(function () {
  return this.orders.reduce((sum, order) => sum + (order.orderAmount || 0), 0);
});

// Virtual for checking if delivery is delayed
DeliverySchema.virtual("isDelayed").get(function () {
  if (this.deliveryStatus === "Delivered") return false;
  return new Date() > new Date(this.expectedDeliveryDate);
});

// Pre-save hook to update status history
DeliverySchema.pre("save", function (next) {
  if (this.isModified("deliveryStatus")) {
    this.statusHistory.push({
      status: this.deliveryStatus,
      updatedAt: new Date(),
      updatedBy: this.updatedBy,
    });
  }

  // Auto-set actual delivery date when status changes to Delivered
  if (
    this.isModified("deliveryStatus") &&
    this.deliveryStatus === "Delivered" &&
    !this.actualDeliveryDateTime
  ) {
    this.actualDeliveryDateTime = new Date();
  }

  next();
});

// Indexes for efficient querying
DeliverySchema.index({ vehicleNumber: 1, dispatchDateTime: -1 });
DeliverySchema.index({ driverId: 1, dispatchDateTime: -1 });
DeliverySchema.index({ retailerId: 1, dispatchDateTime: -1 });
DeliverySchema.index({ deliveryStatus: 1, expectedDeliveryDate: 1 });
DeliverySchema.index({ createdAt: -1 });

// Method to update delivery status
DeliverySchema.methods.updateStatus = function (newStatus, updatedBy, remarks) {
  this.deliveryStatus = newStatus;
  this.updatedBy = updatedBy;

  this.statusHistory.push({
    status: newStatus,
    updatedAt: new Date(),
    updatedBy: updatedBy,
    remarks: remarks || "",
  });

  if (newStatus === "Delivered" && !this.actualDeliveryDateTime) {
    this.actualDeliveryDateTime = new Date();
  }

  return this.save();
};

module.exports = mongoose.model("Delivery", DeliverySchema);
