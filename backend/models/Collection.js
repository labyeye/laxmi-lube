const mongoose = require("mongoose");

const collectionSchema = new mongoose.Schema({
  bill: { type: mongoose.Schema.Types.ObjectId, ref: "Bill" },
  amountCollected: Number,
  paymentMode: String,
  paymentStatus: String,
  collectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  remarks: String,
  proofImage: String,
  collectedOn: { type: Date, default: Date.now },
});
module.exports = mongoose.model("Collection", collectionSchema);
