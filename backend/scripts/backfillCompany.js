// One-time setup: creates the two companies and makes sure the "Company"
// field is optional everywhere (module definitions included), so existing
// data that predates the multi-company feature keeps working untouched.
// Usage: node scripts/backfillCompany.js
require("dotenv").config();
const mongoose = require("mongoose");
const Company = require("../models/Company");
const ModuleDefinition = require("../models/ModuleDefinition");

const COMPANY_NAMES = ["Laxmi Lube Pvt Ltd", "Kalahanu Enterprises Pvt Ltd"];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  for (const name of COMPANY_NAMES) {
    const existing = await Company.findOne({ name });
    if (existing) {
      console.log("Already exists:", name, existing._id.toString());
    } else {
      const created = await Company.create({ name });
      console.log("Created company:", name, created._id.toString());
    }
  }

  // Make sure the "company" field (added to the retailer/bill module
  // definitions used by the dynamic Add forms) is optional, in case an
  // earlier run of this script or the module defaults marked it required.
  for (const key of ["retailer", "bill"]) {
    const def = await ModuleDefinition.findOne({ key });
    if (!def) continue;
    const field = def.fields.find((f) => f.key === "company");
    if (field && field.required) {
      field.required = false;
      def.markModified("fields");
      await def.save();
      console.log(`Made "company" optional on "${key}" module definition`);
    }
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
