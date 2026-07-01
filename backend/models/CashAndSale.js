const mongoose = require("mongoose");

const cashAndSaleSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: [true, "Bill number is required"],
      trim: true,
      uppercase: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [1, "Amount must be at least 1"],
      set: (v) => parseFloat(parseFloat(v).toFixed(2)),
    },
    personName: {
      type: String,
      required: [true, "Person / retailer name is required"],
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [300, "Notes cannot exceed 300 characters"],
    },
    status: {
      type: String,
      enum: ["pending", "adjusted"],
      default: "pending",
    },
    adjustedBill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill",
      default: null,
    },
    adjustedAt: { type: Date, default: null },
    adjustedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

cashAndSaleSchema.index({ billNumber: 1 });
cashAndSaleSchema.index({ status: 1 });

module.exports = mongoose.model("CashAndSale", cashAndSaleSchema);
