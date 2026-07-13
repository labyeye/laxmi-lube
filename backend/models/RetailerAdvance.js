const mongoose = require("mongoose");

const retailerAdvanceSchema = new mongoose.Schema(
  {
    retailerName: { type: String, required: true, trim: true },
    retailerId: { type: mongoose.Schema.Types.ObjectId, ref: "Retailer" },
    amount: { type: Number, required: true, min: 0 },
    remainingAmount: { type: Number, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    remarks: { type: String, default: "" },
    status: {
      type: String,
      enum: ["Open", "Partial", "Applied"],
      default: "Open",
    },
    adjustments: [
      {
        bill: { type: mongoose.Schema.Types.ObjectId, ref: "Bill" },
        billNumber: String,
        amountApplied: Number,
        appliedAt: { type: Date, default: Date.now },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

retailerAdvanceSchema.pre("save", function (next) {
  if (this.isNew && this.remainingAmount === undefined) {
    this.remainingAmount = this.amount;
  }
  next();
});

module.exports = mongoose.model("RetailerAdvance", retailerAdvanceSchema);
