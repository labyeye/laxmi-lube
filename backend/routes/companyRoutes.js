const express = require("express");
const router = express.Router();
const Company = require("../models/Company");
const { protect, adminOnly } = require("../middleware/authMiddleware");

router.get("/", protect, async (req, res) => {
  try {
    const companies = await Company.find().sort({ name: 1 });
    res.json(companies);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });
    const company = await Company.create({ name, code });
    res.status(201).json(company);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
