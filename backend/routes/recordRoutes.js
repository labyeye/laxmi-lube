const express = require("express");
const router = express.Router();
const Record = require("../models/Record");
const ModuleDefinition = require("../models/ModuleDefinition");
const Retailer = require("../models/Retailer");
const Product = require("../models/Product");
const Bill = require("../models/Bill");
const { protect } = require("../middleware/authMiddleware");
const {
  validateRecordPayload,
  filterRecordDataForRole,
} = require("../utils/recordValidation");

const hasPermission = (moduleDef, action, role) => {
  if (!moduleDef?.permissions?.[action]) return role === "admin";
  if (role === "admin") return true;
  return moduleDef.permissions[action].includes(role);
};

const legacyModels = {
  retailer: Retailer,
  product: Product,
  bill: Bill,
};

const toIsoIfDate = (value) => {
  if (!value) return value;
  if (value instanceof Date) return value.toISOString();
  return value;
};

const buildDataFromLegacyDoc = (moduleDef, doc) => {
  const data = {};
  const source = doc.toObject ? doc.toObject() : doc;
  for (const field of moduleDef.fields || []) {
    const value = source[field.key];
    if (value !== undefined) {
      data[field.key] = toIsoIfDate(value);
    }
  }
  return data;
};

// Auto-migrate legacy documents into Record collection if none exist yet
const autoMigrateLegacy = async (moduleKey, moduleDef) => {
  const LegacyModel = legacyModels[moduleKey];
  if (!LegacyModel) return;

  const existingCount = await Record.countDocuments({ module: moduleKey });
  if (existingCount > 0) return;

  const docs = await LegacyModel.find({});
  if (docs.length === 0) return;

  const records = docs.map((doc) => ({
    module: moduleKey,
    data: buildDataFromLegacyDoc(moduleDef, doc),
    status: "active",
    legacyId: doc._id,
    createdBy: doc.createdBy || undefined,
    updatedBy: doc.updatedBy || undefined,
    createdAt: doc.createdAt || undefined,
    updatedAt: doc.updatedAt || undefined,
  }));

  await Record.insertMany(records);
};

const legacyFieldMap = {
  retailer: [
    "name",
    "address1",
    "address2",
    "assignedTo",
    "dayAssigned",
    "collectionDays",
  ],
  product: ["code", "name", "mrp", "price", "weight", "scheme", "stock", "company"],
  bill: [
    "billNumber",
    "retailer",
    "amount",
    "dueAmount",
    "billDate",
    "status",
    "collectionDay",
    "assignedTo",
  ],
};

const buildLegacyPayload = (moduleKey, data, userId) => {
  const payload = {};
  const fields = legacyFieldMap[moduleKey] || [];
  fields.forEach((field) => {
    if (data[field] !== undefined) {
      payload[field] = data[field];
    }
  });
  if (moduleKey === "retailer" && userId) {
    payload.createdBy = userId;
  }
  return payload;
};

router.get("/:moduleKey", protect, async (req, res) => {
  try {
    const moduleKey = req.params.moduleKey;
    const moduleDef = await ModuleDefinition.findOne({ key: moduleKey });
    if (!moduleDef) {
      return res.status(404).json({ message: "Module not found" });
    }

    if (!hasPermission(moduleDef, "read", req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Auto-migrate legacy data (Product, Retailer, Bill) into Records on first access
    await autoMigrateLegacy(moduleKey, moduleDef);

    const records = await Record.find({
      module: moduleKey,
      status: { $ne: "deleted" },
    }).sort({ createdAt: -1 });

    const filtered = records.map((record) =>
      filterRecordDataForRole(moduleDef, record.toObject(), req.user.role)
    );

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: "Failed to load records", error: err.message });
  }
});

router.post("/:moduleKey", protect, async (req, res) => {
  try {
    const moduleKey = req.params.moduleKey;
    const moduleDef = await ModuleDefinition.findOne({ key: moduleKey });
    if (!moduleDef) {
      return res.status(404).json({ message: "Module not found" });
    }

    if (!hasPermission(moduleDef, "create", req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { errors, normalizedData } = validateRecordPayload({
      moduleDef,
      data: req.body?.data || {},
      role: req.user.role,
      isUpdate: false,
    });

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    const record = await Record.create({
      module: moduleKey,
      data: normalizedData,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    const LegacyModel = legacyModels[moduleKey];
    if (LegacyModel) {
      const legacyPayload = buildLegacyPayload(
        moduleKey,
        normalizedData,
        req.user._id
      );
      const legacyDoc = await LegacyModel.create(legacyPayload);
      record.legacyId = legacyDoc._id;
      await record.save();
    }

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ message: "Failed to create record", error: err.message });
  }
});

router.get("/:moduleKey/:id", protect, async (req, res) => {
  try {
    const { moduleKey, id } = req.params;
    const moduleDef = await ModuleDefinition.findOne({ key: moduleKey });
    if (!moduleDef) {
      return res.status(404).json({ message: "Module not found" });
    }

    if (!hasPermission(moduleDef, "read", req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const record = await Record.findOne({
      _id: id,
      module: moduleKey,
      status: { $ne: "deleted" },
    });

    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    const filtered = filterRecordDataForRole(
      moduleDef,
      record.toObject(),
      req.user.role
    );

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: "Failed to load record", error: err.message });
  }
});

router.put("/:moduleKey/:id", protect, async (req, res) => {
  try {
    const { moduleKey, id } = req.params;
    const moduleDef = await ModuleDefinition.findOne({ key: moduleKey });
    if (!moduleDef) {
      return res.status(404).json({ message: "Module not found" });
    }

    if (!hasPermission(moduleDef, "update", req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const { errors, normalizedData } = validateRecordPayload({
      moduleDef,
      data: req.body?.data || {},
      role: req.user.role,
      isUpdate: true,
    });

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: "Validation failed", errors });
    }

    const record = await Record.findOne({
      _id: id,
      module: moduleKey,
      status: { $ne: "deleted" },
    });

    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    record.data = { ...(record.data || {}), ...normalizedData };
    record.updatedBy = req.user._id;
    await record.save();

    const LegacyModel = legacyModels[moduleKey];
    if (LegacyModel && record.legacyId) {
      const legacyPayload = buildLegacyPayload(
        moduleKey,
        normalizedData,
        req.user._id
      );
      if (Object.keys(legacyPayload).length > 0) {
        await LegacyModel.findByIdAndUpdate(record.legacyId, legacyPayload);
      }
    }

    res.json(record);
  } catch (err) {
    res.status(500).json({ message: "Failed to update record", error: err.message });
  }
});

router.delete("/:moduleKey/:id", protect, async (req, res) => {
  try {
    const { moduleKey, id } = req.params;
    const moduleDef = await ModuleDefinition.findOne({ key: moduleKey });
    if (!moduleDef) {
      return res.status(404).json({ message: "Module not found" });
    }

    if (!hasPermission(moduleDef, "delete", req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const record = await Record.findOne({ _id: id, module: moduleKey });
    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    record.status = "deleted";
    record.updatedBy = req.user._id;
    await record.save();

    const LegacyModel = legacyModels[moduleKey];
    if (LegacyModel && record.legacyId) {
      await LegacyModel.findByIdAndDelete(record.legacyId);
    }
    res.json({ message: "Record deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete record", error: err.message });
  }
});

module.exports = router;
