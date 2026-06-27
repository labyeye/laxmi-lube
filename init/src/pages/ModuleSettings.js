import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import DynamicForm from "../components/DynamicForm";

const emptyField = {
  label: "",
  key: "",
  type: "text",
  required: false,
  default: "",
  options: "",
  showInForm: true,
  showInList: true,
  roles: "admin,staff",
  status: "active",
  ref: "",
  multi: false,
};

const ModuleSettings = () => {
  const normalizeField = (field) => {
    const showInForm =
      field.showInForm !== undefined
        ? field.showInForm
        : field.visible
        ? field.visible.includes("form")
        : true;
    const showInList =
      field.showInList !== undefined
        ? field.showInList
        : field.visible
        ? field.visible.includes("list")
        : true;

    return {
      ...field,
      options: Array.isArray(field.options)
        ? field.options.join(", ")
        : field.options || "",
      roles: Array.isArray(field.roles) ? field.roles.join(", ") : field.roles || "",
      showInForm,
      showInList,
    };
  };
  const [modules, setModules] = useState([]);
  const [activeModuleId, setActiveModuleId] = useState("");
  const [activeModule, setActiveModule] = useState(null);
  const [fieldDraft, setFieldDraft] = useState(emptyField);
  const [isEditingField, setIsEditingField] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const activeFields = useMemo(() => {
    return (activeModule?.fields || []).slice().sort((a, b) => {
      return (a.order || 0) - (b.order || 0);
    });
  }, [activeModule]);

  useEffect(() => {
    const loadModules = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("http://localhost:2500/api/modules", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("Failed to load modules");
        const data = await response.json();
        setModules(Array.isArray(data) ? data : []);
        if (data?.length) {
          setActiveModuleId(data[0]._id || data[0].key || data[0].name);
        }
      } catch (err) {
        setError(err.message || "Failed to load modules");
      }
    };
    loadModules();
  }, []);

  useEffect(() => {
    const module = modules.find(
      (m) => m._id === activeModuleId || m.key === activeModuleId
    );
    setActiveModule(
      module
        ? { ...module, fields: (module.fields || []).map(normalizeField) }
        : null
    );
    setFieldDraft(emptyField);
    setIsEditingField(false);
  }, [activeModuleId, modules]);

  const handleSelectModule = (moduleId) => {
    setActiveModuleId(moduleId);
    setError("");
    setSuccess("");
  };

  const generateKey = (label) =>
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40);

  const handleFieldDraftChange = (key, value) => {
    setFieldDraft((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "label" && !isEditingField
        ? { key: generateKey(value) }
        : {}),
    }));
  };

  const handleAddField = () => {
    if (!fieldDraft.label || !fieldDraft.key) {
      setError("Field label and key are required");
      return;
    }
    const exists = activeFields.find((f) => f.key === fieldDraft.key);
    if (exists && !isEditingField) {
      setError("A field with this key already exists");
      return;
    }

    const nextFields = isEditingField
      ? activeFields.map((f) => (f.key === fieldDraft.key ? fieldDraft : f))
      : [
          ...activeFields,
          { ...fieldDraft, order: activeFields.length + 1 },
        ];

    updateModuleFields(nextFields);
    setFieldDraft(emptyField);
    setIsEditingField(false);
  };

  const handleEditField = (field) => {
    setFieldDraft({ ...field });
    setIsEditingField(true);
    setError("");
  };

  const handleDisableField = (fieldKey) => {
    const nextFields = activeFields.map((f) =>
      f.key === fieldKey ? { ...f, status: "disabled" } : f
    );
    updateModuleFields(nextFields);
  };

  const moveField = (fieldKey, direction) => {
    const index = activeFields.findIndex((f) => f.key === fieldKey);
    if (index < 0) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activeFields.length) return;

    const reordered = activeFields.slice();
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;

    const normalized = reordered.map((f, idx) => ({ ...f, order: idx + 1 }));
    updateModuleFields(normalized);
  };

  const updateModuleFields = async (fields) => {
    if (!activeModule) return;
    try {
      setError("");
      const token = localStorage.getItem("token");
      const normalizedFields = fields.map((field, index) => {
        const options =
          typeof field.options === "string"
            ? field.options
                .split(",")
                .map((opt) => opt.trim())
                .filter(Boolean)
            : field.options || [];
        const roles =
          typeof field.roles === "string"
            ? field.roles
                .split(",")
                .map((role) => role.trim())
                .filter(Boolean)
            : field.roles || [];
        const visible = [];
        if (field.showInForm !== false) visible.push("form");
        if (field.showInList !== false) visible.push("list");

        return {
          ...field,
          options,
          roles,
          visible,
          order: field.order || index + 1,
        };
      });
      const response = await fetch(
        `http://localhost:2500/api/modules/${activeModule._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ fields: normalizedFields }),
        }
      );
      if (!response.ok) throw new Error("Failed to update module");
      const updated = await response.json();
      setModules((prev) =>
        prev.map((m) => (m._id === updated._id ? updated : m))
      );
      setSuccess("Module updated");
    } catch (err) {
      setError(err.message || "Failed to update module");
    }
  };

  const fieldEditorDefinition = useMemo(
    () => ({
      fields: [
        { key: "label", label: "Label", type: "text", required: true },
        { key: "key", label: "Key", type: "text", required: true },
        {
          key: "type",
          label: "Type",
          type: "dropdown",
          required: true,
          options: [
            "text",
            "number",
            "date",
            "dropdown",
            "multi_select",
            "boolean",
            "relation",
          ],
        },
        {
          key: "required",
          label: "Required",
          type: "boolean",
        },
        {
          key: "default",
          label: "Default",
          type: "text",
        },
        {
          key: "options",
          label: "Options (comma separated)",
          type: "text",
        },
        {
          key: "showInForm",
          label: "Show In Form",
          type: "boolean",
        },
        {
          key: "showInList",
          label: "Show In List",
          type: "boolean",
        },
        {
          key: "roles",
          label: "Roles (comma separated)",
          type: "text",
        },
        {
          key: "status",
          label: "Status",
          type: "dropdown",
          options: ["active", "disabled"],
        },
        {
          key: "ref",
          label: "Relation Module Key",
          type: "text",
        },
        {
          key: "multi",
          label: "Multi Select",
          type: "boolean",
        },
      ],
    }),
    []
  );

  return (
    <>
      <PageHeader>Settings · Modules</PageHeader>

      <SettingsGrid>
        <ModuleList>
          <SectionTitle>Modules</SectionTitle>
          {modules.map((mod) => (
            <ModuleButton
              key={mod._id}
              active={mod._id === activeModuleId}
              onClick={() => handleSelectModule(mod._id)}
            >
              {mod.name || mod._id}
            </ModuleButton>
          ))}
        </ModuleList>

        <ModulePanel>
          <SectionTitle>Fields</SectionTitle>
          {activeModule ? (
            <>
              <FieldTable>
                <thead>
                  <tr>
                    <th>Label</th>
                    <th>Key</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Order</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeFields.map((field, index) => (
                    <tr key={field.key}>
                      <td>{field.label}</td>
                      <td>{field.key}</td>
                      <td>{field.type}</td>
                      <td>{field.status}</td>
                      <td>{index + 1}</td>
                      <td>
                        <ActionRow>
                          <SmallButton onClick={() => handleEditField(field)}>
                            Edit
                          </SmallButton>
                          <SmallButton
                            onClick={() => handleDisableField(field.key)}
                          >
                            Disable
                          </SmallButton>
                          <SmallButton
                            onClick={() => moveField(field.key, "up")}
                          >
                            ↑
                          </SmallButton>
                          <SmallButton
                            onClick={() => moveField(field.key, "down")}
                          >
                            ↓
                          </SmallButton>
                        </ActionRow>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </FieldTable>

              <SectionTitle>Field Builder</SectionTitle>
              <DynamicForm
                moduleDefinition={fieldEditorDefinition}
                values={fieldDraft}
                onChange={handleFieldDraftChange}
                submitLabel={isEditingField ? "Update Field" : "Add Field"}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddField();
                }}
              />
            </>
          ) : (
            <EmptyState>Select a module to edit fields.</EmptyState>
          )}

          {error && <ErrorMessage>{error}</ErrorMessage>}
          {success && <SuccessMessage>{success}</SuccessMessage>}
        </ModulePanel>
      </SettingsGrid>
    </>
  );
};

const SettingsGrid = styled.div`
  display: grid;
  grid-template-columns: 260px 1fr;
  gap: 1.5rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const PageHeader = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: var(--nb-ink);
`;

const ModuleList = styled.div`
  background: var(--nb-white);
  border: 1px solid var(--nb-border);
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: var(--nb-shadow-md);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const ModuleButton = styled.button`
  padding: 0.6rem 0.75rem;
  border-radius: 0.4rem;
  border: 1px solid var(--nb-border);
  background: ${(props) => (props.active ? "var(--nb-blue)" : "var(--nb-white)")};
  color: ${(props) => (props.active ? "var(--nb-white)" : "var(--nb-ink)")};
  font-weight: 600;
  text-align: left;
  cursor: pointer;
`;

const ModulePanel = styled.div`
  background: var(--nb-white);
  border: 1px solid var(--nb-border);
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: var(--nb-shadow-md);
`;

const SectionTitle = styled.h2`
  font-size: 1.1rem;
  color: var(--nb-ink);
  margin-bottom: 0.75rem;
`;

const FieldTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;

  th,
  td {
    padding: 0.6rem;
    border-bottom: 1px solid var(--nb-border);
    text-align: left;
  }

  th {
    background: var(--nb-muted);
  }
`;

const ActionRow = styled.div`
  display: flex;
  gap: 0.4rem;
`;

const SmallButton = styled.button`
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--nb-border);
  background: var(--nb-white);
  cursor: pointer;
  border-radius: 0.25rem;
`;

const ErrorMessage = styled.div`
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--nb-muted);
  color: var(--nb-orange);
  border-radius: 0.4rem;
`;

const SuccessMessage = styled.div`
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--nb-muted);
  color: var(--nb-blue);
  border-radius: 0.4rem;
`;

const EmptyState = styled.div`
  padding: 1rem;
  color: var(--nb-ink);
`;

export default ModuleSettings;
