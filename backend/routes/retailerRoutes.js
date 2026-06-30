// routes/retailerRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const xlsx = require("xlsx");
const Retailer = require("../models/Retailer");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const mongoose = require("mongoose");
const User = require("../models/User");
const fs = require("fs");

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const {
      name,
      address1,
      address2,
      assignedTo,
      dayAssigned,
      email,
      password,
      phone,
    } = req.body;
    console.log("Creating retailer:", { name, address1, assignedTo, email });

    // Create retailer document
    const retailer = new Retailer({
      name,
      address1,
      address2,
      assignedTo,
      dayAssigned,
      phone: phone || undefined,
      createdBy: req.user._id,
      status: "ACTIVE",
    });

    await retailer.save();
    console.log("Retailer saved:", retailer);

    // If email and password provided, create user account
    if (email && password) {
      const User = require("../models/User");

      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        // Rollback retailer creation
        await Retailer.findByIdAndDelete(retailer._id);
        return res.status(400).json({ message: "Email already registered" });
      }

      // Create user account
      const user = new User({
        name: name,
        email: email,
        password: password, // Will be hashed by pre-save hook
        role: "retailer",
        retailerId: retailer._id,
        isActive: true, // Active immediately
      });

      await user.save();

      // Link user to retailer
      retailer.userId = user._id;
      await retailer.save();

      console.log("User account created for retailer");
    }

    res.status(201).json(retailer);
  } catch (err) {
    console.error("Error saving retailer:", err);
    res.status(400).json({ message: err.message });
  }
});
router.post(
  "/import",
  protect,
  adminOnly,
  upload.single("file"),
  async (req, res) => {
    const { PassThrough } = require("stream");
    const progressStream = new PassThrough();
    const errors = [];
    const importedRetailers = [];
    let processedRows = 0;
    let totalRows = 0;
    const cleanup = () => {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    };

    try {
      if (!req.file) {
        cleanup();
        return res.status(400).json({ message: "No file uploaded" });
      }
      const dayAbbreviations = {
        MON: "Monday",
        TUE: "Tuesday",
        WED: "Wednesday",
        THU: "Thursday",
        FRI: "Friday",
        SAT: "Saturday",
        SUN: "Sunday",
      };

      const workbook = xlsx.readFile(req.file.path);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      const headers = jsonData[0] || [];
      const lowerHeaders = headers.map((h) => String(h).toLowerCase().trim());

      const nameCol = lowerHeaders.findIndex((h) => h.includes("name"));
      const addr1Col = lowerHeaders.findIndex(
        (h) => h.includes("address 1") || h.includes("address1"),
      );
      const addr2Col = lowerHeaders.findIndex(
        (h) => h.includes("address 2") || h.includes("address2"),
      );
      const dayAssignedCol = lowerHeaders.findIndex(
        (h) => h.includes("day assigned") || h.includes("dayassigned"),
      );
      const assignedToCol = lowerHeaders.findIndex(
        (h) => h.includes("assigned to") || h.includes("assignedto"),
      );
      const phoneCol = lowerHeaders.findIndex(
        (h) =>
          h.includes("phone") ||
          h.includes("mobile") ||
          h.includes("whatsapp") ||
          h.includes("contact"),
      );

      if (nameCol === -1 || addr1Col === -1) {
        return res.status(400).json({ message: "Required columns not found" });
      }

      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Transfer-Encoding", "chunked");

      totalRows = jsonData.length - 1;

      for (const [index, row] of jsonData.entries()) {
        if (index === 0) continue;

        try {
          if (!row[nameCol] && !row[addr1Col]) continue;
          const name = row[nameCol]?.trim();
          const address1 = row[addr1Col]?.trim();
          const address2 = addr2Col !== -1 ? row[addr2Col]?.trim() : "";
          const dayAssigned =
            dayAssignedCol !== -1 ? row[dayAssignedCol]?.trim() : "";
          let processedDayAssigned = dayAssigned;
          if (dayAbbreviations[dayAssigned?.toUpperCase()]) {
            processedDayAssigned = dayAbbreviations[dayAssigned.toUpperCase()];
          } else if (
            ![
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
              "Sunday",
            ].includes(dayAssigned)
          ) {
            processedDayAssigned = "";
          }
          let assignedTo = null;
          if (assignedToCol !== -1 && row[assignedToCol]) {
            const assignedToName = row[assignedToCol]?.trim();
            const staff = await User.findOne({
              name: { $regex: new RegExp(assignedToName, "i") },
              role: "staff",
            });
            assignedTo = staff?._id || null;
            if (!staff) {
              errors.push(
                `Row ${index + 1}: Staff member "${assignedToName}" not found`,
              );
            }
          }

          if (!name || !address1) {
            errors.push(`Row ${index + 1}: Missing required fields`);
            continue;
          }
          const existingRetailer = await Retailer.findOne({
            name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
          });
          if (existingRetailer) {
            errors.push(
              `Row ${
                index + 1
              }: Retailer with exact name "${name}" already exists`,
            );
            continue;
          }

          let phone = null;
          if (phoneCol !== -1 && row[phoneCol]) {
            // Strip non-digits and a leading country code (e.g. 91) to get a 10-digit number
            const digits = String(row[phoneCol]).replace(/\D/g, "");
            const tenDigit =
              digits.length === 12 && digits.startsWith("91")
                ? digits.slice(2)
                : digits;
            if (/^[6-9]\d{9}$/.test(tenDigit)) {
              phone = tenDigit;
            } else {
              errors.push(
                `Row ${
                  index + 1
                }: Invalid phone number "${row[phoneCol]}" for "${name}" - skipped phone field`,
              );
            }
          }

          // Create and save new retailer
          const retailer = new Retailer({
            name,
            address1,
            address2,
            dayAssigned: processedDayAssigned,
            assignedTo,
            phone: phone || undefined,
            createdBy: req.user._id,
          });

          await retailer.save();
          importedRetailers.push(retailer);

          processedRows++;
          res.write(
            JSON.stringify({
              type: "progress",
              current: processedRows,
              total: totalRows,
            }) + "\n",
          );
        } catch (err) {
          errors.push(`Row ${index + 1}: ${err.message}`);
        }
      }

      // Send final result
      const finalResult = {
        type: "result",
        importedCount: importedRetailers.length,
        errorCount: errors.length,
        errors: errors.slice(0, 10),
      };
      res.write(JSON.stringify(finalResult) + "\n");
    } catch (error) {
      console.error("Import error:", error);
      res.write(
        JSON.stringify({
          type: "error",
          message: "Failed to import retailers",
          error: error.message,
        }) + "\n",
      );
    } finally {
      cleanup();
      try {
        res.end();
      } catch (err) {
        console.error("Error ending response:", err);
      }
    }
  },
);

router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const { name, address1, address2, assignedTo, dayAssigned, phone } =
      req.body;
    const retailer = await Retailer.findById(req.params.id);

    if (!retailer) {
      return res.status(404).json({ message: "Retailer not found" });
    }

    retailer.name = name !== undefined ? name : retailer.name;
    retailer.address1 = address1 !== undefined ? address1 : retailer.address1;
    retailer.address2 = address2 !== undefined ? address2 : retailer.address2;
    retailer.assignedTo =
      assignedTo !== undefined ? assignedTo : retailer.assignedTo;
    retailer.dayAssigned =
      dayAssigned !== undefined ? dayAssigned : retailer.dayAssigned;
    retailer.phone = phone !== undefined ? phone : retailer.phone;
    retailer.updatedAt = Date.now();

    await retailer.save();
    res.json(retailer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const retailer = await Retailer.findById(req.params.id);

    if (!retailer) {
      return res.status(404).json({ message: "Retailer not found" });
    }

    // Add validation for retailer ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: "Invalid retailer ID" });
    }

    await retailer.deleteOne();
    res.json({ message: "Retailer removed successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({
      message: "Failed to delete retailer",
      error: err.message,
    });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const retailers = await Retailer.find({})
      .populate("assignedTo", "name")
      .populate("createdBy", "name")
      .sort({ name: 1 });
    res.json(retailers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
router.post("/:id/assign", protect, adminOnly, async (req, res) => {
  try {
    const { staffId } = req.body;
    const retailer = await Retailer.findByIdAndUpdate(
      req.params.id,
      { assignedTo: staffId },
      { new: true },
    );
    res.json(retailer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
router.get("/export", protect, adminOnly, async (req, res) => {
  try {
    const retailers = await Retailer.find({})
      .populate("assignedTo", "name")
      .sort({ name: 1 });

    // Prepare CSV data
    const csvData = [
      ["Name", "Address 1", "Address 2", "Day Assigned", "Assigned To"],
      ...retailers.map((retailer) => [
        retailer.name,
        retailer.address1,
        retailer.address2 || "",
        retailer.dayAssigned || "",
        retailer.assignedTo?.name || "",
      ]),
    ];
    const csvString = csvData.map((row) => row.join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=retailers_export.csv",
    );

    // Send the CSV
    res.send(csvString);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Get pending retailer approvals
router.get("/pending", protect, adminOnly, async (req, res) => {
  try {
    const pendingRetailers = await Retailer.find({ status: "PENDING" })
      .populate("assignedTo", "name email")
      .populate("userId", "email")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: pendingRetailers.length,
      retailers: pendingRetailers,
    });
  } catch (err) {
    console.error("Error fetching pending retailers:", err);
    res.status(500).json({ message: err.message });
  }
});

// Admin: Approve retailer
router.put("/:id/approve", protect, adminOnly, async (req, res) => {
  try {
    const retailer = await Retailer.findById(req.params.id);

    if (!retailer) {
      return res.status(404).json({ message: "Retailer not found" });
    }

    if (retailer.status !== "PENDING") {
      return res
        .status(400)
        .json({ message: "Retailer is not pending approval" });
    }

    // Update retailer status
    retailer.status = "ACTIVE";
    await retailer.save();

    // Activate user account
    if (retailer.userId) {
      await User.findByIdAndUpdate(retailer.userId, { isActive: true });
    }

    res.json({
      success: true,
      message: "Retailer approved successfully",
      retailer,
    });
  } catch (err) {
    console.error("Error approving retailer:", err);
    res.status(500).json({ message: err.message });
  }
});

// Admin: Reject retailer
router.put("/:id/reject", protect, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const retailer = await Retailer.findById(req.params.id);

    if (!retailer) {
      return res.status(404).json({ message: "Retailer not found" });
    }

    if (retailer.status !== "PENDING") {
      return res
        .status(400)
        .json({ message: "Retailer is not pending approval" });
    }

    // Update retailer status
    retailer.status = "REJECTED";
    await retailer.save();

    // Keep user account inactive
    if (retailer.userId) {
      await User.findByIdAndUpdate(retailer.userId, { isActive: false });
    }

    res.json({
      success: true,
      message: "Retailer rejected",
      retailer,
    });
  } catch (err) {
    console.error("Error rejecting retailer:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
