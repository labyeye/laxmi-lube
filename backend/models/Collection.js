const mongoose = require("mongoose");

const collectionSchema = new mongoose.Schema(
  {
    bill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Bill",
      required: [true, "Bill reference is required"],
    },
    amountCollected: {
      type: Number,
      required: [true, "Amount collected is required"],
      min: [1, "Amount collected must be at least 1"],
    },
    paymentMode: {
      type: String,
      required: [true, "Payment mode is required"],
      enum: {
        values: ["Cash", "cheque", "bank_transfer", "upi"],
        message: "Invalid payment mode",
      },
      default: "Cash",
    },
    paymentDetails: {
      type: Object,
      default: null,
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Collector reference is required"],
    },
    remarks: {
      type: String,
      maxlength: [200, "Remarks cannot exceed 200 characters"],
    },
    collectedOn: {
      type: Date,
      default: Date.now,
      required: [true, "Collection date is required"],
    },
    whatsappStatus: {
      type: String,
      enum: ["pending", "sent", "received", "not_received", "no_phone"],
      default: "pending",
    },
    whatsappSentAt: { type: Date },
    whatsappConfirmedAt: { type: Date },
    whatsappConfirmedBy: { type: String },
    screenshotPath: { type: String, default: null },
    paymentGroupId: { type: String, default: null, index: true },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Collection", collectionSchema);
