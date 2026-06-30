import React, { useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";
import {
  FaSearch,
  FaCalendarAlt,
  FaEye,
  FaMoneyBillWave,
} from "react-icons/fa";
import Layout from "../components/Layout";

const AdminCollectionHistory = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewCollection, setViewCollection] = useState(null);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      setError("");

      let url = "https://backend.laxmilube.in/api/collections";
      const params = new URLSearchParams();
      if (searchTerm) params.append("search", searchTerm);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setCollections(response.data);
    } catch (err) {
      console.error("Error fetching collections:", err);
      setError("Failed to fetch collection history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (dateString) => {
    const options = {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const filteredCollections = collections.filter((collection) => {
    if (!searchTerm) return true;
    return (
      collection.bill?.billNumber?.toString().includes(searchTerm) ||
      collection.bill?.retailer
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase())
    );
  });

  return (
    <Layout>
      <PageContainer>
        <Header>
          <h1>Collection History</h1>
          <HeaderActions>
            <SearchBox>
              <FaSearch />
              <input
                type="text"
                placeholder="Search by bill # or retailer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchBox>
            <DateBox>
              <FaCalendarAlt />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </DateBox>
            <DateBox>
              <FaCalendarAlt />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </DateBox>
            <RefreshBtn onClick={fetchCollections}>Apply</RefreshBtn>
          </HeaderActions>
        </Header>

        {loading ? (
          <LoadingIndicator>
            <Spinner />
            Loading collection history...
          </LoadingIndicator>
        ) : error ? (
          <ErrorMessage>{error}</ErrorMessage>
        ) : filteredCollections.length > 0 ? (
          <TableContainer>
            <DataTable>
              <thead>
                <tr>
                  <th>Bill #</th>
                  <th>Retailer</th>
                  <th>Amount</th>
                  <th>Payment Mode</th>
                  <th>Collected On</th>
                  <th>Collected By</th>
                  <th>Remarks</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredCollections.map((collection) => (
                  <tr key={collection._id}>
                    <td>#{collection.bill?.billNumber}</td>
                    <td>{collection.bill?.retailer}</td>
                    <td>{formatCurrency(collection.amountCollected)}</td>
                    <td>
                      <PaymentMode mode={collection.paymentMode}>
                        {collection.paymentMode}
                      </PaymentMode>
                    </td>
                    <td>{formatDate(collection.collectedOn)}</td>
                    <td>{collection.collectedBy?.name || "-"}</td>
                    <td>{collection.remarks || "-"}</td>
                    <td>
                      <EyeBtn
                        title="View details"
                        onClick={() => setViewCollection(collection)}
                      >
                        <FaEye />
                      </EyeBtn>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </TableContainer>
        ) : (
          <EmptyState>
            <FaMoneyBillWave size={40} />
            <p>No collections found</p>
          </EmptyState>
        )}
      </PageContainer>

      {viewCollection && (
        <ModalOverlay onClick={() => setViewCollection(null)}>
          <DetailModal onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h3>Collection Details</h3>
              <CloseBtn onClick={() => setViewCollection(null)}>×</CloseBtn>
            </ModalHeader>
            <ModalBody>
              <DetailGrid>
                <DetailRow>
                  <DetailLabel>Bill #</DetailLabel>
                  <DetailValue>#{viewCollection.bill?.billNumber}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Retailer</DetailLabel>
                  <DetailValue>{viewCollection.bill?.retailer}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Amount</DetailLabel>
                  <DetailValue>
                    {formatCurrency(viewCollection.amountCollected)}
                  </DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Payment Mode</DetailLabel>
                  <DetailValue>
                    <PaymentMode mode={viewCollection.paymentMode}>
                      {viewCollection.paymentMode}
                    </PaymentMode>
                  </DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Collected On</DetailLabel>
                  <DetailValue>
                    {formatDate(viewCollection.collectedOn)}
                  </DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Collected By</DetailLabel>
                  <DetailValue>
                    {viewCollection.collectedBy?.name || "-"}
                  </DetailValue>
                </DetailRow>
                {viewCollection.remarks && (
                  <DetailRow>
                    <DetailLabel>Remarks</DetailLabel>
                    <DetailValue>{viewCollection.remarks}</DetailValue>
                  </DetailRow>
                )}
                {viewCollection.paymentDetails &&
                  Object.entries(viewCollection.paymentDetails).map(
                    ([k, v]) =>
                      v ? (
                        <DetailRow key={k}>
                          <DetailLabel>{k}</DetailLabel>
                          <DetailValue>{v}</DetailValue>
                        </DetailRow>
                      ) : null,
                  )}
              </DetailGrid>

              {viewCollection.screenshotPath ? (
                <SSSection>
                  <DetailLabel>Payment Screenshot</DetailLabel>
                  <SSImage
                    src={`https://backend.laxmilube.in/${viewCollection.screenshotPath.replace(/\\/g, "/")}`}
                    alt="Payment screenshot"
                  />
                </SSSection>
              ) : (
                <NoSS>No screenshot uploaded</NoSS>
              )}
            </ModalBody>
          </DetailModal>
        </ModalOverlay>
      )}
    </Layout>
  );
};

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
    margin: 0;
    font-weight: 600;
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
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  background: var(--nb-white);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  box-shadow: var(--nb-shadow-md);

  input {
    border: none;
    outline: none;
    padding: 0.25rem 0.5rem;
    font-size: 0.9rem;
    width: 180px;
  }

  svg {
    color: var(--nb-border);
  }
`;

const DateBox = styled.div`
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
  }

  svg {
    color: var(--nb-border);
  }
`;

const RefreshBtn = styled.button`
  padding: 0.5rem 1.2rem;
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

const TableContainer = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 0.75rem;
  background: var(--nb-white);
  box-shadow: var(--nb-shadow-md);
`;

const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  min-width: 900px;

  th,
  td {
    padding: 0.85rem 1rem;
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
`;

const PaymentMode = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: var(--nb-muted);
  color: ${(props) =>
    props.mode === "Cash" || props.mode === "upi" || props.mode === "bank_transfer"
      ? "var(--nb-blue)"
      : "var(--nb-orange)"};
  text-transform: capitalize;
`;

const EyeBtn = styled.button`
  background: none;
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
  color: var(--nb-blue);
  font-size: 0.85rem;
  transition: background 0.15s;
  &:hover {
    background: var(--nb-muted);
  }
`;

const LoadingIndicator = styled.div`
  padding: 3rem;
  text-align: center;
  color: var(--nb-ink);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid var(--nb-muted);
  border-radius: 50%;
  border-top-color: var(--nb-blue);
  animation: spin 1s ease-in-out infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const ErrorMessage = styled.div`
  padding: 2rem;
  text-align: center;
  color: var(--nb-orange);
  background-color: var(--nb-muted);
  border-radius: 0.75rem;
  border: 1px solid var(--nb-border);
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 3rem;
  text-align: center;
  background-color: var(--nb-white);
  border-radius: 0.75rem;
  box-shadow: var(--nb-shadow-md);
  color: var(--nb-ink);
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const DetailModal = styled.div`
  background: var(--nb-white);
  border-radius: 12px;
  width: 100%;
  max-width: 520px;
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

const DetailGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1.25rem;
`;

const DetailRow = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
`;

const DetailLabel = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7280;
  min-width: 120px;
  text-transform: capitalize;
`;

const DetailValue = styled.span`
  font-size: 0.875rem;
  color: var(--nb-ink);
  flex: 1;
`;

const SSSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-top: 1px solid var(--nb-border);
  padding-top: 1rem;
`;

const SSImage = styled.img`
  width: 100%;
  max-height: 400px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid var(--nb-border);
`;

const NoSS = styled.p`
  font-size: 0.8rem;
  color: #9ca3af;
  text-align: center;
  padding: 1rem 0;
  border-top: 1px solid var(--nb-border);
`;

export default AdminCollectionHistory;
