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
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const response = await axios.get(
          "http://localhost:2500/api/admin/dashboard",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setDashboardData(response.data);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setError("Failed to load dashboard data");
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
                  <p>
                    ₹{dashboardData?.totalBillAmount?.toLocaleString() || "0"}
                  </p>
                </div>
              </MetricCard>

              <MetricCard color="#1cc88a">
                <FaMoneyBillWave size={24} />
                <div>
                  <h3>Total Paid Today</h3>
                  <p>
                    ₹{dashboardData?.totalPaidAmount?.toLocaleString() || "0"}
                  </p>
                </div>
              </MetricCard>

              <MetricCard color="#f6c23e">
                <FaListAlt size={24} />
                <div>
                  <h3>Remaining Today</h3>
                  <p>
                    ₹
                    {dashboardData?.totalRemainingAmount?.toLocaleString() ||
                      "0"}
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

              <DataTable>
                <thead>
                  <tr>
                    <th>Bill Number</th>
                    <th>Amount</th>
                    <th>Collected By</th>
                    <th>Payment Mode</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData?.recentCollections?.map((collection) => (
                    <tr key={collection._id}>
                      <td>{collection.bill.billNumber}</td>
                      <td>₹{collection.amountCollected.toLocaleString()}</td>
                      <td>{collection.collectedBy.name}</td>
                      <td>
                        <PaymentBadge mode={collection.paymentMode}>
                          {collection.paymentMode}
                        </PaymentBadge>
                      </td>
                      <td>
                        {new Date(collection.collectedOn).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </ContentSection>
          </>
        )}
      </MainContent>
    </Layout>
  );
};

const MainContent = styled.div`
  flex: 1;
  padding: 20px;
  overflow-x: hidden;

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

const UserProfile = styled.div`
  display: flex;
  align-items: center;

  img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    margin-right: 10px;
  }

  span {
    color: #2e3a59;
    font-weight: 500;
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
`;

const MetricCard = styled.div`
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  border-left: 4px solid ${(props) => props.color};
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);
  }

  svg {
    color: ${(props) => props.color};
    margin-right: 15px;
    flex-shrink: 0;
  }

  h3 {
    color: #6e707e;
    font-size: 0.9rem;
    margin: 0 0 5px 0;
    font-weight: 600;
  }

  p {
    color: #2e3a59;
    font-size: 1.5rem;
    margin: 0;
    font-weight: 700;
  }
`;

const ContentSection = styled.section`
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h2 {
    color: #2e3a59;
    font-size: 1.3rem;
    margin: 0;
    font-weight: 600;
  }
`;

const ViewAllLink = styled(Link)`
  color: #4e73df;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;

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
  }

  td {
    color: #2e3a59;
    font-size: 0.9rem;
  }

  tr:hover {
    background-color: #f9f9f9;
  }
`;

const PaymentBadge = styled.span`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
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

export default AdminDashboard;
