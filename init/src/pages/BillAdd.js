import React, { useState } from "react";
import axios from "axios";
import styled from "styled-components";
import Layout from "../components/Layout";

const BillsAdd = () => {
  const [file, setFile] = useState(null);
  const [manualBill, setManualBill] = useState({
    billNumber: "",
    retailer: "",
    amount: "",
    dueAmount: "",
    dueDate: "",
    billDate: "",
    status: "Unpaid",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // API base URL
  const API_URL = "http://localhost:2500/api";

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    // Clear previous messages when a new file is selected
    setMessage("");
    setError("");
  };

  // Handle manual input change
  const handleManualInputChange = (e) => {
    const { name, value } = e.target;
    setManualBill((prevBill) => ({
      ...prevBill,
      [name]: value,
    }));

    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  // Validate form fields
  const validateForm = () => {
    const errors = {};

    if (!manualBill.billNumber) errors.billNumber = "Bill number is required";
    if (!manualBill.retailer) errors.retailer = "Retailer is required";
    if (!manualBill.amount) errors.amount = "Amount is required";
    if (manualBill.amount && isNaN(parseFloat(manualBill.amount)))
      errors.amount = "Amount must be a number";
    if (!manualBill.dueAmount) errors.dueAmount = "Due amount is required";
    if (manualBill.dueAmount && isNaN(parseFloat(manualBill.dueAmount)))
      errors.dueAmount = "Due amount must be a number";
    if (!manualBill.dueDate) errors.dueDate = "Due date is required";
    if (!manualBill.billDate) errors.billDate = "Bill date is required";

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle manual bill submission
  const handleManualSubmit = async (e) => {
    e.preventDefault();

    // Clear previous messages
    setError("");
    setMessage("");

    // Validate form
    if (!validateForm()) {
      setError("Please fix the errors in the form.");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      const response = await axios.post(`${API_URL}/bills`, manualBill, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      setMessage("Bill added successfully");
      setManualBill({
        billNumber: "",
        retailer: "",
        amount: "",
        dueAmount: "",
        dueDate: "",
        billDate: "",
        status: "Unpaid",
      });
    } catch (error) {
      console.error("Error adding bill:", error);

      // Handle different types of errors
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (error.response.data && error.response.data.errors) {
          // Handle validation errors from backend
          const backendErrors = error.response.data.errors;
          setError(`Failed to add bill: ${backendErrors.join(", ")}`);
        } else if (error.response.data && error.response.data.message) {
          setError(`Failed to add bill: ${error.response.data.message}`);
        } else {
          setError(
            `Failed to add bill: Server returned status ${error.response.status}`
          );
        }
      } else if (error.request) {
        // The request was made but no response was received
        setError(
          "Failed to add bill: No response received from server. Please check your network connection."
        );
      } else {
        // Something happened in setting up the request that triggered an Error
        setError(`Failed to add bill: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle file upload and bulk import
  const handleImport = async (e) => {
    e.preventDefault();

    // Clear previous messages
    setError("");
    setMessage("");

    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      const response = await axios.post(`${API_URL}/bills/import`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      // Handle partial success (some rows imported, some failed)
      if (response.data.errors && response.data.errors.length > 0) {
        setMessage(
          `Imported ${response.data.importedCount} bills successfully. ${response.data.errors.length} records had errors.`
        );
      } else {
        setMessage(`Successfully imported ${response.data.count} bills.`);
      }

      // Clear file input
      setFile(null);
      document.getElementById("fileInput").value = "";
    } catch (error) {
      console.error("Error importing file:", error);

      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        setError(`Failed to import file: ${error.response.data.message}`);
      } else if (error.request) {
        setError(
          "Failed to import file: No response received from server. Please check your network connection."
        );
      } else {
        setError(`Failed to import file: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <PageHeader>Add Bills</PageHeader>

      {/* Manual Bill Entry Form */}
      <FormContainer onSubmit={handleManualSubmit}>
        <SectionHeader>Manual Bill Entry</SectionHeader>
        <FormGrid>
          <FormGroup>
            <Label htmlFor="billNumber">Bill Number</Label>
            <Input
              id="billNumber"
              type="text"
              name="billNumber"
              placeholder="Enter bill number"
              value={manualBill.billNumber}
              onChange={handleManualInputChange}
              hasError={!!fieldErrors.billNumber}
            />
            {fieldErrors.billNumber && (
              <ErrorText>{fieldErrors.billNumber}</ErrorText>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="retailer">Retailer</Label>
            <Input
              id="retailer"
              type="text"
              name="retailer"
              placeholder="Enter retailer name"
              value={manualBill.retailer}
              onChange={handleManualInputChange}
              hasError={!!fieldErrors.retailer}
            />
            {fieldErrors.retailer && (
              <ErrorText>{fieldErrors.retailer}</ErrorText>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="amount">Total Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              name="amount"
              placeholder="0.00"
              value={manualBill.amount}
              onChange={handleManualInputChange}
              hasError={!!fieldErrors.amount}
            />
            {fieldErrors.amount && <ErrorText>{fieldErrors.amount}</ErrorText>}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="dueAmount">Due Amount</Label>
            <Input
              id="dueAmount"
              type="number"
              step="0.01"
              name="dueAmount"
              placeholder="0.00"
              value={manualBill.dueAmount}
              onChange={handleManualInputChange}
              hasError={!!fieldErrors.dueAmount}
            />
            {fieldErrors.dueAmount && (
              <ErrorText>{fieldErrors.dueAmount}</ErrorText>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              name="dueDate"
              value={manualBill.dueDate}
              onChange={handleManualInputChange}
              hasError={!!fieldErrors.dueDate}
            />
            {fieldErrors.dueDate && (
              <ErrorText>{fieldErrors.dueDate}</ErrorText>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="billDate">Bill Date</Label>
            <Input
              id="billDate"
              type="date"
              name="billDate"
              value={manualBill.billDate}
              onChange={handleManualInputChange}
              hasError={!!fieldErrors.billDate}
            />
            {fieldErrors.billDate && (
              <ErrorText>{fieldErrors.billDate}</ErrorText>
            )}
          </FormGroup>

          <FormGroup>
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              name="status"
              value={manualBill.status}
              onChange={handleManualInputChange}
            >
              <option value="Unpaid">Unpaid</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
            </Select>
          </FormGroup>
        </FormGrid>

        <ButtonContainer>
          <Button type="submit" disabled={loading}>
            {loading ? "Adding Bill..." : "Add Bill"}
          </Button>
        </ButtonContainer>
      </FormContainer>

      {/* Excel File Upload Form */}
      <FormContainer onSubmit={handleImport}>
        <SectionHeader>Upload Bills (Excel)</SectionHeader>
        <FileUploadContainer>
          <FileInputLabel>
            <FileInput
              id="fileInput"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
            />
            <span>Choose File</span>
          </FileInputLabel>
          <FileName>{file ? file.name : "No file chosen"}</FileName>
        </FileUploadContainer>

        <ButtonContainer>
          <Button type="submit" disabled={loading || !file}>
            {loading ? "Uploading..." : "Upload Bills"}
          </Button>
        </ButtonContainer>

        <NoteText>
          Note: Excel file should have columns for Bill Number, Retailer,
          Amount, Due Amount, Due Date, Bill Date, and Status (optional).
        </NoteText>
      </FormContainer>

      {message && <SuccessMessage>{message}</SuccessMessage>}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </Layout>
  );
};

export default BillsAdd;

// Styled Components
const PageHeader = styled.h1`
  font-size: 24px;
  margin-bottom: 24px;
  color: #333;
`;

const SectionHeader = styled.h2`
  font-size: 18px;
  margin-bottom: 16px;
  color: #444;
`;

const FormContainer = styled.form`
  background: white;
  padding: 20px;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  margin-bottom: 24px;
  max-width: 900px;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 16px;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 6px;
  color: #555;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid ${(props) => (props.hasError ? "#e74c3c" : "#ddd")};
  border-radius: 4px;
  font-size: 14px;
  transition: border 0.2s ease;
  background-color: white;

  &:focus {
    outline: none;
    border-color: #4299e1;
    box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.15);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;

  &:focus {
    outline: none;
    border-color: #4299e1;
    box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.15);
  }
`;

const ButtonContainer = styled.div`
  margin-top: 20px;
  display: flex;
  justify-content: flex-start;
`;

const Button = styled.button`
  padding: 10px 16px;
  background-color: #4299e1;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: #3182ce;
  }

  &:disabled {
    background-color: #a0aec0;
    cursor: not-allowed;
  }
`;

const FileUploadContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
`;

const FileInputLabel = styled.label`
  display: inline-block;
  padding: 8px 14px;
  background-color: #edf2f7;
  color: #4a5568;
  border: 1px solid #cbd5e0;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;

  &:hover {
    background-color: #e2e8f0;
  }
`;

const FileInput = styled.input`
  display: none;
`;

const FileName = styled.span`
  margin-left: 12px;
  font-size: 14px;
  color: #4a5568;
`;

const NoteText = styled.p`
  font-size: 14px;
  color: #718096;
  margin-top: 16px;
`;

const SuccessMessage = styled.div`
  padding: 12px 16px;
  background-color: #c6f6d5;
  color: #2f855a;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 14px;
`;

const ErrorMessage = styled.div`
  padding: 12px 16px;
  background-color: #fed7d7;
  color: #c53030;
  border-radius: 4px;
  margin-bottom: 16px;
  font-size: 14px;
`;

const ErrorText = styled.span`
  color: #e74c3c;
  font-size: 12px;
  margin-top: 4px;
  display: block;
`;
