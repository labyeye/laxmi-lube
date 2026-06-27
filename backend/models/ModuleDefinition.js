const mongoose = require("mongoose");

const FieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, required: true },
    required: { type: Boolean, default: false },
    unique: { type: Boolean, default: false },
    default: { type: mongoose.Schema.Types.Mixed, default: null },
    options: { type: [mongoose.Schema.Types.Mixed], default: [] },
    visible: { type: [String], default: ["form", "list"] },
    roles: { type: [String], default: ["admin"] },
    status: { type: String, default: "active" },
    order: { type: Number, default: 0 },
    ref: { type: String },
    multi: { type: Boolean, default: false },
  },
  { _id: false }
);

const ModuleDefinitionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    key: { type: String, required: true, unique: true, index: true },
    status: { type: String, default: "active" },
    version: { type: Number, default: 1 },
    permissions: {
      create: { type: [String], default: ["admin"] },
      read: { type: [String], default: ["admin"] },
      update: { type: [String], default: ["admin"] },
      delete: { type: [String], default: ["admin"] },
    },
    fields: { type: [FieldSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ModuleDefinition", ModuleDefinitionSchema);
