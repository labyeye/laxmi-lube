import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styled from 'styled-components';
import Layout from '../components/Layout';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import * as XLSX from 'xlsx';

const DSRCollectionSummary = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCollections();
  }, [selectedDate]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.get('https://laxmi-lube.onrender.com/api/reports/dsr-summary', {
        params: {
          date: selectedDate.toISOString()
        },
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        setSummaryData(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch data');
      }
    } catch (err) {
      console.error('Error fetching DSR summary:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch DSR summary');
      setSummaryData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (date) => {
    setSelectedDate(date);
  };

  const exportToExcel = () => {
    if (summaryData.length === 0) {
      setError('No data to export');
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(summaryData.map(item => ({
      'DSR Name': item.staffName,
      'Total': item.total,
      'Cash': item.cash,
      'Cash TRC': item.cashTrc,
      'UPI': item.upi,
      'UPI TRC': item.upiTrc,
      'Cheque': item.cheque,
      'Cheque TRC': item.chequeTrc,
      'Bank Transfer': item.bankTransfer,
      'Bank Transfer TRC': item.bankTransferTrc
    })));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "DSR Collection Summary");
    
    const fileName = `DSR_Collection_Summary_${selectedDate.toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <Layout>
      <HeaderContainer>
        <h1>DSR Collection Summary</h1>
        <ControlsContainer>
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            dateFormat="dd/MM/yyyy"
            className="date-picker"
          />
          <ExportButton onClick={exportToExcel} disabled={summaryData.length === 0}>
            Export to Excel
          </ExportButton>
        </ControlsContainer>
      </HeaderContainer>

      {loading ? (
        <LoadingMessage>Loading data...</LoadingMessage>
      ) : error ? (
        <ErrorMessage>{error}</ErrorMessage>
      ) : (
        <TableContainer>
          <SummaryTable>
            <thead>
              <tr>
                <th>DSR Name</th>
                <th>Total</th>
                <CashHeader colSpan="2">Cash</CashHeader>
                <UPIHeader colSpan="2">UPI</UPIHeader>
                <ChequeHeader colSpan="2">Cheque</ChequeHeader>
                <BankHeader colSpan="2">Bank Transfer</BankHeader>
              </tr>
              <tr>
                <th></th>
                <th></th>
                <CashSubHeader>Amount</CashSubHeader>
                <CashSubHeader>TRC</CashSubHeader>
                <UPISubHeader>Amount</UPISubHeader>
                <UPISubHeader>TRC</UPISubHeader>
                <ChequeSubHeader>Amount</ChequeSubHeader>
                <ChequeSubHeader>TRC</ChequeSubHeader>
                <BankSubHeader>Amount</BankSubHeader>
                <BankSubHeader>TRC</BankSubHeader>
              </tr>
            </thead>
            <tbody>
              {summaryData.length > 0 ? (
                summaryData.map((row, index) => (
                  <tr key={index}>
                    <td>{row.staffName}</td>
                    <td>{row.total.toFixed(2)}</td>
                    <CashCell>{row.cash.toFixed(2)}</CashCell>
                    <CashCell>{row.cashTrc}</CashCell>
                    <UPICell>{row.upi.toFixed(2)}</UPICell>
                    <UPICell>{row.upiTrc}</UPICell>
                    <ChequeCell>{row.cheque.toFixed(2)}</ChequeCell>
                    <ChequeCell>{row.chequeTrc}</ChequeCell>
                    <BankCell>{row.bankTransfer.toFixed(2)}</BankCell>
                    <BankCell>{row.bankTransferTrc}</BankCell>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" style={{ textAlign: 'center' }}>
                    No collections found for the selected date
                  </td>
                </tr>
              )}
            </tbody>
          </SummaryTable>
        </TableContainer>
      )}
    </Layout>
  );
};

// Styled components
const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const ControlsContainer = styled.div`
  display: flex;
  gap: 15px;
  align-items: center;

  .date-picker {
    padding: 8px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }
`;

const ExportButton = styled.button`
  padding: 8px 16px;
  background-color: ${props => props.disabled ? '#cccccc' : '#4CAF50'};
  color: white;
  border: none;
  border-radius: 4px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  font-size: 14px;
  transition: background-color 0.3s;

  &:hover {
    background-color: ${props => props.disabled ? '#cccccc' : '#45a049'};
  }
`;

const LoadingMessage = styled.div`
  padding: 20px;
  text-align: center;
  font-size: 16px;
  color: #666;
`;

const ErrorMessage = styled.div`
  color: #d32f2f;
  background-color: #fde7e7;
  padding: 15px;
  border-radius: 4px;
  margin: 20px 0;
  text-align: center;
`;

const TableContainer = styled.div`
  margin-top: 20px;
  overflow-x: auto;
`;

const SummaryTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;

  th, td {
    padding: 12px 15px;
    text-align: center;
    border: 1px solid #ddd;
  }

  th {
    font-weight: 600;
    white-space: nowrap;
  }

  tr:nth-child(even) {
    background-color: #f9f9f9;
  }

  tr:hover {
    background-color: #f1f1f1;
  }
`;

// Color-coded headers and cells
const CashHeader = styled.th`
  background-color: #e3f2fd !important;
  color: #1565c0;
`;

const CashSubHeader = styled.th`
  background-color: #e3f2fd !important;
`;

const CashCell = styled.td`
  background-color: #e3f2fd;
`;

const UPIHeader = styled.th`
  background-color: #e8f5e9 !important;
  color: #2e7d32;
`;

const UPISubHeader = styled.th`
  background-color: #e8f5e9 !important;
`;

const UPICell = styled.td`
  background-color: #e8f5e9;
`;

const ChequeHeader = styled.th`
  background-color: #fff3e0 !important;
  color: #e65100;
`;

const ChequeSubHeader = styled.th`
  background-color: #fff3e0 !important;
`;

const ChequeCell = styled.td`
  background-color: #fff3e0;
`;

const BankHeader = styled.th`
  background-color: #f3e5f5 !important;
  color: #6a1b9a;
`;

const BankSubHeader = styled.th`
  background-color: #f3e5f5 !important;
`;

const BankCell = styled.td`
  background-color: #f3e5f5;
`;

export default DSRCollectionSummary;