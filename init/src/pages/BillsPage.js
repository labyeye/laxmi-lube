import React, { useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";
import * as xlsx from "xlsx";
import {
  FaEdit,
  FaTrash,
  FaUserPlus,
  FaSearch,
  FaFileInvoiceDollar,
  FaPlus,
} from "react-icons/fa";
import Layout from "../components/Layout";
import DynamicForm from "../components/DynamicForm";
import { createRecord, hydrateModuleDefinition } from "../utils/dynamicApi";

const BillsPage = () => {
  const [bills, setBills] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedBill, setSelectedBill] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addTab, setAddTab] = useState("manual");
  const [moduleDefinition, setModuleDefinition] = useState(null);
  const [manualBill, setManualBill] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [editFormData, setEditFormData] = useState({
    billNumber: "",
    retailer: "",
    amount: "",
    dueAmount: "",
    billDate: "",
    collectionDay: "",
    status: "",
  });
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const [billsResponse, staffResponse] = await Promise.all([
        axios.get("https://backend.laxmilube.in/api/bills", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
        axios.get("https://backend.laxmilube.in/api/users/staff", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }),
      ]);

      setBills(billsResponse.data);
      setStaff(staffResponse.data);
    } catch (err) {
      setError("Failed to load bills. Please try again later.");
      setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const loadModule = async () => {
      try {
        const definition = await hydrateModuleDefinition("bill");
        setModuleDefinition(definition);
      } catch {
        setError("Failed to load bill module definition");
      }
    };
    loadModule();
  }, []);

  const openAddModal = () => {
    setAddTab("manual");
    setManualBill({});
    setFieldErrors({});
    setImportFile(null);
    setImportResult(null);
    setError("");
    setMessage("");
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
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
      await fetchData();
      setIsAddModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add bill");
      setFieldErrors(err.response?.data?.errors || {});
    } finally {
      setLoading(false);
    }
  };

  const handleImportFileChange = (e) => {
    setImportFile(e.target.files?.[0] || null);
    setMessage("");
    setError("");
  };

  const validateExcelStructure = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target.result);
          const workbook = xlsx.read(data, { type: "array", cellDates: true });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
          const headers = jsonData[0] || [];
          const lowerHeaders = headers.map((h) =>
            String(h).toLowerCase().trim(),
          );
          const requiredColumns = [
            "billno",
            "custname",
            "billamt",
            "billdate",
            "day",
          ];
          const missingColumns = requiredColumns.filter(
            (col) => !lowerHeaders.includes(col.toLowerCase()),
          );
          if (missingColumns.length > 0) {
            resolve(`Missing required columns: ${missingColumns.join(", ")}`);
            return;
          }
          resolve(null);
        } catch (error) {
          resolve(`Error reading Excel file: ${error.message}`);
        }
      };
      reader.onerror = () =>
        resolve("Error reading file. Please check if the file is valid.");
      reader.readAsArrayBuffer(file);
    });
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setImportProgress({ current: 0, total: 0 });

    if (!importFile) {
      setError("Please select a file to upload");
      return;
    }

    const validationError = await validateExcelStructure(importFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setImportLoading(true);
    const formData = new FormData();
    formData.append("file", importFile);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        "https://backend.laxmilube.in/api/bills/import",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        },
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      if (!response.body)
        throw new Error("ReadableStream not supported in this browser");

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
              setImportResult({
                imported: data.importedCount || 0,
                existing: data.alreadyExistsCount || 0,
                errors: data.errorCount || 0,
              });
            } else if (data.type === "error") {
              setError(data.message || "Failed to import bills");
            }
          } catch {
            // ignore chunk parse failure
          }
        }
      }

      setImportFile(null);
      await fetchData();
      setIsAddModalOpen(false);
    } catch (err) {
      setError(err.message || "Failed to import bills");
    } finally {
      setImportLoading(false);
    }
  };

  const openAssignModal = (bill) => {
    setSelectedBill(bill);
    setIsModalOpen(true);
  };
  const handleEditBill = (bill) => {
    setSelectedBill(bill);
    setEditFormData({
      billNumber: bill.billNumber,
      retailer: bill.retailer,
      amount: bill.amount,
      dueAmount: bill.dueAmount,
      billDate: bill.billDate
        ? new Date(bill.billDate).toISOString().split("T")[0]
        : "",
      collectionDay: bill.collectionDay || "",
      status: bill.status,
    });
    setIsEditModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedBill(null);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedBill(null);
    setEditFormData({
      billNumber: "",
      retailer: "",
      amount: "",
      dueAmount: "",
      billDate: "",
      collectionDay: "",
      status: "",
    });
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleUpdateBill = async (e) => {
    e.preventDefault();

    if (!selectedBill) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `https://backend.laxmilube.in/api/bills/${selectedBill._id}`,
        editFormData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      setBills((prevBills) =>
        prevBills.map((bill) =>
          bill._id === selectedBill._id ? response.data : bill,
        ),
      );

      setMessage("Bill successfully updated");
      setTimeout(() => setMessage(""), 5000);
      closeEditModal();
    } catch (err) {
      setError(
        err.response?.data?.error || "Failed to update bill. Please try again.",
      );
      setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignStaff = async (e) => {
    e.preventDefault();
    const staffId = e.target.staffId.value;

    if (!staffId || !selectedBill) {
      setError("Please select a staff member");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `https://backend.laxmilube.in/api/bills/${selectedBill._id}/assign`,
        { staffId },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setBills((prevBills) =>
        prevBills.map((bill) =>
          bill._id === selectedBill._id ? response.data : bill,
        ),
      );

      setMessage("Bill successfully assigned to staff member");
      setTimeout(() => setMessage(""), 5000);
      closeModal();
    } catch (err) {
      setError("Failed to assign staff. Please try again.");
      setTimeout(() => setError(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBill = async (billId) => {
    if (!window.confirm("Are you sure you want to delete this bill?")) return;

    const token = localStorage.getItem("token");
    try {
      await axios.delete(`https://backend.laxmilube.in/api/bills/${billId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setBills(bills.filter((bill) => bill._id !== billId));
      setMessage("Bill successfully deleted");
      setTimeout(() => setMessage(""), 5000);
    } catch (err) {
      setError("Failed to delete bill. Please try again.");
      setTimeout(() => setError(""), 5000);
    }
  };

  const filteredBills = bills.filter(
    (bill) =>
      bill.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.retailer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (bill.assignedTo &&
        staff
          .find((s) => s._id === bill.assignedTo)
          ?.name.toLowerCase()
          .includes(searchTerm.toLowerCase())),
  );

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Layout>
      <PageContainer>
        <Header>
          <Title>
            <FaFileInvoiceDollar size={24} />
            <h1>Bills Management</h1>
          </Title>
          <HeaderActions>
            <AddBillButton onClick={openAddModal}>
              <FaPlus /> Add Bill
            </AddBillButton>
            <SearchBox>
              <FaSearch />
              <input
                type="text"
                placeholder="Search bills..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchBox>
          </HeaderActions>
        </Header>

        {message && <Message type="success">{message}</Message>}
        {error && <Message type="error">{error}</Message>}

        {loading ? (
          <LoadingIndicator>
            <Spinner />
            Loading bills...
          </LoadingIndicator>
        ) : (
          <>
            <TableContainer>
              <BillsTable>
                <thead>
                  <tr>
                    <th>Bill #</th>
                    <th>Retailer</th>
                    <th>Amount</th>
                    <th>Bill Date</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.length > 0 ? (
                    filteredBills.map((bill) => (
                      <tr key={bill._id}>
                        <td>{bill.billNumber}</td>
                        <td>{bill.retailer}</td>
                        <td>{formatCurrency(bill.amount)}</td>
                        <td>
                          {new Date(bill.billDate).toLocaleDateString()}
                        </td>{" "}
                        {/* Changed from dueDate to billDate */}
                        <td>
                          <StatusBadge status={bill.status}>
                            {bill.status}
                          </StatusBadge>
                        </td>
                        <td>{bill.assignedToName || "Not Assigned"}</td>
                        <td>
                          <ActionButtons>
                            <AssignButton onClick={() => openAssignModal(bill)}>
                              <FaUserPlus />
                            </AssignButton>
                            <EditButton onClick={() => handleEditBill(bill)}>
                              <FaEdit />
                            </EditButton>
                            <DeleteButton
                              onClick={() => handleDeleteBill(bill._id)}
                            >
                              <FaTrash />
                            </DeleteButton>
                          </ActionButtons>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        style={{ textAlign: "center", padding: "20px" }}
                      >
                        No bills found matching your search
                      </td>
                    </tr>
                  )}
                </tbody>
              </BillsTable>
            </TableContainer>

            {/* Modal for Assigning Staff */}
            {isModalOpen && selectedBill && (
              <ModalOverlay>
                <ModalContent>
                  <ModalHeader>
                    <h3>Assign Bill #{selectedBill.billNumber}</h3>
                    <CloseButton onClick={closeModal}>×</CloseButton>
                  </ModalHeader>
                  <Form onSubmit={handleAssignStaff}>
                    <FormGroup>
                      <label>Select Staff Member</label>
                      <Select name="staffId">
                        <option value="">Select a staff member</option>
                        {staff.map((staffMember) => (
                          <option key={staffMember._id} value={staffMember._id}>
                            {staffMember.name}
                          </option>
                        ))}
                      </Select>
                    </FormGroup>
                    <ButtonGroup>
                      <PrimaryButton type="submit">Assign Staff</PrimaryButton>
                      <SecondaryButton type="button" onClick={closeModal}>
                        Cancel
                      </SecondaryButton>
                    </ButtonGroup>
                  </Form>
                </ModalContent>
              </ModalOverlay>
            )}

            {isAddModalOpen && (
              <ModalOverlay>
                <ModalContent>
                  <ModalHeader>
                    <h3>Add Bill</h3>
                    <CloseButton onClick={closeAddModal}>×</CloseButton>
                  </ModalHeader>

                  <TabRow>
                    <TabBtn
                      type="button"
                      active={addTab === "manual"}
                      onClick={() => setAddTab("manual")}
                    >
                      Manual Entry
                    </TabBtn>
                    <TabBtn
                      type="button"
                      active={addTab === "import"}
                      onClick={() => setAddTab("import")}
                    >
                      Excel Import
                    </TabBtn>
                  </TabRow>

                  {addTab === "manual" ? (
                    <Form as="div">
                      {moduleDefinition ? (
                        <DynamicForm
                          moduleDefinition={moduleDefinition}
                          values={manualBill}
                          onChange={(key, value) =>
                            setManualBill((prev) => ({ ...prev, [key]: value }))
                          }
                          onSubmit={handleManualSubmit}
                          errors={fieldErrors}
                          submitLabel="Add Bill"
                        />
                      ) : (
                        <LoadingIndicator>
                          <Spinner />
                          Loading fields...
                        </LoadingIndicator>
                      )}
                    </Form>
                  ) : (
                    <Form onSubmit={handleImportSubmit}>
                      <FormGroup>
                        <label>Upload Bill Excel File</label>
                        <Input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleImportFileChange}
                        />
                        {importFile && <small>{importFile.name}</small>}
                      </FormGroup>

                      {importResult && (
                        <ImportSummary>
                          {importResult.imported > 0 && <span className="ok">✓ {importResult.imported} imported</span>}
                          {importResult.existing > 0 && <span className="skip">⊘ {importResult.existing} already exist</span>}
                          {importResult.errors > 0 && <span className="err">✕ {importResult.errors} rows had errors</span>}
                        </ImportSummary>
                      )}

                      <ButtonGroup>
                        <PrimaryButton
                          type="submit"
                          disabled={importLoading || !importFile}
                        >
                          {importLoading ? "Uploading..." : "Import Bills"}
                        </PrimaryButton>
                        <SecondaryButton type="button" onClick={closeAddModal}>
                          Cancel
                        </SecondaryButton>
                      </ButtonGroup>
                    </Form>
                  )}
                </ModalContent>
              </ModalOverlay>
            )}

            {/* Modal for Editing Bill */}
            {isEditModalOpen && selectedBill && (
              <ModalOverlay>
                <ModalContent>
                  <ModalHeader>
                    <h3>Edit Bill #{selectedBill.billNumber}</h3>
                    <CloseButton onClick={closeEditModal}>×</CloseButton>
                  </ModalHeader>
                  <Form onSubmit={handleUpdateBill}>
                    <FormGrid>
                      <FormGroup>
                        <label>Bill Number</label>
                        <Input
                          type="text"
                          name="billNumber"
                          value={editFormData.billNumber}
                          onChange={handleEditFormChange}
                          required
                        />
                      </FormGroup>
                      <FormGroup>
                        <label>Retailer</label>
                        <Input
                          type="text"
                          name="retailer"
                          value={editFormData.retailer}
                          onChange={handleEditFormChange}
                          required
                        />
                      </FormGroup>
                      <FormGroup>
                        <label>Total Amount</label>
                        <Input
                          type="number"
                          step="0.01"
                          name="amount"
                          value={editFormData.amount}
                          onChange={handleEditFormChange}
                          required
                        />
                      </FormGroup>
                      <FormGroup>
                        <label>Due Amount</label>
                        <Input
                          type="number"
                          step="0.01"
                          name="dueAmount"
                          value={editFormData.dueAmount}
                          onChange={handleEditFormChange}
                          required
                        />
                      </FormGroup>
                      <FormGroup>
                        <label>Bill Date</label>
                        <Input
                          type="date"
                          name="billDate"
                          value={editFormData.billDate}
                          onChange={handleEditFormChange}
                          required
                        />
                      </FormGroup>
                      <FormGroup>
                        <label>Collection Day</label>
                        <Select
                          name="collectionDay"
                          value={editFormData.collectionDay}
                          onChange={handleEditFormChange}
                          required
                        >
                          <option value="">Select Day</option>
                          <option value="Monday">Monday</option>
                          <option value="Tuesday">Tuesday</option>
                          <option value="Wednesday">Wednesday</option>
                          <option value="Thursday">Thursday</option>
                          <option value="Friday">Friday</option>
                          <option value="Saturday">Saturday</option>
                          <option value="Sunday">Sunday</option>
                        </Select>
                      </FormGroup>
                      <FormGroup>
                        <label>Status</label>
                        <Select
                          name="status"
                          value={editFormData.status}
                          onChange={handleEditFormChange}
                          required
                        >
                          <option value="Unpaid">Unpaid</option>
                          <option value="Paid">Paid</option>
                          <option value="Partially Paid">Partially Paid</option>
                        </Select>
                      </FormGroup>
                    </FormGrid>
                    <ButtonGroup>
                      <PrimaryButton type="submit" disabled={loading}>
                        {loading ? "Updating..." : "Update Bill"}
                      </PrimaryButton>
                      <SecondaryButton type="button" onClick={closeEditModal}>
                        Cancel
                      </SecondaryButton>
                    </ButtonGroup>
                  </Form>
                </ModalContent>
              </ModalOverlay>
            )}
          </>
        )}
      </PageContainer>
    </Layout>
  );
};
const PageContainer = styled.div`
  padding: 1rem;

  @media (min-width: 768px) {
    padding: 2rem;
  }
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: flex-end;
    width: auto;
  }
`;

const AddBillButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border: none;
  border-radius: 0.375rem;
  padding: 0.6rem 0.9rem;
  background: var(--nb-blue);
  color: var(--nb-white);
  font-weight: 600;
  cursor: pointer;
`;

const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  h1 {
    font-size: 1.5rem;
    color: var(--nb-ink);
    margin: 0;
  }

  svg {
    color: var(--nb-ink);
  }

  @media (min-width: 768px) {
    h1 {
      font-size: 1.8rem;
    }
  }
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  background: var(--nb-white);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  box-shadow: var(--nb-shadow-md);
  width: 100%;

  input {
    border: none;
    outline: none;
    padding: 0.5rem;
    width: 100%;
    font-size: 1rem;
  }

  svg {
    color: var(--nb-border);
    margin-right: 0.5rem;
  }

  @media (min-width: 768px) {
    width: 300px;
  }
`;

const Message = styled.div`
  padding: 0.75rem;
  margin-bottom: 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  font-size: 0.875rem;
  background-color: ${(props) =>
    props.type === "error" ? "var(--nb-muted)" : "var(--nb-muted)"};
  color: ${(props) =>
    props.type === "error" ? "var(--nb-orange)" : "var(--nb-blue)"};
  border-left: 4px solid
    ${(props) =>
      props.type === "error" ? "var(--nb-orange)" : "var(--nb-blue)"};

  @media (min-width: 768px) {
    padding: 1rem;
    font-size: 1rem;
    margin-bottom: 1.5rem;
  }
`;

const LoadingIndicator = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--nb-ink);
  gap: 1rem;
`;

const Spinner = styled.div`
  border: 4px solid var(--nb-border);
  border-radius: 50%;
  border-top: 4px solid var(--nb-blue);
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

const TableContainer = styled.div`
  background: var(--nb-white);
  border-radius: 0.5rem;
  box-shadow: var(--nb-shadow-md);
  overflow-x: auto;
`;

const BillsTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 600px;

  th {
    background-color: var(--nb-muted);
    color: var(--nb-ink);
    font-weight: 600;
    text-align: left;
    padding: 0.75rem;
    border-bottom: 1px solid var(--nb-border);
    font-size: 0.875rem;
  }

  td {
    padding: 0.75rem;
    border-bottom: 1px solid var(--nb-border);
    color: var(--nb-ink);
    font-size: 0.875rem;
  }

  tr:hover td {
    background-color: var(--nb-muted);
  }

  @media (min-width: 768px) {
    th,
    td {
      padding: 1rem;
      font-size: 1rem;
    }
  }
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: capitalize;
  background-color: ${(props) =>
    props.status === "paid"
      ? "var(--nb-muted)"
      : props.status === "pending"
        ? "var(--nb-muted)"
        : "var(--nb-muted)"};
  color: ${(props) =>
    props.status === "paid"
      ? "var(--nb-blue)"
      : props.status === "pending"
        ? "var(--nb-orange)"
        : "var(--nb-blue)"};

  @media (min-width: 768px) {
    padding: 0.25rem 0.75rem;
    font-size: 0.875rem;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.25rem;

  @media (min-width: 768px) {
    gap: 0.5rem;
  }
`;

const AssignButton = styled.button`
  background-color: var(--nb-muted);
  color: var(--nb-blue);
  border: none;
  border-radius: 0.25rem;
  padding: 0.4rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.75rem;

  &:hover {
    background-color: var(--nb-muted);
  }

  @media (min-width: 768px) {
    padding: 0.5rem;
    font-size: 1rem;
  }
`;

const EditButton = styled.button`
  background-color: var(--nb-muted);
  color: var(--nb-blue);
  border: none;
  border-radius: 0.25rem;
  padding: 0.4rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.75rem;

  &:hover {
    background-color: var(--nb-muted);
  }

  @media (min-width: 768px) {
    padding: 0.5rem;
    font-size: 1rem;
  }
`;

const DeleteButton = styled.button`
  background-color: var(--nb-muted);
  color: var(--nb-orange);
  border: none;
  border-radius: 0.25rem;
  padding: 0.4rem;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.75rem;

  &:hover {
    background-color: var(--nb-muted);
  }

  @media (min-width: 768px) {
    padding: 0.5rem;
    font-size: 1rem;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--nb-muted);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled.div`
  background: var(--nb-white);
  border-radius: 0.5rem;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--nb-shadow-md);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--nb-border);

  h3 {
    margin: 0;
    font-size: 1.1rem;
    color: var(--nb-ink);
  }

  @media (min-width: 768px) {
    padding: 1.5rem;

    h3 {
      font-size: 1.25rem;
    }
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: var(--nb-border);
  padding: 0.25rem;

  &:hover {
    color: var(--nb-ink);
  }

  @media (min-width: 768px) {
    font-size: 1.5rem;
    padding: 0.5rem;
  }
`;

const Form = styled.form`
  padding: 1rem;

  @media (min-width: 768px) {
    padding: 1.5rem;
  }
`;

const TabRow = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 0 1rem 0.75rem;

  @media (min-width: 768px) {
    padding: 0 1.5rem 0.75rem;
  }
`;

const TabBtn = styled.button`
  border: 1px solid var(--nb-border);
  background: ${(p) => (p.active ? "var(--nb-blue)" : "var(--nb-white)")};
  color: ${(p) => (p.active ? "var(--nb-white)" : "var(--nb-ink)")};
  border-radius: 0.375rem;
  padding: 0.45rem 0.75rem;
  font-weight: 600;
  cursor: pointer;
`;

const ImportSummary = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: var(--nb-muted);
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;

  .ok { color: #15803d; }
  .skip { color: #92400e; }
  .err { color: #b91c1c; }
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--nb-ink);
  }

  @media (min-width: 768px) {
    margin-bottom: 1.5rem;
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--nb-border);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: var(--nb-blue);
    box-shadow: var(--nb-shadow-md);
  }

  @media (min-width: 768px) {
    padding: 0.75rem;
    font-size: 1rem;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--nb-border);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s;

  &:focus {
    outline: none;
    border-color: var(--nb-blue);
    box-shadow: var(--nb-shadow-md);
  }

  @media (min-width: 768px) {
    padding: 0.75rem;
    font-size: 1rem;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;

  @media (min-width: 768px) {
    flex-direction: row;
    gap: 1rem;
  }
`;

const PrimaryButton = styled.button`
  padding: 0.5rem;
  background-color: var(--nb-blue);
  color: var(--nb-white);
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;

  &:hover {
    background-color: var(--nb-blue);
  }

  @media (min-width: 768px) {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    flex: 1;
  }
`;

const SecondaryButton = styled.button`
  padding: 0.5rem;
  background-color: var(--nb-white);
  color: var(--nb-blue);
  border: 1px solid var(--nb-blue);
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;

  &:hover {
    background-color: var(--nb-muted);
  }

  @media (min-width: 768px) {
    padding: 0.75rem 1.5rem;
    font-size: 1rem;
    flex: 1;
  }
`;

export default BillsPage;
