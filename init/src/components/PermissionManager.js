import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { FaShieldAlt, FaCheck, FaUsers } from "react-icons/fa";

// allStaff: [{ _id, name }] — full staff list passed from parent
// targetUserId: the user whose permissions are being edited (to exclude from viewable list)
const PermissionManager = ({
  userId,
  currentPermissions,
  onUpdate,
  allStaff = [],
  targetUserId,
}) => {
  const [activeTab, setActiveTab] = useState("permissions"); // "permissions" | "collectionTaker"
  const [permissions, setPermissions] = useState({
    dashboard: { view: true },
    bills: {
      view: true,
      create: false,
      edit: false,
      delete: false,
      assign: false,
    },
    collections: {
      view: true,
      create: true,
      edit: false,
      delete: false,
      verify: false,
    },
    products: { view: true, create: false, edit: false, delete: false },
    retailers: { view: true, create: false, edit: false, delete: false },
    orders: {
      view: true,
      create: true,
      edit: false,
      delete: false,
      approve: false,
    },
    users: { view: false, create: false, edit: false, delete: false },
    reports: { view: true, export: false },
    salary: { view: false, create: false, edit: false, delete: false },
    advances: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, edit: false },
  });

  // Staff IDs this user can view collections of (in addition to their own)
  const [viewableStaff, setViewableStaff] = useState([]);

  const [selectedTemplate, setSelectedTemplate] = useState("custom");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (currentPermissions) {
      setPermissions((defaults) => {
        const merged = {};
        Object.keys(defaults).forEach((module) => {
          const stored = currentPermissions[module];
          merged[module] =
            stored && typeof stored === "object"
              ? { ...defaults[module], ...stored }
              : { ...defaults[module] };
        });
        return merged;
      });

      // Load viewableStaff — could be array of IDs or populated objects
      const vs = currentPermissions?.collections?.viewableStaff || [];
      setViewableStaff(
        vs.map((s) => (typeof s === "object" ? String(s._id) : String(s))),
      );
    }
  }, [currentPermissions]);

  const permissionTemplates = {
    fullAccess: {
      name: "Full Access",
      description: "All permissions enabled",
      permissions: {
        dashboard: { view: true },
        bills: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          assign: true,
        },
        collections: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          verify: true,
        },
        products: { view: true, create: true, edit: true, delete: true },
        retailers: { view: true, create: true, edit: true, delete: true },
        orders: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          approve: true,
        },
        users: { view: true, create: true, edit: true, delete: true },
        reports: { view: true, export: true },
        salary: { view: true, create: true, edit: true, delete: true },
        advances: { view: true, create: true, edit: true, delete: true },
        settings: { view: true, edit: true },
      },
    },
    fieldStaff: {
      name: "Field Staff (DSR)",
      description: "Collection and order management",
      permissions: {
        dashboard: { view: true },
        bills: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          assign: false,
        },
        collections: {
          view: true,
          create: true,
          edit: false,
          delete: false,
          verify: false,
        },
        products: { view: true, create: false, edit: false, delete: false },
        retailers: { view: true, create: false, edit: false, delete: false },
        orders: {
          view: true,
          create: true,
          edit: false,
          delete: false,
          approve: false,
        },
        users: { view: false, create: false, edit: false, delete: false },
        reports: { view: true, export: false },
        salary: { view: false, create: false, edit: false, delete: false },
        advances: { view: false, create: false, edit: false, delete: false },
        settings: { view: false, edit: false },
      },
    },
    supervisor: {
      name: "Supervisor",
      description: "View and approve operations",
      permissions: {
        dashboard: { view: true },
        bills: {
          view: true,
          create: true,
          edit: true,
          delete: false,
          assign: true,
        },
        collections: {
          view: true,
          create: true,
          edit: true,
          delete: false,
          verify: true,
        },
        products: { view: true, create: true, edit: true, delete: false },
        retailers: { view: true, create: true, edit: true, delete: false },
        orders: {
          view: true,
          create: true,
          edit: true,
          delete: false,
          approve: true,
        },
        users: { view: true, create: false, edit: false, delete: false },
        reports: { view: true, export: true },
        salary: { view: true, create: false, edit: false, delete: false },
        advances: { view: true, create: true, edit: false, delete: false },
        settings: { view: false, edit: false },
      },
    },
    viewOnly: {
      name: "View Only",
      description: "Read-only access to all modules",
      permissions: {
        dashboard: { view: true },
        bills: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          assign: false,
        },
        collections: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          verify: false,
        },
        products: { view: true, create: false, edit: false, delete: false },
        retailers: { view: true, create: false, edit: false, delete: false },
        orders: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
        },
        users: { view: false, create: false, edit: false, delete: false },
        reports: { view: true, export: false },
        salary: { view: false, create: false, edit: false, delete: false },
        advances: { view: false, create: false, edit: false, delete: false },
        settings: { view: false, edit: false },
      },
    },
    collectionVerifier: {
      name: "Collection Verifier",
      description: "Can only verify or reject staff collections",
      permissions: {
        dashboard: { view: true },
        bills: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          assign: false,
        },
        collections: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          verify: true,
        },
        products: { view: false, create: false, edit: false, delete: false },
        retailers: { view: true, create: false, edit: false, delete: false },
        orders: {
          view: false,
          create: false,
          edit: false,
          delete: false,
          approve: false,
        },
        users: { view: false, create: false, edit: false, delete: false },
        reports: { view: false, export: false },
        salary: { view: false, create: false, edit: false, delete: false },
        advances: { view: false, create: false, edit: false, delete: false },
        settings: { view: false, edit: false },
      },
    },
    accountant: {
      name: "Accountant",
      description: "Financial and salary management",
      permissions: {
        dashboard: { view: true },
        bills: {
          view: true,
          create: true,
          edit: true,
          delete: false,
          assign: false,
        },
        collections: {
          view: true,
          create: true,
          edit: true,
          delete: false,
          verify: true,
        },
        products: { view: true, create: false, edit: false, delete: false },
        retailers: { view: true, create: false, edit: false, delete: false },
        orders: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          approve: false,
        },
        users: { view: false, create: false, edit: false, delete: false },
        reports: { view: true, export: true },
        salary: { view: true, create: true, edit: true, delete: false },
        advances: { view: true, create: true, edit: true, delete: false },
        settings: { view: false, edit: false },
      },
    },
  };

  const moduleLabels = {
    dashboard: "Dashboard",
    bills: "Bills",
    collections: "Collections",
    products: "Products",
    retailers: "Retailers",
    orders: "Orders",
    users: "User Management",
    reports: "Reports",
    salary: "Salary",
    advances: "Advances",
    settings: "Settings",
  };

  const actionLabels = {
    view: "View",
    create: "Create",
    edit: "Edit",
    delete: "Delete",
    assign: "Assign",
    approve: "Approve",
    export: "Export",
    verify: "Verify Collections",
  };

  const handlePermissionChange = (module, action, value) => {
    setPermissions((prev) => ({
      ...prev,
      [module]: { ...prev[module], [action]: value },
    }));
    setSelectedTemplate("custom");
  };

  const applyTemplate = (templateKey) => {
    if (templateKey === "custom") return;
    setPermissions(permissionTemplates[templateKey].permissions);
    setSelectedTemplate(templateKey);
  };

  const toggleViewableStaff = (staffId) => {
    setViewableStaff((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId],
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Merge viewableStaff back into the collections permission before saving
      const permissionsToSave = {
        ...permissions,
        collections: {
          ...permissions.collections,
          viewableStaff,
        },
      };
      await onUpdate(userId, permissionsToSave);
      setMessage("Permissions updated successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Error updating permissions");
      setTimeout(() => setMessage(""), 3000);
    } finally {
      setSaving(false);
    }
  };

  const toggleModuleAll = (module) => {
    const allEnabled = Object.values(permissions[module]).every(
      (val) => val === true,
    );
    const newModulePerms = {};
    Object.keys(permissions[module]).forEach((action) => {
      newModulePerms[action] = !allEnabled;
    });
    setPermissions((prev) => ({ ...prev, [module]: newModulePerms }));
    setSelectedTemplate("custom");
  };

  // Staff list excluding the user being edited (they always see their own)
  const otherStaff = allStaff.filter(
    (s) => String(s._id) !== String(targetUserId || userId),
  );

  return (
    <Container>
      <Header>
        <HeaderIcon>
          <FaShieldAlt />
        </HeaderIcon>
        <div>
          <Title>Permission Management</Title>
          <Subtitle>Control what this user can access and modify</Subtitle>
        </div>
      </Header>

      {message && <Message>{message}</Message>}

      {/* Tab bar */}
      <TabBar>
        <Tab
          $active={activeTab === "permissions"}
          onClick={() => setActiveTab("permissions")}
        >
          <FaShieldAlt /> Module Permissions
        </Tab>
        <Tab
          $active={activeTab === "collectionTaker"}
          onClick={() => setActiveTab("collectionTaker")}
        >
          <FaUsers /> Collection Taker
        </Tab>
      </TabBar>

      {activeTab === "permissions" && (
        <>
          <TemplateSection>
            <TemplateLabel>Quick Templates:</TemplateLabel>
            <TemplateGrid>
              <TemplateCard
                $active={selectedTemplate === "custom"}
                onClick={() => setSelectedTemplate("custom")}
              >
                <TemplateName>Custom</TemplateName>
                <TemplateDescription>Manually configured</TemplateDescription>
              </TemplateCard>
              {Object.entries(permissionTemplates).map(([key, template]) => (
                <TemplateCard
                  key={key}
                  $active={selectedTemplate === key}
                  onClick={() => applyTemplate(key)}
                >
                  <TemplateName>{template.name}</TemplateName>
                  <TemplateDescription>
                    {template.description}
                  </TemplateDescription>
                </TemplateCard>
              ))}
            </TemplateGrid>
          </TemplateSection>

          <PermissionsGrid>
            {Object.entries(permissions).map(([module, actions]) => (
              <ModuleCard key={module}>
                <ModuleHeader onClick={() => toggleModuleAll(module)}>
                  <ModuleName>{moduleLabels[module]}</ModuleName>
                  <ModuleToggleHint>Click to toggle all</ModuleToggleHint>
                </ModuleHeader>
                <PermissionsList>
                  {Object.entries(actions).map(([action, value]) => (
                    <PermissionItem key={action}>
                      <PermissionLabel>
                        <Checkbox
                          type="checkbox"
                          checked={value}
                          onChange={(e) =>
                            handlePermissionChange(
                              module,
                              action,
                              e.target.checked,
                            )
                          }
                        />
                        <CheckboxCustom $checked={value}>
                          {value && <FaCheck />}
                        </CheckboxCustom>
                        {actionLabels[action]}
                      </PermissionLabel>
                    </PermissionItem>
                  ))}
                </PermissionsList>
              </ModuleCard>
            ))}
          </PermissionsGrid>
        </>
      )}

      {activeTab === "collectionTaker" && (
        <CollectionTakerSection>
          <CTTitle>Whose collections can this staff member view?</CTTitle>
          <CTSubtitle>
            This staff member always sees their own collections. Select
            additional staff members below.
          </CTSubtitle>

          {otherStaff.length === 0 ? (
            <CTEmpty>No other staff members found.</CTEmpty>
          ) : (
            <CTStaffList>
              {otherStaff.map((s) => {
                const checked = viewableStaff.includes(String(s._id));
                return (
                  <CTStaffRow
                    key={s._id}
                    $checked={checked}
                    onClick={() => toggleViewableStaff(String(s._id))}
                  >
                    <CTCheckbox $checked={checked}>
                      {checked && <FaCheck />}
                    </CTCheckbox>
                    <CTStaffName>{s.name}</CTStaffName>
                    {checked && <CTBadge>Can view</CTBadge>}
                  </CTStaffRow>
                );
              })}
            </CTStaffList>
          )}

          {viewableStaff.length > 0 && (
            <CTSummary>
              This staff member can view collections from{" "}
              <strong>
                {[
                  "themselves",
                  ...viewableStaff
                    .map(
                      (id) => allStaff.find((s) => String(s._id) === id)?.name,
                    )
                    .filter(Boolean),
                ].join(", ")}
              </strong>
            </CTSummary>
          )}
        </CollectionTakerSection>
      )}

      <SaveButton onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Permissions"}
      </SaveButton>
    </Container>
  );
};

export default PermissionManager;

// Styled Components
const Container = styled.div`
  padding: 1.5rem;
  background: var(--nb-white);
  border-radius: 0.75rem;
  box-shadow: var(--nb-shadow-md);
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--nb-border);
`;

const HeaderIcon = styled.div`
  width: 48px;
  height: 48px;
  background: var(--nb-muted);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--nb-orange);
  font-size: 1.5rem;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  color: var(--nb-ink);
  margin: 0;
  font-weight: 600;
`;

const Subtitle = styled.p`
  font-size: 0.9rem;
  color: var(--nb-ink);
  opacity: 0.7;
  margin: 0.25rem 0 0 0;
`;

const Message = styled.div`
  padding: 1rem;
  background: var(--nb-muted);
  color: var(--nb-blue);
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
  border-left: 4px solid var(--nb-blue);
`;

const TabBar = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid var(--nb-border);
`;

const Tab = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.1rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${(p) => (p.$active ? "var(--nb-blue)" : "var(--nb-ink)")};
  border-bottom: 2.5px solid
    ${(p) => (p.$active ? "var(--nb-blue)" : "transparent")};
  margin-bottom: -2px;
  transition: color 0.2s;
  &:hover {
    color: var(--nb-blue);
  }
`;

const TemplateSection = styled.div`
  margin-bottom: 2rem;
`;

const TemplateLabel = styled.h3`
  font-size: 1rem;
  color: var(--nb-ink);
  margin-bottom: 1rem;
  font-weight: 600;
`;

const TemplateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
`;

const TemplateCard = styled.div`
  padding: 1rem;
  border: 1px solid
    ${(props) => (props.$active ? "var(--nb-orange)" : "var(--nb-border)")};
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${(props) =>
    props.$active ? "var(--nb-muted)" : "var(--nb-white)"};
  &:hover {
    border-color: var(--nb-orange);
    transform: translateY(-2px);
    box-shadow: var(--nb-shadow-md);
  }
`;

const TemplateName = styled.div`
  font-weight: 600;
  color: var(--nb-ink);
  margin-bottom: 0.25rem;
`;

const TemplateDescription = styled.div`
  font-size: 0.85rem;
  color: var(--nb-ink);
  opacity: 0.7;
`;

const PermissionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const ModuleCard = styled.div`
  border: 1px solid var(--nb-border);
  border-radius: 0.5rem;
  overflow: hidden;
  transition: all 0.3s ease;
  &:hover {
    box-shadow: var(--nb-shadow-md);
    border-color: var(--nb-orange);
  }
`;

const ModuleHeader = styled.div`
  background: var(--nb-muted);
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover {
    background: var(--nb-border);
  }
`;

const ModuleName = styled.h4`
  font-size: 1rem;
  color: var(--nb-ink);
  margin: 0;
  font-weight: 600;
`;

const ModuleToggleHint = styled.div`
  font-size: 0.75rem;
  color: var(--nb-ink);
  opacity: 0.6;
  margin-top: 0.25rem;
`;

const PermissionsList = styled.div`
  padding: 1rem;
`;

const PermissionItem = styled.div`
  margin-bottom: 0.75rem;
  &:last-child {
    margin-bottom: 0;
  }
`;

const PermissionLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  color: var(--nb-ink);
  font-size: 0.9rem;
  transition: color 0.2s ease;
  &:hover {
    color: var(--nb-orange);
  }
`;

const Checkbox = styled.input`
  position: absolute;
  opacity: 0;
  cursor: pointer;
`;

const CheckboxCustom = styled.div`
  width: 20px;
  height: 20px;
  border: 1px solid
    ${(props) => (props.$checked ? "var(--nb-blue)" : "var(--nb-border)")};
  border-radius: 0.25rem;
  background: ${(props) =>
    props.$checked ? "var(--nb-blue)" : "var(--nb-white)"};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: var(--nb-white);
  font-size: 0.7rem;
  ${Checkbox}:hover + & {
    border-color: var(--nb-orange);
  }
`;

const SaveButton = styled.button`
  width: 100%;
  padding: 1rem;
  background: var(--nb-blue);
  color: var(--nb-white);
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1.5rem;
  &:hover:not(:disabled) {
    background: var(--nb-orange);
    transform: translateY(-2px);
    box-shadow: var(--nb-shadow-md);
  }
  &:disabled {
    background: var(--nb-border);
    cursor: not-allowed;
  }
`;

// Collection Taker tab styles
const CollectionTakerSection = styled.div`
  margin-bottom: 1rem;
`;

const CTTitle = styled.h3`
  font-size: 1rem;
  font-weight: 700;
  color: var(--nb-ink);
  margin: 0 0 0.35rem 0;
`;

const CTSubtitle = styled.p`
  font-size: 0.85rem;
  color: var(--nb-ink);
  opacity: 0.65;
  margin: 0 0 1.25rem 0;
`;

const CTEmpty = styled.div`
  padding: 2rem;
  text-align: center;
  color: var(--nb-ink);
  opacity: 0.5;
  font-size: 0.9rem;
`;

const CTStaffList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const CTStaffRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.7rem 1rem;
  border: 1.5px solid
    ${(p) => (p.$checked ? "var(--nb-blue)" : "var(--nb-border)")};
  border-radius: 8px;
  background: ${(p) => (p.$checked ? "#eff6ff" : "var(--nb-white)")};
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    border-color: var(--nb-blue);
    background: #eff6ff;
  }
`;

const CTCheckbox = styled.div`
  width: 20px;
  height: 20px;
  min-width: 20px;
  border: 1.5px solid
    ${(p) => (p.$checked ? "var(--nb-blue)" : "var(--nb-border)")};
  border-radius: 4px;
  background: ${(p) => (p.$checked ? "var(--nb-blue)" : "transparent")};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.65rem;
  transition: all 0.15s;
`;

const CTStaffName = styled.span`
  flex: 1;
  font-size: 0.92rem;
  font-weight: 500;
  color: var(--nb-ink);
`;

const CTBadge = styled.span`
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--nb-blue);
  background: #dbeafe;
  padding: 0.2rem 0.55rem;
  border-radius: 20px;
`;

const CTSummary = styled.div`
  margin-top: 1.25rem;
  padding: 0.85rem 1rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  font-size: 0.85rem;
  color: #166534;
  line-height: 1.5;
`;
