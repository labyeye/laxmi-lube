const mongoose = require("mongoose");

const FIELD_TYPES = new Set([
  "text",
  "number",
  "date",
  "dropdown",
  "multi_select",
  "boolean",
  "relation",
]);

const isEmpty = (value) =>
  value === undefined || value === null || value === "";

const normalizeValue = (field, value) => {
  if (isEmpty(value)) return null;

  switch (field.type) {
    case "text":
      return String(value);
    case "number": {
      const num = Number(value);
      return Number.isNaN(num) ? null : num;
    }
    case "date": {
      const date =
        value instanceof Date ? value : new Date(String(value));
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    }
    case "dropdown":
      return String(value);
    case "multi_select":
      return Array.isArray(value) ? value : [value];
    case "boolean":
      return Boolean(value);
    case "relation":
      if (field.multi) {
        return Array.isArray(value) ? value : [value];
      }
      return String(value);
    default:
      return value;
  }
};

const isFieldVisibleToRole = (field, role) => {
  if (role === "admin") return true;
  if (!Array.isArray(field.roles) || field.roles.length === 0) return false;
  return field.roles.includes(role);
};

const validateRecordPayload = ({
  moduleDef,
  data,
  role,
  isUpdate = false,
}) => {
  const errors = {};
  const normalizedData = {};

  if (!moduleDef) {
    return {
      errors: { module: "Module definition not found" },
      normalizedData: {},
    };
  }

  const fields = Array.isArray(moduleDef.fields) ? moduleDef.fields : [];

  for (const field of fields) {
    const fieldKey = field.key;
    const fieldStatus = field.status || "active";

    if (!FIELD_TYPES.has(field.type)) {
      errors[fieldKey] = "Unsupported field type";
      continue;
    }

    const isVisibleToRole = isFieldVisibleToRole(field, role);
    if (!isVisibleToRole) {
      continue;
    }

    const incomingValue = data?.[fieldKey];
    const hasValue = !isEmpty(incomingValue);

    if (!isUpdate && field.required && fieldStatus !== "disabled" && !hasValue) {
      errors[fieldKey] = `${field.label || field.key} is required`;
      continue;
    }

    if (hasValue) {
      const normalized = normalizeValue(field, incomingValue);
      if (normalized === null) {
        errors[fieldKey] = `${field.label || field.key} is invalid`;
        continue;
      }

      if (field.type === "dropdown" && Array.isArray(field.options)) {
        if (!field.options.includes(normalized)) {
          errors[fieldKey] = `${field.label || field.key} must be a valid option`;
          continue;
        }
      }

      if (field.type === "multi_select" && Array.isArray(field.options)) {
        const invalid = normalized.filter(
          (item) => !field.options.includes(item)
        );
        if (invalid.length > 0) {
          errors[fieldKey] = `${field.label || field.key} has invalid options`;
          continue;
        }
      }

      if (field.type === "relation") {
        const values = field.multi ? normalized : [normalized];
        const invalidIds = values.filter(
          (val) => !mongoose.Types.ObjectId.isValid(val)
        );
        if (invalidIds.length > 0) {
          errors[fieldKey] = `${field.label || field.key} has invalid relation`;
          continue;
        }
      }

      normalizedData[fieldKey] = normalized;
    } else if (!isUpdate && field.default !== undefined && field.default !== null) {
      normalizedData[fieldKey] = field.default;
    }
  }

  return { errors, normalizedData };
};

const filterModuleDefinitionForRole = (moduleDef, role) => {
  if (!moduleDef) return null;
  const filtered = moduleDef.toObject ? moduleDef.toObject() : { ...moduleDef };
  const isAdmin = role === "admin";
  filtered.fields = (filtered.fields || []).filter((field) => {
    if (isAdmin) return true;
    return field.status !== "disabled" && isFieldVisibleToRole(field, role);
  });
  return filtered;
};

const filterRecordDataForRole = (moduleDef, record, role) => {
  if (!moduleDef || !record) return record;
  const isAdmin = role === "admin";
  const allowedFields = new Set(
    (moduleDef.fields || [])
      .filter((field) => {
        if (isAdmin) return true;
        return field.status !== "disabled" && isFieldVisibleToRole(field, role);
      })
      .map((field) => field.key)
  );
  const filteredData = {};
  for (const key of Object.keys(record.data || {})) {
    if (allowedFields.has(key)) {
      filteredData[key] = record.data[key];
    }
  }
  return { ...record, data: filteredData };
};

module.exports = {
  validateRecordPayload,
  filterModuleDefinitionForRole,
  filterRecordDataForRole,
  isFieldVisibleToRole,
};
