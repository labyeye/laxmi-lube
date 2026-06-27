const mongoose = require("mongoose");

const advanceSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  staffName: {
    type: String,
    required: true,
  },
  advanceAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  advanceDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  reason: {
    type: String,
    default: "",
  },
  notes: {
    type: String,
    default: "",
  },
  adjustedMonth: {
    type: Number,
    min: 1,
    max: 12,
  },
  adjustedYear: {
    type: Number,
  },
  status: {
    type: String,
    enum: ["Open", "Adjusted"],
    default: "Open",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Advance", advanceSchema);
