const mongoose = require("mongoose");

const salarySchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  staffName: {
    type: String,
    required: true,
  },
  salaryMonth: {
    type: Number,
    required: true,
    min: 1,
    max: 12,
  },
  salaryYear: {
    type: Number,
    required: true,
  },
  basicSalary: {
    type: Number,
    required: true,
    min: 0,
  },
  advanceDeducted: {
    type: Number,
    default: 0,
    min: 0,
  },
  netSalaryPayable: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentMode: {
    type: String,
    enum: ["Cash", "Bank", "UPI"],
    default: "Cash",
  },
  paymentStatus: {
    type: String,
    enum: ["Paid", "Partially Paid", "Pending"],
    default: "Pending",
  },
  paidAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  paidDate: {
    type: Date,
  },
  remarks: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to prevent duplicate salary for same month
salarySchema.index(
  { staffId: 1, salaryMonth: 1, salaryYear: 1 },
  { unique: true },
);

// Calculate net salary before saving
salarySchema.pre("save", function (next) {
  this.netSalaryPayable = this.basicSalary - this.advanceDeducted;
  next();
});

module.exports = mongoose.model("Salary", salarySchema);
