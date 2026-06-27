import React from "react";
import styled from "styled-components";
import { usePermissions } from "../hooks/usePermissions";
import ProtectedComponent, {
  AdminOnly,
  HasAnyPermission,
} from "../components/ProtectedComponent";
import { FaPlus, FaEdit, FaTrash, FaFileExport, FaLock } from "react-icons/fa";

/**
 * Example component demonstrating various ways to use the permission system
 * This is a reference implementation - copy patterns from here to other components
 */
const PermissionExamplePage = () => {
  const {
    user,
    hasPermission,
    canAccessModule,
    getModulePermissions,
    isAdmin,
  } = usePermissions();

  // Example 1: Direct permission check
  const canCreateBills = hasPermission("bills", "create");
  const canEditBills = hasPermission("bills", "edit");
  const canDeleteBills = hasPermission("bills", "delete");

  // Example 2: Get all module permissions
  const billPermissions = getModulePermissions("bills");

  // Example 3: Check module access
  const canAccessReports = canAccessModule("reports");

  return (
    <Container>
      <Header>
        <h1>Permission System Examples</h1>
        <UserInfo>
          <span>
            Logged in as: <strong>{user?.name}</strong>
          </span>
          <RoleBadge $role={user?.role}>{user?.role}</RoleBadge>
        </UserInfo>
      </Header>

      {/* Example 1: Using hasPermission in conditional rendering */}
      <Section>
        <SectionTitle>Example 1: Direct Permission Checks</SectionTitle>
        <ButtonGroup>
          {canCreateBills && (
            <ActionButton $color="green">
              <FaPlus /> Create Bill
            </ActionButton>
          )}
          {canEditBills && (
            <ActionButton $color="blue">
              <FaEdit /> Edit Bill
            </ActionButton>
          )}
          {canDeleteBills && (
            <ActionButton $color="red">
              <FaTrash /> Delete Bill
            </ActionButton>
          )}
          {!canCreateBills && !canEditBills && !canDeleteBills && (
            <NoPermissionMessage>
              <FaLock /> You don't have any write permissions for bills
            </NoPermissionMessage>
          )}
        </ButtonGroup>
      </Section>

      {/* Example 2: Using ProtectedComponent wrapper */}
      <Section>
        <SectionTitle>Example 2: Protected Component Wrapper</SectionTitle>
        <ButtonGroup>
          <ProtectedComponent
            module="products"
            action="create"
            fallback={
              <LockedButton>
                <FaLock /> Create Product (Locked)
              </LockedButton>
            }
          >
            <ActionButton $color="green">
              <FaPlus /> Create Product
            </ActionButton>
          </ProtectedComponent>

          <ProtectedComponent module="products" action="edit">
            <ActionButton $color="blue">
              <FaEdit /> Edit Product
            </ActionButton>
          </ProtectedComponent>

          <ProtectedComponent module="products" action="delete">
            <ActionButton $color="red">
              <FaTrash /> Delete Product
            </ActionButton>
          </ProtectedComponent>
        </ButtonGroup>
      </Section>

      {/* Example 3: Admin-only content */}
      <Section>
        <SectionTitle>Example 3: Admin-Only Content</SectionTitle>
        <AdminOnly
          fallback={<InfoMessage>Admin-only features are hidden</InfoMessage>}
        >
          <AdminPanel>
            <h3>🔐 Admin Control Panel</h3>
            <p>This section is only visible to administrators</p>
            <ButtonGroup>
              <ActionButton $color="purple">User Management</ActionButton>
              <ActionButton $color="purple">System Settings</ActionButton>
              <ActionButton $color="purple">Audit Logs</ActionButton>
            </ButtonGroup>
          </AdminPanel>
        </AdminOnly>
      </Section>

      {/* Example 4: Multiple permission checks */}
      <Section>
        <SectionTitle>Example 4: Multiple Permission Checks</SectionTitle>
        <HasAnyPermission
          permissions={[
            { module: "reports", action: "view" },
            { module: "reports", action: "export" },
          ]}
          fallback={<InfoMessage>You don't have access to reports</InfoMessage>}
        >
          <ReportSection>
            <h3>📊 Reports</h3>
            <ButtonGroup>
              {hasPermission("reports", "view") && (
                <ActionButton $color="blue">View Reports</ActionButton>
              )}
              {hasPermission("reports", "export") && (
                <ActionButton $color="green">
                  <FaFileExport /> Export Reports
                </ActionButton>
              )}
            </ButtonGroup>
          </ReportSection>
        </HasAnyPermission>
      </Section>

      {/* Example 5: Displaying current permissions */}
      <Section>
        <SectionTitle>
          Example 5: Current User Permissions for Bills Module
        </SectionTitle>
        <PermissionTable>
          <thead>
            <tr>
              <th>Action</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(billPermissions).map(([action, allowed]) => (
              <tr key={action}>
                <td>{action}</td>
                <td>
                  <StatusBadge $allowed={allowed}>
                    {allowed ? "✓ Allowed" : "✗ Denied"}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </PermissionTable>
      </Section>

      {/* Example 6: Feature flags based on permissions */}
      <Section>
        <SectionTitle>Example 6: Feature Availability</SectionTitle>
        <FeatureGrid>
          <FeatureCard $available={canAccessModule("dashboard")}>
            <FeatureIcon>📊</FeatureIcon>
            <FeatureName>Dashboard</FeatureName>
            <FeatureStatus $available={canAccessModule("dashboard")}>
              {canAccessModule("dashboard") ? "Available" : "Locked"}
            </FeatureStatus>
          </FeatureCard>

          <FeatureCard $available={canAccessModule("bills")}>
            <FeatureIcon>📄</FeatureIcon>
            <FeatureName>Bills</FeatureName>
            <FeatureStatus $available={canAccessModule("bills")}>
              {canAccessModule("bills") ? "Available" : "Locked"}
            </FeatureStatus>
          </FeatureCard>

          <FeatureCard $available={canAccessModule("collections")}>
            <FeatureIcon>💰</FeatureIcon>
            <FeatureName>Collections</FeatureName>
            <FeatureStatus $available={canAccessModule("collections")}>
              {canAccessModule("collections") ? "Available" : "Locked"}
            </FeatureStatus>
          </FeatureCard>

          <FeatureCard $available={canAccessModule("users")}>
            <FeatureIcon>👥</FeatureIcon>
            <FeatureName>User Management</FeatureName>
            <FeatureStatus $available={canAccessModule("users")}>
              {canAccessModule("users") ? "Available" : "Locked"}
            </FeatureStatus>
          </FeatureCard>
        </FeatureGrid>
      </Section>

      {/* Example 7: Role-based messaging */}
      <Section>
        <SectionTitle>Example 7: Role-Based Information</SectionTitle>
        <InfoPanel>
          {isAdmin && (
            <AdminInfo>
              <h4>👑 Administrator</h4>
              <p>You have full access to all features and settings.</p>
            </AdminInfo>
          )}
          {user?.role === "staff" && (
            <StaffInfo>
              <h4>🚚 Staff Member</h4>
              <p>
                Your permissions are configured by the administrator. Contact
                them to request access changes.
              </p>
            </StaffInfo>
          )}
          {user?.role === "retailer" && (
            <RetailerInfo>
              <h4>🏪 Retailer</h4>
              <p>You have access to your bills, orders, and payment history.</p>
            </RetailerInfo>
          )}
        </InfoPanel>
      </Section>
    </Container>
  );
};

export default PermissionExamplePage;

// Styled Components
const Container = styled.div`
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--nb-border);

  h1 {
    color: var(--nb-ink);
    margin: 0;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  span {
    color: var(--nb-ink);
  }
`;

const RoleBadge = styled.span`
  background: ${(props) =>
    props.$role === "admin"
      ? "var(--nb-blue)"
      : props.$role === "staff"
        ? "var(--nb-orange)"
        : "var(--nb-border)"};
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-weight: 600;
  text-transform: capitalize;
`;

const Section = styled.div`
  background: var(--nb-white);
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: var(--nb-shadow-md);
`;

const SectionTitle = styled.h2`
  color: var(--nb-ink);
  font-size: 1.25rem;
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--nb-border);
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${(props) =>
    props.$color === "green"
      ? "var(--nb-blue)"
      : props.$color === "blue"
        ? "var(--nb-blue)"
        : props.$color === "red"
          ? "var(--nb-orange)"
          : props.$color === "purple"
            ? "var(--nb-blue-medium)"
            : "var(--nb-border)"};
  color: white;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--nb-shadow-md);
  }
`;

const LockedButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: 2px dashed var(--nb-border);
  border-radius: 0.5rem;
  background: var(--nb-muted);
  color: var(--nb-ink);
  opacity: 0.6;
  cursor: not-allowed;
`;

const NoPermissionMessage = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: var(--nb-muted);
  border-left: 4px solid var(--nb-orange);
  border-radius: 0.5rem;
  color: var(--nb-ink);
`;

const InfoMessage = styled.div`
  padding: 1rem;
  background: var(--nb-muted);
  border-left: 4px solid var(--nb-blue);
  border-radius: 0.5rem;
  color: var(--nb-ink);
`;

const AdminPanel = styled.div`
  padding: 1.5rem;
  background: var(--nb-muted);
  border: 1px solid var(--nb-blue);
  border-radius: 0.75rem;

  h3 {
    color: var(--nb-ink);
    margin: 0 0 1rem 0;
  }

  p {
    color: var(--nb-ink);
    margin: 0 0 1rem 0;
  }
`;

const ReportSection = styled.div`
  padding: 1.5rem;
  background: var(--nb-muted);
  border-radius: 0.75rem;

  h3 {
    color: var(--nb-ink);
    margin: 0 0 1rem 0;
  }
`;

const PermissionTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--nb-border);
  }

  th {
    background: var(--nb-muted);
    color: var(--nb-ink);
    font-weight: 600;
  }

  td {
    color: var(--nb-ink);
    text-transform: capitalize;
  }
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  background: ${(props) => (props.$allowed ? "var(--nb-blue)" : "var(--nb-orange)")};
  color: white;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
`;

const FeatureCard = styled.div`
  padding: 1.5rem;
  background: ${(props) => (props.$available ? "var(--nb-muted)" : "var(--nb-border)")};
  border: 1px solid
    ${(props) => (props.$available ? "var(--nb-blue)" : "var(--nb-border)")};
  border-radius: 0.75rem;
  text-align: center;
  opacity: ${(props) => (props.$available ? 1 : 0.5)};
`;

const FeatureIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
`;

const FeatureName = styled.div`
  font-size: 1rem;
  font-weight: 600;
  color: var(--nb-ink);
  margin-bottom: 0.5rem;
`;

const FeatureStatus = styled.div`
  font-size: 0.875rem;
  color: ${(props) => (props.$available ? "var(--nb-blue)" : "var(--nb-orange)")};
  font-weight: 600;
`;

const InfoPanel = styled.div`
  padding: 1.5rem;
  background: var(--nb-muted);
  border-radius: 0.75rem;
`;

const AdminInfo = styled.div`
  padding: 1rem;
  background: var(--nb-blue);
  color: white;
  border-radius: 0.5rem;

  h4 {
    margin: 0 0 0.5rem 0;
  }

  p {
    margin: 0;
  }
`;

const StaffInfo = styled.div`
  padding: 1rem;
  background: var(--nb-orange);
  color: white;
  border-radius: 0.5rem;

  h4 {
    margin: 0 0 0.5rem 0;
  }

  p {
    margin: 0;
  }
`;

const RetailerInfo = styled.div`
  padding: 1rem;
  background: var(--nb-border);
  color: var(--nb-ink);
  border-radius: 0.5rem;

  h4 {
    margin: 0 0 0.5rem 0;
  }

  p {
    margin: 0;
  }
`;
