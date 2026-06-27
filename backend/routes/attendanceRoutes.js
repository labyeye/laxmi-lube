const express = require("express");
const router = express.Router();
const Attendance = require("../models/Attendance");
const User = require("../models/User");

// Get all attendance records
router.get("/", async (req, res) => {
  try {
    const attendance = await Attendance.find().sort({ attendanceDate: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance by ID
router.get("/:id", async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);
    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance by staff ID
router.get("/staff/:staffId", async (req, res) => {
  try {
    const attendance = await Attendance.find({
      staffId: req.params.staffId,
    }).sort({ attendanceDate: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance by date range
router.get("/range/:startDate/:endDate", async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    const attendance = await Attendance.find({
      attendanceDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }).sort({ attendanceDate: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get attendance by staff and date range
router.get("/staff/:staffId/range/:startDate/:endDate", async (req, res) => {
  try {
    const { staffId, startDate, endDate } = req.params;
    const attendance = await Attendance.find({
      staffId,
      attendanceDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }).sort({ attendanceDate: -1 });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get monthly attendance summary
router.get("/summary/:staffId/:month/:year", async (req, res) => {
  try {
    const { staffId, month, year } = req.params;

    // Get first and last day of the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const attendance = await Attendance.find({
      staffId,
      attendanceDate: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ attendanceDate: 1 });

    // Calculate summary
    const totalDays = endDate.getDate();
    const presentDays = attendance.filter((a) => a.status === "Present").length;
    const absentDays = attendance.filter((a) => a.status === "Absent").length;
    const halfDays = attendance.filter((a) => a.status === "Half Day").length;
    const leaveDays = attendance.filter((a) => a.status === "Leave").length;
    const totalWorkingHours = attendance.reduce(
      (sum, a) => sum + (a.workingHours || 0),
      0,
    );

    res.json({
      month: parseInt(month),
      year: parseInt(year),
      monthName: getMonthName(parseInt(month)),
      totalDays,
      presentDays,
      absentDays,
      halfDays,
      leaveDays,
      totalWorkingHours: parseFloat(totalWorkingHours.toFixed(2)),
      recordCount: attendance.length,
      attendance,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new attendance record
router.post("/", async (req, res) => {
  try {
    const {
      staffId,
      staffName,
      attendanceDate,
      status,
      inTime,
      outTime,
      remarks,
    } = req.body;

    // Check if attendance already exists for this date
    const existingAttendance = await Attendance.findOne({
      staffId,
      attendanceDate: new Date(attendanceDate),
    });

    if (existingAttendance) {
      return res.status(400).json({
        message: "Attendance for this date already exists",
      });
    }

    const attendance = new Attendance({
      staffId,
      staffName,
      attendanceDate: new Date(attendanceDate),
      status: status || "Present",
      inTime: inTime || "",
      outTime: outTime || "",
      remarks: remarks || "",
    });

    const savedAttendance = await attendance.save();
    res.status(201).json(savedAttendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Bulk create attendance records
router.post("/bulk", async (req, res) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ message: "Invalid records array" });
    }

    const results = {
      created: [],
      skipped: [],
      errors: [],
    };

    for (const record of records) {
      try {
        const existingAttendance = await Attendance.findOne({
          staffId: record.staffId,
          attendanceDate: new Date(record.attendanceDate),
        });

        if (existingAttendance) {
          results.skipped.push({
            date: record.attendanceDate,
            reason: "Already exists",
          });
          continue;
        }

        const attendance = new Attendance({
          staffId: record.staffId,
          staffName: record.staffName,
          attendanceDate: new Date(record.attendanceDate),
          status: record.status || "Present",
          inTime: record.inTime || "",
          outTime: record.outTime || "",
          remarks: record.remarks || "",
        });

        const saved = await attendance.save();
        results.created.push(saved);
      } catch (error) {
        results.errors.push({
          date: record.attendanceDate,
          error: error.message,
        });
      }
    }

    res.status(201).json(results);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update attendance record
router.put("/:id", async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    // Check if locked
    if (attendance.isLocked) {
      return res.status(403).json({
        message:
          "Cannot edit locked attendance record. Salary has been finalized.",
      });
    }

    const { status, inTime, outTime, remarks } = req.body;

    if (status !== undefined) attendance.status = status;
    if (inTime !== undefined) attendance.inTime = inTime;
    if (outTime !== undefined) attendance.outTime = outTime;
    if (remarks !== undefined) attendance.remarks = remarks;

    const updatedAttendance = await attendance.save();
    res.json(updatedAttendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete attendance record
router.delete("/:id", async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    // Check if locked
    if (attendance.isLocked) {
      return res.status(403).json({
        message:
          "Cannot delete locked attendance record. Salary has been finalized.",
      });
    }

    await Attendance.findByIdAndDelete(req.params.id);
    res.json({ message: "Attendance record deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Lock attendance for a month (when salary is finalized)
router.post("/lock/:staffId/:month/:year", async (req, res) => {
  try {
    const { staffId, month, year } = req.params;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const result = await Attendance.updateMany(
      {
        staffId,
        attendanceDate: {
          $gte: startDate,
          $lte: endDate,
        },
      },
      { isLocked: true },
    );

    res.json({
      message: "Attendance locked successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Unlock attendance for a month
router.post("/unlock/:staffId/:month/:year", async (req, res) => {
  try {
    const { staffId, month, year } = req.params;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const result = await Attendance.updateMany(
      {
        staffId,
        attendanceDate: {
          $gte: startDate,
          $lte: endDate,
        },
      },
      { isLocked: false },
    );

    res.json({
      message: "Attendance unlocked successfully",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper function
function getMonthName(month) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[month - 1];
}

module.exports = router;
