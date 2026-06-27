import styled from "styled-components";

// Page Layout Components
export const PageContainer = styled.div`
  padding: 1rem;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  
  @media (min-width: 768px) {
    padding: 2rem;
  }
`;

export const PageHeader = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: var(--nb-ink);
  text-align: center;

  @media (min-width: 768px) {
    font-size: 2rem;
    text-align: left;
  }
`;

export const SectionHeader = styled.h2`
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: var(--nb-ink);
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--nb-border);

  @media (min-width: 768px) {
    font-size: 1.5rem;
  }
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-direction: column;
  gap: 1rem;
  
  @media (min-width: 768px) {
    flex-direction: row;
    margin-bottom: 2rem;
  }
`;

export const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  justify-content: center;

  h1 {
    font-size: 1.5rem;
    color: var(--nb-ink);
    margin: 0;
  }

  svg {
    color: var(--nb-ink);
  }
  
  @media (min-width: 768px) {
    width: auto;
    justify-content: flex-start;
    gap: 1rem;
    
    h1 {
      font-size: 1.8rem;
    }
  }
`;

// Form Components
export const FormContainer = styled.form`
  background: var(--nb-cream);
  padding: 1.25rem;
  border-radius: var(--nb-radius-lg);
  border: 1px solid var(--nb-border);
  box-shadow: var(--nb-shadow-sm);
  margin-bottom: 1.5rem;
  width: 100%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;

  @media (min-width: 768px) {
    padding: 1.5rem;
  }
`;

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

export const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

export const Label = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: var(--nb-ink);
  font-weight: 500;
  font-size: 0.875rem;

  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

export const Input = styled.input`
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid ${(props) => (props.hasError ? "var(--nb-orange)" : "var(--nb-border)")};
  border-radius: var(--nb-radius-sm);
  font-size: 0.875rem;
  transition: box-shadow var(--nb-transition), transform var(--nb-transition), border-color var(--nb-transition);
  background-color: var(--nb-cream);
  color: var(--nb-ink);
  min-height: 2.5rem;

  &:focus {
    outline: none;
    border-color: var(--nb-blue);
    box-shadow: var(--nb-shadow-sm);
  }

  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

export const Select = styled.select`
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: 1px solid ${(props) => (props.hasError ? "var(--nb-orange)" : "var(--nb-border)")};
  border-radius: var(--nb-radius-sm);
  font-size: 0.875rem;
  background-color: var(--nb-cream);
  min-height: 2.5rem;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;

  &:focus {
    outline: none;
    border-color: var(--nb-blue);
    box-shadow: var(--nb-shadow-sm);
  }

  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

// Button Components
export const ButtonContainer = styled.div`
  margin-top: 1.25rem;
  display: flex;
  justify-content: center;

  @media (min-width: 768px) {
    justify-content: flex-start;
  }
`;

export const Button = styled.button`
  padding: 0.625rem 1.25rem;
  background-color: var(--nb-blue);
  color: var(--nb-white);
  border: none;
  border-radius: var(--nb-radius-sm);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--nb-transition);
  width: 100%;
  max-width: 200px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);

  &:hover {
    background-color: var(--nb-blue-medium);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }

  &:disabled {
    background-color: var(--nb-muted);
    color: var(--nb-ink);
    cursor: not-allowed;
    box-shadow: none;
  }

  @media (min-width: 768px) {
    font-size: 1rem;
    padding: 0.75rem 1.25rem;
  }
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-direction: column;
  
  @media (min-width: 480px) {
    flex-direction: row;
    gap: 1rem;
  }
`;

export const PrimaryButton = styled.button`
  padding: 0.75rem 1.25rem;
  background-color: var(--nb-blue);
  color: var(--nb-white);
  border: none;
  border-radius: var(--nb-radius-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--nb-transition);
  width: 100%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);

  &:hover {
    background-color: var(--nb-blue-medium);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
  
  @media (min-width: 480px) {
    padding: 0.75rem 1.5rem;
    flex: 1;
  }
`;

export const SecondaryButton = styled.button`
  padding: 0.75rem 1.25rem;
  background-color: var(--nb-cream);
  color: var(--nb-ink);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--nb-transition);
  width: 100%;

  &:hover {
    background-color: var(--nb-muted);
    transform: translateY(-1px);
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  }
  
  @media (min-width: 480px) {
    padding: 0.75rem 1.5rem;
    flex: 1;
  }
`;

// Action Buttons
export const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: center;
  
  @media (min-width: 768px) {
    justify-content: flex-start;
  }
`;

export const ActionButton = styled.button`
  background-color: ${(props) => props.bgColor || "var(--nb-white)"};
  color: ${(props) => props.color || "var(--nb-ink)"};
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  padding: 0.5rem;
  cursor: pointer;
  transition: transform var(--nb-transition), box-shadow var(--nb-transition);
  box-shadow: var(--nb-shadow-sm);

  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--nb-shadow-sm);
  }
`;

export const AssignButton = styled(ActionButton).attrs({
  bgColor: "var(--nb-blue)",
  color: "var(--nb-white)",
  hoverBgColor: "var(--nb-blue)"
})``;

export const EditButton = styled(ActionButton).attrs({
  bgColor: "var(--nb-white)",
  color: "var(--nb-ink)",
  hoverBgColor: "var(--nb-white)"
})``;

export const DeleteButton = styled(ActionButton).attrs({
  bgColor: "var(--nb-orange)",
  color: "var(--nb-white)",
  hoverBgColor: "var(--nb-orange)"
})``;

// File Upload Components
export const FileUploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;

  @media (min-width: 480px) {
    flex-direction: row;
    align-items: center;
  }
`;

export const FileInputLabel = styled.label`
  display: inline-block;
  padding: 0.625rem 1rem;
  background-color: var(--nb-cream);
  color: var(--nb-ink);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  cursor: pointer;
  font-size: 0.875rem;
  text-align: center;
  transition: transform var(--nb-transition), box-shadow var(--nb-transition);
  width: 100%;
  box-shadow: var(--nb-shadow-sm);

  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--nb-shadow-sm);
  }

  @media (min-width: 480px) {
    width: auto;
    flex-shrink: 0;
  }

  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

export const FileInput = styled.input`
  display: none;
`;

export const FileName = styled.span`
  font-size: 0.875rem;
  color: var(--nb-ink);
  word-break: break-all;
  text-align: center;

  @media (min-width: 480px) {
    text-align: left;
  }

  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

// Search Components
export const SearchBox = styled.div`
  display: flex;
  align-items: center;
  background: var(--nb-cream);
  border-radius: var(--nb-radius-lg);
  padding: 0.5rem 1rem;
  border: 1px solid var(--nb-border);
  box-shadow: var(--nb-shadow-sm);
  width: 100%;

  input {
    border: none;
    outline: none;
    padding: 0.5rem;
    width: 100%;
    font-size: 1rem;
    color: var(--nb-ink);
    background: transparent;
  }

  svg {
    color: var(--nb-ink);
    margin-right: 0.5rem;
  }
  
  @media (min-width: 768px) {
    width: 300px;
  }
`;

// Table Components
export const TableContainer = styled.div`
  background: var(--nb-cream);
  border-radius: var(--nb-radius-lg);
  border: 1px solid var(--nb-border);
  box-shadow: var(--nb-shadow-sm);
  overflow-x: auto;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  min-width: 650px;

  th {
    background-color: var(--nb-muted);
    color: var(--nb-text-secondary);
    font-weight: 500;
    text-transform: uppercase;
    font-size: 0.75rem;
    letter-spacing: 0.05em;
    text-align: left;
    padding: 1rem;
    border-bottom: 1px solid var(--nb-border);
    white-space: nowrap;
  }

  td {
    padding: 1rem;
    border-bottom: 1px solid var(--nb-border);
    color: var(--nb-ink);
    font-size: 0.9rem;
  }

  tbody tr {
    transition: background-color var(--nb-transition);
  }

  tbody tr:hover {
    background-color: var(--nb-muted);
  }
`;

export const StatusBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  white-space: nowrap;
  border: 1px solid var(--nb-border);
  
  background-color: ${(props) =>
    props.status === "Paid" || props.status === "paid"
      ? "var(--nb-blue)"
      : props.status === "Partially Paid" || props.status === "partially paid"
      ? "var(--nb-orange)"
      : props.status === "Unpaid" || props.status === "unpaid" || props.status === "pending"
      ? "var(--nb-white)"
      : "var(--nb-white)"};
      
  color: ${(props) =>
    props.status === "Paid" || props.status === "paid"
      ? "var(--nb-white)"
      : props.status === "Partially Paid" || props.status === "partially paid"
      ? "var(--nb-white)"
      : props.status === "Unpaid" || props.status === "unpaid" || props.status === "pending"
      ? "var(--nb-orange)"
      : "var(--nb-ink)"};
`;

// Message Components
export const Message = styled.div`
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: var(--nb-radius-sm);
  font-weight: 500;
  font-size: 0.875rem;
  background-color: var(--nb-cream);
  color: var(--nb-ink);
  border: 1px solid var(--nb-border);
  border-left: 6px solid
    ${(props) => (props.type === "error" ? "var(--nb-orange)" : "var(--nb-blue)")};
  width: 100%;

  @media (min-width: 768px) {
    font-size: 1rem;
    padding: 1rem 1.25rem;
  }
`;

export const SuccessMessage = styled(Message).attrs({
  type: "success"
})``;

export const ErrorMessage = styled(Message).attrs({
  type: "error"
})`
  white-space: pre-line;
`;

export const ErrorText = styled.span`
  color: var(--nb-orange);
  font-size: 0.75rem;
  margin-top: 0.25rem;
  display: block;

  @media (min-width: 768px) {
    font-size: 0.875rem;
  }
`;

export const NoteText = styled.p`
  font-size: 0.875rem;
  color: var(--nb-ink);
  margin-top: 1rem;
  line-height: 1.5;

  @media (min-width: 768px) {
    font-size: 1rem;
  }
`;

// Loading Components
export const LoadingIndicator = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--nb-ink);
  gap: 1rem;
`;

export const Spinner = styled.div`
  border: 3px solid var(--nb-ink);
  border-radius: 50%;
  border-top: 3px solid var(--nb-blue);
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

// Modal Components
export const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
`;

export const ModalContent = styled.div`
  background: var(--nb-cream);
  border-radius: var(--nb-radius-lg);
  width: 100%;
  max-width: 500px;
  border: 1px solid var(--nb-border);
  box-shadow: var(--nb-shadow-lg);
`;

export const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  border-bottom: 1px solid var(--nb-border);

  h3 {
    margin: 0;
    font-size: 1.15rem;
    color: var(--nb-ink);
  }
  
  @media (min-width: 768px) {
    padding: 1.5rem;
    
    h3 {
      font-size: 1.25rem;
    }
  }
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--nb-ink);
  padding: 0.5rem;

  &:hover {
    color: var(--nb-ink);
  }
`;

export const Form = styled.form`
  padding: 1.25rem;
  
  @media (min-width: 768px) {
    padding: 1.5rem;
  }
`;
