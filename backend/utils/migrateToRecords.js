/* eslint-disable no-console */
const mongoose = require("mongoose");
const ModuleDefinition = require("../models/ModuleDefinition");
const Record = require("../models/Record");
const Retailer = require("../models/Retailer");
const Product = require("../models/Product");
const Bill = require("../models/Bill");

const toIsoIfDate = (value) => {
  if (!value) return value;
  if (value instanceof Date) return value.toISOString();
  return value;
};

const buildDataFromModule = (moduleDef, doc) => {
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

const moduleModelMap = {
  retailer: Retailer,
  product: Product,
  bill: Bill,
};

const migrate = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not set");
  }

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const moduleDefs = await ModuleDefinition.find({
    key: { $in: Object.keys(moduleModelMap) },
  });

  for (const moduleDef of moduleDefs) {
    const moduleKey = moduleDef.key;
    const existingCount = await Record.countDocuments({ module: moduleKey });
    if (existingCount > 0) {
      console.log(`[SKIP] ${moduleKey} already has records`);
      continue;
    }

    const Model = moduleModelMap[moduleKey];
    const docs = await Model.find({});
    console.log(`[MIGRATE] ${moduleKey} => ${docs.length} documents`);

    const records = docs.map((doc) => ({
      module: moduleKey,
      data: buildDataFromModule(moduleDef, doc),
      status: "active",
      createdBy: doc.createdBy || undefined,
      updatedBy: doc.updatedBy || undefined,
      createdAt: doc.createdAt || undefined,
      updatedAt: doc.updatedAt || undefined,
    }));

    if (records.length > 0) {
      await Record.insertMany(records);
    }
  }

  await mongoose.disconnect();
};

migrate()
  .then(() => {
    console.log("Migration complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
