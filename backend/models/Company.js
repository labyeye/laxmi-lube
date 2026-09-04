const mongoose = require("mongoose");

const CompanySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, trim: true, uppercase: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Company", CompanySchema);
