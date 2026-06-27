import React, { useEffect, useState } from "react";
import styled from "styled-components";
import Layout from "../components/Layout";
import { useModules } from "../contexts/ModuleContext";
import * as xlsx from "xlsx";
import DynamicForm from "../components/DynamicForm";
import { createRecord, hydrateModuleDefinition } from "../utils/dynamicApi";

const BillsAdd = () => {
  const [file, setFile] = useState(null);
  const [manualBill, setManualBill] = useState({});
  const [moduleDefinition, setModuleDefinition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });
  const API_URL = "http://localhost:2500/api";
  const { getModuleName } = useModules();

  useEffect(() => {
    const loadModule = async () => {
      try {
        const definition = await hydrateModuleDefinition("bill");
        setModuleDefinition(definition);
      } catch (err) {
        setError("Failed to load bill module");
      }
    };
    loadModule();
  }, []);

  const handleImport = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setImportProgress({ current: 0, total: 0 });

    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    const validationError = await validateExcelStructure(file);
    if (validationError) {
      setError(validationError);
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

      const response = await fetch(`${API_URL}/bills/import`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error("ReadableStream not supported in this browser");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const data = JSON.parse(line);

            if (data.type === "progress") {
              setImportProgress({
                current: data.current,
                total: data.total,
              });
            } else if (data.type === "result") {
              setMessage(
                `Successfully imported ${data.importedCount} bills. ${data.errorCount} records had errors.`
              );
              if (data.errorCount > 0) {
                const exampleErrors = data.errors?.join(";\n") || "";
                setError(
                  `Some rows had errors. Examples:\n${exampleErrors}${
                    data.errorCount > 10 ? "\n...and more" : ""
                  }`
                );
              }
            } else if (data.type === "error") {
              setError(data.message || "Failed to import bills");
            }
          } catch (err) {
            console.error("Error parsing JSON:", err);
          }
        }
      }

      setFile(null);
      document.getElementById("fileInput").value = "";
    } catch (err) {
      console.error("Error importing file:", err);
      setError(err.message || "Failed to import bills");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setMessage("");
    setError("");
  };

  const validateExcelStructure = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = xlsx.read(data, { type: "array", cellDates: true });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

          const headers = jsonData[0] || [];
          const lowerHeaders = headers.map((h) =>
            String(h).toLowerCase().trim()
          );

          const requiredColumns = [
            "billno",
            "custname",
            "billamt",
            "billdate",
            "day",
          ];

          const missingColumns = requiredColumns.filter(
            (col) => !lowerHeaders.includes(col.toLowerCase())
          );

          if (missingColumns.length > 0) {
            resolve(`Missing required columns: ${missingColumns.join(", ")}`);
            return;
          }

          resolve(null);
        } catch (error) {
          resolve("Error reading Excel file: " + error.message);
        }
      };
      reader.onerror = () => {
        resolve("Error reading file. Please check if the file is valid.");
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await createRecord("bill", manualBill);
      setMessage("Bill added successfully");
      setManualBill({});
      setFieldErrors({});
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add bill");
      setFieldErrors(err.response?.data?.errors || {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <PageHeader>Add {getModuleName('bill', 'plural')}</PageHeader>

      <FormContainer>
        <SectionHeader>Manual {getModuleName('bill')} Entry</SectionHeader>
        {moduleDefinition ? (
          <DynamicForm
            moduleDefinition={moduleDefinition}
            values={manualBill}
            onChange={(key, value) =>
              setManualBill((prev) => ({ ...prev, [key]: value }))
            }
            onSubmit={handleManualSubmit}
            errors={fieldErrors}
            submitLabel={`Add ${getModuleName('bill')}`}
          />
        ) : (
          <LoadingMessage>Loading fields...</LoadingMessage>
        )}

        {message && <SuccessMessage>{message}</SuccessMessage>}
        {error && <ErrorMessage>{error}</ErrorMessage>}
      </FormContainer>

      <UploadForm onSubmit={handleImport}>
        <SectionHeader>Upload {getModuleName('bill', 'plural')} (Excel)</SectionHeader>
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
            {loading
              ? importProgress.total > 0
                ? `Importing ${importProgress.current} of ${importProgress.total} rows`
                : "Processing..."
              : `Upload ${getModuleName('bill', 'plural')}`}
          </Button>
          {loading && importProgress.total > 0 && (
            <ProgressBar>
              <ProgressFill
                width={`${
                  (importProgress.current / importProgress.total) * 100
                }%`}
              />
            </ProgressBar>
          )}
        </ButtonContainer>

        <NoteText>
          Note: Excel file should have columns for Bill Number, Retailer, Amount,
          Due Amount, Bill Date, and Collection Day.
        </NoteText>
      </UploadForm>

      {message && <SuccessMessage>{message}</SuccessMessage>}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </Layout>
  );
};

export default BillsAdd;

const PageHeader = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: var(--nb-ink);
  text-align: center;
`;

const SectionHeader = styled.h2`
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: var(--nb-ink);
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--nb-border);
`;

const FormContainer = styled.div`
  background: var(--nb-white);
  padding: 1.25rem;
  border-radius: 0.5rem;
  box-shadow: var(--nb-shadow-md);
  margin-bottom: 1.5rem;
  width: 100%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
`;

const UploadForm = styled.form`
  background: var(--nb-white);
  padding: 1.25rem;
  border-radius: 0.5rem;
  box-shadow: var(--nb-shadow-md);
  margin-bottom: 1.5rem;
  width: 100%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
`;

const LoadingMessage = styled.div`
  padding: 1rem 0;
  color: var(--nb-ink);
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 4px;
  background: var(--nb-border);
  border-radius: 2px;
  margin-top: 8px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: var(--nb-blue);
  width: ${(props) => props.width};
  transition: width 0.3s ease;
`;

const ButtonContainer = styled.div`
  margin-top: 1.25rem;
  display: flex;
  justify-content: center;
`;

const Button = styled.button`
  padding: 0.625rem 1rem;
  background-color: var(--nb-blue);
  color: var(--nb-white);
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  max-width: 200px;
`;

const FileUploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const FileInputLabel = styled.label`
  display: inline-block;
  padding: 0.625rem 1rem;
  background-color: var(--nb-muted);
  color: var(--nb-ink);
  border: 1px solid var(--nb-border);
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  text-align: center;
  transition: all 0.2s ease;
`;

const FileInput = styled.input`
  display: none;
`;

const FileName = styled.span`
  font-size: 0.875rem;
  color: var(--nb-ink);
  word-break: break-all;
`;

const NoteText = styled.p`
  font-size: 0.875rem;
  color: var(--nb-ink);
  margin-top: 1rem;
  line-height: 1.5;
`;

const SuccessMessage = styled.div`
  padding: 0.75rem 1rem;
  background-color: var(--nb-muted);
  color: var(--nb-blue);
  border-radius: 0.375rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  width: 100%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
`;

const ErrorMessage = styled.div`
  padding: 0.75rem 1rem;
  background-color: var(--nb-muted);
  color: var(--nb-orange);
  border-radius: 0.375rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  width: 100%;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
  white-space: pre-line;
`;
