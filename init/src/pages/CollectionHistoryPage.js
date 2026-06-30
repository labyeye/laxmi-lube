import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import styled, { keyframes } from "styled-components";
import {
  FaMoneyBillWave,
  FaHome,
  FaMoneyCheckAlt,
  FaSignOutAlt,
  FaUserCircle,
  FaChevronDown,
  FaChevronRight,
  FaSearch,
  FaCalendarAlt,
  FaEye,
  FaSearchPlus,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;
const CollectionsHistory = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarCollapsed] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter] = useState("");
  const [sendingWa, setSendingWa] = useState(null);
  const [waToast, setWaToast] = useState(null);
  const [viewCollection, setViewCollection] = useState(null);
  const [zoomImage, setZoomImage] = useState(null);
  const navigate = useNavigate();
  const [staffInfo, setStaffInfo] = useState({
    name: "Loading...",
    role: "Collections",
  });
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const fetchUserInfo = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token not found");

      const response = await axios.get(
        `https://backend.laxmilube.in/api/users/me`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      setStaffInfo({
        name: response.data.name || "Staff Member",
        role: response.data.role || "Collections",
      });
    } catch (err) {
      console.error("Failed to fetch user info:", err);
    }
  }, []);
  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);
  const fetchCollections = async () => {
    try {
      setLoading(true);
      setError("");

      let url = "https://backend.laxmilube.in/api/collections";
      const params = new URLSearchParams();

      if (searchTerm) params.append("search", searchTerm);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      setCollections(response.data);
    } catch (err) {
      console.error("Error fetching collections:", err);
      setError("Failed to fetch collections history. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSubmenu = (menu) => {
    if (activeSubmenu === menu) {
      setActiveSubmenu(null);
    } else {
      setActiveSubmenu(menu);
    }
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleResendWhatsApp = async (collectionId) => {
    setSendingWa(collectionId);
    setWaToast(null);
    try {
      const res = await axios.post(
        `https://backend.laxmilube.in/api/collections/${collectionId}/send-whatsapp`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      // Update local state so badge reflects new status
      setCollections((prev) =>
        prev.map((c) =>
          c._id === collectionId
            ? { ...c, whatsappStatus: res.data.whatsappStatus }
            : c,
        ),
      );
      setWaToast({
        type: res.data.hasPhone ? "success" : "warn",
        msg: res.data.message,
      });
    } catch (err) {
      setWaToast({
        type: "error",
        msg: err.response?.data?.message || "Failed to send WhatsApp",
      });
    } finally {
      setSendingWa(null);
      setTimeout(() => setWaToast(null), 4000);
    }
  };

  const filteredCollections = collections.filter((collection) => {
    const matchesSearch =
      collection.bill?.billNumber?.toString().includes(searchTerm) ||
      collection.bill?.retailer
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesDate = dateFilter
      ? new Date(collection.collectedOn).toISOString().split("T")[0] ===
        dateFilter
      : true;

    return matchesSearch && matchesDate;
  });

  if (loading) {
    return (
      <LoadingContainer>
        <Spinner />
        <p>Loading collections history...</p>
      </LoadingContainer>
    );
  }

  return (
    <DashboardLayout>
      {/* Sidebar - Same as BillAssignedToday */}
      <Sidebar collapsed={sidebarCollapsed}>
        <SidebarHeader>
          <Logo>BillTrack</Logo>
        </SidebarHeader>
        <UserProfile>
          <UserAvatar>
            <FaUserCircle size={sidebarCollapsed ? 24 : 32} />
          </UserAvatar>
          {!sidebarCollapsed && (
            <UserInfo>
              <UserName>{staffInfo.name}</UserName>
              <UserRole>DSR</UserRole>
            </UserInfo>
          )}
        </UserProfile>
        <NavMenu>
          <NavItem onClick={() => navigate("/staff")}>
            <NavIcon>
              <FaHome />
            </NavIcon>
            {!sidebarCollapsed && <NavText>Dashboard</NavText>}
          </NavItem>
          <NavItem onClick={() => navigate("/staff/order-create")}>
            <NavIcon>
              <FaMoneyBillWave />
            </NavIcon>
            {!sidebarCollapsed && <NavText>Order Create</NavText>}
          </NavItem>

          <NavItemWithSubmenu>
            <NavItemMain onClick={() => toggleSubmenu("collections")}>
              <NavIcon>
                <FaMoneyCheckAlt />
              </NavIcon>
              {!sidebarCollapsed && (
                <>
                  <NavText>Collections</NavText>
                  <NavArrow>
                    {activeSubmenu === "collections" ? (
                      <FaChevronDown />
                    ) : (
                      <FaChevronRight />
                    )}
                  </NavArrow>
                </>
              )}
            </NavItemMain>

            {!sidebarCollapsed && activeSubmenu === "collections" && (
              <Submenu>
                <Link
                  to="/staff/bill-assigned-today"
                  style={{ textDecoration: "none" }}
                >
                  <SubmenuItem>
                    <NavText>Assigned Today</NavText>
                  </SubmenuItem>
                </Link>
                <SubmenuItem
                  active
                  onClick={() => navigate("/staff/collections-history")}
                >
                  <NavText>History</NavText>
                  <NavCheckmark>☑</NavCheckmark>
                </SubmenuItem>
              </Submenu>
            )}
          </NavItemWithSubmenu>
        </NavMenu>
        <LogoutButton onClick={handleLogout}>
          <NavIcon>
            <FaSignOutAlt />
          </NavIcon>
          {!sidebarCollapsed && <NavText>Logout</NavText>}
        </LogoutButton>
      </Sidebar>
      <MainContent>
        <TopBar>
          <PageTitle>Collections History</PageTitle>
          <HeaderActions>
            <SearchContainer>
              <SearchIcon>
                <FaSearch />
              </SearchIcon>
              <SearchInput
                type="text"
                placeholder="Search by bill # or retailer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchContainer>
            <DateFilterContainer>
              <CalendarIcon>
                <FaCalendarAlt />
              </CalendarIcon>
              <DateInput
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="From Date"
              />
            </DateFilterContainer>
            <DateFilterContainer>
              <CalendarIcon>
                <FaCalendarAlt />
              </CalendarIcon>
              <DateInput
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="To Date"
              />
            </DateFilterContainer>
          </HeaderActions>
        </TopBar>

        <ContentArea>
          {waToast && <WaToast type={waToast.type}>{waToast.msg}</WaToast>}
          {error ? (
            <ErrorAlert>
              <ErrorMessage>{error}</ErrorMessage>
            </ErrorAlert>
          ) : filteredCollections.length > 0 ? (
            <CollectionsTable>
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Bill #</TableHeaderCell>
                  <TableHeaderCell>Retailer</TableHeaderCell>
                  <TableHeaderCell>Amount</TableHeaderCell>
                  <TableHeaderCell>Payment Mode</TableHeaderCell>
                  <TableHeaderCell>Collection Time</TableHeaderCell>
                  <TableHeaderCell>Remarks</TableHeaderCell>
                  <TableHeaderCell>WhatsApp</TableHeaderCell>
                  <TableHeaderCell></TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCollections.map((collection) => (
                  <TableRow key={collection._id}>
                    <TableCell>#{collection.bill?.billNumber}</TableCell>
                    <TableCell>{collection.bill?.retailer}</TableCell>
                    <TableCell>
                      {formatCurrency(collection.amountCollected)}
                    </TableCell>
                    <TableCell>
                      <PaymentMode mode={collection.paymentMode}>
                        {collection.paymentMode}
                      </PaymentMode>
                    </TableCell>
                    <TableCell>{formatDate(collection.collectedOn)}</TableCell>
                    <TableCell>{collection.remarks || "-"}</TableCell>
                    <TableCell>
                      <WaCellWrap>
                        <WhatsAppBadge status={collection.whatsappStatus}>
                          {waLabel(collection.whatsappStatus)}
                        </WhatsAppBadge>
                        <ResendWaBtn
                          title="Resend WhatsApp receipt"
                          disabled={sendingWa === collection._id}
                          onClick={() => handleResendWhatsApp(collection._id)}
                        >
                          {sendingWa === collection._id ? "..." : "↺"}
                        </ResendWaBtn>
                      </WaCellWrap>
                    </TableCell>
                    <TableCell>
                      <EyeBtn title="View details" onClick={() => setViewCollection(collection)}>
                        <FaEye />
                      </EyeBtn>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </CollectionsTable>
          ) : (
            <EmptyState>
              <FaMoneyBillWave size={48} />
              <EmptyMessage>No collections found</EmptyMessage>
            </EmptyState>
          )}
        </ContentArea>
      </MainContent>

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
                  <DetailValue>{formatCurrency(viewCollection.amountCollected)}</DetailValue>
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
                  <DetailValue>{formatDate(viewCollection.collectedOn)}</DetailValue>
                </DetailRow>
                <DetailRow>
                  <DetailLabel>Collected By</DetailLabel>
                  <DetailValue>{viewCollection.collectedBy?.name || "-"}</DetailValue>
                </DetailRow>
                {viewCollection.remarks && (
                  <DetailRow>
                    <DetailLabel>Remarks</DetailLabel>
                    <DetailValue>{viewCollection.remarks}</DetailValue>
                  </DetailRow>
                )}
                {viewCollection.paymentDetails && Object.entries(viewCollection.paymentDetails).map(([k, v]) =>
                  v ? (
                    <DetailRow key={k}>
                      <DetailLabel>{k}</DetailLabel>
                      <DetailValue>{v}</DetailValue>
                    </DetailRow>
                  ) : null
                )}
                <DetailRow>
                  <DetailLabel>WhatsApp</DetailLabel>
                  <DetailValue>
                    <WhatsAppBadge status={viewCollection.whatsappStatus}>
                      {waLabel(viewCollection.whatsappStatus)}
                    </WhatsAppBadge>
                  </DetailValue>
                </DetailRow>
              </DetailGrid>

              {viewCollection.screenshotPath ? (
                <SSSection>
                  <DetailLabel>Payment Screenshot</DetailLabel>
                  <SSImageWrap
                    onClick={() =>
                      setZoomImage(
                        `https://backend.laxmilube.in/${viewCollection.screenshotPath.replace(/\\/g, "/")}`,
                      )
                    }
                  >
                    <SSImage
                      src={`https://backend.laxmilube.in/${viewCollection.screenshotPath.replace(/\\/g, "/")}`}
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
// Responsive Styles
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
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 10;

  @media (min-width: 768px) {
    width: ${(props) => (props.collapsed ? "80px" : "250px")};
    height: 100vh;
    position: sticky;
    top: 0;
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
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
  flex: 1;
`;

const CollectionsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  background-color: var(--nb-white);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: var(--nb-shadow-md);
  display: block;
  overflow-x: auto;
  white-space: nowrap;

  @media (min-width: 992px) {
    display: table;
    white-space: normal;
  }
`;

const TableHeaderCell = styled.th`
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: var(--nb-blue);

  @media (min-width: 768px) {
    padding: 15px;
  }
`;

const TableCell = styled.td`
  padding: 12px;
  color: var(--nb-ink);

  @media (min-width: 768px) {
    padding: 15px;
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

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  background-color: var(--nb-white);
  border-radius: 8px;
  box-shadow: var(--nb-shadow-md);

  @media (min-width: 768px) {
    padding: 60px 20px;
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
const NavCheckmark = styled.span`
  margin-left: auto;
  font-size: 0.9rem;
  color: ${(props) => (props.active ? "var(--nb-blue)" : "var(--nb-ink)")};
`;

const TableHeader = styled.thead`
  background-color: var(--nb-muted);
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
  border-bottom: 1px solid var(--nb-border);

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background-color: var(--nb-muted);
  }
`;

const PaymentMode = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: ${(props) =>
    props.mode === "Cash"
      ? "var(--nb-blue)20"
      : props.mode === "upi"
        ? "var(--nb-blue)20"
        : props.mode === "bank_transfer"
          ? "var(--nb-blue)20"
          : "var(--nb-orange)20"};
  color: ${(props) =>
    props.mode === "Cash"
      ? "var(--nb-blue)"
      : props.mode === "upi"
        ? "var(--nb-blue)"
        : props.mode === "bank_transfer"
          ? "var(--nb-blue)"
          : "var(--nb-orange)"};
`;

const WA_COLORS = {
  received: { bg: "#e6f9ee", color: "#1a7d45" },
  not_received: { bg: "#fde8e8", color: "#c0392b" },
  sent: { bg: "#e8f4fd", color: "#1565c0" },
  no_phone: { bg: "#f5f5f5", color: "#888" },
  pending: { bg: "#fff8e1", color: "#b8860b" },
};

const WhatsAppBadge = styled.span`
  display: inline-block;
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 600;
  background-color: ${(p) => (WA_COLORS[p.status] || WA_COLORS.pending).bg};
  color: ${(p) => (WA_COLORS[p.status] || WA_COLORS.pending).color};
`;

const WA_LABELS = {
  received: "✓ Received",
  not_received: "✗ Not Received",
  sent: "Sent",
  no_phone: "No Phone",
  pending: "Pending",
};

const waLabel = (status) => WA_LABELS[status] || "Pending";

const WaToast = styled.div`
  padding: 0.75rem 1.2rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  font-weight: 600;
  background: ${(p) =>
    p.type === "success"
      ? "#dcfce7"
      : p.type === "warn"
        ? "#fef9c3"
        : "#fee2e2"};
  color: ${(p) =>
    p.type === "success"
      ? "#15803d"
      : p.type === "warn"
        ? "#92400e"
        : "#991b1b"};
`;

const WaCellWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ResendWaBtn = styled.button`
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 2px 7px;
  font-size: 0.85rem;
  cursor: pointer;
  color: #1a73e8;
  line-height: 1.4;
  transition: background 0.15s;
  &:hover:not(:disabled) {
    background: #eff6ff;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SearchIcon = styled.div`
  color: var(--nb-ink);
  margin-right: 10px;
`;

const CalendarIcon = styled.div`
  color: var(--nb-ink);
  margin-right: 10px;
`;

const DateInput = styled.input`
  border: none;
  outline: none;
  font-size: 0.9rem;
`;

const SidebarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 70px;
  border-bottom: 1px solid var(--nb-border);
`;

const Logo = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--nb-blue);
  white-space: nowrap;
`;
const UserProfile = styled.div`
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--nb-border);
`;

const UserAvatar = styled.div`
  color: var(--nb-blue);
  margin-right: ${(props) => (props.collapsed ? "0" : "15px")};
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
  overflow-y: auto;
`;

const NavItem = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: ${(props) => (props.active ? "var(--nb-blue)" : "var(--nb-ink)")};
  background-color: ${(props) =>
    props.active ? "var(--nb-muted)" : "transparent"};
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
  overflow: hidden;

  &:hover {
    background-color: var(--nb-muted);
    color: var(--nb-blue);
  }
`;

const NavItemWithSubmenu = styled.div`
  display: flex;
  flex-direction: column;
`;

const NavItemMain = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: var(--nb-ink);
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
  overflow: hidden;

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
  justify-content: center;
`;

const NavText = styled.div`
  flex: 1;
`;

const NavArrow = styled.div`
  font-size: 0.8rem;
`;

const Submenu = styled.div`
  padding-left: 40px;
`;

const SubmenuItem = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 20px 8px 40px;
  color: var(--nb-ink);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.3s;

  &:hover {
    color: var(--nb-blue);
  }
`;

const LogoutButton = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: var(--nb-ink);
  cursor: pointer;
  transition: all 0.3s;
  border-top: 1px solid var(--nb-border);
  white-space: nowrap;
  overflow: hidden;

  &:hover {
    color: var(--nb-orange);
    background-color: var(--nb-muted);
  }
`;

const ErrorAlert = styled.div`
  background-color: var(--nb-muted);
  border: 1px solid var(--nb-border);
  border-radius: 8px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  margin-bottom: 30px;
`;

const ErrorMessage = styled.div`
  font-size: 1rem;
  color: var(--nb-orange);
  margin-bottom: 20px;
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

const EmptyMessage = styled.p`
  font-size: 1rem;
  color: var(--nb-ink);
  margin: 20px 0;
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
  &:hover { background: var(--nb-muted); }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
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
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--nb-border);
  h3 { margin: 0; font-size: 1rem; color: var(--nb-ink); }
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

const SSImageWrap = styled.div`
  position: relative;
  cursor: zoom-in;

  &:hover > div {
    opacity: 1;
  }
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

const NoSS = styled.p`
  font-size: 0.8rem;
  color: #9ca3af;
  text-align: center;
  padding: 1rem 0;
  border-top: 1px solid var(--nb-border);
`;

export default CollectionsHistory;
