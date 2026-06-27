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
  const [sidebarCollapsed, ] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, ] = useState("");
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

      const response = await axios.get(`http://localhost:2500/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

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

      let url = "http://localhost:2500/api/collections";
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
                      <WhatsAppBadge status={collection.whatsappStatus}>
                        {waLabel(collection.whatsappStatus)}
                      </WhatsAppBadge>
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
  received:     { bg: "#e6f9ee", color: "#1a7d45" },
  not_received: { bg: "#fde8e8", color: "#c0392b" },
  sent:         { bg: "#e8f4fd", color: "#1565c0" },
  no_phone:     { bg: "#f5f5f5", color: "#888" },
  pending:      { bg: "#fff8e1", color: "#b8860b" },
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
  received:     "✓ Received",
  not_received: "✗ Not Received",
  sent:         "Sent",
  no_phone:     "No Phone",
  pending:      "Pending",
};

const waLabel = (status) => WA_LABELS[status] || "Pending";

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

export default CollectionsHistory;
