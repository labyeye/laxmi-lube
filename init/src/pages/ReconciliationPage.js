import React, { useState } from "react";
import styled from "styled-components";
import {
  FaFileExcel,
  FaSearch,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import Layout from "../components/Layout";

const API_URL = "https://backend.laxmilube.in/api/reconciliation/check";

const STATUS_LABELS = {
  match: "Matched",
  mismatch: "Mismatch",
  not_found: "Bill Not Found",
  skipped_non_cash_upi: "Skipped (Cheque/Bank)",
};

const ReconciliationPage = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState(null);
  const [results, setResults] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("mismatch");

  const handleFileChange = (e) => {
    setFile(e.target.files?.[0] || null);
    setError("");
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    setLoading(true);
    setError("");
    setSummary(null);
    setResults([]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to process file");
      }

      setSummary(data);
      setResults(data.results || []);
    } catch (err) {
      setError(err.message || "Failed to reconcile file");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return "—";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const filteredResults = results.filter((r) => {
    const matchesStatus =
      filterStatus === "all" ? true : r.status === filterStatus;
    const matchesSearch =
      r.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.retailer.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <Layout>
      <PageContainer>
        <Header>
          <Title>
            <FaFileExcel size={24} />
            <h1>Collection Reconciliation</h1>
          </Title>
        </Header>

        <Description>
          Upload the staff's local Excel sheet (same format as bill imports —
          BillNo, CustName, BillRec). It will be compared against the
          collections actually recorded in the app, for Cash and UPI payments
          only. Bills with any cheque or bank transfer collection are skipped
          since the local sheet isn't comparable for those.
        </Description>

        <UploadForm onSubmit={handleUpload}>
          <Input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
          {file && <small>{file.name}</small>}
          <PrimaryButton type="submit" disabled={loading || !file}>
            {loading ? "Checking..." : "Check Collections"}
          </PrimaryButton>
        </UploadForm>

        {error && <Message type="error">{error}</Message>}

        {summary && (
          <SummaryRow>
            <SummaryCard>
              <span>{summary.total}</span>
              Total Rows
            </SummaryCard>
            <SummaryCard $tone="error">
              <span>{summary.mismatchCount}</span>
              Mismatches
            </SummaryCard>
            <SummaryCard $tone="warn">
              <span>{summary.notFoundCount}</span>
              Not Found
            </SummaryCard>
            <SummaryCard $tone="muted">
              <span>{summary.skippedCount}</span>
              Skipped (Cheque/Bank)
            </SummaryCard>
          </SummaryRow>
        )}

        {results.length > 0 && (
          <>
            <FilterRow>
              <SearchBox>
                <FaSearch />
                <input
                  type="text"
                  placeholder="Search bill # or retailer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </SearchBox>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="mismatch">Mismatch Only</option>
                <option value="match">Matched Only</option>
                <option value="not_found">Not Found Only</option>
                <option value="skipped_non_cash_upi">Skipped Only</option>
              </Select>
            </FilterRow>

            <TableContainer>
              <ResultsTable>
                <thead>
                  <tr>
                    <th>Bill #</th>
                    <th>Retailer</th>
                    <th>Staff</th>
                    <th>Local Sheet</th>
                    <th>App Collected</th>
                    <th>Difference</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.length > 0 ? (
                    filteredResults.map((r, idx) => (
                      <tr key={`${r.billNumber}-${r.retailer}-${idx}`}>
                        <td>{r.billNumber}</td>
                        <td>{r.retailer}</td>
                        <td>{r.assignedToName || "—"}</td>
                        <td>{formatCurrency(r.localReceived)}</td>
                        <td>{formatCurrency(r.appCollected)}</td>
                        <td>
                          {r.difference !== null
                            ? formatCurrency(r.difference)
                            : "—"}
                        </td>
                        <td>
                          <StatusBadge status={r.status}>
                            {r.status === "match" ? (
                              <FaCheckCircle />
                            ) : r.status === "mismatch" ? (
                              <FaTimesCircle />
                            ) : null}
                            {STATUS_LABELS[r.status] || r.status}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="7"
                        style={{ textAlign: "center", padding: 20 }}
                      >
                        No rows match the current filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </ResultsTable>
            </TableContainer>
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
  margin-bottom: 1rem;
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
  @media (min-width: 768px) {
    h1 {
      font-size: 1.8rem;
    }
  }
`;

const Description = styled.p`
  color: var(--nb-ink);
  opacity: 0.8;
  max-width: 800px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
`;

const UploadForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: var(--nb-white);
  padding: 1rem;
  border-radius: 0.5rem;
  box-shadow: var(--nb-shadow-md);
  max-width: 500px;
  margin-bottom: 1.5rem;

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: center;
  }
`;

const Input = styled.input`
  flex: 1;
  padding: 0.5rem;
  border: 1px solid var(--nb-border);
  border-radius: 0.375rem;
  font-size: 0.875rem;
`;

const Select = styled.select`
  padding: 0.5rem;
  border: 1px solid var(--nb-border);
  border-radius: 0.375rem;
  font-size: 0.875rem;
`;

const PrimaryButton = styled.button`
  padding: 0.6rem 1rem;
  background-color: var(--nb-blue);
  color: var(--nb-white);
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  font-size: 0.875rem;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Message = styled.div`
  padding: 0.75rem;
  margin-bottom: 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  font-size: 0.875rem;
  background-color: var(--nb-muted);
  color: var(--nb-orange);
  border-left: 4px solid var(--nb-orange);
`;

const SummaryRow = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
  margin-bottom: 1.5rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const SummaryCard = styled.div`
  background: var(--nb-white);
  border-radius: 0.5rem;
  box-shadow: var(--nb-shadow-md);
  padding: 1rem;
  text-align: center;
  color: ${(p) =>
    p.$tone === "error"
      ? "var(--nb-orange)"
      : p.$tone === "warn"
        ? "var(--nb-orange)"
        : "var(--nb-ink)"};

  span {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
  }

  font-size: 0.8rem;
`;

const FilterRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;

  @media (min-width: 640px) {
    flex-direction: row;
  }
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  background: var(--nb-white);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  box-shadow: var(--nb-shadow-md);
  flex: 1;

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
`;

const TableContainer = styled.div`
  background: var(--nb-white);
  border-radius: 0.5rem;
  box-shadow: var(--nb-shadow-md);
  overflow-x: auto;
`;

const ResultsTable = styled.table`
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 700px;

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
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: var(--nb-muted);
  color: ${(p) =>
    p.status === "match"
      ? "var(--nb-blue)"
      : p.status === "mismatch"
        ? "var(--nb-orange)"
        : "var(--nb-ink)"};
`;

export default ReconciliationPage;
