/**
 * Migration: Fix collectedOn timestamps that were saved as midnight UTC
 * (showing as 5:30 AM IST) → shift to midnight IST.
 *
 * Run once:  node backend/scripts/migrateCollectedOn.js
 * Dry run:   node backend/scripts/migrateCollectedOn.js --dry-run
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const Collection = require("../models/Collection");

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Find records where time is exactly midnight UTC (the bad ones)
  const records = await Collection.find({
    $expr: {
      $and: [
        { $eq: [{ $hour: "$collectedOn" }, 0] },
        { $eq: [{ $minute: "$collectedOn" }, 0] },
        { $eq: [{ $second: "$collectedOn" }, 0] },
        { $eq: [{ $millisecond: "$collectedOn" }, 0] },
      ],
    },
  });

  console.log(`Found ${records.length} records with midnight UTC timestamp`);
  if (DRY_RUN) console.log("DRY RUN — no changes will be saved\n");

  let updated = 0;
  for (const record of records) {
    const oldDate = record.collectedOn;
    // Shift back by 5h30m: midnight UTC (00:00 UTC) → 18:30 prev-day UTC = midnight IST
    const newDate = new Date(oldDate.getTime() - 5.5 * 60 * 60 * 1000);

    console.log(
      `  [${record._id}]  ${oldDate.toISOString()}  →  ${newDate.toISOString()}` +
        `  (was ${oldDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })},` +
        `  will be ${newDate.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })})`,
    );

    if (!DRY_RUN) {
      await Collection.findByIdAndUpdate(record._id, { collectedOn: newDate });
      updated++;
    }
  }

  if (DRY_RUN) {
    console.log(
      `\nDry run complete — ${records.length} records would be updated`,
    );
  } else {
    console.log(`\nDone — updated ${updated} records`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
