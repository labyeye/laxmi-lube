import React, { useState } from 'react';
import styled from 'styled-components';
import Layout from '../components/Layout';
import ModuleSettings from './ModuleSettings';
import ModuleNameCustomization from './ModuleNameCustomization';
import PermissionTemplates from '../components/PermissionTemplates';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('fields');

  return (
    <Layout>
      <Container>
        <Header>
          <Title>Settings</Title>
          <Description>Configure and customize your application modules</Description>
        </Header>

        <TabContainer>
          <Tab 
            active={activeTab === 'fields'} 
            onClick={() => setActiveTab('fields')}
          >
            Module Fields
          </Tab>
          <Tab 
            active={activeTab === 'names'} 
            onClick={() => setActiveTab('names')}
          >
            Module Names
          </Tab>
          <Tab 
            active={activeTab === 'permissions'} 
            onClick={() => setActiveTab('permissions')}
          >
            Permissions
          </Tab>
        </TabContainer>

        <ContentWrapper>
          {activeTab === 'fields' && <ModuleSettings />}
          {activeTab === 'names' && <ModuleNameCustomization />}
          {activeTab === 'permissions' && <PermissionTemplates />}
        </ContentWrapper>
      </Container>
    </Layout>
  );
};

// Styled Components
const Container = styled.div`
  padding: 0;
`;

const Header = styled.div`
  padding: 2rem;
  background: var(--nb-white);
  border-bottom: 1px solid var(--nb-border);
`;

const Title = styled.h1`
  color: var(--nb-ink);
  margin-bottom: 0.5rem;
  font-size: 2rem;
  font-weight: 600;
`;

const Description = styled.p`
  color: var(--nb-ink);
  opacity: 0.7;
  font-size: 0.95rem;
`;

const TabContainer = styled.div`
  display: flex;
  background: var(--nb-white);
  border-bottom: 1px solid var(--nb-border);
  padding: 0 2rem;
  gap: 1rem;
`;

const Tab = styled.button`
  padding: 1rem 2rem;
  background: ${props => props.active ? 'var(--nb-orange)' : 'transparent'};
  color: ${props => props.active ? 'white' : 'var(--nb-ink)'};
  border: none;
  border-bottom: 3px solid ${props => props.active ? 'var(--nb-orange)' : 'transparent'};
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    background: ${props => props.active ? 'var(--nb-orange)' : 'var(--nb-muted)'};
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -2px;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--nb-orange);
    transform: scaleX(${props => props.active ? '1' : '0'});
    transition: transform 0.3s ease;
  }
`;

const ContentWrapper = styled.div`
  background: var(--nb-white);
`;

export default Settings;
