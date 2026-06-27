const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  staffName: {
    type: String,
    required: true,
  },
  attendanceDate: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ["Present", "Absent", "Half Day", "Leave"],
    default: "Present",
  },
  inTime: {
    type: String,
    default: "",
  },
  outTime: {
    type: String,
    default: "",
  },
  workingHours: {
    type: Number,
    default: 0,
  },
  remarks: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isLocked: {
    type: Boolean,
    default: false,
  },
});

// Compound index to prevent duplicate attendance for same day
attendanceSchema.index({ staffId: 1, attendanceDate: 1 }, { unique: true });

// Calculate working hours before saving
attendanceSchema.pre("save", function (next) {
  if (this.inTime && this.outTime) {
    try {
      const [inHour, inMin] = this.inTime.split(":").map(Number);
      const [outHour, outMin] = this.outTime.split(":").map(Number);

      const inMinutes = inHour * 60 + inMin;
      const outMinutes = outHour * 60 + outMin;

      let diffMinutes = outMinutes - inMinutes;
      if (diffMinutes < 0) {
        diffMinutes += 24 * 60; // Handle overnight shifts
      }

      this.workingHours = parseFloat((diffMinutes / 60).toFixed(2));
    } catch (error) {
      this.workingHours = 0;
    }
  } else {
    this.workingHours = 0;
  }
  next();
});

module.exports = mongoose.model("Attendance", attendanceSchema);
