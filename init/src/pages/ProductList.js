import React, { useEffect, useMemo, useState } from "react";
import styled from "styled-components";
import Layout from "../components/Layout";
import {
  FaSearch,
  FaTimes,
  FaFilter,
  FaEdit,
  FaTrash,
  FaPlus,
  FaUpload,
} from "react-icons/fa";
import * as xlsx from "xlsx";
import DynamicForm from "../components/DynamicForm";
import {
  fetchRecords,
  hydrateModuleDefinition,
  updateRecord,
  deleteRecord,
  createRecord,
} from "../utils/dynamicApi";

const STOCK_OPTIONS = [
  { label: "All Stock", value: "all" },
  { label: "In Stock (> 0)", value: "instock" },
  { label: "Out of Stock (= 0)", value: "outofstock" },
  { label: "Low Stock (≤ 10)", value: "low" },
];

const PRODUCT_FIELDS = [
  { key: "company", label: "Company", type: "text" },
  { key: "code", label: "Product Code", type: "text" },
  { key: "name", label: "Product Name", type: "text" },
  { key: "price", label: "Price (₹)", type: "number" },
  { key: "mrp", label: "MRP (₹)", type: "number" },
  { key: "weight", label: "Weight", type: "number" },
  { key: "scheme", label: "Scheme", type: "number" },
  { key: "stock", label: "Stock", type: "number" },
];

const ProductList = () => {
  const [records, setRecords] = useState([]);
  const [moduleDefinition, setModuleDefinition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Edit modal states
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete confirm states
  const [deletingRecord, setDeletingRecord] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addTab, setAddTab] = useState("manual");
  const [manualProduct, setManualProduct] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [file, setFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [message, setMessage] = useState("");

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

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchRecords("product");
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      setError("Failed to fetch products. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // ── Edit handlers ──
  const openEdit = (record) => {
    setEditingRecord(record);
    setEditForm({ ...(record.data || {}) });
    setEditError("");
  };

  const closeEdit = () => {
    setEditingRecord(null);
    setEditForm({});
    setEditError("");
  };

  const handleEditChange = (key, value) => {
    setEditForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!editForm.name?.trim()) {
      setEditError("Product Name is required.");
      return;
    }
    if (!editForm.code?.trim()) {
      setEditError("Product Code is required.");
      return;
    }
    if (editForm.price === "" || editForm.price === undefined) {
      setEditError("Price is required.");
      return;
    }
    if (editForm.stock === "" || editForm.stock === undefined) {
      setEditError("Stock is required.");
      return;
    }
    try {
      setSaving(true);
      setEditError("");
      await updateRecord("product", editingRecord._id, editForm);
      await fetchProducts();
      closeEdit();
    } catch (err) {
      setEditError(err?.response?.data?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete handlers ──
  const openDelete = (record) => setDeletingRecord(record);
  const closeDelete = () => setDeletingRecord(null);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteRecord("product", deletingRecord._id);
      await fetchProducts();
      closeDelete();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete product.");
      closeDelete();
    } finally {
      setDeleting(false);
    }
  };

  const openAddModal = () => {
    setAddTab("manual");
    setManualProduct({});
    setFieldErrors({});
    setFile(null);
    setError("");
    setMessage("");
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
  };

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
      await fetchProducts();
      setIsAddModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add product");
      setFieldErrors(err.response?.data?.errors || {});
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
    setMessage("");
    setError("");
  };

  const validateExcelStructure = (selectedFile) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = new Uint8Array(event.target.result);
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
        } catch (validationError) {
          resolve(`Error reading Excel file: ${validationError.message}`);
        }
      };
      reader.onerror = () =>
        resolve("Error reading file. Please check if the file is valid.");
      reader.readAsArrayBuffer(selectedFile);
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

    setImportLoading(true);
    setError("");
    setMessage("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "https://backend.laxmilube.in/api/products/import",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
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
                const exampleErrors = data.errors?.join("; ") || "";
                setError(`Some rows had errors. ${exampleErrors}`);
              }
            } else if (data.type === "error") {
              setError(data.message || "Failed to import products");
            }
          } catch {
            // ignore stream parse chunk errors
          }
        }
      }

      setFile(null);
      await fetchProducts();
      setIsAddModalOpen(false);
    } catch (importErr) {
      setError(importErr.message || "Failed to import products");
    } finally {
      setImportLoading(false);
    }
  };

  // ── Filter helpers ──
  const companyOptions = useMemo(() => {
    return [
      ...new Set(records.map((r) => r.data?.company).filter(Boolean)),
    ].sort();
  }, [records]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedCompany !== "all") count++;
    if (stockFilter !== "all") count++;
    if (minPrice !== "") count++;
    if (maxPrice !== "") count++;
    return count;
  }, [selectedCompany, stockFilter, minPrice, maxPrice]);

  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedCompany("all");
    setStockFilter("all");
    setMinPrice("");
    setMaxPrice("");
  };

  const filteredRecords = useMemo(() => {
    let result = records;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter((r) => {
        const d = r.data || {};
        return (
          String(d.name || "")
            .toLowerCase()
            .includes(q) ||
          String(d.code || "")
            .toLowerCase()
            .includes(q) ||
          String(d.company || "")
            .toLowerCase()
            .includes(q)
        );
      });
    }
    if (selectedCompany !== "all") {
      result = result.filter((r) => r.data?.company === selectedCompany);
    }
    if (stockFilter === "instock")
      result = result.filter((r) => Number(r.data?.stock) > 0);
    else if (stockFilter === "outofstock")
      result = result.filter((r) => Number(r.data?.stock) === 0);
    else if (stockFilter === "low")
      result = result.filter(
        (r) => Number(r.data?.stock) > 0 && Number(r.data?.stock) <= 10,
      );
    if (minPrice !== "")
      result = result.filter((r) => Number(r.data?.price) >= Number(minPrice));
    if (maxPrice !== "")
      result = result.filter((r) => Number(r.data?.price) <= Number(maxPrice));
    return result;
  }, [records, searchTerm, selectedCompany, stockFilter, minPrice, maxPrice]);

  return (
    <Layout>
      <TopBar>
        <PageHeader>Product List</PageHeader>
        <Stats>
          {filteredRecords.length} of {records.length} products
        </Stats>
        <AddButton onClick={openAddModal}>
          <FaPlus size={12} /> Add Product
        </AddButton>
      </TopBar>

      <ControlsRow>
        <SearchContainer>
          <FaSearch color="var(--nb-ink)" opacity={0.4} />
          <SearchInput
            type="text"
            placeholder="Search by name, code or company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <ClearBtn onClick={() => setSearchTerm("")}>
              <FaTimes size={12} />
            </ClearBtn>
          )}
        </SearchContainer>

        <FilterToggle
          onClick={() => setShowFilters((v) => !v)}
          active={showFilters || activeFilterCount > 0}
        >
          <FaFilter size={13} />
          Filters
          {activeFilterCount > 0 && <Badge>{activeFilterCount}</Badge>}
        </FilterToggle>

        {activeFilterCount > 0 && (
          <ClearAllBtn onClick={clearAllFilters}>Clear all</ClearAllBtn>
        )}
      </ControlsRow>

      {showFilters && (
        <FilterPanel>
          <FilterGroup>
            <FilterLabel>Company</FilterLabel>
            <FilterSelect
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
            >
              <option value="all">All Companies</option>
              {companyOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </FilterSelect>
          </FilterGroup>
          <FilterGroup>
            <FilterLabel>Stock Status</FilterLabel>
            <FilterSelect
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
            >
              {STOCK_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </FilterSelect>
          </FilterGroup>
          <FilterGroup>
            <FilterLabel>Price Range (₹)</FilterLabel>
            <PriceRow>
              <PriceInput
                type="number"
                placeholder="Min"
                value={minPrice}
                min={0}
                onChange={(e) => setMinPrice(e.target.value)}
              />
              <PriceSep>–</PriceSep>
              <PriceInput
                type="number"
                placeholder="Max"
                value={maxPrice}
                min={0}
                onChange={(e) => setMaxPrice(e.target.value)}
              />
            </PriceRow>
          </FilterGroup>
        </FilterPanel>
      )}

      {activeFilterCount > 0 && (
        <ChipsRow>
          {selectedCompany !== "all" && (
            <Chip>
              Company: {selectedCompany}
              <ChipRemove onClick={() => setSelectedCompany("all")}>
                <FaTimes size={10} />
              </ChipRemove>
            </Chip>
          )}
          {stockFilter !== "all" && (
            <Chip>
              {STOCK_OPTIONS.find((o) => o.value === stockFilter)?.label}
              <ChipRemove onClick={() => setStockFilter("all")}>
                <FaTimes size={10} />
              </ChipRemove>
            </Chip>
          )}
          {minPrice !== "" && (
            <Chip>
              Min ₹{minPrice}
              <ChipRemove onClick={() => setMinPrice("")}>
                <FaTimes size={10} />
              </ChipRemove>
            </Chip>
          )}
          {maxPrice !== "" && (
            <Chip>
              Max ₹{maxPrice}
              <ChipRemove onClick={() => setMaxPrice("")}>
                <FaTimes size={10} />
              </ChipRemove>
            </Chip>
          )}
        </ChipsRow>
      )}

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {message && <SuccessMessage>{message}</SuccessMessage>}

      {loading ? (
        <LoadingMessage>Loading products...</LoadingMessage>
      ) : (
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>#</Th>
                <Th>Company</Th>
                <Th>Code</Th>
                <Th>Product Name</Th>
                <Th>Price (₹)</Th>
                <Th>MRP (₹)</Th>
                <Th>Weight</Th>
                <Th>Scheme</Th>
                <Th>Stock</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <Td
                    colSpan={10}
                    style={{ textAlign: "center", opacity: 0.5 }}
                  >
                    No products found
                  </Td>
                </tr>
              ) : (
                filteredRecords.map((record, index) => {
                  const d = record.data || {};
                  const stock = Number(d.stock);
                  return (
                    <tr key={record._id}>
                      <Td>{index + 1}</Td>
                      <Td>{d.company || "—"}</Td>
                      <Td>
                        <CodeBadge>{d.code || "—"}</CodeBadge>
                      </Td>
                      <Td>
                        <strong>{d.name || "—"}</strong>
                      </Td>
                      <Td>₹{d.price ?? "—"}</Td>
                      <Td>₹{d.mrp ?? "—"}</Td>
                      <Td>{d.weight ?? "—"}</Td>
                      <Td>{d.scheme ?? "—"}</Td>
                      <Td>
                        <StockBadge
                          low={stock <= 10 && stock > 0}
                          out={stock === 0}
                        >
                          {stock}
                        </StockBadge>
                      </Td>
                      <Td>
                        <ActionGroup>
                          <ActionBtn
                            title="Edit product"
                            onClick={() => openEdit(record)}
                          >
                            <FaEdit size={14} />
                          </ActionBtn>
                          <ActionBtn
                            title="Delete product"
                            danger
                            onClick={() => openDelete(record)}
                          >
                            <FaTrash size={14} />
                          </ActionBtn>
                        </ActionGroup>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </Table>
        </TableWrapper>
      )}

      {/* ── Edit Modal ── */}
      {editingRecord && (
        <ModalOverlay onClick={closeEdit}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Edit Product</ModalTitle>
              <ModalClose onClick={closeEdit}>
                <FaTimes />
              </ModalClose>
            </ModalHeader>
            <ModalBody>
              {PRODUCT_FIELDS.map((field) => (
                <FormGroup key={field.key}>
                  <FormLabel>{field.label}</FormLabel>
                  <FormInput
                    type={field.type === "number" ? "number" : "text"}
                    value={editForm[field.key] ?? ""}
                    onChange={(e) =>
                      handleEditChange(
                        field.key,
                        field.type === "number"
                          ? e.target.value
                          : e.target.value,
                      )
                    }
                    min={field.type === "number" ? 0 : undefined}
                  />
                </FormGroup>
              ))}
              {editError && <EditError>{editError}</EditError>}
            </ModalBody>
            <ModalFooter>
              <CancelBtn onClick={closeEdit}>Cancel</CancelBtn>
              <SaveBtn onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </SaveBtn>
            </ModalFooter>
          </ModalBox>
        </ModalOverlay>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deletingRecord && (
        <ModalOverlay onClick={closeDelete}>
          <ModalBox small onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Delete Product</ModalTitle>
              <ModalClose onClick={closeDelete}>
                <FaTimes />
              </ModalClose>
            </ModalHeader>
            <ModalBody>
              <DeleteMsg>
                Are you sure you want to delete{" "}
                <strong>{deletingRecord.data?.name || "this product"}</strong>?
                This action cannot be undone.
              </DeleteMsg>
            </ModalBody>
            <ModalFooter>
              <CancelBtn onClick={closeDelete}>Cancel</CancelBtn>
              <DeleteConfirmBtn onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Yes, Delete"}
              </DeleteConfirmBtn>
            </ModalFooter>
          </ModalBox>
        </ModalOverlay>
      )}

      {isAddModalOpen && (
        <ModalOverlay onClick={closeAddModal}>
          <ModalBox onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Add Product</ModalTitle>
              <ModalClose onClick={closeAddModal}>
                <FaTimes />
              </ModalClose>
            </ModalHeader>

            <TabRow>
              <TabButton
                active={addTab === "manual"}
                onClick={() => setAddTab("manual")}
              >
                Manual Entry
              </TabButton>
              <TabButton
                active={addTab === "import"}
                onClick={() => setAddTab("import")}
              >
                Excel Import
              </TabButton>
            </TabRow>

            <ModalBody>
              {addTab === "manual" ? (
                moduleDefinition ? (
                  <DynamicForm
                    moduleDefinition={moduleDefinition}
                    values={manualProduct}
                    onChange={(key, value) =>
                      setManualProduct((prev) => ({ ...prev, [key]: value }))
                    }
                    onSubmit={handleManualSubmit}
                    errors={fieldErrors}
                    submitLabel="Add Product"
                  />
                ) : (
                  <LoadingMessage>Loading fields...</LoadingMessage>
                )
              ) : (
                <ImportForm onSubmit={handleImport}>
                  <FormGroup>
                    <FormLabel>Upload Products Excel File</FormLabel>
                    <FormInput
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileChange}
                    />
                    {file && <SmallText>{file.name}</SmallText>}
                  </FormGroup>

                  <SmallText>
                    Required columns: Code, Product Name, Price, Weight, Stock.
                    Scheme is optional.
                  </SmallText>

                  <ModalFooter
                    style={{
                      padding: 0,
                      borderTop: "none",
                      marginTop: "0.75rem",
                    }}
                  >
                    <CancelBtn type="button" onClick={closeAddModal}>
                      Cancel
                    </CancelBtn>
                    <SaveBtn type="submit" disabled={importLoading || !file}>
                      <FaUpload size={12} style={{ marginRight: 6 }} />
                      {importLoading ? "Uploading..." : "Import Products"}
                    </SaveBtn>
                  </ModalFooter>
                </ImportForm>
              )}
            </ModalBody>
          </ModalBox>
        </ModalOverlay>
      )}
    </Layout>
  );
};

/* ─── Styled Components ─── */

const TopBar = styled.div`
  display: flex;
  align-items: baseline;
  gap: 1rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
`;

const AddButton = styled.button`
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: none;
  border-radius: 6px;
  background: var(--nb-blue);
  color: #fff;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.5rem 0.8rem;
  cursor: pointer;
`;

const PageHeader = styled.h1`
  font-size: 2rem;
  color: var(--nb-ink);
  margin: 0;
`;

const Stats = styled.span`
  font-size: 0.85rem;
  color: var(--nb-ink);
  opacity: 0.5;
`;

const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  background: var(--nb-white);
  flex: 1;
  min-width: 220px;
  max-width: 380px;
  gap: 0.5rem;
`;

const SearchInput = styled.input`
  border: none;
  outline: none;
  width: 100%;
  background: transparent;
  color: var(--nb-ink);
  font-size: 0.9rem;
`;

const ClearBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: var(--nb-ink);
  opacity: 0.4;
  padding: 0;
  display: flex;
  align-items: center;
  &:hover {
    opacity: 0.8;
  }
`;

const FilterToggle = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border: 1px solid
    ${({ active }) => (active ? "var(--nb-blue)" : "var(--nb-border)")};
  border-radius: 6px;
  background: ${({ active }) =>
    active ? "var(--nb-blue)" : "var(--nb-white)"};
  color: ${({ active }) => (active ? "#fff" : "var(--nb-ink)")};
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    border-color: var(--nb-blue);
  }
`;

const Badge = styled.span`
  background: #fff;
  color: var(--nb-blue);
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0 6px;
  min-width: 18px;
  text-align: center;
`;

const ClearAllBtn = styled.button`
  background: none;
  border: none;
  color: var(--nb-orange);
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  &:hover {
    text-decoration: underline;
  }
`;

const FilterPanel = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  padding: 1rem 1.25rem;
  background: var(--nb-muted);
  border: 1px solid var(--nb-border);
  border-radius: 8px;
  margin-bottom: 0.75rem;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 160px;
`;

const FilterLabel = styled.label`
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--nb-ink);
  opacity: 0.6;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const FilterSelect = styled.select`
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  background: var(--nb-white);
  color: var(--nb-ink);
  font-size: 0.875rem;
  outline: none;
  cursor: pointer;
  &:focus {
    border-color: var(--nb-blue);
  }
`;

const PriceRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const PriceInput = styled.input`
  width: 80px;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  background: var(--nb-white);
  color: var(--nb-ink);
  font-size: 0.875rem;
  outline: none;
  &:focus {
    border-color: var(--nb-blue);
  }
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
  }
`;

const PriceSep = styled.span`
  color: var(--nb-ink);
  opacity: 0.4;
  font-size: 0.9rem;
`;

const ChipsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
`;

const Chip = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.6rem;
  background: var(--nb-blue);
  color: #fff;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 500;
`;

const ChipRemove = styled.button`
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  opacity: 0.75;
  &:hover {
    opacity: 1;
  }
`;

const ErrorMessage = styled.div`
  color: var(--nb-orange);
  margin-bottom: 1rem;
  padding: 0.5rem 0.75rem;
  background-color: var(--nb-muted);
  border-radius: 4px;
`;

const SuccessMessage = styled.div`
  color: var(--nb-blue);
  margin-bottom: 1rem;
  padding: 0.5rem 0.75rem;
  background-color: var(--nb-muted);
  border-radius: 4px;
`;

const LoadingMessage = styled.div`
  color: var(--nb-blue);
  margin-bottom: 1rem;
`;

/* ── Table ── */
const TableWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid var(--nb-border);
  border-radius: 8px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
`;

const Th = styled.th`
  padding: 0.75rem 1rem;
  background: var(--nb-muted);
  font-weight: 600;
  color: var(--nb-ink);
  text-align: left;
  border-bottom: 1px solid var(--nb-border);
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--nb-border);
  color: var(--nb-ink);
  vertical-align: middle;
`;

const CodeBadge = styled.span`
  display: inline-block;
  padding: 0.15rem 0.5rem;
  background: var(--nb-muted);
  border: 1px solid var(--nb-border);
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.82rem;
`;

const StockBadge = styled.span`
  display: inline-block;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${({ out, low }) =>
    out ? "#fee2e2" : low ? "#fef9c3" : "#dcfce7"};
  color: ${({ out, low }) => (out ? "#dc2626" : low ? "#a16207" : "#166534")};
`;

const ActionGroup = styled.div`
  display: flex;
  gap: 0.4rem;
`;

const ActionBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid ${({ danger }) => (danger ? "#fca5a5" : "var(--nb-border)")};
  border-radius: 6px;
  background: ${({ danger }) => (danger ? "#fff1f1" : "var(--nb-white)")};
  color: ${({ danger }) => (danger ? "#dc2626" : "var(--nb-ink)")};
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    background: ${({ danger }) => (danger ? "#fee2e2" : "var(--nb-muted)")};
    border-color: ${({ danger }) => (danger ? "#f87171" : "var(--nb-blue)")};
    color: ${({ danger }) => (danger ? "#b91c1c" : "var(--nb-blue)")};
  }
`;

/* ── Modal ── */
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalBox = styled.div`
  background: var(--nb-white);
  border-radius: 12px;
  width: 100%;
  max-width: ${({ small }) => (small ? "420px" : "560px")};
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.5rem;
  border-bottom: 1px solid var(--nb-border);
`;

const ModalTitle = styled.h2`
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--nb-ink);
  margin: 0;
`;

const ModalClose = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: var(--nb-ink);
  opacity: 0.5;
  font-size: 1rem;
  display: flex;
  align-items: center;
  &:hover {
    opacity: 1;
  }
`;

const ModalBody = styled.div`
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const TabRow = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0.85rem 1.5rem 0;
`;

const TabButton = styled.button`
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  padding: 0.45rem 0.75rem;
  background: ${({ active }) =>
    active ? "var(--nb-blue)" : "var(--nb-white)"};
  color: ${({ active }) => (active ? "#fff" : "var(--nb-ink)")};
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
`;

const ImportForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const SmallText = styled.div`
  font-size: 0.8rem;
  color: var(--nb-ink);
  opacity: 0.7;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--nb-border);
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;

const FormLabel = styled.label`
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--nb-ink);
  opacity: 0.6;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const FormInput = styled.input`
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  font-size: 0.9rem;
  color: var(--nb-ink);
  background: var(--nb-white);
  outline: none;
  &:focus {
    border-color: var(--nb-blue);
  }
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
  }
`;

const EditError = styled.div`
  color: #dc2626;
  font-size: 0.85rem;
  padding: 0.5rem 0.75rem;
  background: #fee2e2;
  border-radius: 6px;
`;

const DeleteMsg = styled.p`
  font-size: 0.95rem;
  color: var(--nb-ink);
  line-height: 1.6;
  margin: 0;
`;

const CancelBtn = styled.button`
  padding: 0.55rem 1.25rem;
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  background: var(--nb-white);
  color: var(--nb-ink);
  font-size: 0.9rem;
  cursor: pointer;
  &:hover {
    background: var(--nb-muted);
  }
`;

const SaveBtn = styled.button`
  padding: 0.55rem 1.25rem;
  border: none;
  border-radius: 6px;
  background: var(--nb-blue);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    opacity: 0.9;
  }
`;

const DeleteConfirmBtn = styled.button`
  padding: 0.55rem 1.25rem;
  border: none;
  border-radius: 6px;
  background: #dc2626;
  color: #fff;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    background: #b91c1c;
  }
`;

export default ProductList;
