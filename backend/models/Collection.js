const mongoose = require("mongoose");
const collectionSchema = new mongoose.Schema({
  bill: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Bill",
    required: [true, "Bill reference is required"] 
  },
  amountCollected: { 
    type: Number, 
    required: [true, "Amount collected is required"],
    min: [1, "Amount collected must be at least 1"] 
  },
  paymentMode: { 
    type: String, 
    required: [true, "Payment mode is required"],
    enum: {
      values: ["cash", "cheque", "bank_transfer", "upi"],
      message: "Invalid payment mode"
    },
    default: "cash"
  },
  // New fields for payment details
  paymentDetails: {
    upiId: {
      type: String,
      required: function() { return this.paymentMode === 'upi'; }
    },
    upiTransactionId: {
      type: String,
      required: function() { return this.paymentMode === 'upi'; }
    },
    bankName: {
      type: String,
      required: function() { 
        return this.paymentMode === 'cheque' || this.paymentMode === 'bank_transfer'; 
      }
    },
    chequeNumber: {
      type: String,
      required: function() { return this.paymentMode === 'cheque'; }
    },
    bankTransactionId: {
      type: String,
      required: function() { return this.paymentMode === 'bank_transfer'; }
    }
  },
  collectedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: [true, "Collector reference is required"] 
  },
  remarks: { 
    type: String,
    maxlength: [200, "Remarks cannot exceed 200 characters"] 
  },
  collectedOn: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true
});
module.exports = mongoose.model("Collection", collectionSchema);