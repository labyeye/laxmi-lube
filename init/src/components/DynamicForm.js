import React, { useMemo } from "react";
import styled from "styled-components";

const normalizeValue = (field, value) => {
  if (value !== undefined && value !== null) return value;
  if (field.default !== undefined) return field.default;
  if (field.type === "multi-select" || field.type === "multi_select")
    return [];
  if (field.type === "relation" && field.multi) return [];
  if (field.type === "boolean") return false;
  return "";
};

const isVisibleForRole = (field, role) => {
  if (!field.roles || field.roles.length === 0) return true;
  return field.roles.includes(role);
};

const isVisibleForView = (field, view) => {
  if (field.showInForm !== undefined || field.showInList !== undefined) {
    return view === "form" ? field.showInForm !== false : field.showInList !== false;
  }
  if (!field.visible || field.visible.length === 0) return true;
  return field.visible.includes(view);
};

const DynamicForm = ({
  moduleDefinition,
  values,
  onChange,
  onSubmit,
  role = "admin",
  errors = {},
  readOnly = false,
  submitLabel = "Save",
  asForm = true,
}) => {
  const fields = useMemo(() => {
    const raw = moduleDefinition?.fields || [];
    return raw
      .filter((field) => field.status !== "disabled")
      .filter((field) => isVisibleForRole(field, role))
      .filter((field) => isVisibleForView(field, "form"))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [moduleDefinition, role]);

  const handleFieldChange = (key, nextValue) => {
    if (readOnly) return;
    onChange?.(key, nextValue);
  };

  const Wrapper = asForm ? Form : FormWrapper;
  const handleSubmit = (e) => {
    if (onSubmit) {
      onSubmit(e);
    }
  };

  return (
    <Wrapper onSubmit={asForm ? handleSubmit : undefined}>
      <FormGrid>
        {fields.map((field) => {
          const value = normalizeValue(field, values?.[field.key]);
          const fieldError = errors?.[field.key];

          return (
            <FormGroup key={field.key}>
              <Label>
                {field.label || field.key}
                {field.required ? " *" : ""}
              </Label>

              {field.type === "text" && (
                <Input
                  type="text"
                  value={value}
                  disabled={readOnly}
                  hasError={!!fieldError}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                />
              )}

              {field.type === "number" && (
                <Input
                  type="number"
                  value={value}
                  disabled={readOnly}
                  hasError={!!fieldError}
                  onChange={(e) =>
                    handleFieldChange(field.key, e.target.value)
                  }
                />
              )}

              {field.type === "date" && (
                <Input
                  type="date"
                  value={value}
                  disabled={readOnly}
                  hasError={!!fieldError}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                />
              )}

              {field.type === "dropdown" && (
                <Select
                  value={value}
                  disabled={readOnly}
                  hasError={!!fieldError}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                >
                  <option value="">Select</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt.value || opt} value={opt.value || opt}>
                      {opt.label || opt}
                    </option>
                  ))}
                </Select>
              )}

              {(field.type === "multi-select" || field.type === "multi_select") && (
                <Select
                  multiple
                  value={Array.isArray(value) ? value : []}
                  disabled={readOnly}
                  hasError={!!fieldError}
                  onChange={(e) =>
                    handleFieldChange(
                      field.key,
                      Array.from(e.target.selectedOptions).map(
                        (opt) => opt.value
                      )
                    )
                  }
                >
                  {(field.options || []).map((opt) => (
                    <option key={opt.value || opt} value={opt.value || opt}>
                      {opt.label || opt}
                    </option>
                  ))}
                </Select>
              )}

              {field.type === "boolean" && (
                <ToggleRow>
                  <Toggle
                    type="checkbox"
                    checked={!!value}
                    disabled={readOnly}
                    onChange={(e) =>
                      handleFieldChange(field.key, e.target.checked)
                    }
                  />
                  <ToggleLabel>{value ? "Yes" : "No"}</ToggleLabel>
                </ToggleRow>
              )}

              {field.type === "relation" && !field.multi && (
                <Select
                  value={value}
                  disabled={readOnly}
                  hasError={!!fieldError}
                  onChange={(e) => handleFieldChange(field.key, e.target.value)}
                >
                  <option value="">Select</option>
                  {(field.options || []).map((opt) => (
                    <option key={opt.value || opt} value={opt.value || opt}>
                      {opt.label || opt}
                    </option>
                  ))}
                </Select>
              )}

              {field.type === "relation" && field.multi && (
                <Select
                  multiple
                  value={Array.isArray(value) ? value : []}
                  disabled={readOnly}
                  hasError={!!fieldError}
                  onChange={(e) =>
                    handleFieldChange(
                      field.key,
                      Array.from(e.target.selectedOptions).map(
                        (opt) => opt.value
                      )
                    )
                  }
                >
                  {(field.options || []).map((opt) => (
                    <option key={opt.value || opt} value={opt.value || opt}>
                      {opt.label || opt}
                    </option>
                  ))}
                </Select>
              )}

              {fieldError && <ErrorText>{fieldError}</ErrorText>}
            </FormGroup>
          );
        })}
      </FormGrid>

      {!readOnly && (
        <ButtonRow>
          <Button type={asForm ? "submit" : "button"} onClick={!asForm ? handleSubmit : undefined}>
            {submitLabel}
          </Button>
        </ButtonRow>
      )}
    </Wrapper>
  );
};

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-weight: 600;
  color: var(--nb-ink);
  font-size: 0.9rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid ${(props) =>
    props.hasError ? "var(--nb-orange)" : "var(--nb-border)"};
  border-radius: 0.375rem;
  font-size: 0.9rem;
  background: var(--nb-white);
`;

const Select = styled.select`
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid ${(props) =>
    props.hasError ? "var(--nb-orange)" : "var(--nb-border)"};
  border-radius: 0.375rem;
  font-size: 0.9rem;
  background: var(--nb-white);
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const Toggle = styled.input``;

const ToggleLabel = styled.span`
  color: var(--nb-ink);
  font-weight: 500;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const Button = styled.button`
  padding: 0.625rem 1rem;
  background: var(--nb-blue);
  color: var(--nb-white);
  border: none;
  border-radius: 0.375rem;
  font-weight: 600;
  cursor: pointer;
`;

const ErrorText = styled.span`
  color: var(--nb-orange);
  font-size: 0.8rem;
`;

export default DynamicForm;
