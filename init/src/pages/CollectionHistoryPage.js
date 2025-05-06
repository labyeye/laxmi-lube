import React, { useState, useEffect } from "react";
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
  FaCalendarAlt
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;
const CollectionsHistory = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const navigate = useNavigate();

  const fetchCollections = async () => {
    try {
      setLoading(true);
      setError("");
      
      const response = await axios.get("https://laxmi-lube.onrender.com/api/collections", {
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
      minute: "2-digit"
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

  const filteredCollections = collections.filter(collection => {
    const matchesSearch = collection.bill?.billNumber?.toString().includes(searchTerm) || 
                         collection.bill?.retailer?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDate = dateFilter ? 
      new Date(collection.collectedOn).toISOString().split('T')[0] === dateFilter : 
      true;
    
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
          <ToggleButton onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? <FaChevronRight /> : <FaChevronDown />}
          </ToggleButton>
        </SidebarHeader>
        <UserProfile>
          <UserAvatar>
            <FaUserCircle size={sidebarCollapsed ? 24 : 32} />
          </UserAvatar>
          {!sidebarCollapsed && (
            <UserInfo>
              <UserName>Staff Member</UserName>
              <UserRole>Collections</UserRole>
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

          <NavItemWithSubmenu>
            <NavItemMain onClick={() => toggleSubmenu("collections")}>
              <NavIcon>
                <FaMoneyCheckAlt />
              </NavIcon>
              {!sidebarCollapsed && (
                <>
                  <NavText>Collections</NavText>
                  <NavArrow>
                    {activeSubmenu === "collections" ? <FaChevronDown /> : <FaChevronRight />}
                  </NavArrow>
                </>
              )}
            </NavItemMain>

            {!sidebarCollapsed && activeSubmenu === "collections" && (
              <Submenu>
                <SubmenuItem onClick={() => navigate("/staff/bill-assigned-today")}>
                  <NavText>Assigned Today</NavText>
                </SubmenuItem>
                <SubmenuItem active>
                  <NavText>History</NavText>
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
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCollections.map((collection) => (
                  <TableRow key={collection._id}>
                    <TableCell>#{collection.bill?.billNumber}</TableCell>
                    <TableCell>{collection.bill?.retailer}</TableCell>
                    <TableCell>{formatCurrency(collection.amountCollected)}</TableCell>
                    <TableCell>
                      <PaymentMode mode={collection.paymentMode}>
                        {collection.paymentMode}
                      </PaymentMode>
                    </TableCell>
                    <TableCell>{formatDate(collection.collectedOn)}</TableCell>
                    <TableCell>{collection.remarks || "-"}</TableCell>
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

const CollectionsTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 0 28px 0 rgba(82, 63, 105, 0.08);
`;

const TableHeader = styled.thead`
  background-color: #f8f9fc;
`;

const TableHeaderCell = styled.th`
  padding: 15px;
  text-align: left;
  font-weight: 600;
  color: #4e73df;
`;

const TableBody = styled.tbody``;

const TableRow = styled.tr`
  border-bottom: 1px solid #eee;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:hover {
    background-color: #f8f9fc;
  }
`;

const TableCell = styled.td`
  padding: 15px;
  color: #6c757d;
`;

const PaymentMode = styled.span`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: ${(props) =>
    props.mode === "cash" ? "#1cc88a20" : 
     props.mode === "upi" ? "#4e73df20" : 
     props.mode === "bank_transfer" ? "#36b9cc20" : "#f6c23e20"};
  color: ${(props) =>
    props.mode === "cash" ? "#1cc88a" : 
     props.mode === "upi" ? "#4e73df" : 
     props.mode === "bank_transfer" ? "#36b9cc" : "#f6c23e"};
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 4px;
  padding: 8px 15px;
  border: 1px solid #ddd;
`;

const SearchIcon = styled.div`
  color: #6c757d;
  margin-right: 10px;
`;

const SearchInput = styled.input`
  border: none;
  outline: none;
  width: 250px;
  font-size: 0.9rem;
`;

const DateFilterContainer = styled.div`
  display: flex;
  align-items: center;
  background-color: #fff;
  border-radius: 4px;
  padding: 8px 15px;
  border: 1px solid #ddd;
`;

const CalendarIcon = styled.div`
  color: #6c757d;
  margin-right: 10px;
`;

const DateInput = styled.input`
  border: none;
  outline: none;
  font-size: 0.9rem;
`;

const DashboardLayout = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: #f8f9fc;
`;

const Sidebar = styled.div`
  width: ${(props) => (props.collapsed ? "80px" : "250px")};
  background-color: #fff;
  box-shadow: 0 0 28px 0 rgba(82, 63, 105, 0.08);
  transition: width 0.3s ease;
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 1;
`;

const SidebarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 70px;
  border-bottom: 1px solid #f0f0f0;
`;

const Logo = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: #4e73df;
  white-space: nowrap;
`;

const ToggleButton = styled.button`
  background: none;
  border: none;
  color: #6c757d;
  cursor: pointer;
  font-size: 1rem;
  padding: 5px;
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f0f0;
`;

const UserAvatar = styled.div`
  color: #4e73df;
  margin-right: ${(props) => (props.collapsed ? "0" : "15px")};
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const UserName = styled.div`
  font-weight: 600;
  font-size: 0.9rem;
  color: #343a40;
`;

const UserRole = styled.div`
  font-size: 0.75rem;
  color: #6c757d;
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
  color: ${(props) => (props.active ? "#4e73df" : "#6c757d")};
  background-color: ${(props) =>
    props.active ? "rgba(78, 115, 223, 0.1)" : "transparent"};
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
  overflow: hidden;

  &:hover {
    background-color: rgba(78, 115, 223, 0.1);
    color: #4e73df;
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
  color: #6c757d;
  cursor: pointer;
  transition: all 0.3s;
  white-space: nowrap;
  overflow: hidden;

  &:hover {
    background-color: rgba(78, 115, 223, 0.1);
    color: #4e73df;
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
  color: #6c757d;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.3s;

  &:hover {
    color: #4e73df;
  }
`;

const LogoutButton = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.3s;
  border-top: 1px solid #f0f0f0;
  white-space: nowrap;
  overflow: hidden;

  &:hover {
    color: #e74a3b;
    background-color: rgba(231, 74, 59, 0.1);
  }
`;

const MainContent = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 70px;
  background-color: #fff;
  box-shadow: 0 0 28px 0 rgba(82, 63, 105, 0.08);
`;

const PageTitle = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  color: #2e3a59;
  margin: 0;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 15px;
`;


const ContentArea = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
`;

const ErrorAlert = styled.div`
  background-color: #fff5f5;
  border: 1px solid #ffd6d6;
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
  color: #e74a3b;
  margin-bottom: 20px;
`;



const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: #f8f9fc;
`;

const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 4px solid rgba(78, 115, 223, 0.1);
  border-radius: 50%;
  border-top-color: #4e73df;
  animation: ${spin} 1s linear infinite;
  margin-bottom: 20px;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 0 28px 0 rgba(82, 63, 105, 0.08);
`;

const EmptyMessage = styled.p`
  font-size: 1rem;
  color: #6c757d;
  margin: 20px 0;
`;
// Reuse your existing styled components from BillAssignedToday.js
// (DashboardLayout, Sidebar, MainContent, etc.)

export default CollectionsHistory;