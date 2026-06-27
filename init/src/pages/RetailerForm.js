import React, { useEffect, useState } from "react";
import styled from "styled-components";
import DynamicForm from "../components/DynamicForm";
import {
  createRecord,
  hydrateModuleDefinition,
  updateRecord,
} from "../utils/dynamicApi";

const RetailerForm = ({ record, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({});
  const [moduleDefinition, setModuleDefinition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    const loadModule = async () => {
      try {
        const definition = await hydrateModuleDefinition("retailer");
        setModuleDefinition(definition);
      } catch (err) {
        setError("Failed to load retailer module");
      }
    };
    loadModule();
  }, []);

  useEffect(() => {
    if (record?.data) {
      setFormData(record.data);
    } else {
      setFormData({});
    }
  }, [record]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (record?._id) {
        await updateRecord("retailer", record._id, formData);
      } else {
        await createRecord("retailer", formData);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
      setFieldErrors(err.response?.data?.errors || {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer>
      <FormHeader>
        {record ? "Edit Retailer" : "Add New Retailer"}
        <CloseButton onClick={onClose}>×</CloseButton>
      </FormHeader>

      {error && <ErrorMessage>{error}</ErrorMessage>}

      {moduleDefinition ? (
        <DynamicForm
          moduleDefinition={moduleDefinition}
          values={formData}
          onChange={(key, value) =>
            setFormData((prev) => ({ ...prev, [key]: value }))
          }
          onSubmit={handleSubmit}
          errors={fieldErrors}
          submitLabel={record ? "Update Retailer" : "Add Retailer"}
        />
      ) : (
        <LoadingText>Loading fields...</LoadingText>
      )}

      <ButtonContainer>
        <Button type="button" onClick={onClose} secondary>
          Cancel
        </Button>
      </ButtonContainer>
    </FormContainer>
  );
};

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormHeader = styled.h2`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  font-size: 1.25rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--nb-ink);
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 1rem;
`;

const Button = styled.button`
  padding: 0.5rem 1rem;
  background-color: ${(props) =>
    props.secondary ? "var(--nb-border)" : "var(--nb-blue)"};
  color: ${(props) => (props.secondary ? "var(--nb-ink)" : "var(--nb-white)")};
  border: none;
  border-radius: 4px;
  cursor: pointer;
`;

const ErrorMessage = styled.div`
  color: var(--nb-orange);
  padding: 0.5rem;
  background-color: var(--nb-muted);
  border-radius: 4px;
`;

const LoadingText = styled.div`
  color: var(--nb-ink);
  padding: 0.5rem 0;
`;

export default RetailerForm;
