const mongoose = require("mongoose");

const RecordSchema = new mongoose.Schema(
  {
    module: { type: String, required: true, index: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, default: "active" },
    legacyId: { type: mongoose.Schema.Types.ObjectId },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

RecordSchema.index({ module: 1, createdAt: -1 });

module.exports = mongoose.model("Record", RecordSchema);
