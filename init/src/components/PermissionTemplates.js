import React, { useState } from "react";
import styled from "styled-components";
import {
  FaShieldAlt,
  FaInfoCircle,
  FaCopy,
  FaCheckCircle,
} from "react-icons/fa";

const PermissionTemplates = () => {
  const [copiedTemplate, setCopiedTemplate] = useState(null);

  const permissionTemplates = {
    fullAccess: {
      name: "Full Access",
      description:
        "Complete access to all features. Best for managers and supervisors.",
      icon: "🔓",
      color: "var(--nb-blue)",
      permissions: {
        dashboard: { view: true },
        bills: {
          view: true,
          create: true,
          edit: true,
          delete: true,
          assign: true,
        },
        collections: { view: true, create: true, edit: true, delete: true },
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
      description:
        "Collection and order management for distribution sales representatives in the field.",
      icon: "🚚",
      color: "var(--nb-blue-medium)",
      permissions: {
        dashboard: { view: true },
        bills: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          assign: false,
        },
        collections: { view: true, create: true, edit: false, delete: false },
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
      description:
        "View and approve operations. Can manage most features except user administration.",
      icon: "👨‍💼",
      color: "var(--nb-blue)",
      permissions: {
        dashboard: { view: true },
        bills: {
          view: true,
          create: true,
          edit: true,
          delete: false,
          assign: true,
        },
        collections: { view: true, create: true, edit: true, delete: false },
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
      description:
        "Read-only access to all modules. Cannot create, edit, or delete anything.",
      icon: "👁️",
      color: "var(--nb-border)",
      permissions: {
        dashboard: { view: true },
        bills: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          assign: false,
        },
        collections: { view: true, create: false, edit: false, delete: false },
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
    accountant: {
      name: "Accountant",
      description:
        "Financial management access including bills, collections, salary, and advances.",
      icon: "💰",
      color: "var(--nb-blue-medium)",
      permissions: {
        dashboard: { view: true },
        bills: {
          view: true,
          create: true,
          edit: true,
          delete: false,
          assign: false,
        },
        collections: { view: true, create: true, edit: true, delete: false },
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
    warehouseManager: {
      name: "Warehouse Manager",
      description:
        "Product and inventory management. Limited financial access.",
      icon: "📦",
      color: "var(--nb-blue)",
      permissions: {
        dashboard: { view: true },
        bills: {
          view: true,
          create: false,
          edit: false,
          delete: false,
          assign: false,
        },
        collections: { view: false, create: false, edit: false, delete: false },
        products: { view: true, create: true, edit: true, delete: true },
        retailers: { view: true, create: false, edit: false, delete: false },
        orders: {
          view: true,
          create: false,
          edit: true,
          delete: false,
          approve: true,
        },
        users: { view: false, create: false, edit: false, delete: false },
        reports: { view: true, export: true },
        salary: { view: false, create: false, edit: false, delete: false },
        advances: { view: false, create: false, edit: false, delete: false },
        settings: { view: false, edit: false },
      },
    },
  };

  const copyToClipboard = (templateKey) => {
    const template = permissionTemplates[templateKey];
    const text = JSON.stringify(template.permissions, null, 2);
    navigator.clipboard.writeText(text);
    setCopiedTemplate(templateKey);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  const countPermissions = (permissions) => {
    let enabled = 0;
    let total = 0;
    Object.values(permissions).forEach((module) => {
      Object.values(module).forEach((value) => {
        total++;
        if (value) enabled++;
      });
    });
    return { enabled, total };
  };

  return (
    <Container>
      <Header>
        <HeaderContent>
          <IconWrapper>
            <FaShieldAlt size={32} />
          </IconWrapper>
          <div>
            <Title>Permission Templates</Title>
            <Subtitle>
              Pre-configured permission sets for common user roles
            </Subtitle>
          </div>
        </HeaderContent>
      </Header>

      <InfoBox>
        <FaInfoCircle />
        <InfoText>
          These templates can be applied when managing user permissions. Each
          template is designed for specific job roles and provides appropriate
          access levels. You can customize permissions after applying a
          template.
        </InfoText>
      </InfoBox>

      <TemplatesGrid>
        {Object.entries(permissionTemplates).map(([key, template]) => {
          const { enabled, total } = countPermissions(template.permissions);
          const percentage = Math.round((enabled / total) * 100);

          return (
            <TemplateCard key={key} $color={template.color}>
              <CardHeader $color={template.color}>
                <TemplateIcon>{template.icon}</TemplateIcon>
                <CopyButton
                  onClick={() => copyToClipboard(key)}
                  title="Copy permissions JSON"
                >
                  {copiedTemplate === key ? <FaCheckCircle /> : <FaCopy />}
                </CopyButton>
              </CardHeader>

              <CardBody>
                <TemplateName>{template.name}</TemplateName>
                <TemplateDescription>
                  {template.description}
                </TemplateDescription>

                <PermissionStats>
                  <StatLabel>Permissions Enabled:</StatLabel>
                  <StatValue>
                    {enabled} / {total}
                  </StatValue>
                  <ProgressBar>
                    <ProgressFill
                      $percentage={percentage}
                      $color={template.color}
                    />
                  </ProgressBar>
                  <PercentageLabel>{percentage}%</PercentageLabel>
                </PermissionStats>

                <PermissionBreakdown>
                  <BreakdownTitle>Access Levels:</BreakdownTitle>
                  {Object.entries(template.permissions).map(
                    ([module, actions]) => {
                      const moduleEnabled =
                        Object.values(actions).filter(Boolean).length;
                      const moduleTotal = Object.values(actions).length;
                      if (moduleEnabled === 0) return null;

                      return (
                        <ModuleItem key={module}>
                          <ModuleName>
                            {module.charAt(0).toUpperCase() + module.slice(1)}
                          </ModuleName>
                          <ModuleBadge>
                            {moduleEnabled}/{moduleTotal}
                          </ModuleBadge>
                        </ModuleItem>
                      );
                    },
                  )}
                </PermissionBreakdown>
              </CardBody>
            </TemplateCard>
          );
        })}
      </TemplatesGrid>

      <UsageGuide>
        <GuideTitle>How to Use Templates</GuideTitle>
        <GuideSteps>
          <Step>
            <StepNumber>1</StepNumber>
            <StepText>Go to User Management page</StepText>
          </Step>
          <Step>
            <StepNumber>2</StepNumber>
            <StepText>Click the shield icon next to a user</StepText>
          </Step>
          <Step>
            <StepNumber>3</StepNumber>
            <StepText>
              Select a template from the Quick Templates section
            </StepText>
          </Step>
          <Step>
            <StepNumber>4</StepNumber>
            <StepText>Customize individual permissions if needed</StepText>
          </Step>
          <Step>
            <StepNumber>5</StepNumber>
            <StepText>Click Save to apply the permissions</StepText>
          </Step>
        </GuideSteps>
      </UsageGuide>
    </Container>
  );
};

export default PermissionTemplates;

// Styled Components
const Container = styled.div`
  padding: 2rem;
`;

const Header = styled.div`
  margin-bottom: 2rem;
`;

const HeaderContent = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
`;

const IconWrapper = styled.div`
  width: 64px;
  height: 64px;
  background: var(--nb-muted);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--nb-orange);
`;

const Title = styled.h1`
  font-size: 2rem;
  color: var(--nb-ink);
  margin: 0 0 0.5rem 0;
  font-weight: 600;
`;

const Subtitle = styled.p`
  font-size: 1rem;
  color: var(--nb-ink);
  opacity: 0.7;
  margin: 0;
`;

const InfoBox = styled.div`
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  background: var(--nb-muted);
  border-left: 4px solid var(--nb-blue);
  border-radius: 0.5rem;
  margin-bottom: 2rem;
  color: var(--nb-blue);
`;

const InfoText = styled.p`
  margin: 0;
  color: var(--nb-ink);
  line-height: 1.6;
`;

const TemplatesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
`;

const TemplateCard = styled.div`
  background: var(--nb-white);
  border-radius: 0.75rem;
  box-shadow: var(--nb-shadow-md);
  overflow: hidden;
  transition: all 0.3s ease;
  border: 1px solid ${(props) => props.$color};

  &:hover {
    transform: translateY(-5px);
    box-shadow: var(--nb-shadow-lg);
  }
`;

const CardHeader = styled.div`
  background: ${(props) => props.$color};
  padding: 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const TemplateIcon = styled.div`
  font-size: 2.5rem;
`;

const CopyButton = styled.button`
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }
`;

const CardBody = styled.div`
  padding: 1.5rem;
`;

const TemplateName = styled.h3`
  font-size: 1.5rem;
  color: var(--nb-ink);
  margin: 0 0 0.5rem 0;
  font-weight: 600;
`;

const TemplateDescription = styled.p`
  font-size: 0.95rem;
  color: var(--nb-ink);
  opacity: 0.8;
  line-height: 1.5;
  margin-bottom: 1.5rem;
`;

const PermissionStats = styled.div`
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--nb-muted);
  border-radius: 0.5rem;
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: var(--nb-ink);
  margin-bottom: 0.5rem;
  font-weight: 500;
`;

const StatValue = styled.div`
  font-size: 1.25rem;
  color: var(--nb-ink);
  font-weight: 600;
  margin-bottom: 0.75rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: var(--nb-border);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
`;

const ProgressFill = styled.div`
  width: ${(props) => props.$percentage}%;
  height: 100%;
  background: ${(props) => props.$color};
  transition: width 0.3s ease;
`;

const PercentageLabel = styled.div`
  font-size: 0.875rem;
  color: var(--nb-ink);
  text-align: right;
`;

const PermissionBreakdown = styled.div`
  border-top: 1px solid var(--nb-border);
  padding-top: 1rem;
`;

const BreakdownTitle = styled.div`
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--nb-ink);
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ModuleItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--nb-border);

  &:last-child {
    border-bottom: none;
  }
`;

const ModuleName = styled.span`
  color: var(--nb-ink);
  font-size: 0.9rem;
`;

const ModuleBadge = styled.span`
  background: var(--nb-blue);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
`;

const UsageGuide = styled.div`
  background: var(--nb-white);
  border-radius: 0.75rem;
  padding: 2rem;
  box-shadow: var(--nb-shadow-md);
`;

const GuideTitle = styled.h2`
  font-size: 1.5rem;
  color: var(--nb-ink);
  margin: 0 0 1.5rem 0;
  font-weight: 600;
`;

const GuideSteps = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Step = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const StepNumber = styled.div`
  width: 36px;
  height: 36px;
  background: var(--nb-blue);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  flex-shrink: 0;
`;

const StepText = styled.div`
  color: var(--nb-ink);
  font-size: 1rem;
`;
