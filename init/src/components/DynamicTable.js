import React, { useMemo } from "react";
import styled from "styled-components";

const isVisibleForRole = (field, role) => {
  if (!field.roles || field.roles.length === 0) return true;
  return field.roles.includes(role);
};

const isVisibleForView = (field, view) => {
  if (field.showInForm !== undefined || field.showInList !== undefined) {
    return view === "form"
      ? field.showInForm !== false
      : field.showInList !== false;
  }
  if (!field.visible || field.visible.length === 0) return true;
  return field.visible.includes(view);
};

const DynamicTable = ({
  moduleDefinition,
  records = [],
  role = "admin",
  onRowClick,
}) => {
  const columns = useMemo(() => {
    const raw = moduleDefinition?.fields || [];
    return raw
      .filter((field) => field.status !== "disabled")
      .filter((field) => isVisibleForRole(field, role))
      .filter((field) => isVisibleForView(field, "list"))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [moduleDefinition, role]);

  return (
    <Table>
      <thead>
        <tr>
          {columns.map((field) => (
            <th key={field.key}>{field.label || field.key}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {records.length === 0 ? (
          <tr>
            <td colSpan={columns.length || 1}>No records found</td>
          </tr>
        ) : (
          records.map((record) => (
            <tr
              key={record._id || record.id}
              onClick={() => onRowClick?.(record)}
              role={onRowClick ? "button" : undefined}
            >
              {columns.map((field) => (
                <td key={`${record._id || record.id}-${field.key}`}>
                  {formatValue(record?.data?.[field.key], field)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </Table>
  );
};

const formatValue = (value, field) => {
  if (value === undefined || value === null || value === "") return "—";
  if (field.type === "boolean") {
    return <Badge $active={value}>{value ? "Yes" : "No"}</Badge>;
  }
  if (field.type === "status" || field.key.toLowerCase().includes("status")) {
    return <Badge $status={value}>{value}</Badge>;
  }
  if (field.type === "relation" && Array.isArray(field.options || [])) {
    if (Array.isArray(value)) {
      return value
        .map((val) => {
          const match = field.options.find((opt) => (opt.value ?? opt) === val);
          return match?.label || match || val;
        })
        .join(", ");
    }
    const match = field.options.find((opt) => (opt.value ?? opt) === value);
    return match?.label || match || value;
  }
  if (Array.isArray(value)) return value.join(", ");
  return value;
};

const Badge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
  white-space: nowrap;
  background-color: ${(props) => {
    if (props.$active === true) return "rgba(16, 185, 129, 0.1)";
    if (props.$active === false) return "rgba(239, 68, 68, 0.1)";
    const status = String(props.$status || "").toLowerCase();
    if (["paid", "completed", "approved", "delivered"].includes(status))
      return "rgba(16, 185, 129, 0.1)";
    if (["pending", "processing", "partially paid"].includes(status))
      return "rgba(245, 158, 11, 0.1)";
    if (["unpaid", "failed", "rejected", "cancelled"].includes(status))
      return "rgba(239, 68, 68, 0.1)";
    return "var(--nb-muted)";
  }};
  color: ${(props) => {
    if (props.$active === true) return "rgb(16, 185, 129)";
    if (props.$active === false) return "rgb(239, 68, 68)";
    const status = String(props.$status || "").toLowerCase();
    if (["paid", "completed", "approved", "delivered"].includes(status))
      return "rgb(16, 185, 129)";
    if (["pending", "processing", "partially paid"].includes(status))
      return "rgb(245, 158, 11)";
    if (["unpaid", "failed", "rejected", "cancelled"].includes(status))
      return "rgb(239, 68, 68)";
    return "var(--nb-ink)";
  }};
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;

  th,
  td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--nb-border);
    text-align: left;
  }

  th {
    background: var(--nb-muted);
    font-weight: 600;
    color: var(--nb-text-secondary);
  }

  tbody tr:hover {
    background: var(--nb-muted);
  }
`;

export default DynamicTable;
