import React, { useState, useEffect } from "react";
import styled from "styled-components";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { fmtDate } from "../utils/dateFormat";
import { FaCheck, FaTimes, FaClock, FaStore } from "react-icons/fa";

const RetailerApproval = () => {
  const [pendingRetailers, setPendingRetailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingId, setProcessingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingRetailers();
  }, []);

  const fetchPendingRetailers = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await axios.get(
        "https://backend.laxmilube.in/api/retailers/pending",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      setPendingRetailers(response.data.retailers || []);
    } catch (error) {
      console.error("Error fetching pending retailers:", error);
      if (error.response?.status === 401 || error.response?.status === 403) {
        navigate("/login");
        return;
      }
      setError(
        error.response?.data?.message || "Failed to load pending retailers",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (retailerId) => {
    if (!window.confirm("Are you sure you want to approve this retailer?")) {
      return;
    }

    try {
      setProcessingId(retailerId);
      const token = localStorage.getItem("token");

      await axios.put(
        `https://backend.laxmilube.in/api/retailers/${retailerId}/approve`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      alert("Retailer approved successfully!");
      fetchPendingRetailers();
    } catch (error) {
      console.error("Error approving retailer:", error);
      alert(error.response?.data?.message || "Failed to approve retailer");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (retailerId) => {
    const reason = window.prompt(
      "Please provide a reason for rejection (optional):",
    );
    if (reason === null) return; // User cancelled

    try {
      setProcessingId(retailerId);
      const token = localStorage.getItem("token");

      await axios.put(
        `https://backend.laxmilube.in/api/retailers/${retailerId}/reject`,
        { reason },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      alert("Retailer rejected");
      fetchPendingRetailers();
    } catch (error) {
      console.error("Error rejecting retailer:", error);
      alert(error.response?.data?.message || "Failed to reject retailer");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Layout>
      <PageContainer>
        <Header>
          <div>
            <h1>Retailer Approval Queue</h1>
            <SubTitle>
              Review and approve retailer registration requests
            </SubTitle>
          </div>
          <CountBadge>
            <FaClock /> {pendingRetailers.length} Pending
          </CountBadge>
        </Header>

        {loading ? (
          <LoadingIndicator>
            <div className="spinner"></div>
            <p>Loading pending approvals...</p>
          </LoadingIndicator>
        ) : error ? (
          <ErrorMessage>{error}</ErrorMessage>
        ) : pendingRetailers.length === 0 ? (
          <EmptyState>
            <FaStore size={48} />
            <h3>No Pending Approvals</h3>
            <p>All retailer registrations have been processed</p>
          </EmptyState>
        ) : (
          <ApprovalGrid>
            {pendingRetailers.map((retailer) => (
              <ApprovalCard key={retailer._id}>
                <CardHeader>
                  <ShopIcon>
                    <FaStore />
                  </ShopIcon>
                  <ShopInfo>
                    <ShopName>{retailer.name}</ShopName>
                    <ShopEmail>{retailer.userId?.email}</ShopEmail>
                  </ShopInfo>
                </CardHeader>

                <CardBody>
                  <InfoRow>
                    <Label>Address:</Label>
                    <Value>
                      {retailer.address1}
                      {retailer.address2 && `, ${retailer.address2}`}
                    </Value>
                  </InfoRow>

                  <InfoRow>
                    <Label>Assigned Staff:</Label>
                    <Value>{retailer.assignedTo?.name || "Not assigned"}</Value>
                  </InfoRow>

                  <InfoRow>
                    <Label>Collection Days:</Label>
                    <Value>
                      {retailer.collectionDays &&
                      retailer.collectionDays.length > 0
                        ? retailer.collectionDays.join(", ")
                        : "Not set"}
                    </Value>
                  </InfoRow>

                  <InfoRow>
                    <Label>Registered On:</Label>
                    <Value>
                      {fmtDate(retailer.createdAt)}
                    </Value>
                  </InfoRow>
                </CardBody>

                <CardFooter>
                  <ApproveButton
                    onClick={() => handleApprove(retailer._id)}
                    disabled={processingId === retailer._id}
                  >
                    <FaCheck /> Approve
                  </ApproveButton>
                  <RejectButton
                    onClick={() => handleReject(retailer._id)}
                    disabled={processingId === retailer._id}
                  >
                    <FaTimes /> Reject
                  </RejectButton>
                </CardFooter>
              </ApprovalCard>
            ))}
          </ApprovalGrid>
        )}
      </PageContainer>
    </Layout>
  );
};

// Styled Components
const PageContainer = styled.div`
  width: 100%;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;

  h1 {
    color: var(--nb-ink);
    font-size: 1.5rem;
    margin: 0 0 0.5rem 0;
    font-weight: 600;

    @media (min-width: 768px) {
      font-size: 1.8rem;
    }
  }
`;

const SubTitle = styled.p`
  color: var(--nb-ink);
  font-size: 0.95rem;
  margin: 0;
`;

const CountBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--nb-muted);
  color: var(--nb-ink);
  padding: 0.6rem 1.2rem;
  border-radius: 2rem;
  font-weight: 600;
  font-size: 0.9rem;
  box-shadow: var(--nb-shadow-md);
`;

const ApprovalGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;

  @media (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const ApprovalCard = styled.div`
  background-color: var(--nb-white);
  border-radius: 0.75rem;
  box-shadow: var(--nb-shadow-md);
  overflow: hidden;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: var(--nb-shadow-md);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem;
  background: var(--nb-cream);
  color: var(--nb-white);
`;

const ShopIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--nb-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    font-size: 1.5rem;
  }
`;

const ShopInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ShopName = styled.h3`
  margin: 0 0 0.25rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ShopEmail = styled.p`
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const CardBody = styled.div`
  padding: 1.5rem;
`;

const InfoRow = styled.div`
  margin-bottom: 1rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const Label = styled.div`
  color: var(--nb-ink);
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
`;

const Value = styled.div`
  color: var(--nb-ink);
  font-size: 0.95rem;
`;

const CardFooter = styled.div`
  display: flex;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background-color: var(--nb-muted);
  border-top: 1px solid var(--nb-border);
`;

const ApproveButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem 1rem;
  background-color: var(--nb-blue);
  color: var(--nb-white);
  border: none;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background-color: var(--nb-blue);
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const RejectButton = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem 1rem;
  background-color: var(--nb-orange);
  color: var(--nb-white);
  border: none;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background-color: var(--nb-orange);
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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

const ErrorMessage = styled.div`
  padding: 2rem;
  text-align: center;
  color: var(--nb-orange);
  background-color: var(--nb-muted);
  border-radius: 0.75rem;
  border: 1px solid var(--nb-border);
`;

const EmptyState = styled.div`
  padding: 4rem 2rem;
  text-align: center;
  color: var(--nb-ink);
  background-color: var(--nb-white);
  border-radius: 0.75rem;
  box-shadow: var(--nb-shadow-md);

  svg {
    color: var(--nb-border);
    margin-bottom: 1rem;
  }

  h3 {
    color: var(--nb-ink);
    font-size: 1.3rem;
    margin: 0 0 0.5rem 0;
  }

  p {
    margin: 0;
    font-size: 0.95rem;
  }
`;

export default RetailerApproval;
