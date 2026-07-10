import React, { useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";
import { fmtDate } from "../utils/dateFormat";
import {
  FaPlus,
  FaSearch,
  FaExchangeAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaTrash,
  FaClock,
} from "react-icons/fa";
import Layout from "../components/Layout";

const API = "http://localhost:1200/api/cash-and-sale";
const authHeader = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const CashAndSalePage = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    billNumber: "",
    amount: "",
    personName: "",
    notes: "",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Adjust modal
  const [adjustEntry, setAdjustEntry] = useState(null); // the CashAndSale entry being adjusted
  const [billCheck, setBillCheck] = useState(null); // { found, bill } from API
  const [checking, setChecking] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [adjustError, setAdjustError] = useState("");

  const fetchEntries = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(API, { headers: authHeader() });
      setEntries(res.data);
    } catch (err) {
      setError("Failed to load Cash & Sale entries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const formatDate = fmtDate;

  const filtered = entries.filter((e) => {
    const matchSearch =
      !searchTerm ||
      e.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.personName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !statusFilter || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // ── Create ────────────────────────────────────────────
  const handleCreate = async (ev) => {
    ev.preventDefault();
    setCreateError("");
    if (!form.billNumber || !form.amount || !form.personName) {
      return setCreateError(
        "Bill number, amount and person name are required.",
      );
    }
    setCreating(true);
    try {
      const res = await axios.post(API, form, { headers: authHeader() });
      setEntries((prev) => [res.data, ...prev]);
      setShowCreate(false);
      setForm({ billNumber: "", amount: "", personName: "", notes: "" });
    } catch (err) {
      setCreateError(err.response?.data?.message || "Failed to create entry.");
    } finally {
      setCreating(false);
    }
  };

  // ── Adjust flow ───────────────────────────────────────
  const openAdjust = async (entry) => {
    setAdjustEntry(entry);
    setBillCheck(null);
    setAdjustError("");
    setChecking(true);
    try {
      const res = await axios.get(
        `${API}/check-bill/${encodeURIComponent(entry.billNumber)}`,
        { headers: authHeader() },
      );
      setBillCheck(res.data);
    } catch {
      setAdjustError("Failed to look up bill.");
    } finally {
      setChecking(false);
    }
  };

  const handleAdjust = async () => {
    if (!adjustEntry) return;
    setAdjusting(true);
    setAdjustError("");
    try {
      const res = await axios.patch(
        `${API}/${adjustEntry._id}/adjust`,
        {},
        { headers: authHeader() },
      );
      setEntries((prev) =>
        prev.map((e) => (e._id === adjustEntry._id ? res.data.entry : e)),
      );
      setAdjustEntry(null);
    } catch (err) {
      setAdjustError(err.response?.data?.message || "Adjustment failed.");
    } finally {
      setAdjusting(false);
    }
  };

  // ── Delete ────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      await axios.delete(`${API}/${id}`, { headers: authHeader() });
      setEntries((prev) => prev.filter((e) => e._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete.");
    }
  };

  return (
    <Layout>
      <PageContainer>
        <Header>
          <h1>Cash &amp; Sale</h1>
          <HeaderActions>
            <SearchBox>
              <FaSearch />
              <input
                type="text"
                placeholder="Search bill # or name…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchBox>
            <FilterSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="adjusted">Adjusted</option>
            </FilterSelect>
            <AddBtn
              onClick={() => {
                setShowCreate(true);
                setCreateError("");
              }}
            >
              <FaPlus /> Add Entry
            </AddBtn>
          </HeaderActions>
        </Header>

        {loading ? (
          <LoadingBox>
            <Spinner /> Loading…
          </LoadingBox>
        ) : error ? (
          <ErrorMsg>{error}</ErrorMsg>
        ) : filtered.length === 0 ? (
          <EmptyState>
            <FaExchangeAlt size={36} />
            <p>No Cash &amp; Sale entries found</p>
          </EmptyState>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <th>Bill #</th>
                  <th>Person / Retailer</th>
                  <th>Amount</th>
                  <th>Notes</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e._id}>
                    <td>
                      <BillNum>#{e.billNumber}</BillNum>
                    </td>
                    <td>{e.personName}</td>
                    <td>
                      <strong>{formatCurrency(e.amount)}</strong>
                    </td>
                    <td>{e.notes || <Muted>—</Muted>}</td>
                    <td>{formatDate(e.createdAt)}</td>
                    <td>
                      {e.status === "adjusted" ? (
                        <Badge $variant="adjusted">
                          <FaCheckCircle size={10} /> Adjusted
                        </Badge>
                      ) : (
                        <Badge $variant="pending">
                          <FaClock size={10} /> Pending
                        </Badge>
                      )}
                    </td>
                    <td>
                      <ActionRow>
                        {e.status === "pending" && (
                          <AdjustBtn onClick={() => openAdjust(e)}>
                            <FaExchangeAlt /> Adjust
                          </AdjustBtn>
                        )}
                        {e.status === "adjusted" && e.adjustedBill && (
                          <AdjustedInfo>
                            Bill #{e.adjustedBill.billNumber} — Due now{" "}
                            {formatCurrency(e.adjustedBill.dueAmount)}
                          </AdjustedInfo>
                        )}
                        {e.status === "pending" && (
                          <DeleteBtn onClick={() => handleDelete(e._id)}>
                            <FaTrash />
                          </DeleteBtn>
                        )}
                      </ActionRow>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </PageContainer>

      {/* ── Create Modal ───────────────────────────────── */}
      {showCreate && (
        <Overlay onClick={() => setShowCreate(false)}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h3>New Cash &amp; Sale Entry</h3>
              <CloseBtn onClick={() => setShowCreate(false)}>×</CloseBtn>
            </ModalHeader>
            <ModalBody>
              <form onSubmit={handleCreate}>
                <Field>
                  <label>Bill Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. 1042"
                    value={form.billNumber}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, billNumber: e.target.value }))
                    }
                  />
                </Field>
                <Field>
                  <label>Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="e.g. 5000"
                    value={form.amount}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, amount: e.target.value }))
                    }
                  />
                </Field>
                <Field>
                  <label>Person / Retailer Name *</label>
                  <input
                    type="text"
                    placeholder="Name of who paid"
                    value={form.personName}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, personName: e.target.value }))
                    }
                  />
                </Field>
                <Field>
                  <label>Notes (optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Any remarks…"
                    value={form.notes}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, notes: e.target.value }))
                    }
                  />
                </Field>
                {createError && <ErrText>{createError}</ErrText>}
                <ModalFooter>
                  <GhostBtn type="button" onClick={() => setShowCreate(false)}>
                    Cancel
                  </GhostBtn>
                  <SaveBtn type="submit" disabled={creating}>
                    {creating ? "Saving…" : "Save Entry"}
                  </SaveBtn>
                </ModalFooter>
              </form>
            </ModalBody>
          </Modal>
        </Overlay>
      )}

      {/* ── Adjust Modal ───────────────────────────────── */}
      {adjustEntry && (
        <Overlay onClick={() => setAdjustEntry(null)}>
          <Modal onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h3>Adjust Bill #{adjustEntry.billNumber}</h3>
              <CloseBtn onClick={() => setAdjustEntry(null)}>×</CloseBtn>
            </ModalHeader>
            <ModalBody>
              <AdjustSummary>
                <SummaryRow>
                  <span>Cash &amp; Sale Amount</span>
                  <strong>{formatCurrency(adjustEntry.amount)}</strong>
                </SummaryRow>
                <SummaryRow>
                  <span>Person / Retailer</span>
                  <strong>{adjustEntry.personName}</strong>
                </SummaryRow>
              </AdjustSummary>

              {checking ? (
                <CheckingBox>
                  <Spinner /> Checking bill in database…
                </CheckingBox>
              ) : adjustError && !billCheck ? (
                <ErrText>{adjustError}</ErrText>
              ) : billCheck && !billCheck.found ? (
                <BillNotFound>
                  <FaTimesCircle size={18} />
                  <div>
                    <strong>Bill #{adjustEntry.billNumber} not found</strong>
                    <p>
                      This bill does not exist in the database yet. You can
                      adjust once the bill is imported.
                    </p>
                  </div>
                </BillNotFound>
              ) : billCheck?.found ? (
                <>
                  <BillFound>
                    <FaCheckCircle size={18} />
                    <div>
                      <strong>Bill found in database</strong>
                    </div>
                  </BillFound>
                  <BillDetails>
                    <BillDetailRow>
                      <span>Bill #</span>
                      <strong>{billCheck.bill.billNumber}</strong>
                    </BillDetailRow>
                    <BillDetailRow>
                      <span>Retailer</span>
                      <strong>{billCheck.bill.retailer}</strong>
                    </BillDetailRow>
                    <BillDetailRow>
                      <span>Bill Amount</span>
                      <strong>{formatCurrency(billCheck.bill.amount)}</strong>
                    </BillDetailRow>
                    <BillDetailRow>
                      <span>Current Due</span>
                      <strong>
                        {formatCurrency(billCheck.bill.dueAmount)}
                      </strong>
                    </BillDetailRow>
                    <BillDetailRow $highlight>
                      <span>Due After Adjustment</span>
                      <strong>
                        {formatCurrency(
                          Math.max(
                            0,
                            billCheck.bill.dueAmount - adjustEntry.amount,
                          ),
                        )}
                      </strong>
                    </BillDetailRow>
                  </BillDetails>
                  <ConfirmText>
                    Do you want to adjust{" "}
                    <strong>{formatCurrency(adjustEntry.amount)}</strong>{" "}
                    against Bill #{billCheck.bill.billNumber}?
                  </ConfirmText>
                  {adjustError && <ErrText>{adjustError}</ErrText>}
                  <ModalFooter>
                    <GhostBtn onClick={() => setAdjustEntry(null)}>
                      Cancel
                    </GhostBtn>
                    <SaveBtn onClick={handleAdjust} disabled={adjusting}>
                      {adjusting ? "Adjusting…" : "Confirm Adjustment"}
                    </SaveBtn>
                  </ModalFooter>
                </>
              ) : null}
            </ModalBody>
          </Modal>
        </Overlay>
      )}
    </Layout>
  );
};

// ── Styled Components ──────────────────────────────────────────────────────────

const PageContainer = styled.div`
  width: 100%;
`;

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;

  h1 {
    color: var(--nb-ink);
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0;
  }

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    h1 {
      font-size: 1.8rem;
    }
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  align-items: center;
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  background: var(--nb-white);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  box-shadow: var(--nb-shadow-md);
  gap: 0.5rem;

  input {
    border: none;
    outline: none;
    font-size: 0.9rem;
    width: 160px;
  }

  svg {
    color: var(--nb-border);
  }
`;

const FilterSelect = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--nb-border);
  border-radius: 8px;
  font-size: 0.85rem;
  background: var(--nb-white);
  color: var(--nb-ink);
  cursor: pointer;
  outline: none;
`;

const AddBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.1rem;
  border: none;
  border-radius: 8px;
  background: var(--nb-blue);
  color: var(--nb-white);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`;

const TableWrap = styled.div`
  overflow-x: auto;
  border-radius: 0.75rem;
  background: var(--nb-white);
  box-shadow: var(--nb-shadow-md);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  min-width: 800px;

  th,
  td {
    padding: 0.85rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--nb-border);
  }

  th {
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.72rem;
    letter-spacing: 0.5px;
    color: var(--nb-ink);
    background: var(--nb-muted);
    white-space: nowrap;
  }

  td {
    color: var(--nb-ink);
  }

  tr:last-child td {
    border-bottom: none;
  }
  tr:hover {
    background: var(--nb-muted);
  }
`;

const BillNum = styled.span`
  font-weight: 600;
  color: var(--nb-blue);
`;

const Muted = styled.span`
  color: #9ca3af;
`;

const Badge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 600;
  background: ${(p) => (p.$variant === "adjusted" ? "#dcfce7" : "#fef9c3")};
  color: ${(p) => (p.$variant === "adjusted" ? "#15803d" : "#92400e")};
`;

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const AdjustBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.3rem 0.75rem;
  border: 1px solid var(--nb-blue);
  border-radius: 6px;
  background: var(--nb-white);
  color: var(--nb-blue);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: var(--nb-muted);
  }
`;

const DeleteBtn = styled.button`
  padding: 0.3rem 0.6rem;
  border: 1px solid #fecaca;
  border-radius: 6px;
  background: var(--nb-white);
  color: #dc2626;
  cursor: pointer;
  font-size: 0.8rem;

  &:hover {
    background: #fee2e2;
  }
`;

const AdjustedInfo = styled.span`
  font-size: 0.78rem;
  color: #15803d;
`;

const LoadingBox = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 3rem;
  justify-content: center;
  color: var(--nb-ink);
`;

const Spinner = styled.div`
  width: 28px;
  height: 28px;
  border: 3px solid var(--nb-muted);
  border-top-color: var(--nb-blue);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const ErrorMsg = styled.div`
  padding: 2rem;
  text-align: center;
  color: var(--nb-orange);
  background: var(--nb-muted);
  border-radius: 0.75rem;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 3rem;
  text-align: center;
  background: var(--nb-white);
  border-radius: 0.75rem;
  box-shadow: var(--nb-shadow-md);
  color: var(--nb-ink);
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const Modal = styled.div`
  background: var(--nb-white);
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--nb-border);

  h3 {
    margin: 0;
    font-size: 1rem;
    color: var(--nb-ink);
  }
`;

const CloseBtn = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--nb-ink);
  line-height: 1;
  padding: 0 4px;
`;

const ModalBody = styled.div`
  padding: 1.25rem;
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 1rem;

  label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #374151;
  }

  input,
  textarea {
    padding: 0.5rem 0.7rem;
    border: 1px solid var(--nb-border);
    border-radius: 6px;
    font-size: 0.875rem;
    font-family: inherit;
    color: var(--nb-ink);
    outline: none;
    &:focus {
      border-color: var(--nb-blue);
    }
  }

  textarea {
    resize: vertical;
  }
`;

const ErrText = styled.p`
  color: #dc2626;
  font-size: 0.8rem;
  margin: 0.5rem 0;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
`;

const GhostBtn = styled.button`
  padding: 0.5rem 1.1rem;
  border: 1px solid var(--nb-border);
  border-radius: 8px;
  background: var(--nb-white);
  color: var(--nb-ink);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: var(--nb-muted);
  }
`;

const SaveBtn = styled.button`
  padding: 0.5rem 1.25rem;
  border: none;
  border-radius: 8px;
  background: var(--nb-blue);
  color: var(--nb-white);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  &:hover:not(:disabled) {
    opacity: 0.9;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const AdjustSummary = styled.div`
  background: var(--nb-muted);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
  color: var(--nb-ink);
  padding: 0.2rem 0;
`;

const CheckingBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 0;
  color: var(--nb-ink);
  font-size: 0.875rem;
`;

const BillNotFound = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;

  p {
    margin: 0.25rem 0 0;
    font-size: 0.82rem;
    color: #6b7280;
  }
  strong {
    font-size: 0.875rem;
  }
`;

const BillFound = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 1rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  color: #15803d;
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
`;

const BillDetails = styled.div`
  border: 1px solid var(--nb-border);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 1rem;
`;

const BillDetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 0.55rem 1rem;
  font-size: 0.875rem;
  border-bottom: 1px solid var(--nb-border);
  background: ${(p) => (p.$highlight ? "#eff6ff" : "transparent")};
  color: ${(p) => (p.$highlight ? "var(--nb-blue)" : "var(--nb-ink)")};

  &:last-child {
    border-bottom: none;
  }
  span {
    color: #6b7280;
  }
`;

const ConfirmText = styled.p`
  font-size: 0.875rem;
  color: var(--nb-ink);
  margin: 0 0 0.5rem;
`;

export default CashAndSalePage;
