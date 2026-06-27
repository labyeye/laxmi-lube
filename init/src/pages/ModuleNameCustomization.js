import React, { useState } from 'react';
import styled from 'styled-components';
import { useModules } from '../contexts/ModuleContext';
import { FaSave, FaUndo, FaCheck, FaTimes } from 'react-icons/fa';

const ModuleNameCustomization = () => {
  const {
    getAllModules,
    getDefaultModules,
    updateModule,
    resetModule,
    resetAllModules
  } = useModules();

  const [editedModules, setEditedModules] = useState(getAllModules());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const handleModuleChange = (moduleKey, field, value) => {
    // Validate input
    if (field === 'singular' || field === 'plural') {
      if (value.trim().length === 0) {
        setErrors(prev => ({
          ...prev,
          [moduleKey]: 'Name cannot be empty'
        }));
        return;
      }
      if (value.length > 50) {
        setErrors(prev => ({
          ...prev,
          [moduleKey]: 'Name must be less than 50 characters'
        }));
        return;
      }
      // Remove error if validation passes
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[moduleKey];
        return newErrors;
      });
    }

    setEditedModules(prev => ({
      ...prev,
      [moduleKey]: {
        ...prev[moduleKey],
        [field]: value
      }
    }));
  };

  const handleSaveAll = () => {
    // Check for errors
    if (Object.keys(errors).length > 0) {
      alert('Please fix all errors before saving');
      return;
    }

    // Save all modules
    Object.keys(editedModules).forEach(key => {
      updateModule(key, editedModules[key]);
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetModule = (moduleKey) => {
    const defaultModules = getDefaultModules();
    setEditedModules(prev => ({
      ...prev,
      [moduleKey]: defaultModules[moduleKey]
    }));
    resetModule(moduleKey);
    
    // Remove error if exists
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[moduleKey];
      return newErrors;
    });
  };

  const handleResetAll = () => {
    if (window.confirm('Are you sure you want to reset all module names to defaults? This cannot be undone.')) {
      resetAllModules();
      setEditedModules(getDefaultModules());
      setErrors({});
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const isModified = (moduleKey) => {
    const defaults = getDefaultModules();
    const current = editedModules[moduleKey];
    const original = defaults[moduleKey];
    
    return current.singular !== original.singular || 
           current.plural !== original.plural;
  };

  return (
    <>
      <PageHeader>Settings · Module Names</PageHeader>
      
      <SettingsContainer>
        <Description>
          Personalize your application by renaming modules to match your business terminology.
          Changes will be reflected throughout the entire application.
        </Description>

        {saveSuccess && (
          <SuccessMessage>
            <FaCheck /> Changes saved successfully!
          </SuccessMessage>
        )}

        <ModuleList>
        {Object.entries(editedModules).map(([key, module]) => (
          <ModuleCard key={key} hasError={errors[key]}>
            <ModuleHeader>
              <ModuleName>
                <strong>{getDefaultModules()[key].singular}</strong>
                {isModified(key) && <ModifiedBadge>Modified</ModifiedBadge>}
              </ModuleName>
              <ResetButton 
                onClick={() => handleResetModule(key)}
                title="Reset to default"
                disabled={!isModified(key)}
              >
                <FaUndo /> Reset
              </ResetButton>
            </ModuleHeader>

            <InputGroup>
              <Label>Singular Form</Label>
              <Input
                type="text"
                value={module.singular}
                onChange={(e) => handleModuleChange(key, 'singular', e.target.value)}
                placeholder="e.g., Bill, Customer, Product"
                maxLength={50}
              />
            </InputGroup>

            <InputGroup>
              <Label>Plural Form</Label>
              <Input
                type="text"
                value={module.plural}
                onChange={(e) => handleModuleChange(key, 'plural', e.target.value)}
                placeholder="e.g., Bills, Customers, Products"
                maxLength={50}
              />
            </InputGroup>

            {errors[key] && (
              <ErrorText>
                <FaTimes /> {errors[key]}
              </ErrorText>
            )}

            <PreviewSection>
              <PreviewLabel>Preview:</PreviewLabel>
              <PreviewText>
                "Add {module.singular}" • "View {module.plural}" • "{module.plural} List"
              </PreviewText>
            </PreviewSection>
          </ModuleCard>
        ))}
      </ModuleList>

      <ActionButtons>
        <SaveButton onClick={handleSaveAll} disabled={Object.keys(errors).length > 0}>
          <FaSave /> Save All Changes
        </SaveButton>
        <ResetAllButton onClick={handleResetAll}>
          <FaUndo /> Reset All to Defaults
        </ResetAllButton>
      </ActionButtons>
      </SettingsContainer>
    </>
  );
};

// Styled Components
const SettingsContainer = styled.div`
  padding: 2rem;
  max-width: 100%;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const PageHeader = styled.h1`
  padding: 2rem;
  margin: 0;
  color: var(--nb-ink);
  font-size: 1.8rem;
  font-weight: 600;
  background: var(--nb-muted);
  border-bottom: 1px solid var(--nb-border);
`;

const Description = styled.p`
  color: var(--nb-ink);
  opacity: 0.8;
  line-height: 1.6;
  font-size: 0.95rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: var(--nb-muted);
  border-radius: 8px;
  border-left: 4px solid var(--nb-orange);
`;

const SuccessMessage = styled.div`
  background: var(--nb-muted);
  color: var(--nb-ink);
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: 1px solid var(--nb-border);
  animation: slideIn 0.3s ease;

  @keyframes slideIn {
    from {
      transform: translateY(-10px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

const ModuleList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ModuleCard = styled.div`
  background: var(--nb-muted);
  border: 1px solid ${props => props.hasError ? 'var(--nb-orange)' : 'var(--nb-border)'};
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: var(--nb-shadow-md);
    transform: translateY(-2px);
  }
`;

const ModuleHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--nb-border);
`;

const ModuleName = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.1rem;
  color: var(--nb-ink);
`;

const ModifiedBadge = styled.span`
  background: var(--nb-orange);
  color: white;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
`;

const InputGroup = styled.div`
  margin-bottom: 1rem;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 0.4rem;
  color: var(--nb-ink);
  font-size: 0.85rem;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.7rem;
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  background: var(--nb-white);
  color: var(--nb-ink);

  &:focus {
    outline: none;
    border-color: var(--nb-orange);
    box-shadow: var(--nb-shadow-sm);
  }

  &::placeholder {
    color: var(--nb-ink);
    opacity: 0.5;
  }
`;

const ResetButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: transparent;
  color: var(--nb-ink);
  border: 1px solid var(--nb-border);
  padding: 0.4rem 0.8rem;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: var(--nb-muted);
    border-color: var(--nb-orange);
    color: var(--nb-orange);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorText = styled.p`
  color: var(--nb-orange);
  font-size: 0.85rem;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const PreviewSection = styled.div`
  margin-top: 1rem;
  padding: 0.75rem;
  background: var(--nb-muted);
  border-radius: 6px;
  border-left: 3px solid var(--nb-orange);
`;

const PreviewLabel = styled.div`
  font-size: 0.75rem;
  color: var(--nb-ink);
  opacity: 0.7;
  text-transform: uppercase;
  font-weight: 600;
  margin-bottom: 0.4rem;
`;

const PreviewText = styled.div`
  color: var(--nb-ink);
  font-size: 0.9rem;
  font-style: italic;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  padding-top: 1.5rem;
  border-top: 1px solid var(--nb-border);

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const SaveButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: var(--nb-orange);
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: var(--nb-shadow-md);

  &:hover:not(:disabled) {
    background: var(--nb-blue);
    transform: translateY(-2px);
    box-shadow: var(--nb-shadow-lg);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
`;

const ResetAllButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: transparent;
  color: var(--nb-ink);
  border: 1px solid var(--nb-border);
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: var(--nb-muted);
    border-color: #dc3545;
    color: #dc3545;
    transform: translateY(-2px);
  }
`;

export default ModuleNameCustomization;
