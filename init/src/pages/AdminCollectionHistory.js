import React, { useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";
import {
  FaSearch,
  FaCalendarAlt,
  FaEye,
  FaMoneyBillWave,
  FaChevronDown,
  FaChevronRight,
  FaSearchPlus,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";
import Layout from "../components/Layout";

const AdminCollectionHistory = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewGroup, setViewGroup] = useState(null); // array of collections shown in modal
  const [expandedGroups, setExpandedGroups] = useState({});
  const [zoomImage, setZoomImage] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [verifyRemarks, setVerifyRemarks] = useState({}); // { [collectionId]: string }

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

  // Group collections that share a paymentGroupId (split payments) into one row
  const groupedRows = [];
  const seenGroups = new Set();
  filteredCollections.forEach((c) => {
    if (c.paymentGroupId) {
      if (seenGroups.has(c.paymentGroupId)) return;
      seenGroups.add(c.paymentGroupId);
      const members = filteredCollections.filter(
        (x) => x.paymentGroupId === c.paymentGroupId,
      );
      groupedRows.push({ isGroup: true, key: c.paymentGroupId, members });
    } else {
      groupedRows.push({ isGroup: false, key: c._id, members: [c] });
    }
  });
  groupedRows.sort(
    (a, b) =>
      new Date(b.members[0].collectedOn) - new Date(a.members[0].collectedOn),
  );

  const toggleExpand = (key) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleVerify = async (collectionId, status) => {
    setVerifyingId(collectionId);
    try {
      const res = await axios.patch(
        `https://backend.laxmilube.in/api/collections/${collectionId}/verify`,
        { status, remarks: verifyRemarks[collectionId] || "" },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setCollections((prev) =>
        prev.map((c) => (c._id === collectionId ? { ...c, ...res.data } : c)),
      );
      setViewGroup((prev) =>
        prev
          ? prev.map((c) =>
              c._id === collectionId ? { ...c, ...res.data } : c,
            )
          : prev,
      );
    } catch (err) {
      console.error("Verification update failed:", err);
    } finally {
      setVerifyingId(null);
    }
  };

  const verificationBadge = (status) => {
    if (status === "verified")
      return <VerifyBadge status="verified">Verified</VerifyBadge>;
    if (status === "not_verified")
      return <VerifyBadge status="not_verified">Not Verified</VerifyBadge>;
    return <VerifyBadge status="pending">Pending</VerifyBadge>;
  };

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
        ) : groupedRows.length > 0 ? (
          <TableContainer>
            <DataTable>
              <thead>
                <tr>
                  <th></th>
                  <th>Bill #</th>
                  <th>Retailer</th>
                  <th>Amount</th>
                  <th>Payment Mode</th>
                  <th>Collected On</th>
                  <th>Collected By</th>
                  <th>Verification</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {groupedRows.map((row) => {
                  const first = row.members[0];
                  const totalAmount = row.members.reduce(
                    (sum, m) => sum + m.amountCollected,
                    0,
                  );
                  const billLabel = row.isGroup
                    ? `${row.members.length} bills`
                    : `#${first.bill?.billNumber}`;
                  const isExpanded = expandedGroups[row.key];

                  return (
                    <React.Fragment key={row.key}>
                      <tr>
                        <td>
                          {row.isGroup && (
                            <ExpandBtn onClick={() => toggleExpand(row.key)}>
                              {isExpanded ? (
                                <FaChevronDown />
                              ) : (
                                <FaChevronRight />
                              )}
                            </ExpandBtn>
                          )}
                        </td>
                        <td>{billLabel}</td>
                        <td>{first.bill?.retailer}</td>
                        <td>{formatCurrency(totalAmount)}</td>
                        <td>
                          <PaymentMode mode={first.paymentMode}>
                            {first.paymentMode}
                          </PaymentMode>
                        </td>
                        <td>{formatDate(first.collectedOn)}</td>
                        <td>{first.collectedBy?.name || "-"}</td>
                        <td>
                          {row.isGroup ? (
                            <span
                              style={{ fontSize: "0.75rem", color: "#6b7280" }}
                            >
                              {
                                row.members.filter(
                                  (m) => m.verificationStatus === "verified",
                                ).length
                              }
                              /{row.members.length} verified
                            </span>
                          ) : (
                            verificationBadge(first.verificationStatus)
                          )}
                        </td>
                        <td>
                          <EyeBtn
                            title="View details"
                            onClick={() => setViewGroup(row.members)}
                          >
                            <FaEye />
                          </EyeBtn>
                        </td>
                      </tr>
                      {row.isGroup &&
                        isExpanded &&
                        row.members.map((m) => (
                          <SubRow key={m._id}>
                            <td></td>
                            <td>#{m.bill?.billNumber}</td>
                            <td colSpan={2}>
                              {formatCurrency(m.amountCollected)}
                            </td>
                            <td colSpan={2}></td>
                            <td>{verificationBadge(m.verificationStatus)}</td>
                            <td>
                              <EyeBtn
                                title="View bill"
                                onClick={() => setViewGroup([m])}
                              >
                                <FaEye />
                              </EyeBtn>
                            </td>
                          </SubRow>
                        ))}
                    </React.Fragment>
                  );
                })}
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

      {viewGroup && (
        <ModalOverlay onClick={() => setViewGroup(null)}>
          <DetailModal onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h3>
                Collection Details
                {viewGroup.length > 1 ? ` (${viewGroup.length} bills)` : ""}
              </h3>
              <CloseBtn onClick={() => setViewGroup(null)}>×</CloseBtn>
            </ModalHeader>
            <ModalBody>
              <DetailGrid>
                <DetailRow>
                  <DetailLabel>Retailer</DetailLabel>
                  <DetailValue>{viewGroup[0].bill?.retailer}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Payment Mode</DetailLabel>
                  <DetailValue>
                    <PaymentMode mode={viewGroup[0].paymentMode}>
                      {viewGroup[0].paymentMode}
                    </PaymentMode>
                  </DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Collected On</DetailLabel>
                  <DetailValue>
                    {formatDate(viewGroup[0].collectedOn)}
                  </DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Collected By</DetailLabel>
                  <DetailValue>
                    {viewGroup[0].collectedBy?.name || "-"}
                  </DetailValue>
                </DetailRow>
                {viewGroup[0].remarks && (
                  <DetailRow>
                    <DetailLabel>Remarks</DetailLabel>
                    <DetailValue>{viewGroup[0].remarks}</DetailValue>
                  </DetailRow>
                )}
                {viewGroup[0].paymentDetails &&
                  Object.entries(viewGroup[0].paymentDetails).map(([k, v]) =>
                    v ? (
                      <DetailRow key={k}>
                        <DetailLabel>{k}</DetailLabel>
                        <DetailValue>{v}</DetailValue>
                      </DetailRow>
                    ) : null,
                  )}
              </DetailGrid>

              <BillsSection>
                <DetailLabel>
                  {viewGroup.length > 1 ? "Bills Adjusted" : "Bill"}
                </DetailLabel>
                {viewGroup.map((c) => (
                  <BillVerifyRow key={c._id}>
                    <BillVerifyTopLine>
                      <div>
                        <strong>#{c.bill?.billNumber}</strong>{" "}
                        <span>{formatCurrency(c.amountCollected)}</span>
                        <div>{verificationBadge(c.verificationStatus)}</div>
                      </div>
                      <VerifyBtnGroup>
                        <VerifyBtn
                          type="button"
                          $variant="verified"
                          disabled={verifyingId === c._id}
                          onClick={() => handleVerify(c._id, "verified")}
                        >
                          <FaCheckCircle /> Verified
                        </VerifyBtn>
                        <VerifyBtn
                          type="button"
                          $variant="not_verified"
                          disabled={verifyingId === c._id}
                          onClick={() => handleVerify(c._id, "not_verified")}
                        >
                          <FaTimesCircle /> Not Verified
                        </VerifyBtn>
                      </VerifyBtnGroup>
                    </BillVerifyTopLine>

                    <RemarksInput
                      placeholder="Add a remark (optional)..."
                      value={
                        verifyRemarks[c._id] !== undefined
                          ? verifyRemarks[c._id]
                          : c.verificationRemarks || ""
                      }
                      onChange={(e) =>
                        setVerifyRemarks((prev) => ({
                          ...prev,
                          [c._id]: e.target.value,
                        }))
                      }
                      maxLength={300}
                    />
                    {c.verificationStatus !== "pending" &&
                      c.verificationRemarks && (
                        <SavedRemark>
                          Saved remark: "{c.verificationRemarks}"
                        </SavedRemark>
                      )}
                  </BillVerifyRow>
                ))}
              </BillsSection>

              {viewGroup[0].screenshotPath ? (
                <SSSection>
                  <DetailLabel>Payment Screenshot</DetailLabel>
                  <SSImageWrap
                    onClick={() =>
                      setZoomImage(
                        `https://backend.laxmilube.in/${viewGroup[0].screenshotPath.replace(/\\/g, "/")}`,
                      )
                    }
                  >
                    <SSImage
                      src={`https://backend.laxmilube.in/${viewGroup[0].screenshotPath.replace(/\\/g, "/")}`}
                      alt="Payment screenshot"
                    />
                    <ZoomHint>
                      <FaSearchPlus /> Click to zoom
                    </ZoomHint>
                  </SSImageWrap>
                </SSSection>
              ) : (
                <NoSS>No screenshot uploaded</NoSS>
              )}
            </ModalBody>
          </DetailModal>
        </ModalOverlay>
      )}

      {zoomImage && (
        <ZoomOverlay onClick={() => setZoomImage(null)}>
          <ZoomCloseBtn onClick={() => setZoomImage(null)}>×</ZoomCloseBtn>
          <ZoomedImage
            src={zoomImage}
            alt="Payment screenshot zoomed"
            onClick={(e) => e.stopPropagation()}
          />
        </ZoomOverlay>
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
  min-width: 950px;

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

const SubRow = styled.tr`
  background-color: #f9fafb;
  font-size: 0.8rem;

  td {
    padding: 0.5rem 1rem;
  }
`;

const ExpandBtn = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: var(--nb-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
`;

const PaymentMode = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: var(--nb-muted);
  color: ${(props) =>
    props.mode === "Cash" ||
    props.mode === "upi" ||
    props.mode === "bank_transfer"
      ? "var(--nb-blue)"
      : "var(--nb-orange)"};
  text-transform: capitalize;
`;

const VERIFY_COLORS = {
  verified: { bg: "#dcfce7", color: "#15803d" },
  not_verified: { bg: "#fee2e2", color: "#991b1b" },
  pending: { bg: "#fef9c3", color: "#92400e" },
};

const VerifyBadge = styled.span`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 600;
  background-color: ${(p) => (VERIFY_COLORS[p.status] || VERIFY_COLORS.pending).bg};
  color: ${(p) => (VERIFY_COLORS[p.status] || VERIFY_COLORS.pending).color};
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

const BillsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  border-top: 1px solid var(--nb-border);
  padding-top: 1rem;
  margin-bottom: 1rem;
`;

const BillVerifyRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--nb-border);
  border-radius: 8px;
`;

const BillVerifyTopLine = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  & > div:first-child {
    font-size: 0.875rem;
    color: var(--nb-ink);
    span {
      color: #6b7280;
    }
  }

  @media (min-width: 480px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }
`;

const RemarksInput = styled.textarea`
  width: 100%;
  min-height: 50px;
  resize: vertical;
  padding: 0.5rem 0.6rem;
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  font-size: 0.82rem;
  font-family: inherit;
  color: var(--nb-ink);

  &:focus {
    outline: none;
    border-color: var(--nb-blue);
  }
`;

const SavedRemark = styled.div`
  font-size: 0.78rem;
  color: #6b7280;
  font-style: italic;
`;

const VerifyBtnGroup = styled.div`
  display: flex;
  gap: 0.4rem;
`;

const VerifyBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.6rem;
  border-radius: 6px;
  border: 1px solid
    ${(p) => (p.$variant === "verified" ? "#15803d" : "#991b1b")};
  background: var(--nb-white);
  color: ${(p) => (p.$variant === "verified" ? "#15803d" : "#991b1b")};
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: ${(p) => (p.$variant === "verified" ? "#dcfce7" : "#fee2e2")};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SSSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border-top: 1px solid var(--nb-border);
  padding-top: 1rem;
`;

const SSImageWrap = styled.div`
  position: relative;
  cursor: zoom-in;

  &:hover > div {
    opacity: 1;
  }
`;

const SSImage = styled.img`
  width: 100%;
  max-height: 400px;
  object-fit: contain;
  border-radius: 8px;
  border: 1px solid var(--nb-border);
`;

const ZoomHint = styled.div`
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0.85;
  transition: opacity 0.15s;
`;

const NoSS = styled.p`
  font-size: 0.8rem;
  color: #9ca3af;
  text-align: center;
  padding: 1rem 0;
  border-top: 1px solid var(--nb-border);
`;

const ZoomOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  cursor: zoom-out;
`;

const ZoomedImage = styled.img`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  cursor: default;
`;

const ZoomCloseBtn = styled.button`
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  color: #fff;
  font-size: 2rem;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }
`;

export default AdminCollectionHistory;
