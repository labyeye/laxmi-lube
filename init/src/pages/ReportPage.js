import React, { useState, useEffect } from "react";
import styled from "styled-components";
import axios from "axios";
import { saveAs } from "file-saver";
import {
  FaFileExcel,
  FaFilePdf,
  FaSearch,
  FaCalendarAlt,
  FaHistory,
} from "react-icons/fa";
import { DateRangePicker } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import Layout from "../components/Layout";
import { format, startOfDay, endOfDay, isToday } from "date-fns";

const API_BASE_URL = "https://laxmi-lube.onrender.com/api/admin/reports";

const ReportPage = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showHistory, setShowHistory] = useState(false); // New state for history view
  const [dateRange, setDateRange] = useState([
    {
      startDate: new Date(),
      endDate: new Date(),
      key: "selection",
    },
  ]);

  useEffect(() => {
    fetchReports();
  }, [showHistory]); // Refetch when history view changes

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
  
      const token = localStorage.getItem("token");
      if (!token) return;
  
      let url = `${API_BASE_URL}`;
      let params = {};
      
      if (!showHistory) {
        url = `${API_BASE_URL}/today-collections`;
      } else if (dateRange[0].startDate && dateRange[0].endDate) {
        url = `${API_BASE_URL}`;
        params = {
          startDate: format(dateRange[0].startDate, "yyyy-MM-dd"),
          endDate: format(dateRange[0].endDate, "yyyy-MM-dd")
        };
      }
  
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params
      });
  
      setReports(response.data);
    } catch (error) {
      console.error("Error fetching reports:", error);
      setError(error.response?.data?.message || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };
  

  const toggleHistoryView = () => {
    setShowHistory(!showHistory);
    setShowDatePicker(false);
  };

  const handleDateFilter = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await axios.get(
        `${API_BASE_URL}?startDate=${format(
          dateRange[0].startDate,
          "yyyy-MM-dd"
        )}&endDate=${format(dateRange[0].endDate, "yyyy-MM-dd")}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setReports(response.data);
      setShowDatePicker(false);
    } catch (error) {
      console.error("Error filtering reports:", error);
      setError(error.response?.data?.message || "Failed to filter reports");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTodayCollections = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication required");
        return;
      }

      const response = await axios.get(
        `${API_BASE_URL}/export/today-collections/excel`, // Changed this line
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: response.headers["content-type"],
      });

      const filename = `today_collections_${format(
        new Date(),
        "yyyyMMdd"
      )}.xlsx`;
      saveAs(blob, filename);
    } catch (error) {
      console.error("Error downloading today's collections:", error);
      setError("Failed to download today's collections");
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter((report) => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      report.billNumber?.toLowerCase().includes(searchTermLower) ||
      report.retailer?.toLowerCase().includes(searchTermLower) ||
      report.assignedToName?.toLowerCase().includes(searchTermLower) ||
      report.status?.toLowerCase().includes(searchTermLower)
    );
  });
  return (
    <Layout>
      <MainContent>
        <Header>
          <h1>
            {showHistory ? "Historical Collections" : "Today's Collections"}
          </h1>
          <ActionsContainer>
            <HistoryButton onClick={toggleHistoryView}>
              <FaHistory /> {showHistory ? "View Today" : "View History"}
            </HistoryButton>
            <ExportButton onClick={handleDownloadTodayCollections}>
              <FaFileExcel /> Export {showHistory ? "Selected" : "Today's"}{" "}
              Collections
            </ExportButton>
          </ActionsContainer>
        </Header>

        {showHistory && (
          <ControlsContainer>
            <SearchContainer>
              <FaSearch />
              <SearchInput
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchContainer>

            <DateFilterContainer>
              <DateFilterButton
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                <FaCalendarAlt /> Filter by Date
              </DateFilterButton>

              {showDatePicker && (
                <DatePickerContainer>
                  <DateRangePicker
                    onChange={(item) => setDateRange([item.selection])}
                    showSelectionPreview={true}
                    moveRangeOnFirstSelection={false}
                    months={2}
                    ranges={dateRange}
                    direction="horizontal"
                  />
                  <ApplyDateFilter onClick={handleDateFilter}>
                    Apply Filter
                  </ApplyDateFilter>
                </DatePickerContainer>
              )}
            </DateFilterContainer>
          </ControlsContainer>
        )}
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {loading ? (
          <LoadingIndicator>Loading reports...</LoadingIndicator>
        ) : (
          <ReportTable>
            <thead>
              <tr>
                <th>Bill No.</th>
                <th>Retailer</th>
                <th>Bill Date</th>
                <th>Bill Amount</th>
                <th>Status</th>
                <th>Assigned To</th>
                <th>Collections</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length > 0 ? (
                filteredReports.map((report) => (
                  <tr key={report._id}>
                    <td>{report.billNumber}</td>
                    <td>{report.retailer}</td>
                    <td>{format(new Date(report.billDate), "dd/MM/yyyy")}</td>
                    <td>₹{report.amount.toLocaleString()}</td>
                    <td>
                      <StatusBadge status={report.status}>
                        {report.status}
                      </StatusBadge>
                    </td>
                    <td>{report.assignedToName || "Not assigned"}</td>
                    <td>
                      {report.collections.length > 0 ? (
                        <CollectionsList>
                          {report.collections.map((collection) => (
                            <CollectionItem key={collection._id}>
                              <div>
                                <strong>Amount:</strong> ₹
                                {collection.amountCollected.toLocaleString()}
                              </div>
                              <div>
                                <strong>Mode:</strong> {collection.paymentMode}
                              </div>
                              <div>
                                <strong>Date:</strong>{" "}
                                {format(
                                  new Date(collection.paymentDate),
                                  "dd/MM/yyyy"
                                )}
                              </div>
                              {collection.paymentDetails && (
                                <PaymentDetails>
                                  {Object.entries(
                                    collection.paymentDetails
                                  ).map(([key, value]) => (
                                    <div key={key}>
                                      <strong>{key}:</strong> {value}
                                    </div>
                                  ))}
                                </PaymentDetails>
                              )}
                            </CollectionItem>
                          ))}
                        </CollectionsList>
                      ) : (
                        "No collections"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center" }}>
                    No reports found
                  </td>
                </tr>
              )}
            </tbody>
          </ReportTable>
        )}
      </MainContent>
    </Layout>
  );
};

// Styled components (extending AdminDashboard styles)
const MainContent = styled.div`
  flex: 1;
  padding: 20px;
  overflow-x: auto;

  @media (min-width: 1200px) {
    padding: 30px;
  }
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;

  h1 {
    color: #2e3a59;
    font-size: 1.8rem;
    margin: 0;
    font-weight: 600;
  }
`;
const HistoryButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  background-color: #6c757d; // Changed from theme.colors.secondary
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;
  margin-right: 15px;

  &:hover {
    background-color: #5a6268; // Changed from theme.colors.secondaryDark
  }
`;
const ActionsContainer = styled.div`
  display: flex;
  gap: 15px;
`;

const ExportButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  background-color: #4e73df;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;

  &:hover {
    background-color: #3a5bc7;
  }

  &:last-child {
    background-color: #e74a3b;

    &:hover {
      background-color: #d62c1a;
    }
  }
`;

const ControlsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  background-color: #f8f9fc;
  border-radius: 4px;
  padding: 8px 12px;
  border: 1px solid #d1d3e2;
  width: 300px;

  svg {
    color: #b7b9cc;
    margin-right: 8px;
  }
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  width: 100%;
  outline: none;
  color: #6e707e;

  &::placeholder {
    color: #b7b9cc;
  }
`;

const DateFilterContainer = styled.div`
  position: relative;
`;

const DateFilterButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 15px;
  background-color: #f8f9fc;
  color: #6e707e;
  border: 1px solid #d1d3e2;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background-color: #eaecf4;
  }
`;

const DatePickerContainer = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 100;
  background: white;
  border: 1px solid #d1d3e2;
  border-radius: 4px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  margin-top: 5px;
`;

const ApplyDateFilter = styled.button`
  width: 100%;
  padding: 10px;
  background-color: #4e73df;
  color: white;
  border: none;
  border-radius: 0 0 4px 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.2s;

  &:hover {
    background-color: #3a5bc7;
  }
`;

const ReportTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 20px;

  th,
  td {
    padding: 12px 15px;
    text-align: left;
    border-bottom: 1px solid #eee;
  }

  th {
    color: #6e707e;
    font-weight: 600;
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background-color: #f8f9fc;
    position: sticky;
    top: 0;
  }

  td {
    color: #2e3a59;
    font-size: 0.9rem;
    vertical-align: top;
  }

  tr:hover {
    background-color: #f9f9f9;
  }
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: ${(props) =>
    props.status === "Paid"
      ? "#e3faf0"
      : props.status === "Partially Paid"
      ? "#fff8e6"
      : "#f8d7da"};
  color: ${(props) =>
    props.status === "Paid"
      ? "#20c997"
      : props.status === "Partially Paid"
      ? "#ffc107"
      : "#dc3545"};
`;
const CollectionsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;
const CollectionItem = styled.div`
  padding: 10px;
  background-color: #f8f9fc;
  border-radius: 4px;
  font-size: 0.85rem;
  div {
    margin-bottom: 5px;

    &:last-child {
      margin-bottom: 0;
    }
  }
`;
const PaymentDetails = styled.div`
  margin-top: 5px;
  padding-top: 5px;
  border-top: 1px dashed #ddd;
  font-size: 0.8rem;

  div {
    margin-bottom: 3px;
  }
`;
const LoadingIndicator = styled.div`
  padding: 40px;
  text-align: center;
  color: #6e707e;
`;
const ErrorMessage = styled.div`
  padding: 20px;
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 4px;
  margin: 20px 0;
  text-align: center;
`;
export default ReportPage;
