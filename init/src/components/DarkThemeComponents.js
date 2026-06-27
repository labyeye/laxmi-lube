/*
 * REUSABLE NEOBRUTALISM STYLED COMPONENTS
 * White / Blue / Orange
 */

import styled from "styled-components";
import { Link } from "react-router-dom";

// ============================================
// CONTAINERS & LAYOUTS
// ============================================

export const PageContainer = styled.div`
  width: 100%;
`;

export const DarkCard = styled.div`
  background: var(--nb-white);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius);
  padding: ${(props) => props.padding || "1.5rem"};
  box-shadow: var(--nb-shadow-md);
  margin-bottom: ${(props) => props.marginBottom || "1.5rem"};
  transition:
    transform var(--nb-transition),
    box-shadow var(--nb-transition);

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--nb-shadow-lg);
  }

  ${(props) =>
    props.nohover &&
    `
    &:hover {
      transform: none;
      box-shadow: var(--nb-shadow-md);
    }
  `}
`;

export const GlassCard = styled(DarkCard)`
  background: var(--nb-muted);
`;

export const GridContainer = styled.div`
  display: grid;
  grid-template-columns: ${(props) =>
    props.columns || "repeat(auto-fit, minmax(300px, 1fr))"};
  gap: ${(props) => props.gap || "1.5rem"};
  margin-bottom: 2rem;
`;

export const FlexContainer = styled.div`
  display: flex;
  flex-direction: ${(props) => props.direction || "row"};
  justify-content: ${(props) => props.justify || "flex-start"};
  align-items: ${(props) => props.align || "center"};
  gap: ${(props) => props.gap || "1rem"};
  flex-wrap: ${(props) => (props.wrap ? "wrap" : "nowrap")};
`;

// ============================================
// TYPOGRAPHY
// ============================================

export const PageTitle = styled.h1`
  color: var(--nb-ink);
  font-size: ${(props) => props.size || "1.8rem"};
  font-weight: 700;
  margin: 0 0 1.5rem 0;
`;

export const SectionTitle = styled.h2`
  color: var(--nb-ink);
  font-size: 1.4rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
`;

export const CardTitle = styled.h3`
  color: var(--nb-ink);
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid var(--nb-border);
  padding-bottom: 0.75rem;
`;

export const BodyText = styled.p`
  color: ${(props) => (props.muted ? "var(--nb-blue-medium)" : "var(--nb-ink)")};
  font-size: ${(props) => props.size || "0.95rem"};
  line-height: 1.6;
  margin: ${(props) => props.margin || "0"};
`;

export const HighlightText = styled.span`
  color: var(--nb-orange);
  font-weight: 700;
`;

// ============================================
// BUTTONS
// ============================================

export const PrimaryButton = styled.button`
  background: var(--nb-blue);
  color: var(--nb-white);
  border: 1px solid var(--nb-border);
  border-radius: ${(props) => (props.rounded ? "2rem" : "0.5rem")};
  padding: ${(props) =>
    props.size === "large" ? "1rem 2rem" : "0.75rem 1.5rem"};
  font-size: ${(props) => (props.size === "large" ? "1rem" : "0.9rem")};
  font-weight: 700;
  cursor: pointer;
  transition:
    transform var(--nb-transition),
    box-shadow var(--nb-transition);
  box-shadow: var(--nb-shadow-md);

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--nb-shadow-lg);
  }

  &:active {
    transform: translate(0, 0);
    box-shadow: var(--nb-shadow-md);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const SecondaryButton = styled(PrimaryButton)`
  background: var(--nb-white);
  color: var(--nb-ink);
`;

export const OutlineButton = styled(PrimaryButton)`
  background: var(--nb-white);
  color: var(--nb-blue);
  border: 1px solid var(--nb-blue);
`;

export const IconButton = styled.button`
  background: var(--nb-white);
  color: var(--nb-ink);
  border: 1px solid var(--nb-border);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition:
    transform var(--nb-transition),
    box-shadow var(--nb-transition);
  box-shadow: var(--nb-shadow-sm);

  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--nb-shadow-md);
  }
`;

// ============================================
// FORMS & INPUTS
// ============================================

export const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

export const Label = styled.label`
  display: block;
  color: var(--nb-ink);
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
`;

export const Input = styled.input`
  width: 100%;
  background: var(--nb-white);
  color: var(--nb-ink);
  border: 1px solid var(--nb-border);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 0.95rem;
  transition:
    box-shadow var(--nb-transition),
    transform var(--nb-transition);

  &:focus {
    outline: none;
    border-color: var(--nb-blue);
    box-shadow: var(--nb-shadow-sm);
  }

  &::placeholder {
    color: var(--nb-blue-medium);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const TextArea = styled.textarea`
  width: 100%;
  background: var(--nb-white);
  color: var(--nb-ink);
  border: 1px solid var(--nb-border);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 0.95rem;
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
  transition:
    box-shadow var(--nb-transition),
    transform var(--nb-transition);

  &:focus {
    outline: none;
    border-color: var(--nb-blue);
    box-shadow: var(--nb-shadow-sm);
  }

  &::placeholder {
    color: var(--nb-blue-medium);
  }
`;

export const Select = styled.select`
  width: 100%;
  background: var(--nb-white);
  color: var(--nb-ink);
  border: 1px solid var(--nb-border);
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 0.95rem;
  cursor: pointer;
  transition:
    box-shadow var(--nb-transition),
    transform var(--nb-transition);

  &:focus {
    outline: none;
    border-color: var(--nb-blue);
    box-shadow: var(--nb-shadow-sm);
  }

  option {
    background: var(--nb-white);
    color: var(--nb-ink);
  }
`;

// ============================================
// TABLES
// ============================================

export const TableContainer = styled.div`
  overflow-x: auto;
  border-radius: var(--nb-radius);
  background: var(--nb-white);
  box-shadow: var(--nb-shadow-md);
  border: 1px solid var(--nb-border);
`;

export const DarkTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;

  th {
    color: var(--nb-ink);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: 0.8rem;
    padding: 1rem;
    text-align: left;
    background: var(--nb-muted);
    border-bottom: 1px solid var(--nb-border);
  }

  td {
    color: var(--nb-ink);
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--nb-border);
  }

  tbody tr {
    cursor: ${(props) => (props.clickable ? "pointer" : "default")};

    &:nth-child(even) {
      background: var(--nb-muted);
    }

    &:hover {
      background: var(--nb-blue-light);
    }

    &:last-child td {
      border-bottom: none;
    }
  }
`;

// ============================================
// BADGES & STATUS
// ============================================

export const Badge = styled.span`
  display: inline-block;
  padding: 0.35rem 0.75rem;
  border-radius: ${(props) => (props.rounded ? "2rem" : "0.5rem")};
  font-size: 0.75rem;
  font-weight: 700;
  background: ${(props) => {
    switch (props.variant) {
      case "success":
        return "var(--nb-blue)";
      case "warning":
        return "var(--nb-orange)";
      case "error":
        return "var(--nb-orange)";
      default:
        return "var(--nb-white)";
    }
  }};
  color: ${(props) =>
    props.variant === "success" ||
    props.variant === "warning" ||
    props.variant === "error"
      ? "var(--nb-white)"
      : "var(--nb-ink)"};
  border: 1px solid var(--nb-border);
`;

// ============================================
// LOADING & EMPTY STATES
// ============================================

export const LoadingContainer = styled.div`
  padding: 3rem;
  text-align: center;
  color: var(--nb-ink);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

export const Spinner = styled.div`
  width: ${(props) => props.size || "50px"};
  height: ${(props) => props.size || "50px"};
  border: 3px solid var(--nb-ink);
  border-radius: 50%;
  border-top-color: var(--nb-blue);
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

export const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: var(--nb-blue-medium);

  svg {
    color: var(--nb-blue);
    font-size: 3rem;
    margin-bottom: 1rem;
  }

  h3 {
    color: var(--nb-ink);
    margin-bottom: 0.5rem;
  }

  p {
    color: var(--nb-blue-medium);
  }
`;

export const ErrorMessage = styled.div`
  padding: 1rem 1.5rem;
  background: var(--nb-white);
  color: var(--nb-ink);
  border-radius: var(--nb-radius);
  border: 1px solid var(--nb-border);
  border-left: 6px solid var(--nb-orange);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;

  svg {
    color: var(--nb-orange);
    flex-shrink: 0;
  }
`;

export const SuccessMessage = styled(ErrorMessage)`
  border-left-color: var(--nb-blue);

  svg {
    color: var(--nb-blue);
  }
`;

// ============================================
// LINKS
// ============================================

export const StyledLink = styled(Link)`
  color: var(--nb-blue);
  text-decoration: underline;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;

  &:hover {
    color: var(--nb-orange);
  }
`;

// ============================================
// DIVIDERS
// ============================================

export const Divider = styled.hr`
  border: none;
  border-top: 1px solid var(--nb-border);
  margin: ${(props) => props.margin || "1.5rem 0"};
`;

// ============================================
// METRIC CARDS (Special)
// ============================================

export const MetricCard = styled.div`
  background: var(--nb-white);
  border-radius: var(--nb-radius);
  padding: 1.25rem;
  box-shadow: var(--nb-shadow-md);
  border: 1px solid var(--nb-border);
  border-left: 6px solid ${(props) => props.color || "var(--nb-blue)"};
  position: relative;

  .metric-label {
    color: var(--nb-blue-medium);
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0.5rem;
  }

  .metric-value {
    color: var(--nb-ink);
    font-size: 1.8rem;
    font-weight: 700;
    margin: 0;
  }
`;

export default {
  PageContainer,
  DarkCard,
  GlassCard,
  GridContainer,
  FlexContainer,
  PageTitle,
  SectionTitle,
  CardTitle,
  BodyText,
  HighlightText,
  PrimaryButton,
  SecondaryButton,
  OutlineButton,
  IconButton,
  FormGroup,
  Label,
  Input,
  TextArea,
  Select,
  TableContainer,
  DarkTable,
  Badge,
  LoadingContainer,
  Spinner,
  EmptyState,
  ErrorMessage,
  SuccessMessage,
  StyledLink,
  Divider,
  MetricCard,
};
