import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { fmtDate } from "../utils/dateFormat";
import {
  FaFileInvoiceDollar,
  FaUserTie,
  FaListAlt,
  FaMoneyBillWave,
  FaChevronRight,
  FaStore,
  FaBoxes,
} from "react-icons/fa";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useModules } from "../contexts/ModuleContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);
const AdminDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("week");
  const navigate = useNavigate();
  const { getModuleName } = useModules();

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
          "https://backend.laxmilube.in/api/admin/dashboard",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!response.data.success) {
          throw new Error(
            response.data.message || "Failed to load dashboard data",
          );
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
          setError(
            error.response.data.message || "Failed to load dashboard data",
          );
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

  // Helper function to format numbers in Indian format
  const formatIndianNumber = (num) => {
    if (!num) return "0";
    const numStr = num.toString();
    const [intPart, decPart] = numStr.split(".");
    const lastThree = intPart.substring(intPart.length - 3);
    const otherNumbers = intPart.substring(0, intPart.length - 3);
    const formatted =
      otherNumbers !== ""
        ? otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree
        : lastThree;
    return decPart ? formatted + "." + decPart : formatted;
  };

  // Prepare collection chart data based on time range
  const getCollectionChartData = () => {
    if (!dashboardData?.collectionTrends) {
      return {
        labels: [],
        datasets: [],
      };
    }

    let labels = [];
    let data = [];

    switch (timeRange) {
      case "day":
        labels = dashboardData.collectionTrends.daily.labels;
        data = dashboardData.collectionTrends.daily.data;
        break;
      case "week":
        labels = dashboardData.collectionTrends.weekly.labels;
        data = dashboardData.collectionTrends.weekly.data;
        break;
      case "month":
      default:
        labels = dashboardData.collectionTrends.monthly.labels;
        data = dashboardData.collectionTrends.monthly.data;
        break;
    }

    return {
      labels,
      datasets: [
        {
          label: "Collection Amount (₹)",
          data,
          fill: true,
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) {
              return null;
            }
            const gradient = ctx.createLinearGradient(
              0,
              chartArea.top,
              0,
              chartArea.bottom,
            );
            gradient.addColorStop(0, "rgba(240, 138, 59, 0.4)");
            gradient.addColorStop(1, "rgba(240, 138, 59, 0.05)");
            return gradient;
          },
          borderColor: "#F08A3B",
          borderWidth: 3,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBackgroundColor: "#fff",
          pointBorderColor: "#F08A3B",
          pointBorderWidth: 2,
        },
      ],
    };
  };

  const collectionChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      datalabels: {
        display: false,
      },
      tooltip: {
        mode: "index",
        intersect: false,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        titleColor: "#333",
        bodyColor: "#666",
        borderColor: "#eee",
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: function (context) {
            return "₹" + formatIndianNumber(context.raw);
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value) {
            if (value >= 1000) {
              return "₹" + value / 1000 + "k";
            }
            return "₹" + value;
          },
          color: "var(--nb-text-secondary)",
          font: {
            size: 12,
          },
          padding: 10,
        },
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
          drawBorder: false,
          borderDash: [5, 5],
        },
        border: {
          display: false,
        },
      },
      x: {
        ticks: {
          color: "var(--nb-text-secondary)",
          font: {
            size: 12,
          },
          padding: 10,
        },
        grid: {
          display: false,
          drawBorder: false,
        },
        border: {
          display: false,
        },
      },
    },
    interaction: {
      mode: "nearest",
      axis: "x",
      intersect: false,
    },
  };

  return (
    <Layout>
      <MainContent>
        <Header>
          <div className="title-wrapper">
            <h1>Welcome</h1>
            <p className="subtitle">
              Here's a quick overview of your business performance
            </p>
          </div>
        </Header>

        {loading ? (
          <LoadingIndicator>
            <div className="spinner"></div>
            <p>Loading dashboard data...</p>
          </LoadingIndicator>
        ) : error ? (
          <ErrorMessage>
            <FaFileInvoiceDollar size={20} />
            <p>{error}</p>
          </ErrorMessage>
        ) : (
          <>
            <MetricsGrid>
              <MetricCard>
                <div className="icon-container">
                  <FaFileInvoiceDollar size={20} />
                </div>
                <div className="metric-content">
                  <h3>Total Bill Amount</h3>
                  <p>
                    ₹
                    {formatIndianNumber(
                      dashboardData?.totalBillAmount?.toFixed(2),
                    )}
                  </p>
                </div>
              </MetricCard>

              <MetricCard>
                <div className="icon-container red">
                  <FaMoneyBillWave size={20} />
                </div>
                <div className="metric-content">
                  <h3>Total Paid Today</h3>
                  <p>
                    ₹
                    {formatIndianNumber(
                      dashboardData?.totalPaidAmount?.toFixed(2),
                    )}
                  </p>
                </div>
              </MetricCard>

              <MetricCard>
                <div className="icon-container">
                  <FaListAlt size={20} />
                </div>
                <div className="metric-content">
                  <h3>Remaining Today</h3>
                  <p>
                    ₹
                    {formatIndianNumber(
                      dashboardData?.totalRemainingAmount?.toFixed(2),
                    )}
                  </p>
                </div>
              </MetricCard>

              <MetricCard>
                <div className="icon-container red">
                  <FaUserTie size={20} />
                </div>
                <div className="metric-content">
                  <h3>Total Staff</h3>
                  <p>{formatIndianNumber(dashboardData?.totalStaff)}</p>
                </div>
              </MetricCard>

              <MetricCard>
                <div className="icon-container">
                  <FaStore size={20} />
                </div>
                <div className="metric-content">
                  <h3>Total Retailers</h3>
                  <p>{formatIndianNumber(dashboardData?.totalRetailers)}</p>
                </div>
              </MetricCard>

              <MetricCard>
                <div className="icon-container red">
                  <FaBoxes size={20} />
                </div>
                <div className="metric-content">
                  <h3>Total {getModuleName("product", "plural")}</h3>
                  <p>{formatIndianNumber(dashboardData?.totalProducts)}</p>
                </div>
              </MetricCard>
            </MetricsGrid>

            <ContentSection style={{ marginBottom: 0 }}>
              <SectionHeader style={{ alignItems: "flex-start" }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "1.25rem",
                      margin: 0,
                      fontWeight: "600",
                    }}
                  >
                    Revenue Analytics
                  </h2>
                  <span
                    style={{
                      fontSize: "0.95rem",
                      color: "var(--nb-text-secondary)",
                    }}
                  >
                    Track your revenue over time
                  </span>
                </div>
                <StyledTimeToggle>
                  <button
                    className={timeRange === "day" ? "active" : ""}
                    onClick={() => setTimeRange("day")}
                  >
                    7D
                  </button>
                  <button
                    className={timeRange === "week" ? "active" : ""}
                    onClick={() => setTimeRange("week")}
                  >
                    30D
                  </button>
                  <button
                    className={timeRange === "month" ? "active" : ""}
                    onClick={() => setTimeRange("month")}
                  >
                    6M
                  </button>
                </StyledTimeToggle>
              </SectionHeader>
              <ChartContainer>
                {dashboardData?.collectionTrends ? (
                  <Line
                    data={getCollectionChartData()}
                    options={collectionChartOptions}
                  />
                ) : (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      height: "100%",
                      color: "var(--nb-text-secondary)",
                    }}
                  >
                    No data available
                  </div>
                )}
              </ChartContainer>
            </ContentSection>
            <ContentSection style={{ marginBottom: 0 }}>
              <SectionHeader>
                <h2>Logistics Tracking</h2>
                <ViewAllLink to="/admin/delivery-tracking">
                  View All <FaChevronRight size={12} />
                </ViewAllLink>
              </SectionHeader>
              <TableContainer>
                <DataTable>
                  <thead>
                    <tr>
                      <th>Vehicle No.</th>
                      <th>Route</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData?.recentDeliveries &&
                    dashboardData.recentDeliveries.length > 0 ? (
                      dashboardData.recentDeliveries
                        .slice(0, 5)
                        .map((delivery, index) => (
                          <tr key={index}>
                            <td data-label="Vehicle No.">
                              {delivery.vehicleNumber || "N/A"}
                            </td>
                            <td data-label="Route">
                              {delivery.route?.name || delivery.route || "N/A"}
                            </td>
                            <td data-label="Status">
                              <PaymentBadge
                                mode={
                                  delivery.status === "Delivered" ||
                                  delivery.status === "Completed"
                                    ? "Cash"
                                    : delivery.status === "In Transit"
                                      ? "Card"
                                      : "Pending"
                                }
                              >
                                {delivery.status || "Pending"}
                              </PaymentBadge>
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td
                          colSpan="3"
                          style={{
                            textAlign: "center",
                            padding: "2rem",
                            color: "var(--nb-text-secondary)",
                          }}
                        >
                          No active deliveries found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </DataTable>
              </TableContainer>
            </ContentSection>

            <ContentSection>
              <SectionHeader>
                <h2>DSR Performance</h2>
              </SectionHeader>
              <DSRPerformanceGrid>
                <DSRPerformanceCard>
                  <h3>Top Collectors (This Month)</h3>
                  <DSRList>
                    {dashboardData?.dsrCollections?.map((dsr, index) => (
                      <DSRItem key={dsr._id}>
                        <span className="rank">{index + 1}</span>
                        <span className="name">{dsr.dsrName}</span>
                        <span className="amount">
                          ₹{dsr.totalCollection?.toLocaleString()}
                        </span>
                      </DSRItem>
                    ))}
                  </DSRList>
                </DSRPerformanceCard>

                <DSRPerformanceCard>
                  <h3>Outstanding DSRs (All Time)</h3>
                  <DSRList>
                    {dashboardData?.outstandingDSRs?.map((dsr, index) => (
                      <DSRItem key={dsr._id}>
                        <span className="rank">{index + 1}</span>
                        <span className="name">{dsr.dsrName}</span>
                        <span className="amount">
                          ₹{dsr.totalCollection?.toLocaleString()}
                        </span>
                      </DSRItem>
                    ))}
                  </DSRList>
                </DSRPerformanceCard>
              </DSRPerformanceGrid>
            </ContentSection>

            <ContentSection>
              <SectionHeader>
                <h2>Recent Collections</h2>
                <ViewAllLink to="/admin/bill-collection-history">
                  View All <FaChevronRight size={12} />
                </ViewAllLink>
              </SectionHeader>

              <TableContainer>
                <DataTable>
                  <thead>
                    <tr>
                      <th>Bill No.</th>
                      <th>Retailer</th>
                      <th>Amount</th>
                      <th>Collected By</th>
                      <th>Payment</th>
                      <th>Date</th>
                      <th>WhatsApp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardData?.recentCollections?.map((collection) => (
                      <tr key={collection._id}>
                        <td data-label="Bill No.">
                          {collection.bill?.billNumber || "N/A"}
                        </td>
                        <td data-label="Retailer">
                          {collection.bill?.retailer || "N/A"}
                        </td>
                        <td data-label="Amount">
                          ₹
                          {collection.amountCollected
                            ? collection.amountCollected.toLocaleString()
                            : "0"}
                        </td>
                        <td data-label="Collected By">
                          {collection.collectedBy?.name ||
                            collection.collectedBy?.email ||
                            "N/A"}
                        </td>
                        <td data-label="Payment">
                          <PaymentBadge mode={collection.paymentMode}>
                            {collection.paymentMode}
                          </PaymentBadge>
                        </td>
                        <td data-label="Date">
                          {fmtDate(collection.collectedOn)}
                        </td>
                        <td data-label="WhatsApp">
                          <WaBadge status={collection.whatsappStatus}>
                            {{
                              received: "✓ Received",
                              not_received: "✗ Not Received",
                              sent: "Sent",
                              no_phone: "No Phone",
                              pending: "Pending",
                            }[collection.whatsappStatus] || "Pending"}
                          </WaBadge>
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
  overflow-x: hidden;
  animation: fadeIn 0.6s ease;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @media (min-width: 768px) {
    padding: 1.5rem;
  }

  @media (min-width: 1200px) {
    padding: 2rem;
  }
`;
const ChartContainer = styled.div`
  width: 100%;
  height: 400px;
  margin-top: 1rem;
  padding: 1.5rem;
  background: transparent;
  border-radius: 1rem;
  border: none;

  animation: slideUp 0.8s ease;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
  animation: slideUp 0.6s ease;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  .title-wrapper {
    display: flex;
    flex-direction: column;

    .breadcrumb {
      color: var(--nb-text-secondary);
      font-size: 0.85rem;
      margin-bottom: 0.25rem;
    }

    .subtitle {
      color: var(--nb-text-secondary);
      font-size: 0.95rem;
      margin-top: 0.25rem;
    }
  }

  h1 {
    color: var(--nb-ink);
    font-size: 1.5rem;
    margin: 0;
    font-weight: 700;
    text-shadow: none;

    @media (min-width: 768px) {
      font-size: 1.75rem;
    }
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 1rem;

    .search-bar {
      display: flex;
      align-items: center;
      background: var(--nb-cream);
      border: 1px solid var(--nb-border);
      border-radius: var(--nb-radius-lg);
      padding: 0.5rem 1rem;
      gap: 0.5rem;
      transition: all var(--nb-transition);

      &:focus-within {
        border-color: var(--nb-blue-medium);
        box-shadow: 0 0 0 2px var(--nb-blue-light);
      }

      .search-icon {
        color: var(--nb-text-secondary);
      }

      input {
        border: none;
        outline: none;
        background: transparent;
        font-size: 0.9rem;
        color: var(--nb-ink);
        width: 150px;

        &::placeholder {
          color: var(--nb-text-secondary);
        }
      }
    }

    .icon-btn {
      background: transparent;
      border: none;
      color: var(--nb-text-secondary);
      font-size: 1.1rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--nb-transition);

      &:hover {
        color: var(--nb-blue);
      }
    }
  }
`;
const DSRPerformanceGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const DSRPerformanceCard = styled.div`
  background: var(--nb-white);
  border-radius: var(--nb-radius-lg);
  padding: 1.5rem;
  box-shadow: none;
  border: 1px solid var(--nb-border);
  transition: all var(--nb-transition);

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--nb-shadow-sm);
    border-color: var(--nb-border);
  }

  h3 {
    color: var(--nb-ink);
    font-size: 1.05rem;
    margin: 0 0 1rem 0;
    font-weight: 600;
    border-bottom: 1px solid var(--nb-border);
    padding-bottom: 0.75rem;
  }
`;

const DSRList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const DSRItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    background: var(--nb-cream);
    box-shadow: var(--nb-shadow-sm);
    transform: translateY(-2px);
  }

  .rank {
    background: var(--nb-white);
    color: var(--nb-orange);
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-weight: 600;
  }

  .name {
    flex: 1;
    color: var(--nb-text-primary);
    font-weight: 500;
  }

  .amount {
    color: var(--nb-text-primary);
    font-weight: 600;
    font-size: 1rem;
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
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
  }

  > div:nth-child(1) {
    animation: slideUp 0.6s ease 0.1s backwards;
  }

  > div:nth-child(2) {
    animation: slideUp 0.6s ease 0.2s backwards;
  }

  > div:nth-child(3) {
    animation: slideUp 0.6s ease 0.3s backwards;
  }

  > div:nth-child(4) {
    animation: slideUp 0.6s ease 0.4s backwards;
  }

  > div:nth-child(5) {
    animation: slideUp 0.6s ease 0.5s backwards;
  }

  > div:nth-child(6) {
    animation: slideUp 0.6s ease 0.6s backwards;
  }

  > div:nth-child(7) {
    animation: slideUp 0.6s ease 0.7s backwards;
  }

  > div:nth-child(8) {
    animation: slideUp 0.6s ease 0.8s backwards;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const MetricCard = styled.div`
  background: var(--nb-cream);
  border-radius: var(--nb-radius-lg);
  padding: 1.25rem 1.5rem;
  box-shadow: var(--nb-shadow-sm);
  display: flex;
  flex-direction: row-reverse;
  justify-content: space-between;
  align-items: center;
  transition: all var(--nb-transition);
  min-height: 90px;
  position: relative;
  overflow: hidden;
  border: 1px solid var(--nb-border);

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--nb-shadow-md);
  }

  .icon-container {
    width: 48px;
    height: 48px;
    border-radius: var(--nb-radius);
    background: var(--nb-blue);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: all var(--nb-transition);
    svg {
      color: var(--nb-white);
      position: relative;
      z-index: 1;
      font-size: 1.25rem;
    }
  }
  .red {
    background: #ed1c24;
  }
  &:hover .icon-container {
    transform: scale(1.05);
  }

  .metric-content {
    display: flex;
    flex-direction: column-reverse;
    gap: 0.25rem;

    h3 {
      color: var(--nb-text-secondary);
      font-size: 0.85rem;
      margin: 0;
      font-weight: 500;
      text-transform: capitalize;
      letter-spacing: 0;

      @media (min-width: 768px) {
        font-size: 0.9rem;
      }
    }

    p {
      color: var(--nb-ink);
      font-size: 1.5rem;
      margin: 0;
      font-weight: 600;
      animation: countUp 1s ease;

      @media (min-width: 768px) {
        font-size: 1.75rem;
      }
    }
  }

  @keyframes countUp {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ContentSection = styled.section`
  background: var(--nb-cream);
  border-radius: var(--nb-radius-lg);
  padding: 1.5rem;
  box-shadow: var(--nb-shadow-sm);
  overflow: hidden;
  margin-bottom: 2rem;
  border: 1px solid var(--nb-border);
  transition: all var(--nb-transition);
  animation: slideUp 0.8s ease;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  &:hover {
    box-shadow: var(--nb-shadow-md);
  }

  @media (min-width: 768px) {
    padding: 2rem;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.25rem;

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }

  h2 {
    color: var(--nb-ink);
    font-size: 1.25rem;
    margin: 0;
    font-weight: 600;
    text-shadow: none;

    @media (min-width: 768px) {
      font-size: 1.4rem;
    }
  }
`;

const ViewAllLink = styled(Link)`
  color: var(--nb-blue-medium);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  transition: all 0.3s ease;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background: var(--nb-cream);

  &:hover {
    color: var(--nb-ink);
    text-decoration: none;
    background: var(--nb-cream);
    transform: translateX(2px);
    box-shadow: var(--nb-shadow-md);
  }

  svg {
    transition: transform 0.3s ease;
  }

  &:hover svg {
    transform: translateX(2px);
  }

  @media (min-width: 768px) {
    font-size: 0.95rem;
  }
`;

const TableContainer = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  background: transparent;
`;

const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  min-width: 600px;

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
    color: var(--nb-blue-medium);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: 0.75rem;
    white-space: nowrap;
    background: var(--nb-cream);

    @media (min-width: 768px) {
      font-size: 0.8rem;
      padding: 1rem;
    }
  }

  td {
    color: var(--nb-ink);
    white-space: nowrap;
    transition: all 0.3s ease;
  }

  tr:last-child td {
    border-bottom: none;
  }

  tbody tr {
    transition: all 0.3s ease;
    cursor: pointer;

    &:hover {
      background: var(--nb-cream);
      transform: scale(1.01);
    }
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
      position: relative;
      background: var(--nb-cream);
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
        color: var(--nb-blue-medium);
        margin-right: 1rem;
        font-size: 0.8rem;
      }
    }
  }
`;

const PaymentBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${(props) =>
    props.mode === "Cash"
      ? "rgba(16, 185, 129, 0.1)"
      : props.mode === "Card"
        ? "rgba(59, 130, 246, 0.1)"
        : "rgba(245, 158, 11, 0.1)"};
  color: ${(props) =>
    props.mode === "Cash"
      ? "rgb(16, 185, 129)"
      : props.mode === "Card"
        ? "rgb(59, 130, 246)"
        : "rgb(245, 158, 11)"};
  text-transform: capitalize;
  border: none;
`;

const WA_STATUS_STYLE = {
  received: { bg: "rgba(22,163,74,0.12)", color: "#15803d" },
  not_received: { bg: "rgba(220,38,38,0.12)", color: "#b91c1c" },
  sent: { bg: "rgba(37,99,235,0.12)", color: "#1d4ed8" },
  no_phone: { bg: "rgba(150,150,150,0.12)", color: "#6b7280" },
  pending: { bg: "rgba(234,179,8,0.12)", color: "#92400e" },
};

const WaBadge = styled.span`
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 600;
  background: ${(p) =>
    (WA_STATUS_STYLE[p.status] || WA_STATUS_STYLE.pending).bg};
  color: ${(p) => (WA_STATUS_STYLE[p.status] || WA_STATUS_STYLE.pending).color};
`;

const LoadingIndicator = styled.div`
  padding: 2rem;
  text-align: center;
  color: var(--nb-ink);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  animation: fadeIn 0.6s ease;

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .spinner {
    width: 50px;
    height: 50px;
    border: 4px solid var(--nb-border);
    border-radius: 50%;
    border-top-color: var(--nb-blue-medium);
    animation: spin 1s ease-in-out infinite;
    box-shadow: var(--nb-shadow-md);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  p {
    margin: 0;
    font-size: 0.95rem;
    color: var(--nb-blue);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

const StyledTimeToggle = styled.div`
  display: flex;
  background: var(--nb-white);
  border: 1px solid var(--nb-border);
  border-radius: 20px;
  padding: 0.25rem;

  button {
    background: transparent;
    border: none;
    padding: 0.4rem 1rem;
    border-radius: 16px;
    font-size: 0.85rem;
    font-weight: 500;
    color: var(--nb-text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;

    &.active {
      background: var(--nb-cream);
      color: var(--nb-ink);
      box-shadow: var(--nb-shadow-sm);
      border: 1px solid var(--nb-border);
    }

    &:hover:not(.active) {
      color: var(--nb-ink);
    }
  }
`;

const ErrorMessage = styled.div`
  padding: 1.5rem;
  background: var(--nb-cream);
  color: var(--nb-blue-medium);
  border-radius: 0.75rem;
  margin: 1rem 0;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid var(--nb-blue-medium);
  backdrop-filter: blur(10px);
  animation: shake 0.5s ease;

  @keyframes shake {
    0%,
    100% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(-10px);
    }
    75% {
      transform: translateX(10px);
    }
  }

  svg {
    color: var(--nb-orange);
  }

  p {
    margin: 0;
    font-size: 0.95rem;
    color: var(--nb-ink);
  }
`;

export default AdminDashboard;
