const mongoose = require("mongoose");

const BillSchema = new mongoose.Schema(
  {
    billNumber: {
      type: String,
      required: [true, "Bill number is required"],
      trim: true,
      unique: true,
    },
    retailer: {
      type: String,
      required: [true, "Retailer name is required"],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    dueAmount: {
      type: Number,
      required: [true, "Due amount is required"],
      min: [0, "Due amount cannot be negative"],
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
    },
    billDate: {
      type: Date,
      required: [true, "Bill date is required"],
    },
    status: {
      type: String,
      enum: ["Paid", "Unpaid", "Partially Paid"],
      default: "Unpaid",
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    assignedDate: {
      type: Date,
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    paymentDate: {
      type: Date,
    },
    paymentMethod: {
      type: String,
      enum: ["Cash", "Check", "Bank Transfer", "Credit Card", "Other"],
    },
    notes: {
      type: String,
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

BillSchema.pre("save", function (next) {
  this.updatedAt = Date.now();

  if (this.isModified("assignedTo") && this.assignedTo) {
    this.assignedDate = new Date();
  }

  if (
    this.isModified("status") &&
    this.status === "Paid" &&
    !this.paymentDate
  ) {
    this.paymentDate = new Date();
  }

  next();
});

BillSchema.virtual("remainingAmount").get(function () {
  return this.dueAmount - (this.amount - this.dueAmount);
});

BillSchema.virtual("staffName", {
  ref: "User",
  localField: "assignedTo",
  foreignField: "_id",
  justOne: true,
  options: { select: "name" },
});

BillSchema.methods.isOverdue = function () {
  return this.status !== "Paid" && new Date() > this.dueDate;
};

BillSchema.methods.assignToStaff = async function (staffId) {
  this.assignedTo = staffId;
  this.assignedDate = new Date();
  return this.save();
};

BillSchema.methods.markAsPaid = async function (
  userId,
  paymentMethod = "Cash"
) {
  this.status = "Paid";
  this.collectedBy = userId;
  this.paymentDate = new Date();
  this.paymentMethod = paymentMethod;
  return this.save();
};

BillSchema.index({ dueDate: 1 });
BillSchema.index({ billNumber: 1 }, { unique: true });
BillSchema.index({ retailer: 1 });
BillSchema.index({ status: 1 });
BillSchema.index({ assignedTo: 1 });
BillSchema.index({ assignedDate: 1 });
BillSchema.index({ paymentDate: 1 });

module.exports = mongoose.model("Bill", BillSchema);
