const express = require("express");
const router = express.Router();
const Salary = require("../models/Salary");
const Advance = require("../models/Advance");
const User = require("../models/User");

// Get all salaries
router.get("/", async (req, res) => {
  try {
    const salaries = await Salary.find().sort({
      salaryYear: -1,
      salaryMonth: -1,
    });
    res.json(salaries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get salary by ID
router.get("/:id", async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.id);
    if (!salary) {
      return res.status(404).json({ message: "Salary record not found" });
    }
    res.json(salary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get salaries by staff ID
router.get("/staff/:staffId", async (req, res) => {
  try {
    const salaries = await Salary.find({ staffId: req.params.staffId }).sort({
      salaryYear: -1,
      salaryMonth: -1,
    });
    res.json(salaries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get salary for specific month/year
router.get("/month/:staffId/:month/:year", async (req, res) => {
  try {
    const { staffId, month, year } = req.params;
    const salary = await Salary.findOne({
      staffId,
      salaryMonth: parseInt(month),
      salaryYear: parseInt(year),
    });

    if (!salary) {
      return res
        .status(404)
        .json({ message: "Salary record not found for this month" });
    }

    res.json(salary);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Calculate open advances for a staff
router.get("/calculate-advances/:staffId", async (req, res) => {
  try {
    const openAdvances = await Advance.find({
      staffId: req.params.staffId,
      status: "Open",
    });

    const totalAdvance = openAdvances.reduce(
      (sum, adv) => sum + adv.advanceAmount,
      0,
    );

    res.json({
      openAdvances,
      totalAdvance,
      count: openAdvances.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new salary
router.post("/", async (req, res) => {
  try {
    const {
      staffId,
      staffName,
      salaryMonth,
      salaryYear,
      basicSalary,
      paymentMode,
      paymentStatus,
      paidAmount,
      paidDate,
      remarks,
    } = req.body;

    // Check if salary already exists for this month
    const existingSalary = await Salary.findOne({
      staffId,
      salaryMonth,
      salaryYear,
    });

    if (existingSalary) {
      return res.status(400).json({
        message: `Salary for ${getMonthName(salaryMonth)} ${salaryYear} already exists`,
      });
    }

    // Get open advances
    const openAdvances = await Advance.find({
      staffId,
      status: "Open",
    });

    const advanceDeducted = openAdvances.reduce(
      (sum, adv) => sum + adv.advanceAmount,
      0,
    );

    // Create salary record
    const salary = new Salary({
      staffId,
      staffName,
      salaryMonth,
      salaryYear,
      basicSalary,
      advanceDeducted,
      netSalaryPayable: basicSalary - advanceDeducted,
      paymentMode,
      paymentStatus,
      paidAmount: paidAmount || 0,
      paidDate: paidDate || null,
      remarks,
    });

    const savedSalary = await salary.save();

    // If salary is paid, mark advances as adjusted
    if (paymentStatus === "Paid" && advanceDeducted > 0) {
      await Advance.updateMany(
        { staffId, status: "Open" },
        {
          status: "Adjusted",
          adjustedMonth: salaryMonth,
          adjustedYear: salaryYear,
        },
      );
    }

    res.status(201).json(savedSalary);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update salary
router.put("/:id", async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.id);

    if (!salary) {
      return res.status(404).json({ message: "Salary record not found" });
    }

    const {
      basicSalary,
      paymentMode,
      paymentStatus,
      paidAmount,
      paidDate,
      remarks,
    } = req.body;

    // Update fields
    if (basicSalary !== undefined) salary.basicSalary = basicSalary;
    if (paymentMode) salary.paymentMode = paymentMode;
    if (paymentStatus) salary.paymentStatus = paymentStatus;
    if (paidAmount !== undefined) salary.paidAmount = paidAmount;
    if (paidDate) salary.paidDate = paidDate;
    if (remarks !== undefined) salary.remarks = remarks;

    // Recalculate net salary
    salary.netSalaryPayable = salary.basicSalary - salary.advanceDeducted;

    const updatedSalary = await salary.save();

    // If status changed to Paid, mark advances as adjusted
    if (paymentStatus === "Paid" && salary.advanceDeducted > 0) {
      await Advance.updateMany(
        { staffId: salary.staffId, status: "Open" },
        {
          status: "Adjusted",
          adjustedMonth: salary.salaryMonth,
          adjustedYear: salary.salaryYear,
        },
      );
    }

    res.json(updatedSalary);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete salary
router.delete("/:id", async (req, res) => {
  try {
    const salary = await Salary.findById(req.params.id);

    if (!salary) {
      return res.status(404).json({ message: "Salary record not found" });
    }

    // If salary was paid and had advances, revert advances to Open
    if (salary.paymentStatus === "Paid" && salary.advanceDeducted > 0) {
      await Advance.updateMany(
        {
          staffId: salary.staffId,
          adjustedMonth: salary.salaryMonth,
          adjustedYear: salary.salaryYear,
        },
        { status: "Open", adjustedMonth: null, adjustedYear: null },
      );
    }

    await Salary.findByIdAndDelete(req.params.id);
    res.json({ message: "Salary record deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get monthly summary
router.get("/summary/:month/:year", async (req, res) => {
  try {
    const { month, year } = req.params;

    const salaries = await Salary.find({
      salaryMonth: parseInt(month),
      salaryYear: parseInt(year),
    });

    const advances = await Advance.find({
      $expr: {
        $and: [
          { $eq: [{ $month: "$advanceDate" }, parseInt(month)] },
          { $eq: [{ $year: "$advanceDate" }, parseInt(year)] },
        ],
      },
    });

    const totalSalary = salaries.reduce((sum, sal) => sum + sal.basicSalary, 0);
    const totalAdvanceDeducted = salaries.reduce(
      (sum, sal) => sum + sal.advanceDeducted,
      0,
    );
    const totalNetPaid = salaries.reduce((sum, sal) => sum + sal.paidAmount, 0);
    const totalAdvanceGiven = advances.reduce(
      (sum, adv) => sum + adv.advanceAmount,
      0,
    );

    res.json({
      month: parseInt(month),
      year: parseInt(year),
      monthName: getMonthName(parseInt(month)),
      totalSalary,
      totalAdvanceDeducted,
      totalAdvanceGiven,
      totalNetPaid,
      salaryCount: salaries.length,
      advanceCount: advances.length,
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
