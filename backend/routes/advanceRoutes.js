const express = require("express");
const router = express.Router();
const Advance = require("../models/Advance");
const Salary = require("../models/Salary");

// Get all advances
router.get("/", async (req, res) => {
  try {
    const advances = await Advance.find().sort({ advanceDate: -1 });
    res.json(advances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get advance by ID
router.get("/:id", async (req, res) => {
  try {
    const advance = await Advance.findById(req.params.id);
    if (!advance) {
      return res.status(404).json({ message: "Advance record not found" });
    }
    res.json(advance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get advances by staff ID
router.get("/staff/:staffId", async (req, res) => {
  try {
    const advances = await Advance.find({ staffId: req.params.staffId }).sort({
      advanceDate: -1,
    });
    res.json(advances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get open advances by staff ID
router.get("/open/:staffId", async (req, res) => {
  try {
    const openAdvances = await Advance.find({
      staffId: req.params.staffId,
      status: "Open",
    }).sort({ advanceDate: -1 });

    const totalOpen = openAdvances.reduce(
      (sum, adv) => sum + adv.advanceAmount,
      0,
    );

    res.json({
      advances: openAdvances,
      totalAmount: totalOpen,
      count: openAdvances.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get adjusted advances by staff ID
router.get("/adjusted/:staffId", async (req, res) => {
  try {
    const adjustedAdvances = await Advance.find({
      staffId: req.params.staffId,
      status: "Adjusted",
    }).sort({ advanceDate: -1 });

    res.json(adjustedAdvances);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new advance
router.post("/", async (req, res) => {
  try {
    const { staffId, staffName, advanceAmount, advanceDate, reason, notes } =
      req.body;

    const advance = new Advance({
      staffId,
      staffName,
      advanceAmount,
      advanceDate: advanceDate || new Date(),
      reason,
      notes,
      status: "Open",
    });

    const savedAdvance = await advance.save();
    res.status(201).json(savedAdvance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update advance
router.put("/:id", async (req, res) => {
  try {
    const advance = await Advance.findById(req.params.id);

    if (!advance) {
      return res.status(404).json({ message: "Advance record not found" });
    }

    const {
      advanceAmount,
      advanceDate,
      reason,
      notes,
      status,
      adjustedMonth,
      adjustedYear,
    } = req.body;

    // Update fields
    if (advanceAmount !== undefined) advance.advanceAmount = advanceAmount;
    if (advanceDate) advance.advanceDate = advanceDate;
    if (reason !== undefined) advance.reason = reason;
    if (notes !== undefined) advance.notes = notes;
    if (status) advance.status = status;
    if (adjustedMonth !== undefined) advance.adjustedMonth = adjustedMonth;
    if (adjustedYear !== undefined) advance.adjustedYear = adjustedYear;

    const updatedAdvance = await advance.save();
    res.json(updatedAdvance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete advance
router.delete("/:id", async (req, res) => {
  try {
    const advance = await Advance.findById(req.params.id);

    if (!advance) {
      return res.status(404).json({ message: "Advance record not found" });
    }

    // Check if advance is adjusted in any salary
    if (advance.status === "Adjusted") {
      const salary = await Salary.findOne({
        staffId: advance.staffId,
        salaryMonth: advance.adjustedMonth,
        salaryYear: advance.adjustedYear,
      });

      if (salary) {
        return res.status(400).json({
          message:
            "Cannot delete adjusted advance. Please delete the associated salary first.",
        });
      }
    }

    await Advance.findByIdAndDelete(req.params.id);
    res.json({ message: "Advance record deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Manually adjust advance
router.post("/adjust/:id", async (req, res) => {
  try {
    const { month, year } = req.body;

    const advance = await Advance.findById(req.params.id);

    if (!advance) {
      return res.status(404).json({ message: "Advance record not found" });
    }

    if (advance.status === "Adjusted") {
      return res.status(400).json({ message: "Advance is already adjusted" });
    }

    advance.status = "Adjusted";
    advance.adjustedMonth = month;
    advance.adjustedYear = year;

    const updatedAdvance = await advance.save();
    res.json(updatedAdvance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Revert adjusted advance to open
router.post("/revert/:id", async (req, res) => {
  try {
    const advance = await Advance.findById(req.params.id);

    if (!advance) {
      return res.status(404).json({ message: "Advance record not found" });
    }

    if (advance.status === "Open") {
      return res.status(400).json({ message: "Advance is already open" });
    }

    // Check if there's a salary record for this adjustment
    const salary = await Salary.findOne({
      staffId: advance.staffId,
      salaryMonth: advance.adjustedMonth,
      salaryYear: advance.adjustedYear,
    });

    if (salary) {
      return res.status(400).json({
        message: "Cannot revert advance. Associated salary record exists.",
      });
    }

    advance.status = "Open";
    advance.adjustedMonth = null;
    advance.adjustedYear = null;

    const updatedAdvance = await advance.save();
    res.json(updatedAdvance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
