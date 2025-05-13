// routes/productRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const xlsx = require("xlsx");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});
const upload = multer({ storage });

// Update the route handler:
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { code, name, price, weight, scheme, stock, company } = req.body;
    
    const product = new Product({
      code: code.toUpperCase(),
      name,
      price,
      weight,
      scheme,
      stock,
      company
    });
    
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
router.post("/import", protect, adminOnly, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const workbook = xlsx.readFile(req.file.path);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    
    // Get the exact header names from the first row
    const headers = xlsx.utils.sheet_to_json(worksheet, { header: 1 })[0];
    
    // Convert to lowercase for case-insensitive matching
    const lowerHeaders = headers.map(h => String(h).toLowerCase().trim());
    
    // Find column indexes
    const codeCol = lowerHeaders.findIndex(h => h.includes('code'));
    const nameCol = lowerHeaders.findIndex(h => h.includes('product name') || h.includes('name'));
    const mrpCol = lowerHeaders.findIndex(h => h.includes('mrp'));
    const priceCol = lowerHeaders.findIndex(h => h.includes('price'));
    const weightCol = lowerHeaders.findIndex(h => h.includes('weight'));
    const schemeCol = lowerHeaders.findIndex(h => h.includes('scheme'));
    const stockCol = lowerHeaders.findIndex(h => h.includes('stock'));
    const companyCol = lowerHeaders.findIndex(h => h.includes('company') || h.includes('company name'));

    if (codeCol === -1 || nameCol === -1 || priceCol === -1 || weightCol === -1 || stockCol === -1) {
      return res.status(400).json({ message: "Required columns not found" });
    }

    // Get all data rows (skip header)
    const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 0 });

    const products = [];
    const errors = [];

    for (const [index, row] of jsonData.entries()) {
      try {
        // Skip empty rows
        if (!row[headers[codeCol]] && !row[headers[nameCol]]) continue;

        const code = row[headers[codeCol]]?.toString().trim();
        const name = row[headers[nameCol]]?.toString().trim();
        const mrp = parseFloat(row[headers[mrpCol]]) || 0;
        const price = parseFloat(row[headers[priceCol]]) || 0;
        const weight = parseFloat(row[headers[weightCol]]) || 0;
        const scheme = schemeCol !== -1 ? parseFloat(row[headers[schemeCol]]) || 0 : 0;
        const stock = parseInt(row[headers[stockCol]]) || 0;
        const company = companyCol !== -1 ? row[headers[companyCol]]?.toString().trim() : "";

        if (!code || !name || !mrp || isNaN(price) || isNaN(weight) || isNaN(stock)) {
          errors.push(`Row ${index + 2}: Missing or invalid required fields`);
          continue;
        }

        const product = new Product({
          code: code.toUpperCase(),
          name,
          mrp,
          price,
          weight,
          scheme,
          stock,
          company
        });

        await product.save();
        products.push(product);
      } catch (err) {
        errors.push(`Row ${index + 2}: ${err.message}`);
      }
    }

    res.json({
      importedCount: products.length,
      errorCount: errors.length,
      errors: errors.slice(0, 10)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const filter = {};
    if (req.query.company) {
      filter.company = req.query.company;
    }
    const products = await Product.find(filter).sort({ name: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update product stock
router.patch("/:id/stock", protect, adminOnly, async (req, res) => {
  try {
    const { stock } = req.body;
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { stock },
      { new: true }
    );
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;