// ProductAdd.js
import React, { useState, useEffect } from "react";
import * as xlsx from "xlsx";
import styled from "styled-components";
import Layout from "../components/Layout";
import { useModules } from "../contexts/ModuleContext";
import DynamicForm from "../components/DynamicForm";
import { createRecord, hydrateModuleDefinition } from "../utils/dynamicApi";

const ProductAdd = () => {
  const { getModuleName } = useModules();
  const [manualProduct, setManualProduct] = useState({});
  const [moduleDefinition, setModuleDefinition] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    const loadModule = async () => {
      try {
        const definition = await hydrateModuleDefinition("product");
        setModuleDefinition(definition);
      } catch (err) {
        setError("Failed to load product module");
      }
    };
    loadModule();
  }, []);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await createRecord("product", manualProduct);
      setMessage("Product added successfully");
      setManualProduct({});
      setFieldErrors({});
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add product");
      setFieldErrors(err.response?.data?.errors || {});
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage("");
    setError("");
  };

  const validateExcelStructure = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = xlsx.read(data, { type: "array" });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

          const headers = jsonData[0] || [];
          const lowerHeaders = headers.map((h) =>
            String(h).toLowerCase().trim(),
          );

          const hasCode = lowerHeaders.some((h) => h.includes("code"));
          const hasName = lowerHeaders.some(
            (h) => h.includes("product name") || h.includes("name"),
          );
          const hasPrice = lowerHeaders.some((h) => h.includes("price"));
          const hasWeight = lowerHeaders.some((h) => h.includes("weight"));
          const hasStock = lowerHeaders.some((h) => h.includes("stock"));

          if (!hasCode) resolve("Missing required column: Code");
          else if (!hasName) resolve("Missing required column: Product Name");
          else if (!hasPrice) resolve("Missing required column: Price");
          else if (!hasWeight) resolve("Missing required column: Weight");
          else if (!hasStock) resolve("Missing required column: Stock");
          else resolve(null);
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

  const handleImport = async (e) => {
    e.preventDefault();
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
    setError("");
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "http://localhost:1200/api/products/import",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

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
            if (data.type === "result") {
              setMessage(
                `Successfully imported ${data.importedCount} products. ${data.errorCount} records had errors.`,
              );
              if (data.errorCount > 0) {
                const exampleErrors = data.errors?.join(";\n") || "";
                setError(
                  `Some rows had errors. Examples:\n${exampleErrors}${
                    data.errorCount > 10 ? "\n...and more" : ""
                  }`,
                );
              }
            } else if (data.type === "error") {
              setError(data.message || "Failed to import products");
            }
          } catch (err) {
            console.error("Error parsing JSON:", err);
          }
        }
      }

      setFile(null);
      document.getElementById("fileInput").value = "";
    } catch (error) {
      console.error("Error importing file:", error);
      setError(error.message || "Failed to import products");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <PageHeader>Add {getModuleName("product", "plural")}</PageHeader>

      <FormContainer>
        <SectionHeader>Manual {getModuleName("product")} Entry</SectionHeader>
        {moduleDefinition ? (
          <DynamicForm
            moduleDefinition={moduleDefinition}
            values={manualProduct}
            onChange={(key, value) =>
              setManualProduct((prev) => ({ ...prev, [key]: value }))
            }
            onSubmit={handleManualSubmit}
            errors={fieldErrors}
            submitLabel={`Add ${getModuleName("product")}`}
          />
        ) : (
          <LoadingMessage>Loading fields...</LoadingMessage>
        )}
      </FormContainer>

      <UploadForm onSubmit={handleImport}>
        <SectionHeader>
          Upload {getModuleName("product", "plural")} (Excel)
        </SectionHeader>
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
              ? "Processing..."
              : `Upload ${getModuleName("product", "plural")}`}
          </Button>
        </ButtonContainer>

        <NoteText>
          Note: Excel file should have columns for Code, Product Name, Price,
          Weight, Scheme (optional), and Stock.
        </NoteText>
      </UploadForm>

      {message && <SuccessMessage>{message}</SuccessMessage>}
      {error && <ErrorMessage>{error}</ErrorMessage>}
    </Layout>
  );
};

const PageHeader = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: var(--nb-ink);
  text-align: center;
`;

const FormContainer = styled.div`
  background: var(--nb-white);
  padding: 1.25rem;
  border-radius: 0.5rem;
  box-shadow: var(--nb-shadow-md);
  margin-bottom: 1.5rem;
`;

const UploadForm = styled.form`
  background: var(--nb-white);
  padding: 1.25rem;
  border-radius: 0.5rem;
  box-shadow: var(--nb-shadow-md);
  margin-bottom: 1.5rem;
`;

const SectionHeader = styled.h2`
  font-size: 1.25rem;
  margin-bottom: 1rem;
  color: var(--nb-ink);
`;

const LoadingMessage = styled.div`
  padding: 1rem 0;
  color: var(--nb-ink);
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
`;

const FileInput = styled.input`
  display: none;
`;

const FileName = styled.span`
  font-size: 0.875rem;
  color: var(--nb-ink);
`;

const NoteText = styled.p`
  font-size: 0.875rem;
  color: var(--nb-ink);
  margin-top: 1rem;
`;

const SuccessMessage = styled.div`
  padding: 0.75rem 1rem;
  background-color: var(--nb-muted);
  color: var(--nb-blue);
  border-radius: 0.375rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
`;

const ErrorMessage = styled.div`
  padding: 0.75rem 1rem;
  background-color: var(--nb-muted);
  color: var(--nb-orange);
  border-radius: 0.375rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  white-space: pre-line;
`;

export default ProductAdd;
