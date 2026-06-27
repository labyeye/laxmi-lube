const express = require("express");
const router = express.Router();
const ModuleDefinition = require("../models/ModuleDefinition");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  filterModuleDefinitionForRole,
} = require("../utils/recordValidation");

const normalizeFields = (fields = []) =>
  fields.map((field, index) => {
    const visible = Array.isArray(field.visible) ? field.visible : [];
    const showInForm =
      field.showInForm !== undefined ? field.showInForm : visible.includes("form");
    const showInList =
      field.showInList !== undefined ? field.showInList : visible.includes("list");
    const computedVisible = [];
    if (showInForm) computedVisible.push("form");
    if (showInList) computedVisible.push("list");

    return {
      ...field,
      visible: computedVisible,
      order: field.order ?? index + 1,
      status: field.status || "active",
    };
  });

const defaultModules = () => [
  {
    key: "retailer",
    name: "Retailer",
    fields: [
      {
        key: "name",
        label: "Retailer Name",
        type: "text",
        required: true,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 1,
        status: "active",
      },
      {
        key: "address1",
        label: "Address Line 1",
        type: "text",
        required: true,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 2,
        status: "active",
      },
      {
        key: "address2",
        label: "Address Line 2",
        type: "text",
        required: false,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 3,
        status: "active",
      },
      {
        key: "dayAssigned",
        label: "Day Assigned",
        type: "dropdown",
        required: false,
        options: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 4,
        status: "active",
      },
      {
        key: "assignedTo",
        label: "Assigned To",
        type: "relation",
        ref: "user",
        required: false,
        visible: ["form", "list"],
        roles: ["admin"],
        order: 5,
        status: "active",
      },
      {
        key: "collectionDays",
        label: "Collection Days",
        type: "multi_select",
        required: false,
        options: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 6,
        status: "active",
      },
    ],
  },
  {
    key: "product",
    name: "Product",
    fields: [
      {
        key: "company",
        label: "Company",
        type: "text",
        required: false,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 1,
        status: "active",
      },
      {
        key: "code",
        label: "Product Code",
        type: "text",
        required: true,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 2,
        status: "active",
      },
      {
        key: "name",
        label: "Product Name",
        type: "text",
        required: true,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 3,
        status: "active",
      },
      {
        key: "price",
        label: "Price",
        type: "number",
        required: true,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 4,
        status: "active",
      },
      {
        key: "mrp",
        label: "MRP",
        type: "number",
        required: false,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 5,
        status: "active",
      },
      {
        key: "weight",
        label: "Weight",
        type: "number",
        required: true,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 6,
        status: "active",
      },
      {
        key: "scheme",
        label: "Scheme",
        type: "number",
        required: false,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 7,
        status: "active",
      },
      {
        key: "stock",
        label: "Stock",
        type: "number",
        required: true,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 8,
        status: "active",
      },
    ],
  },
  {
    key: "bill",
    name: "Bill",
    fields: [
      {
        key: "billNumber",
        label: "Bill Number",
        type: "text",
        required: true,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 1,
        status: "active",
      },
      {
        key: "retailer",
        label: "Retailer",
        type: "text",
        required: true,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 2,
        status: "active",
      },
      {
        key: "amount",
        label: "Amount",
        type: "number",
        required: true,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 3,
        status: "active",
      },
      {
        key: "dueAmount",
        label: "Due Amount",
        type: "number",
        required: true,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 4,
        status: "active",
      },
      {
        key: "billDate",
        label: "Bill Date",
        type: "date",
        required: true,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 5,
        status: "active",
      },
      {
        key: "collectionDay",
        label: "Collection Day",
        type: "dropdown",
        required: true,
        options: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 6,
        status: "active",
      },
      {
        key: "status",
        label: "Status",
        type: "dropdown",
        required: true,
        options: ["Unpaid", "Paid", "Partially Paid"],
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 7,
        status: "active",
      },
      {
        key: "assignedTo",
        label: "Assigned Staff",
        type: "relation",
        ref: "user",
        required: false,
        visible: ["list"],
        roles: ["admin"],
        order: 8,
        status: "active",
      },
    ],
  },
  {
    key: "order",
    name: "Order",
    fields: [
      {
        key: "retailerName",
        label: "Retailer Name",
        type: "text",
        required: true,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 1,
        status: "active",
      },
      {
        key: "status",
        label: "Status",
        type: "dropdown",
        required: true,
        options: ["Pending", "Approved", "Completed", "Rejected", "Cancelled"],
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 2,
        status: "active",
      },
    ],
  },
  {
    key: "delivery",
    name: "Delivery",
    fields: [
      {
        key: "retailerName",
        label: "Retailer Name",
        type: "text",
        required: true,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 1,
        status: "active",
      },
      {
        key: "driverName",
        label: "Driver/Staff Name",
        type: "text",
        required: true,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 2,
        status: "active",
      },
      {
        key: "status",
        label: "Status",
        type: "dropdown",
        required: false,
        options: ["Pending", "In Transit", "Delivered", "Cancelled"],
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 3,
        status: "active",
      },
    ],
  },
  {
    key: "collection",
    name: "Collection",
    fields: [
      {
        key: "retailer",
        label: "Retailer",
        type: "text",
        required: true,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 1,
        status: "active",
      },
      {
        key: "amountCollected",
        label: "Amount Collected",
        type: "number",
        required: true,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 2,
        status: "active",
      },
      {
        key: "collectionDate",
        label: "Collection Date",
        type: "date",
        required: true,
        visible: ["form", "list"],
        roles: ["admin", "staff"],
        order: 3,
        status: "active",
      },
    ],
  },
  {
    key: "attendance",
    name: "Attendance",
    fields: [
      {
        key: "staffName",
        label: "Staff Name",
        type: "text",
        required: true,
        visible: ["form", "list"],
        roles: ["admin"],
        order: 1,
        status: "active",
      },
      {
        key: "date",
        label: "Date",
        type: "date",
        required: true,
        visible: ["form", "list"],
        roles: ["admin"],
        order: 2,
        status: "active",
      },
      {
        key: "status",
        label: "Status",
        type: "dropdown",
        required: true,
        options: ["Present", "Absent", "Half Day"],
        visible: ["form", "list"],
        roles: ["admin"],
        order: 3,
        status: "active",
      },
    ],
  },
  {
    key: "salary",
    name: "Salary",
    fields: [
      {
        key: "staffName",
        label: "Staff Name",
        type: "text",
        required: true,
        visible: ["form", "list"],
        roles: ["admin"],
        order: 1,
        status: "active",
      },
      {
        key: "amount",
        label: "Amount",
        type: "number",
        required: true,
        visible: ["form", "list"],
        roles: ["admin"],
        order: 2,
        status: "active",
      },
      {
        key: "month",
        label: "Month",
        type: "text",
        required: true,
        visible: ["form", "list"],
        roles: ["admin"],
        order: 3,
        status: "active",
      },
    ],
  },
  {
    key: "advance",
    name: "Advance",
    fields: [
      {
        key: "staffName",
        label: "Staff Name",
        type: "text",
        required: true,
        visible: ["form", "list"],
        roles: ["admin"],
        order: 1,
        status: "active",
      },
      {
        key: "amount",
        label: "Amount",
        type: "number",
        required: true,
        visible: ["form", "list"],
        roles: ["admin"],
        order: 2,
        status: "active",
      },
      {
        key: "reason",
        label: "Reason",
        type: "text",
        required: false,
        visible: ["form", "list"],
        roles: ["admin"],
        order: 3,
        status: "active",
      },
    ],
  },
];

const ensureDefaults = async () => {
  const defaults = defaultModules();
  for (const mod of defaults) {
    const existing = await ModuleDefinition.findOne({ key: mod.key });
    if (!existing) {
      await ModuleDefinition.create(mod);
    }
  }
};

router.get("/", protect, adminOnly, async (req, res) => {
  try {
    await ensureDefaults();
    const modules = await ModuleDefinition.find().sort({ name: 1 });
    res.json(modules);
  } catch (err) {
    res.status(500).json({ message: "Failed to load modules", error: err.message });
  }
});

router.get("/definitions", protect, async (req, res) => {
  try {
    await ensureDefaults();
    const modules = await ModuleDefinition.find().sort({ name: 1 });
    const filtered = modules.map((moduleDef) =>
      filterModuleDefinitionForRole(moduleDef, req.user.role)
    );
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: "Failed to load modules", error: err.message });
  }
});

router.get("/definition/:key", protect, async (req, res) => {
  try {
    await ensureDefaults();
    const moduleDef = await ModuleDefinition.findOne({ key: req.params.key });
    if (!moduleDef) {
      return res.status(404).json({ message: "Module not found" });
    }
    const filtered = filterModuleDefinitionForRole(moduleDef, req.user.role);
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: "Failed to load module", error: err.message });
  }
});

router.get("/:id", protect, adminOnly, async (req, res) => {
  try {
    const moduleDef = await ModuleDefinition.findById(req.params.id);
    if (!moduleDef) {
      return res.status(404).json({ message: "Module not found" });
    }
    res.json(moduleDef);
  } catch (err) {
    res.status(500).json({ message: "Failed to load module", error: err.message });
  }
});

router.put("/:id", protect, adminOnly, async (req, res) => {
  try {
    const { fields } = req.body;
    const moduleDef = await ModuleDefinition.findById(req.params.id);
    if (!moduleDef) {
      return res.status(404).json({ message: "Module not found" });
    }

    if (Array.isArray(fields)) {
      moduleDef.fields = normalizeFields(fields);
    }

    moduleDef.version = (moduleDef.version || 0) + 1;
    const updated = await moduleDef.save();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: "Failed to update module", error: err.message });
  }
});

module.exports = router;
