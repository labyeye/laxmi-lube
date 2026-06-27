import React, { useState } from "react";
import styled from "styled-components";
import { FaCog, FaPuzzlePiece, FaFont, FaShieldAlt } from "react-icons/fa";
import RetailerLayout from "../components/RetailerLayout";
import ModuleSettings from "./ModuleSettings";
import ModuleNameCustomization from "./ModuleNameCustomization";
import PermissionTemplates from "../components/PermissionTemplates";

const RetailerSettings = () => {
  const [activeTab, setActiveTab] = useState("fields");

  return (
    <RetailerLayout>
      <Container>
        <Header>
          <HeaderIcon>
            <FaCog size={28} />
          </HeaderIcon>
          <HeaderText>
            <Title>Settings</Title>
            <Description>
              Configure modules, field definitions, and permission templates
            </Description>
          </HeaderText>
        </Header>

        <TabContainer>
          <Tab
            active={activeTab === "fields"}
            onClick={() => setActiveTab("fields")}
          >
            <FaPuzzlePiece /> Module Fields
          </Tab>
          <Tab
            active={activeTab === "names"}
            onClick={() => setActiveTab("names")}
          >
            <FaFont /> Module Names
          </Tab>
          <Tab
            active={activeTab === "permissions"}
            onClick={() => setActiveTab("permissions")}
          >
            <FaShieldAlt /> Permissions
          </Tab>
        </TabContainer>

        <ContentWrapper>
          {activeTab === "fields" && <ModuleSettings />}
          {activeTab === "names" && <ModuleNameCustomization />}
          {activeTab === "permissions" && <PermissionTemplates />}
        </ContentWrapper>
      </Container>
    </RetailerLayout>
  );
};

const Container = styled.div`
  padding: 0;
  background: linear-gradient(
    135deg,
    #f1f3e0 0%,
    #d2dcb6 100%
  ); /* lighter neubrutalism bg */
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.75rem 2rem;
  background: rgba(210, 220, 182, 0.85); /* lighter muted */
  border-bottom: 1px solid var(--nb-border);
  box-shadow: 4px 4px 0 #778873;
`;

const HeaderIcon = styled.div`
  color: #547792;
  display: flex;
  align-items: center;
  background: #e8e2db;
  border-radius: 12px;
  padding: 0.5rem;
  box-shadow: 2px 2px 0 #778873;
`;

const HeaderText = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const Title = styled.h1`
  color: #1a3263;
  margin: 0 0 0.25rem 0;
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: 1px;
  text-shadow: 2px 2px 0 #d2dcb6;
`;

const Description = styled.p`
  color: #547792;
  opacity: 0.85;
  font-size: 1rem;
  margin: 0;
  font-weight: 500;
`;

const TabContainer = styled.div`
  display: flex;
  background: #f1f3e0;
  border-bottom: 1px solid var(--nb-border);
  padding: 0 2rem;
  gap: 0.5rem;
  box-shadow: 2px 2px 0 #778873;
`;

const Tab = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: ${(p) => (p.active ? "#547792" : "rgba(210,220,182,0.7)")};
  color: ${(p) => (p.active ? "#E8E2DB" : "#1A3263")};
  border: none;
  border-bottom: 3px solid ${(p) => (p.active ? "#FAB95B" : "transparent")};
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  border-radius: 8px 8px 0 0;
  box-shadow: ${(p) => (p.active ? "4px 4px 0 #778873" : "2px 2px 0 #778873")};
  transition: all var(--nb-transition);

  svg {
    font-size: 1rem;
    color: ${(p) => (p.active ? "#FAB95B" : "#547792")};
  }

  &:hover {
    background: ${(p) => (p.active ? "#547792" : "#D2DCB6")};
    color: ${(p) => (p.active ? "#E8E2DB" : "#1A3263")};
    box-shadow: 4px 4px 0 #778873;
  }
`;

const ContentWrapper = styled.div`
  background: #f1f3e0;
  min-height: 300px;
  border-radius: 0 0 12px 12px;
  box-shadow: 4px 4px 0 #778873;
`;

export default RetailerSettings;
