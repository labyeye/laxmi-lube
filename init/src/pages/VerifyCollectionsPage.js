import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import styled, { keyframes } from "styled-components";
import {
  FaHome,
  FaCheckDouble,
  FaSignOutAlt,
  FaUserCircle,
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
import { useNavigate } from "react-router-dom";

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const VerifyCollectionsPage = () => {
  const navigate = useNavigate();
  const [staffInfo, setStaffInfo] = useState({ name: "Loading..." });
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewGroup, setViewGroup] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [zoomImage, setZoomImage] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);

  const fetchUserInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found");
      const response = await axios.get(
        "https://backend.laxmilube.in/api/users/me",
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setStaffInfo({ name: response.data.name || "Staff Member" });
    } catch (err) {
      console.error("Failed to fetch user info:", err);
    }
  }, []);

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
      setError("Failed to fetch collections. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();
    fetchCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

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
        { status },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setCollections((prev) =>
        prev.map((c) => (c._id === collectionId ? { ...c, ...res.data } : c)),
      );
      setViewGroup((prev) =>
        prev
          ? prev.map((c) => (c._id === collectionId ? { ...c, ...res.data } : c))
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

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner />
        <p>Loading collections...</p>
      </LoadingContainer>
    );
  }

  return (
    <DashboardLayout>
      <Sidebar>
        <SidebarHeader>
          <Logo>BillTrack</Logo>
        </SidebarHeader>
        <UserProfile>
          <UserAvatar>
            <FaUserCircle size={32} />
          </UserAvatar>
          <UserInfo>
            <UserName>{staffInfo.name}</UserName>
            <UserRole>Verifier</UserRole>
          </UserInfo>
        </UserProfile>
        <NavMenu>
          <NavItem onClick={() => navigate("/staff")}>
            <NavIcon>
              <FaHome />
            </NavIcon>
            <NavText>Dashboard</NavText>
          </NavItem>
          <NavItem active>
            <NavIcon>
              <FaCheckDouble />
            </NavIcon>
            <NavText>Verify Collections</NavText>
          </NavItem>
        </NavMenu>
        <LogoutButton onClick={handleLogout}>
          <NavIcon>
            <FaSignOutAlt />
          </NavIcon>
          <NavText>Logout</NavText>
        </LogoutButton>
      </Sidebar>

      <MainContent>
        <TopBar>
          <PageTitle>Verify Collections</PageTitle>
          <HeaderActions>
            <SearchContainer>
              <FaSearch />
              <SearchInput
                type="text"
                placeholder="Search by bill # or retailer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchContainer>
            <DateFilterContainer>
              <FaCalendarAlt />
              <DateInput
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </DateFilterContainer>
            <DateFilterContainer>
              <FaCalendarAlt />
              <DateInput
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </DateFilterContainer>
            <RefreshBtn onClick={fetchCollections}>Apply</RefreshBtn>
          </HeaderActions>
        </TopBar>

        <ContentArea>
          {error ? (
            <ErrorAlert>{error}</ErrorAlert>
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
                              <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                                {row.members.filter(
                                  (m) => m.verificationStatus === "verified",
                                ).length}
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
              <EmptyMessage>No collections found</EmptyMessage>
            </EmptyState>
          )}
        </ContentArea>
      </MainContent>

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
                  <DetailValue>{formatDate(viewGroup[0].collectedOn)}</DetailValue>
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
    </DashboardLayout>
  );
};

const DashboardLayout = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: var(--nb-muted);
  flex-direction: column;

  @media (min-width: 768px) {
    flex-direction: row;
  }
`;

const Sidebar = styled.div`
  width: 100%;
  background-color: var(--nb-white);
  box-shadow: var(--nb-shadow-md);
  display: flex;
  flex-direction: column;

  @media (min-width: 768px) {
    width: 250px;
    height: 100vh;
    position: sticky;
    top: 0;
  }
`;

const SidebarHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 0 20px;
  height: 70px;
  border-bottom: 1px solid var(--nb-border);
`;

const Logo = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--nb-blue);
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--nb-border);
`;

const UserAvatar = styled.div`
  color: var(--nb-blue);
  margin-right: 15px;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const UserName = styled.div`
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--nb-ink);
`;

const UserRole = styled.div`
  font-size: 0.75rem;
  color: var(--nb-ink);
`;

const NavMenu = styled.div`
  flex: 1;
  padding: 20px 0;
`;

const NavItem = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: ${(props) => (props.active ? "var(--nb-blue)" : "var(--nb-ink)")};
  background-color: ${(props) =>
    props.active ? "var(--nb-muted)" : "transparent"};
  cursor: pointer;

  &:hover {
    background-color: var(--nb-muted);
    color: var(--nb-blue);
  }
`;

const NavIcon = styled.div`
  font-size: 1rem;
  margin-right: 10px;
  display: flex;
  align-items: center;
`;

const NavText = styled.div`
  flex: 1;
`;

const LogoutButton = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: var(--nb-ink);
  cursor: pointer;
  border-top: 1px solid var(--nb-border);

  &:hover {
    color: var(--nb-orange);
    background-color: var(--nb-muted);
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 70px);

  @media (min-width: 768px) {
    min-height: 100vh;
  }
`;

const TopBar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  padding: 15px;
  background-color: var(--nb-white);
  box-shadow: var(--nb-shadow-md);

  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    height: 70px;
    padding: 0 20px;
  }
`;

const PageTitle = styled.h1`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--nb-ink);
  margin: 0;

  @media (min-width: 768px) {
    font-size: 1.5rem;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;

  @media (min-width: 576px) {
    gap: 15px;
    flex-wrap: nowrap;
  }
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  background-color: var(--nb-white);
  border-radius: 4px;
  padding: 8px 15px;
  border: 1px solid var(--nb-border);
  flex: 1;
  min-width: 200px;
  gap: 8px;
`;

const SearchInput = styled.input`
  border: none;
  outline: none;
  width: 100%;
  font-size: 0.9rem;

  @media (min-width: 576px) {
    width: 250px;
  }
`;

const DateFilterContainer = styled.div`
  display: flex;
  align-items: center;
  background-color: var(--nb-white);
  border-radius: 4px;
  padding: 8px 15px;
  border: 1px solid var(--nb-border);
  gap: 8px;
`;

const DateInput = styled.input`
  border: none;
  outline: none;
  font-size: 0.9rem;
`;

const RefreshBtn = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background: var(--nb-blue);
  color: var(--nb-white);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    opacity: 0.9;
  }
`;

const ContentArea = styled.div`
  flex: 1;
  padding: 15px;
  overflow-y: auto;

  @media (min-width: 768px) {
    padding: 20px;
  }
`;

const TableContainer = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 8px;
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
    props.mode === "Cash" || props.mode === "upi" || props.mode === "bank_transfer"
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

  &:hover {
    background: var(--nb-muted);
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: var(--nb-muted);
`;

const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 4px solid var(--nb-muted);
  border-radius: 50%;
  border-top-color: var(--nb-blue);
  animation: ${spin} 1s linear infinite;
  margin-bottom: 20px;
`;

const ErrorAlert = styled.div`
  background-color: var(--nb-muted);
  border: 1px solid var(--nb-border);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  color: var(--nb-orange);
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  background-color: var(--nb-white);
  border-radius: 8px;
  box-shadow: var(--nb-shadow-md);
`;

const EmptyMessage = styled.p`
  font-size: 1rem;
  color: var(--nb-ink);
  margin: 20px 0;
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

export default VerifyCollectionsPage;
