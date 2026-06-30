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
    const errors = [];
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
        cleanup();
        return res.status(400).json({ message: "Required columns not found" });
      }

      // ── Load all staff once for assignedTo lookup ──────────────────────────
      const staffMembers = await User.find({ role: "staff" })
        .select("name")
        .lean();
      const staffMap = new Map(
        staffMembers.map((s) => [s.name.toUpperCase(), s._id]),
      );

      // ── Pass 1: parse & validate all rows in memory (no DB calls) ──────────
      const validRetailers = [];
      const seenNames = new Set();

      for (const [index, row] of jsonData.entries()) {
        if (index === 0) continue;
        if (!row[nameCol] && !row[addr1Col]) continue;

        const name = row[nameCol]?.trim();
        const address1 = row[addr1Col]?.trim();

        if (!name || !address1) {
          errors.push(`Row ${index + 1}: Missing required fields`);
          continue;
        }

        const nameKey = name.toUpperCase();
        if (seenNames.has(nameKey)) {
          errors.push(`Row ${index + 1}: Duplicate retailer "${name}" in this file`);
          continue;
        }
        seenNames.add(nameKey);

        const address2 = addr2Col !== -1 ? row[addr2Col]?.trim() : "";
        const dayAssigned =
          dayAssignedCol !== -1 ? row[dayAssignedCol]?.trim() : "";
        let processedDayAssigned = dayAssigned;
        if (dayAbbreviations[dayAssigned?.toUpperCase()]) {
          processedDayAssigned = dayAbbreviations[dayAssigned.toUpperCase()];
        } else if (
          !["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].includes(dayAssigned)
        ) {
          processedDayAssigned = "";
        }

        // If assignedTo staff name isn't found, just skip the field (no error)
        let assignedTo = null;
        if (assignedToCol !== -1 && row[assignedToCol]) {
          const assignedToName = row[assignedToCol]?.trim();
          assignedTo = staffMap.get(assignedToName?.toUpperCase()) || null;
        }

        let phone = null;
        if (phoneCol !== -1 && row[phoneCol]) {
          const digits = String(row[phoneCol]).replace(/\D/g, "");
          const tenDigit =
            digits.length === 12 && digits.startsWith("91")
              ? digits.slice(2)
              : digits;
          if (/^[6-9]\d{9}$/.test(tenDigit)) {
            phone = tenDigit;
          } else {
            errors.push(
              `Row ${index + 1}: Invalid phone number "${row[phoneCol]}" for "${name}" - skipped phone field`,
            );
          }
        }

        validRetailers.push({
          name,
          address1,
          address2,
          dayAssigned: processedDayAssigned,
          assignedTo,
          phone: phone || undefined,
          createdBy: req.user._id,
        });
      }

      // ── Pass 2: single query to find already-existing retailers ────────────
      const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const names = validRetailers.map((r) => r.name);
      const existingRetailers = await Retailer.find({
        name: { $in: names.map((n) => new RegExp(`^${escapeRegex(n)}$`, "i")) },
      })
        .select("name")
        .lean();
      const existingNames = new Set(
        existingRetailers.map((r) => r.name.toUpperCase()),
      );

      const toInsert = validRetailers.filter((r) => {
        if (existingNames.has(r.name.toUpperCase())) {
          errors.push(`Retailer with exact name "${r.name}" already exists`);
          return false;
        }
        return true;
      });

      // ── Pass 3: bulk insert all new retailers in one shot ──────────────────
      let insertedCount = 0;
      if (toInsert.length > 0) {
        const inserted = await Retailer.insertMany(toInsert, { ordered: false });
        insertedCount = inserted.length;
      }

      res.json({
        importedCount: insertedCount,
        errorCount: errors.length,
        errors: errors.slice(0, 10),
      });
    } catch (error) {
      console.error("Import error:", error);
      res.status(500).json({
        message: "Failed to import retailers",
        error: error.message,
      });
    } finally {
      cleanup();
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
