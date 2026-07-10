import React, { useState, useEffect } from "react";
import styled from "styled-components";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import RetailerLayout from "../components/RetailerLayout";
import { fmtDate } from "../utils/dateFormat";

const RetailerBilling = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    fetchBills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchBills = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await axios.get(
        "http://localhost:1200/api/retailer/bills",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.data.success) {
        throw new Error(response.data.message || "Failed to load bills");
      }

      setBills(response.data.bills);
    } catch (error) {
      console.error("Error fetching bills:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/login");
        return;
      }
      setError(error.response?.data?.message || "Failed to load bills");
    } finally {
      setLoading(false);
    }
  };

  const filteredBills = bills.filter((bill) => {
    if (filter === "all") return true;
    return bill.status === filter;
  });

  const totalBillAmount = bills.reduce((sum, bill) => sum + bill.amount, 0);
  const totalPaid = bills.reduce((sum, bill) => sum + bill.paidAmount, 0);
  const totalDue = bills.reduce((sum, bill) => sum + bill.dueAmount, 0);

  const billNumberCounts = bills.reduce((acc, bill) => {
    acc[bill.billNumber] = (acc[bill.billNumber] || 0) + 1;
    return acc;
  }, {});
  const duplicateCount = Object.values(billNumberCounts)
    .filter((c) => c > 1)
    .reduce((sum, c) => sum + (c - 1), 0);

  return (
    <RetailerLayout>
      <PageContainer>
        <Header>
          <h1>Billing & Payments</h1>
        </Header>

        {/* Summary Cards */}
        <SummaryGrid>
          <SummaryCard color="var(--nb-blue)">
            <h3>Total Bills</h3>
            <p>₹{totalBillAmount.toFixed(2)}</p>
          </SummaryCard>
          <SummaryCard color="var(--nb-blue)">
            <h3>Total Paid</h3>
            <p>₹{totalPaid.toFixed(2)}</p>
          </SummaryCard>
          <SummaryCard color="var(--nb-orange)">
            <h3>Total Due</h3>
            <p>₹{totalDue.toFixed(2)}</p>
          </SummaryCard>
        </SummaryGrid>

        {/* Filter Buttons */}
        <FilterSection>
          <FilterButton
            active={filter === "all"}
            onClick={() => setFilter("all")}
          >
            All Bills
          </FilterButton>
          <FilterButton
            active={filter === "Paid"}
            onClick={() => setFilter("Paid")}
          >
            Paid
          </FilterButton>
          <FilterButton
            active={filter === "Partially Paid"}
            onClick={() => setFilter("Partially Paid")}
          >
            Partially Paid
          </FilterButton>
          <FilterButton
            active={filter === "Unpaid"}
            onClick={() => setFilter("Unpaid")}
          >
            Unpaid
          </FilterButton>
        </FilterSection>

        {/* Duplicate Warning */}
        {bills.length > 0 && duplicateCount > 0 && (
          <DuplicateBanner>
            {duplicateCount} duplicate {duplicateCount === 1 ? "bill" : "bills"}
          </DuplicateBanner>
        )}

        {/* Bills Table */}
        <ContentSection>
          {loading ? (
            <LoadingIndicator>
              <div className="spinner"></div>
              <p>Loading bills...</p>
            </LoadingIndicator>
          ) : error ? (
            <ErrorMessage>{error}</ErrorMessage>
          ) : (
            <TableContainer>
              <DataTable>
                <thead>
                  <tr>
                    <th>Bill No.</th>
                    <th>Bill Date</th>
                    <th>Amount</th>
                    <th>Paid</th>
                    <th>Due</th>
                    <th>Status</th>
                    <th>Collection Day</th>
                    <th>Payment Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBills.length > 0 ? (
                    filteredBills.map((bill) => (
                      <tr key={bill.id}>
                        <td data-label="Bill No.">{bill.billNumber}</td>
                        <td data-label="Bill Date">{fmtDate(bill.billDate)}</td>
                        <td data-label="Amount">
                          ₹{bill.amount.toLocaleString()}
                        </td>
                        <td data-label="Paid">
                          ₹{bill.paidAmount.toLocaleString()}
                        </td>
                        <td data-label="Due">
                          ₹{bill.dueAmount.toLocaleString()}
                        </td>
                        <td data-label="Status">
                          <StatusBadge status={bill.status}>
                            {bill.status}
                          </StatusBadge>
                        </td>
                        <td data-label="Collection Day">
                          {bill.collectionDay}
                        </td>
                        <td data-label="Payment Date">
                          {bill.paymentDate ? fmtDate(bill.paymentDate) : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan="8"
                        style={{ textAlign: "center", padding: "2rem" }}
                      >
                        No bills found
                      </td>
                    </tr>
                  )}
                </tbody>
              </DataTable>
            </TableContainer>
          )}
        </ContentSection>
      </PageContainer>
    </RetailerLayout>
  );
};

// Styled Components
const PageContainer = styled.div`
  width: 100%;
`;

const Header = styled.header`
  margin-bottom: 1.5rem;

  h1 {
    color: var(--nb-ink);
    font-size: 1.5rem;
    margin: 0;
    font-weight: 600;

    @media (min-width: 768px) {
      font-size: 1.8rem;
    }
  }
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 2rem;

  @media (min-width: 480px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const SummaryCard = styled.div`
  background-color: var(--nb-white);
  border-radius: 0.75rem;
  padding: 1.25rem;
  box-shadow: var(--nb-shadow-md);
  border-left: 4px solid ${(props) => props.color};

  h3 {
    color: var(--nb-ink);
    font-size: 0.85rem;
    margin: 0 0 0.5rem 0;
    font-weight: 600;
  }

  p {
    color: var(--nb-ink);
    font-size: 1.5rem;
    margin: 0;
    font-weight: 700;
  }
`;

const FilterSection = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
`;

const FilterButton = styled.button`
  padding: 0.6rem 1.2rem;
  border: none;
  border-radius: 0.5rem;
  background-color: ${(props) => (props.active ? "var(--nb-blue)" : "var(--nb-muted)")};
  color: ${(props) => (props.active ? "var(--nb-white)" : "var(--nb-ink)")};
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background-color: ${(props) => (props.active ? "var(--nb-blue)" : "var(--nb-muted)")};
  }
`;

const ContentSection = styled.section`
  background-color: var(--nb-white);
  border-radius: 0.75rem;
  padding: 1.25rem;
  box-shadow: var(--nb-shadow-md);
  overflow: hidden;

  @media (min-width: 768px) {
    padding: 1.5rem;
  }
`;

const TableContainer = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 0.5rem;
`;

const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  min-width: 800px;

  @media (min-width: 768px) {
    font-size: 0.9rem;
    min-width: 100%;
  }

  th,
  td {
    padding: 0.75rem 1rem;
    text-align: left;
    border-bottom: 1px solid var(--nb-border);
  }

  th {
    color: var(--nb-ink);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: 0.75rem;
    white-space: nowrap;
    background-color: var(--nb-muted);

    @media (min-width: 768px) {
      font-size: 0.8rem;
      padding: 1rem;
    }
  }

  td {
    color: var(--nb-ink);
    white-space: nowrap;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tr:hover {
    background-color: var(--nb-muted);
  }

  @media (max-width: 767px) {
    min-width: 100%;

    thead {
      display: none;
    }

    tr {
      display: block;
      margin-bottom: 1rem;
      border: 1px solid var(--nb-border);
      border-radius: 0.5rem;
      padding: 0.5rem;
    }

    td {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      text-align: right;
      border-bottom: 1px solid var(--nb-border);
      white-space: normal;

      &:last-child {
        border-bottom: none;
      }

      &::before {
        content: attr(data-label);
        float: left;
        font-weight: 600;
        color: var(--nb-ink);
        margin-right: 1rem;
        font-size: 0.8rem;
      }
    }
  }
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 0.35rem 0.65rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: ${(props) =>
    props.status === "Paid"
      ? "var(--nb-muted)"
      : props.status === "Partially Paid"
        ? "var(--nb-white)8e6"
        : "var(--nb-muted)"};
  color: ${(props) =>
    props.status === "Paid"
      ? "var(--nb-blue)"
      : props.status === "Partially Paid"
        ? "var(--nb-orange)"
        : "var(--nb-orange)"};
  text-transform: capitalize;
`;

const LoadingIndicator = styled.div`
  padding: 2rem;
  text-align: center;
  color: var(--nb-ink);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--nb-muted);
    border-radius: 50%;
    border-top-color: var(--nb-blue);
    animation: spin 1s ease-in-out infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  p {
    margin: 0;
    font-size: 0.95rem;
  }
`;

const DuplicateBanner = styled.div`
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffc107;
  border-radius: 0.5rem;
  padding: 0.6rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 1rem;
`;

const ErrorMessage = styled.div`
  padding: 2rem;
  text-align: center;
  color: var(--nb-orange);
  background-color: var(--nb-muted);
  border-radius: 0.75rem;
  border: 1px solid var(--nb-border);
`;

export default RetailerBilling;
