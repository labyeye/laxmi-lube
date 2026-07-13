import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import styled from "styled-components";
import { fmtDate } from "../utils/dateFormat";
import Layout from "../components/Layout";
import {
  FaPlus,
  FaTrash,
  FaChevronDown,
  FaChevronUp,
  FaCheckCircle,
  FaSearch,
  FaMoneyBillWave,
} from "react-icons/fa";

const API = "https://backend.laxmilube.in/api";

const RetailerAdvancePage = () => {
  const [advances, setAdvances] = useState([]);
  const [retailers, setRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    retailerName: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    remarks: "",
  });
  const [retailerSearch, setRetailerSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Adjust modal state
  const [adjustAdvance, setAdjustAdvance] = useState(null); // the advance being adjusted
  const [adjBills, setAdjBills] = useState([]);
  const [adjBillsLoading, setAdjBillsLoading] = useState(false);
  const [adjAmounts, setAdjAmounts] = useState({}); // { billId: amount string }
  const [adjSaving, setAdjSaving] = useState(false);
  const [adjError, setAdjError] = useState("");

  // Expanded row (to show adjustments history)
  const [expandedId, setExpandedId] = useState(null);

  const token = localStorage.getItem("token");
  const headers = { Authorization: `Bearer ${token}` };

  const flash = (msg, isError = false) => {
    if (isError) setError(msg);
    else setMessage(msg);
    setTimeout(() => { setMessage(""); setError(""); }, 3500);
  };

  const fetchAdvances = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/retailer-advances`, { headers });
      setAdvances(res.data);
    } catch {
      flash("Failed to load advances", true);
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line

  const fetchRetailers = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/retailers`, { headers });
      setRetailers(res.data.map ? res.data : []);
    } catch {
      setRetailers([]);
    }
  }, []); // eslint-disable-line

  useEffect(() => {
    fetchAdvances();
    fetchRetailers();
  }, [fetchAdvances, fetchRetailers]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.retailerName || !form.amount) return;
    setSaving(true);
    try {
      await axios.post(`${API}/retailer-advances`, form, { headers });
      flash("Advance created");
      setShowForm(false);
      setForm({ retailerName: "", amount: "", date: new Date().toISOString().split("T")[0], remarks: "" });
      setRetailerSearch("");
      fetchAdvances();
    } catch (err) {
      flash(err.response?.data?.message || "Failed to create", true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this advance?")) return;
    try {
      await axios.delete(`${API}/retailer-advances/${id}`, { headers });
      flash("Advance deleted");
      fetchAdvances();
    } catch (err) {
      flash(err.response?.data?.message || "Cannot delete", true);
    }
  };

  const openAdjustModal = async (advance) => {
    setAdjustAdvance(advance);
    setAdjError("");
    setAdjAmounts({});
    setAdjBillsLoading(true);
    try {
      const res = await axios.get(`${API}/retailer-advances/bills-for-retailer`, {
        headers,
        params: { retailerName: advance.retailerName },
      });
      setAdjBills(res.data);
      // Pre-fill amounts: auto-allocate smallest bills first
      const prefill = {};
      let remaining = advance.remainingAmount;
      const sorted = [...res.data].sort((a, b) => a.dueAmount - b.dueAmount);
      for (const b of sorted) {
        if (remaining <= 0) break;
        const alloc = Math.min(remaining, b.dueAmount);
        prefill[b._id] = alloc.toFixed(2);
        remaining = Math.round((remaining - alloc) * 100) / 100;
      }
      setAdjAmounts(prefill);
    } catch {
      setAdjBills([]);
    } finally {
      setAdjBillsLoading(false);
    }
  };

  const handleApplyToBill = async (billId) => {
    const amt = parseFloat(adjAmounts[billId]);
    if (!amt || amt <= 0) {
      setAdjError("Enter a valid amount for this bill");
      return;
    }
    setAdjSaving(true);
    setAdjError("");
    try {
      const res = await axios.post(
        `${API}/retailer-advances/${adjustAdvance._id}/apply`,
        { billId, amountToApply: amt },
        { headers },
      );
      // Update local state
      setAdvances((prev) =>
        prev.map((a) => (a._id === adjustAdvance._id ? res.data.advance : a)),
      );
      setAdjustAdvance(res.data.advance);
      // Remove bill from list if fully paid, else update dueAmount
      setAdjBills((prev) =>
        prev
          .map((b) => b._id === billId ? { ...b, dueAmount: res.data.bill.dueAmount, status: res.data.bill.status } : b)
          .filter((b) => b.dueAmount > 0),
      );
      setAdjAmounts((prev) => { const n = { ...prev }; delete n[billId]; return n; });
      flash(`₹${amt.toFixed(2)} adjusted against Bill`);
    } catch (err) {
      setAdjError(err.response?.data?.message || "Failed to apply");
    } finally {
      setAdjSaving(false);
    }
  };

  const filteredRetailers = retailers.filter((r) =>
    r.name?.toLowerCase().includes(retailerSearch.toLowerCase()),
  );

  const statusColor = (s) =>
    s === "Open" ? "#2563eb" : s === "Partial" ? "#d97706" : "#16a34a";

  return (
    <Layout>
      <PageWrapper>
        <PageHeader>
          <PageTitle>
            <FaMoneyBillWave /> Retailer Advances
          </PageTitle>
          <AddBtn onClick={() => { setShowForm(true); setRetailerSearch(""); }}>
            <FaPlus /> New Advance
          </AddBtn>
        </PageHeader>

        {message && <Alert $success>{message}</Alert>}
        {error && <Alert>{error}</Alert>}

        {/* ── Create Form Modal ── */}
        {showForm && (
          <Overlay>
            <Modal>
              <ModalHead>
                New Retailer Advance
                <CloseX onClick={() => setShowForm(false)}>&times;</CloseX>
              </ModalHead>
              <form onSubmit={handleCreate}>
                <ModalBody>
                  <Field>
                    <FieldLabel>Retailer *</FieldLabel>
                    <SearchInput
                      type="text"
                      placeholder="Search retailer..."
                      value={retailerSearch}
                      onChange={(e) => {
                        setRetailerSearch(e.target.value);
                        setForm((f) => ({ ...f, retailerName: e.target.value }));
                      }}
                      autoFocus
                    />
                    {retailerSearch && filteredRetailers.length > 0 && (
                      <Dropdown>
                        {filteredRetailers.slice(0, 8).map((r) => (
                          <DropdownItem
                            key={r._id}
                            onClick={() => {
                              setForm((f) => ({ ...f, retailerName: r.name, retailerId: r._id }));
                              setRetailerSearch(r.name);
                            }}
                          >
                            {r.name}
                          </DropdownItem>
                        ))}
                      </Dropdown>
                    )}
                  </Field>

                  <Field>
                    <FieldLabel>Amount (₹) *</FieldLabel>
                    <FieldInput
                      type="number"
                      min="1"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                      placeholder="0.00"
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Date</FieldLabel>
                    <FieldInput
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Remarks</FieldLabel>
                    <FieldInput
                      as="textarea"
                      rows={2}
                      value={form.remarks}
                      onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
                      placeholder="Optional notes..."
                    />
                  </Field>
                </ModalBody>
                <ModalFoot>
                  <CancelBtn type="button" onClick={() => setShowForm(false)}>Cancel</CancelBtn>
                  <SaveBtn type="submit" disabled={saving || !form.retailerName || !form.amount}>
                    {saving ? "Saving..." : "Create Advance"}
                  </SaveBtn>
                </ModalFoot>
              </form>
            </Modal>
          </Overlay>
        )}

        {/* ── Adjust Modal ── */}
        {adjustAdvance && (
          <Overlay>
            <Modal wide>
              <ModalHead>
                Adjust Advance — {adjustAdvance.retailerName}
                <CloseX onClick={() => setAdjustAdvance(null)}>&times;</CloseX>
              </ModalHead>
              <ModalBody>
                <AdjSummary>
                  <AdjSummaryItem>
                    <span>Total Advance</span>
                    <strong>₹{adjustAdvance.amount.toLocaleString("en-IN")}</strong>
                  </AdjSummaryItem>
                  <AdjSummaryItem>
                    <span>Remaining</span>
                    <strong style={{ color: adjustAdvance.remainingAmount > 0 ? "#d97706" : "#16a34a" }}>
                      ₹{adjustAdvance.remainingAmount.toLocaleString("en-IN")}
                    </strong>
                  </AdjSummaryItem>
                  <AdjSummaryItem>
                    <span>Status</span>
                    <StatusBadge color={statusColor(adjustAdvance.status)}>
                      {adjustAdvance.status}
                    </StatusBadge>
                  </AdjSummaryItem>
                </AdjSummary>

                {adjError && <AdjError>{adjError}</AdjError>}

                {adjBillsLoading ? (
                  <AdjLoading>Loading bills...</AdjLoading>
                ) : adjBills.length === 0 ? (
                  <AdjEmpty>
                    <FaCheckCircle color="#16a34a" size={28} />
                    <p>No unpaid bills found for this retailer.</p>
                  </AdjEmpty>
                ) : (
                  <>
                    <AdjBillsTitle>Unpaid Bills for {adjustAdvance.retailerName}</AdjBillsTitle>
                    <BillsTable>
                      <thead>
                        <tr>
                          <th>Bill #</th>
                          <th>Bill Date</th>
                          <th>Bill Amount</th>
                          <th>Due Amount</th>
                          <th>Apply Amount</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adjBills.map((bill) => (
                          <tr key={bill._id}>
                            <td><strong>{bill.billNumber}</strong></td>
                            <td>{fmtDate(bill.billDate)}</td>
                            <td>₹{Number(bill.amount).toLocaleString("en-IN")}</td>
                            <td style={{ color: "#d97706", fontWeight: 600 }}>
                              ₹{Number(bill.dueAmount).toLocaleString("en-IN")}
                            </td>
                            <td>
                              <AdjInput
                                type="number"
                                min="0.01"
                                step="0.01"
                                max={Math.min(bill.dueAmount, adjustAdvance.remainingAmount)}
                                value={adjAmounts[bill._id] || ""}
                                onChange={(e) =>
                                  setAdjAmounts((prev) => ({ ...prev, [bill._id]: e.target.value }))
                                }
                                placeholder="0.00"
                              />
                            </td>
                            <td>
                              <AdjApplyBtn
                                onClick={() => handleApplyToBill(bill._id)}
                                disabled={
                                  adjSaving ||
                                  !adjAmounts[bill._id] ||
                                  adjustAdvance.remainingAmount <= 0
                                }
                              >
                                {adjSaving ? "..." : "Adjust"}
                              </AdjApplyBtn>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </BillsTable>
                  </>
                )}

                {adjustAdvance.adjustments?.length > 0 && (
                  <AdjHistorySection>
                    <AdjBillsTitle>Previously Applied</AdjBillsTitle>
                    <HistoryTable>
                      <thead>
                        <tr>
                          <th>Bill #</th>
                          <th>Amount Applied</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adjustAdvance.adjustments.map((adj, i) => (
                          <tr key={i}>
                            <td>{adj.billNumber}</td>
                            <td style={{ color: "#16a34a", fontWeight: 600 }}>
                              ₹{Number(adj.amountApplied).toLocaleString("en-IN")}
                            </td>
                            <td>{fmtDate(adj.appliedAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </HistoryTable>
                  </AdjHistorySection>
                )}
              </ModalBody>
              <ModalFoot>
                <CancelBtn onClick={() => setAdjustAdvance(null)}>Close</CancelBtn>
              </ModalFoot>
            </Modal>
          </Overlay>
        )}

        {/* ── Advances List ── */}
        {loading ? (
          <EmptyState>Loading advances...</EmptyState>
        ) : advances.length === 0 ? (
          <EmptyState>No retailer advances yet. Click "New Advance" to create one.</EmptyState>
        ) : (
          <AdvanceTable>
            <thead>
              <tr>
                <th>Retailer</th>
                <th>Date</th>
                <th>Total Amount</th>
                <th>Remaining</th>
                <th>Status</th>
                <th>Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {advances.map((adv) => (
                <React.Fragment key={adv._id}>
                  <tr>
                    <td><strong>{adv.retailerName}</strong></td>
                    <td>{fmtDate(adv.date)}</td>
                    <td>₹{Number(adv.amount).toLocaleString("en-IN")}</td>
                    <td style={{ fontWeight: 600, color: adv.remainingAmount > 0 ? "#d97706" : "#16a34a" }}>
                      ₹{Number(adv.remainingAmount).toLocaleString("en-IN")}
                    </td>
                    <td>
                      <StatusBadge color={statusColor(adv.status)}>{adv.status}</StatusBadge>
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "#555" }}>{adv.remarks || "—"}</td>
                    <td>
                      <ActionGroup>
                        {adv.status !== "Applied" && (
                          <AdjBtn onClick={() => openAdjustModal(adv)}>
                            Adjust Bills
                          </AdjBtn>
                        )}
                        {adv.adjustments?.length > 0 && (
                          <ExpandBtn onClick={() => setExpandedId(expandedId === adv._id ? null : adv._id)}>
                            {expandedId === adv._id ? <FaChevronUp /> : <FaChevronDown />}
                          </ExpandBtn>
                        )}
                        {adv.adjustments?.length === 0 && (
                          <DeleteBtn onClick={() => handleDelete(adv._id)}>
                            <FaTrash />
                          </DeleteBtn>
                        )}
                      </ActionGroup>
                    </td>
                  </tr>
                  {expandedId === adv._id && adv.adjustments?.length > 0 && (
                    <tr>
                      <td colSpan={7} style={{ background: "#f8fafc", padding: "0.75rem 1.5rem" }}>
                        <ExpandLabel>Adjustments made:</ExpandLabel>
                        {adv.adjustments.map((adj, i) => (
                          <ExpandRow key={i}>
                            <span>Bill #{adj.billNumber}</span>
                            <span style={{ color: "#16a34a", fontWeight: 600 }}>
                              −₹{Number(adj.amountApplied).toLocaleString("en-IN")}
                            </span>
                            <span style={{ color: "#888" }}>{fmtDate(adj.appliedAt)}</span>
                          </ExpandRow>
                        ))}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </AdvanceTable>
        )}
      </PageWrapper>
    </Layout>
  );
};

export default RetailerAdvancePage;

// ── Styled Components ──────────────────────────────────────────────────────────

const PageWrapper = styled.div`
  padding: 1.5rem 2rem;
  min-height: 100vh;
  background: var(--nb-white);
`;

const PageHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--nb-border);
`;

const PageTitle = styled.h1`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 1.5rem;
  color: var(--nb-ink);
  margin: 0;
  svg { color: var(--nb-blue); }
`;

const AddBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1.1rem;
  background: var(--nb-blue);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  &:hover { opacity: 0.88; }
`;

const Alert = styled.div`
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: 6px;
  font-weight: 500;
  background: ${(p) => (p.$success ? "#f0fdf4" : "#fef2f2")};
  border-left: 4px solid ${(p) => (p.$success ? "#16a34a" : "#dc2626")};
  color: ${(p) => (p.$success ? "#15803d" : "#b91c1c")};
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
`;

const Modal = styled.div`
  background: var(--nb-white);
  border-radius: 10px;
  width: 100%;
  max-width: ${(p) => (p.wide ? "820px" : "480px")};
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
`;

const ModalHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.1rem 1.5rem;
  background: var(--nb-muted);
  border-bottom: 1px solid var(--nb-border);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--nb-ink);
`;

const CloseX = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--nb-ink);
  line-height: 1;
  &:hover { color: var(--nb-orange); }
`;

const ModalBody = styled.div`
  padding: 1.25rem 1.5rem;
  overflow-y: auto;
  flex: 1;
`;

const ModalFoot = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--nb-border);
  background: var(--nb-muted);
`;

const Field = styled.div`
  margin-bottom: 1rem;
  position: relative;
`;

const FieldLabel = styled.label`
  display: block;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--nb-ink);
  margin-bottom: 0.35rem;
`;

const FieldInput = styled.input`
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  font-size: 0.9rem;
  box-sizing: border-box;
  &:focus { outline: none; border-color: var(--nb-blue); }
`;

const SearchInput = styled(FieldInput)``;

const Dropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  z-index: 100;
  max-height: 200px;
  overflow-y: auto;
`;

const DropdownItem = styled.div`
  padding: 0.6rem 0.85rem;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--nb-ink);
  &:hover { background: var(--nb-muted); }
`;

const SaveBtn = styled.button`
  padding: 0.6rem 1.4rem;
  background: var(--nb-blue);
  color: #fff;
  border: none;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
  &:disabled { background: var(--nb-border); cursor: not-allowed; }
`;

const CancelBtn = styled.button`
  padding: 0.6rem 1.1rem;
  background: var(--nb-muted);
  color: var(--nb-ink);
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
`;

// Adjust modal
const AdjSummary = styled.div`
  display: flex;
  gap: 2rem;
  background: var(--nb-muted);
  border-radius: 8px;
  padding: 0.85rem 1.25rem;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
`;

const AdjSummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  span { font-size: 0.78rem; color: #888; text-transform: uppercase; letter-spacing: 0.4px; }
  strong { font-size: 1.05rem; }
`;

const AdjError = styled.div`
  padding: 0.6rem 0.9rem;
  background: #fef2f2;
  border-left: 3px solid #dc2626;
  color: #b91c1c;
  border-radius: 4px;
  font-size: 0.85rem;
  margin-bottom: 1rem;
`;

const AdjLoading = styled.div`
  text-align: center;
  padding: 2rem;
  color: #888;
`;

const AdjEmpty = styled.div`
  text-align: center;
  padding: 2.5rem;
  color: #888;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
`;

const AdjBillsTitle = styled.div`
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--nb-blue);
  margin-bottom: 0.75rem;
`;

const BillsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
  th {
    background: var(--nb-muted);
    padding: 0.55rem 0.75rem;
    text-align: left;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--nb-ink);
    border-bottom: 1px solid var(--nb-border);
  }
  td {
    padding: 0.6rem 0.75rem;
    border-bottom: 1px solid var(--nb-border);
    color: var(--nb-ink);
    vertical-align: middle;
  }
  tbody tr:hover td { background: #f8fafc; }
`;

const AdjInput = styled.input`
  width: 100px;
  padding: 0.4rem 0.5rem;
  border: 1px solid var(--nb-border);
  border-radius: 5px;
  font-size: 0.88rem;
  &:focus { outline: none; border-color: var(--nb-blue); }
`;

const AdjApplyBtn = styled.button`
  padding: 0.38rem 0.85rem;
  background: var(--nb-blue);
  color: #fff;
  border: none;
  border-radius: 5px;
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
  &:disabled { background: var(--nb-border); cursor: not-allowed; }
  &:hover:not(:disabled) { opacity: 0.85; }
`;

const AdjHistorySection = styled.div`
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--nb-border);
`;

const HistoryTable = styled(BillsTable)``;

// Main list
const AdvanceTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
  background: #fff;
  border: 1px solid var(--nb-border);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--nb-shadow-md);
  th {
    background: var(--nb-muted);
    padding: 0.7rem 1rem;
    text-align: left;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.4px;
    color: var(--nb-ink);
    border-bottom: 1px solid var(--nb-border);
  }
  td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--nb-border);
    color: var(--nb-ink);
    vertical-align: middle;
  }
  tbody tr:hover td { background: #f8fafc; }
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 0.2rem 0.65rem;
  border-radius: 20px;
  font-size: 0.72rem;
  font-weight: 700;
  background: ${(p) => p.color}18;
  color: ${(p) => p.color};
  border: 1px solid ${(p) => p.color}44;
`;

const ActionGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const AdjBtn = styled.button`
  padding: 0.35rem 0.75rem;
  background: var(--nb-blue);
  color: #fff;
  border: none;
  border-radius: 5px;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  &:hover { opacity: 0.85; }
`;

const ExpandBtn = styled.button`
  width: 28px;
  height: 28px;
  border: 1px solid var(--nb-border);
  background: var(--nb-muted);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.75rem;
  color: var(--nb-ink);
`;

const DeleteBtn = styled.button`
  width: 28px;
  height: 28px;
  border: none;
  background: #fef2f2;
  color: #dc2626;
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.78rem;
  &:hover { background: #dc2626; color: #fff; }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem;
  color: #888;
  font-size: 0.95rem;
`;

const ExpandLabel = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--nb-blue);
  margin-bottom: 0.5rem;
`;

const ExpandRow = styled.div`
  display: flex;
  gap: 2rem;
  font-size: 0.85rem;
  padding: 0.3rem 0;
  border-bottom: 1px solid #eee;
  &:last-child { border-bottom: none; }
`;
