import React, { useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";
import Layout from "../components/Layout";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as XLSX from "xlsx";

const DSRCollectionSummary = () => {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        if (!token) throw new Error("Authentication token not found");

        const response = await axios.get(
          "https://backend.laxmilube.in/api/reports/dsr-summary",
          {
            params: {
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            },
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (response.data.success) {
          setSummaryData(response.data.data);
        } else {
          throw new Error("Failed to fetch data");
        }
      } catch (err) {
        console.error("Error:", err);
        setError(
          err.response?.data?.message || err.message || "Failed to fetch data",
        );
        setSummaryData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, [startDate, endDate]);

  const handleStartDateChange = (date) => {
    setStartDate(date);
  };

  const handleEndDateChange = (date) => {
    setEndDate(date);
  };

  const exportToExcel = () => {
    if (summaryData.length === 0) {
      setError("No data to export");
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(
      summaryData.map((item) => ({
        "DSR Name": item.staffName,
        "Total Amount": item.total,
        "Assigned Retailers": item.assignedRetailers,
        "Collected Retailers": item.collectedRetailers,
        "Cash Amount": item.cash,
        "Cash TRC": item.cashTrc,
        "UPI Amount": item.upi,
        "UPI TRC": item.upiTrc,
        "Cheque Amount": item.cheque,
        "Cheque TRC": item.chequeTrc,
        "Bank Transfer Amount": item.bankTransfer,
        "Bank Transfer TRC": item.bankTransferTrc,
      })),
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DSR Collection Summary");

    const fileName = `DSR_Collection_Summary_${
      startDate.toISOString().split("T")[0]
    }_to_${endDate.toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <Layout>
      <Container>
        <HeaderContainer>
          <h1>DSR Collection Summary</h1>
          <ControlsContainer>
            <DateRangeContainer>
              <DatePickerContainer>
                <label>Start Date</label>
                <DatePicker
                  selected={startDate}
                  onChange={handleStartDateChange}
                  dateFormat="dd/MM/yyyy"
                  className="date-picker"
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                />
              </DatePickerContainer>
              <DatePickerContainer>
                <label>End Date</label>
                <DatePicker
                  selected={endDate}
                  onChange={handleEndDateChange}
                  dateFormat="dd/MM/yyyy"
                  className="date-picker"
                  selectsEnd
                  startDate={startDate}
                  endDate={endDate}
                  minDate={startDate}
                />
              </DatePickerContainer>
            </DateRangeContainer>
            <ExportButton
              onClick={exportToExcel}
              disabled={summaryData.length === 0}
            >
              Export to Excel
            </ExportButton>
          </ControlsContainer>
        </HeaderContainer>

        {loading ? (
          <LoadingMessage>Loading data...</LoadingMessage>
        ) : error ? (
          <ErrorMessage>{error}</ErrorMessage>
        ) : (
          <TableWrapper>
            <SummaryTable>
              <thead>
                <tr>
                  <th rowSpan="2">DSR Name</th>
                  <th rowSpan="2">Total Amount</th>
                  <th colSpan="2">Retailers</th>
                  <th colSpan="2">Cash</th>
                  <th colSpan="2">UPI</th>
                  <th colSpan="2">Cheque</th>
                  <th colSpan="2">Bank Transfer</th>
                </tr>
                <tr>
                  <th>Assigned</th>
                  <th>Collected</th>
                  <CashHeader>Amount</CashHeader>
                  <CashHeader>TRC</CashHeader>
                  <UPIHeader>Amount</UPIHeader>
                  <UPIHeader>TRC</UPIHeader>
                  <ChequeHeader>Amount</ChequeHeader>
                  <ChequeHeader>TRC</ChequeHeader>
                  <BankHeader>Amount</BankHeader>
                  <BankHeader>TRC</BankHeader>
                </tr>
              </thead>
              <tbody>
                {summaryData.map((row, index) => (
                  <tr key={index}>
                    <td>
                      <strong>{row.staffName}</strong>
                    </td>
                    <td>
                      <strong>{row.total.toFixed(2)}</strong>
                    </td>
                    <td>{row.assignedRetailers}</td>
                    <td>{row.collectedRetailers}</td>
                    <CashCell>{row.cash.toFixed(2)}</CashCell>
                    <CashCell>{row.cashTrc}</CashCell>
                    <UPICell>{row.upi.toFixed(2)}</UPICell>
                    <UPICell>{row.upiTrc}</UPICell>
                    <ChequeCell>{row.cheque.toFixed(2)}</ChequeCell>
                    <ChequeCell>{row.chequeTrc}</ChequeCell>
                    <BankCell>{row.bankTransfer.toFixed(2)}</BankCell>
                    <BankCell>{row.bankTransferTrc}</BankCell>
                  </tr>
                ))}
              </tbody>
            </SummaryTable>
          </TableWrapper>
        )}
      </Container>
    </Layout>
  );
};

const Container = styled.div`
  padding: 20px;
  max-width: 100%;
  overflow-x: auto;
`;

const HeaderContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
`;

const ControlsContainer = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
`;

const DatePickerContainer = styled.div`
  .date-picker {
    padding: 8px 12px;
    border: 1px solid var(--nb-border);
    border-radius: 4px;
    font-size: 14px;
    min-width: 150px;
  }
`;

const ExportButton = styled.button`
  padding: 8px 16px;
  background-color: ${(props) => (props.disabled ? "var(--nb-border)" : "var(--nb-blue)")};
  color: var(--nb-white);
  border: none;
  border-radius: 4px;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  font-size: 14px;
  transition: background-color 0.3s;
  white-space: nowrap;

  &:hover {
    background-color: ${(props) => (props.disabled ? "var(--nb-border)" : "var(--nb-blue)")};
  }
`;
const DateRangeContainer = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
`;
const LoadingMessage = styled.div`
  padding: 20px;
  text-align: center;
  font-size: 16px;
  color: var(--nb-ink);
`;

const ErrorMessage = styled.div`
  color: var(--nb-orange);
  background-color: var(--nb-muted);
  padding: 15px;
  border-radius: 4px;
  margin: 20px 0;
  text-align: center;
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  border-radius: 8px;
  box-shadow: var(--nb-shadow-md);
  background: var(--nb-white);
`;

const SummaryTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;

  th,
  td {
    padding: 12px 15px;
    text-align: center;
    border: 1px solid var(--nb-border);
  }

  th {
    background-color: var(--nb-muted);
    font-weight: 600;
    white-space: nowrap;
    position: sticky;
    top: 0;
  }

  tr:nth-child(even) {
    background-color: var(--nb-muted);
  }

  tr:hover {
    background-color: var(--nb-muted);
  }

  @media (max-width: 768px) {
    font-size: 12px;

    th,
    td {
      padding: 8px 10px;
    }
  }
`;

const CashHeader = styled.th`
  background-color: var(--nb-muted) !important;
  color: var(--nb-ink);
`;

const CashCell = styled.td`
  background-color: var(--nb-muted);
`;

const UPIHeader = styled.th`
  background-color: var(--nb-muted) !important;
  color: var(--nb-ink);
`;

const UPICell = styled.td`
  background-color: var(--nb-muted);
`;

const ChequeHeader = styled.th`
  background-color: var(--nb-white) 3 !important;
  color: var(--nb-orange);
`;

const ChequeCell = styled.td`
  background-color: var(--nb-white) 3;
`;

const BankHeader = styled.th`
  background-color: var(--nb-muted) !important;
  color: var(--nb-ink);
`;

const BankCell = styled.td`
  background-color: var(--nb-muted);
`;

export default DSRCollectionSummary;
