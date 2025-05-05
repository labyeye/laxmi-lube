import React, { useState, useEffect } from "react";
import styled from "styled-components";
import {
  FaFileInvoiceDollar,
  FaUserTie,
  FaListAlt,
  FaMoneyBillWave,
} from "react-icons/fa";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";

const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const response = await axios.get(
          "https://laxmi-lube.onrender.com/api/admin/dashboard",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.data.success) {
          throw new Error(response.data.message || "Failed to load dashboard data");
        }

        setDashboardData(response.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        
        if (error.response) {
          if (error.response.status === 401) {
            localStorage.removeItem("token");
            navigate("/login");
            return;
          }
          setError(error.response.data.message || "Failed to load dashboard data");
        } else if (error.request) {
          setError("Network error - please check your connection");
        } else {
          setError(error.message || "Failed to load dashboard data");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  return (
    <Layout>
      <MainContent>
        <Header>
          <h1>Dashboard Overview</h1>
          <UserProfile>
            <img
              src="https://ui-avatars.com/api/?name=Admin&background=667eea&color=fff"
              alt="Admin"
            />
            <span>Admin</span>
          </UserProfile>
        </Header>

        {loading ? (
          <LoadingIndicator>Loading dashboard data...</LoadingIndicator>
        ) : error ? (
          <ErrorMessage>{error}</ErrorMessage>
        ) : (
          <>
            <MetricsGrid>
              <MetricCard color="#4e73df">
                <FaFileInvoiceDollar size={24} />
                <div>
                  <h3>Total Bill Amount</h3>
                  <p>₹{dashboardData?.totalBillAmount?.toFixed(2) || "0.00"}</p>
                </div>
              </MetricCard>

              <MetricCard color="#1cc88a">
                <FaMoneyBillWave size={24} />
                <div>
                  <h3>Total Paid Today</h3>
                  <p>₹{dashboardData?.totalPaidAmount?.toFixed(2) || "0.00"}</p>
                </div>
              </MetricCard>

              <MetricCard color="#f6c23e">
                <FaListAlt size={24} />
                <div>
                  <h3>Remaining Today</h3>
                  <p>
                    ₹{dashboardData?.totalRemainingAmount?.toFixed(2) || "0.00"}
                  </p>
                </div>
              </MetricCard>

              <MetricCard color="#36b9cc">
                <FaUserTie size={24} />
                <div>
                  <h3>Total Staff</h3>
                  <p>{dashboardData?.totalStaff?.toLocaleString() || "0"}</p>
                </div>
              </MetricCard>
            </MetricsGrid>

            <ContentSection>
              <SectionHeader>
                <h2>Recent Collections</h2>
                <ViewAllLink to="/admin/bill-collection-history">
                  View All
                </ViewAllLink>
              </SectionHeader>

              <TableContainer>
                <DataTable>
                  <thead>
                    <tr>
                      <th>Bill No.</th>
                      <th>Amount</th>
                      <th>Collected By</th>
                      <th>Payment</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData?.recentCollections?.map((collection) => (
                      <tr key={collection._id}>
                        <td data-label="Bill No.">{collection.bill?.billNumber || "N/A"}</td>
                        <td data-label="Amount">₹{collection.amountCollected.toLocaleString()}</td>
                        <td data-label="Collected By">{collection.collectedBy.name}</td>
                        <td data-label="Payment">
                          <PaymentBadge mode={collection.paymentMode}>
                            {collection.paymentMode}
                          </PaymentBadge>
                        </td>
                        <td data-label="Date">
                          {new Date(collection.collectedOn).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </TableContainer>
            </ContentSection>
          </>
        )}
      </MainContent>
    </Layout>
  );
};

const MainContent = styled.div`
  flex: 1;
  padding: 1rem;
  overflow-x: auto;

  @media (min-width: 768px) {
    padding: 1.5rem;
  }

  @media (min-width: 1200px) {
    padding: 2rem;
  }
`;

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  h1 {
    color: #2e3a59;
    font-size: 1.5rem;
    margin: 0;
    font-weight: 600;

    @media (min-width: 768px) {
      font-size: 1.8rem;
    }
  }
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;

  img {
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 50%;
  }

  span {
    color: #2e3a59;
    font-weight: 500;
    font-size: 0.9rem;

    @media (min-width: 768px) {
      font-size: 1rem;
    }
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin-bottom: 2rem;

  @media (min-width: 480px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const MetricCard = styled.div`
  background-color: #fff;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border-left: 4px solid ${(props) => props.color};
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-3px);
  }

  svg {
    color: ${(props) => props.color};
    flex-shrink: 0;
  }

  h3 {
    color: #6e707e;
    font-size: 0.8rem;
    margin: 0 0 0.25rem 0;
    font-weight: 600;

    @media (min-width: 768px) {
      font-size: 0.9rem;
    }
  }

  p {
    color: #2e3a59;
    font-size: 1.25rem;
    margin: 0;
    font-weight: 700;

    @media (min-width: 768px) {
      font-size: 1.5rem;
    }
  }
`;

const ContentSection = styled.section`
  background-color: #fff;
  border-radius: 0.5rem;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;

  @media (min-width: 768px) {
    padding: 1.5rem;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  h2 {
    color: #2e3a59;
    font-size: 1.2rem;
    margin: 0;
    font-weight: 600;

    @media (min-width: 768px) {
      font-size: 1.3rem;
    }
  }
`;

const ViewAllLink = styled(Link)`
  color: #4e73df;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;

  &:hover {
    text-decoration: underline;
  }

  @media (min-width: 768px) {
    font-size: 0.9rem;
  }
`;

const TableContainer = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
`;

const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;

  @media (min-width: 768px) {
    font-size: 0.9rem;
  }

  th,
  td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid #eee;
  }

  th {
    color: #6e707e;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: 0.75rem;
    white-space: nowrap;

    @media (min-width: 768px) {
      font-size: 0.8rem;
      padding: 1rem 0.75rem;
    }
  }

  td {
    color: #2e3a59;
    white-space: nowrap;
  }

  tr:hover {
    background-color: #f9f9f9;
  }

  @media (max-width: 768px) {
    thead {
      display: none;
    }

    tr {
      display: block;
      margin-bottom: 1rem;
      border: 1px solid #eee;
      border-radius: 0.5rem;
    }

    td {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      text-align: right;
      border-bottom: 1px solid #eee;

      &:last-child {
        border-bottom: none;
      }

      &::before {
        content: attr(data-label);
        float: left;
        font-weight: bold;
        color: #6e707e;
        margin-right: 1rem;
      }
    }
  }
`;

const PaymentBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: ${(props) =>
    props.mode === "Cash"
      ? "#e3faf0"
      : props.mode === "Card"
      ? "#fff8e6"
      : "#ebf5ff"};
  color: ${(props) =>
    props.mode === "Cash"
      ? "#20c997"
      : props.mode === "Card"
      ? "#ffc107"
      : "#4e73df"};
`;

const LoadingIndicator = styled.div`
  padding: 2rem;
  text-align: center;
  color: #6e707e;
`;

const ErrorMessage = styled.div`
  padding: 1rem;
  background-color: #f8d7da;
  color: #721c24;
  border-radius: 0.25rem;
  margin: 1rem 0;
  text-align: center;
`;

export default AdminDashboard;