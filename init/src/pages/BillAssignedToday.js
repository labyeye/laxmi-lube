import React, { useState, useEffect } from "react";
import axios from "axios";
import styled, { keyframes } from "styled-components";
import {
  FaMoneyBillWave,
  FaCalendarDay,
  FaHome,
  FaMoneyCheckAlt,
  FaListAlt,
  FaSignOutAlt,
  FaUserCircle,
  FaChevronDown,
  FaChevronRight,
  FaSync,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const BillAssignedToday = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const navigate = useNavigate();

  const fetchBillsAssignedToday = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        "http://localhost:2500/api/staff/bills-assigned-today",
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );

      setBills(response.data);
    } catch (error) {
      console.error("Error fetching bills assigned today:", error);
      setError("Failed to fetch bills assigned today. Please try again.");
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  useEffect(() => {
    fetchBillsAssignedToday();
  }, []);
  // Add this function to your component
  // Fixed handleCollectionSubmit function
const handleCollectionSubmit = async () => {
  try {
    setIsSubmitting(true);
    setSubmitError("");

    // Validate payment amount
    const paidAmount = parseFloat(paymentAmount);
    const dueAmount = selectedBill.dueAmount || selectedBill.amount;
    
    if (paidAmount <= 0 || paidAmount > dueAmount) {
      setSubmitError("Please enter a valid payment amount");
      return;
    }
    
    const newDueAmount = dueAmount - paidAmount;
    const newStatus = newDueAmount <= 0 ? "Paid" : "Partially Paid";

    // 1. First create the collection record - with proper authorization header
    await axios.post(
      "http://localhost:2500/api/collections",
      {
        bill: selectedBill._id,
        amountCollected: paidAmount,
        paymentMode,
        remarks: paymentRemarks,
      },
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }
    );

    // 2. Then update the bill's dueAmount and status - with proper authorization header
    await axios.put(
      `http://localhost:2500/api/bills/${selectedBill._id}`,
      {
        dueAmount: newDueAmount,
        status: newStatus,
      },
      {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }
    );

    // Refresh data and close modal
    await fetchBillsAssignedToday();
    setShowCollectionModal(false);
    
    // Reset form values
    setSelectedBill(null);
    setPaymentAmount("");
    setPaymentMode("cash");
    setPaymentRemarks("");
    
  } catch (err) {
    console.error("Collection error:", err);
    setSubmitError(
      err.response?.data?.message || "Failed to record collection"
    );
  } finally {
    setIsSubmitting(false);
  }
};

  // Calculate summary values
  // Calculate summary values
  const totalBills = bills.length;
  const totalAmount = bills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const totalDueAmount = bills.reduce(
    (sum, bill) => sum + (bill.dueAmount > 0 ? bill.dueAmount : 0),
    0
  );
  const averageAmount = totalBills > 0 ? totalAmount / totalBills : 0;

  const paidBills = bills.filter((bill) => bill.dueAmount <= 0).length;
  const handleRetry = () => {
    setRetrying(true);
    fetchBillsAssignedToday();
  };

  const toggleSubmenu = (menu) => {
    if (activeSubmenu === menu) {
      setActiveSubmenu(null);
    } else {
      setActiveSubmenu(menu);
    }
  };

  const formatDate = (dateString) => {
    const options = { day: "numeric", month: "short", year: "numeric" };
    return new Date(dateString).toLocaleDateString("en-US", options);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    })
      .format(amount)
      .replace("₹", "₹");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  if (loading && !retrying) {
    return (
      <LoadingContainer>
        <Spinner />
        <p>Loading bills assigned today...</p>
      </LoadingContainer>
    );
  }

  return (
    <DashboardLayout>
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
            {!sidebarCollapsed && (
              <>
                <NavText>Dashboard</NavText>
                <NavCheckmark>☐</NavCheckmark>
              </>
            )}
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
                <SubmenuItem
                  onClick={() => navigate("/staff/bill-assigned-today")}
                >
                  <NavText>Assigned Today</NavText>
                  <NavCheckmark>☑</NavCheckmark>
                </SubmenuItem>
                <Link
                  to="/staff/collections-history"
                  style={{ textDecoration: "none" }}
                >
                  <SubmenuItem>
                    <NavText>History</NavText>
                    <NavCheckmark>☐</NavCheckmark>
                  </SubmenuItem>
                </Link>
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
          <PageTitle>Bills Assigned Today</PageTitle>
          <HeaderActions>
            <NewCollectionButton onClick={() => setShowCollectionModal(true)}>
              New Collection
            </NewCollectionButton>
            <RefreshButton onClick={handleRetry} disabled={retrying}>
              <FaSync className={retrying ? "spinning" : ""} />
              {retrying ? "Refreshing..." : "Refresh Data"}
            </RefreshButton>
          </HeaderActions>
        </TopBar>

        <ContentArea>
          {error ? (
            <ErrorAlert>
              <ErrorIcon>
                <FaExclamationTriangle />
              </ErrorIcon>
              <ErrorMessage>{error}</ErrorMessage>
              <RetryButton onClick={handleRetry} disabled={retrying}>
                {retrying ? "Retrying..." : "Retry Now"}
              </RetryButton>
            </ErrorAlert>
          ) : (
            <>
              <SummaryCard>
                <SummaryItem>
                  <SummaryLabel>Total Bills</SummaryLabel>
                  <SummaryValue>{totalBills}</SummaryValue>
                </SummaryItem>
                <SummaryItem>
                  <SummaryLabel>Total Amount</SummaryLabel>
                  <SummaryValue>{formatCurrency(totalAmount)}</SummaryValue>
                </SummaryItem>
                <SummaryItem>
                  <SummaryLabel>Total Due Amount</SummaryLabel>
                  <SummaryValue>{formatCurrency(totalDueAmount)}</SummaryValue>
                </SummaryItem>
                <SummaryItem>
                  <SummaryLabel>Average Amount</SummaryLabel>
                  <SummaryValue>{formatCurrency(averageAmount)}</SummaryValue>
                </SummaryItem>
              </SummaryCard>

              {bills.length > 0 ? (
                <BillsList>
                  {bills.map((bill) => (
                    <BillCard key={bill._id}>
                      <BillHeader>
                        <BillNumber>Bill #{bill.billNumber}</BillNumber>
                        <BillStatus status={bill.status}>
                          {bill.status}
                        </BillStatus>
                      </BillHeader>
                      <BillRetailer>{bill.retailer}</BillRetailer>
                      <BillDetails>
                        <DetailItem>
                          <DetailLabel>Amount:</DetailLabel>
                          <DetailValue>
                            {formatCurrency(bill.amount)}
                          </DetailValue>
                        </DetailItem>
                        <DetailItem>
                          <DetailLabel>Due Amount:</DetailLabel>
                          <DetailValue>
                            {bill.dueAmount <= 0
                              ? "Cleared"
                              : formatCurrency(bill.dueAmount)}
                          </DetailValue>
                        </DetailItem>
                        <DetailItem>
                          <DetailLabel>Due Date:</DetailLabel>
                          <DetailValue>{formatDate(bill.dueDate)}</DetailValue>
                        </DetailItem>
                        <DetailItem>
                          <DetailLabel>Assigned Date:</DetailLabel>
                          <DetailValue>
                            {formatDate(bill.assignedDate || bill.billDate)}
                          </DetailValue>
                        </DetailItem>
                      </BillDetails>
                      <BillIcon>
                        <FaMoneyBillWave />
                      </BillIcon>
                    </BillCard>
                  ))}
                </BillsList>
              ) : (
                <EmptyState>
                  <FaMoneyBillWave size={48} />
                  <EmptyMessage>No bills assigned to you today</EmptyMessage>
                  <RefreshButton onClick={handleRetry} disabled={retrying}>
                    <FaSync className={retrying ? "spinning" : ""} />
                    {retrying ? "Refreshing..." : "Check Again"}
                  </RefreshButton>
                </EmptyState>
              )}
            </>
          )}
        </ContentArea>
        {showCollectionModal && (
          <ModalOverlay>
            <Modal>
              <ModalHeader>
                <ModalTitle>Record New Collection</ModalTitle>
                <CloseButton onClick={() => setShowCollectionModal(false)}>
                  &times;
                </CloseButton>
              </ModalHeader>
              <ModalBody>
                {bills.filter((bill) => bill.dueAmount > 0).length === 0 ? (
                  <NoBillsMessage>
                    <FaCheckCircle size={32} />
                    <p>All bills are cleared - nothing to collect!</p>
                    <p>No outstanding payments remaining.</p>
                  </NoBillsMessage>
                ) : !selectedBill ? (
                  <>
                    <ModalSubtitle>Select a Bill</ModalSubtitle>
                    <BillSelection>
                      {bills
                        .filter((bill) => bill.dueAmount > 0)
                        .map((bill) => (
                          <BillOption
                            key={bill._id}
                            onClick={() => setSelectedBill(bill)}
                          >
                            <div>Bill #{bill.billNumber}</div>
                            <div>{bill.retailer}</div>
                            <div>Due: {formatCurrency(bill.dueAmount)}</div>
                          </BillOption>
                        ))}
                    </BillSelection>
                  </>
                ) : (
                  <>
                    <SelectedBillInfo>
                      <div>
                        <strong>Bill #:</strong> {selectedBill.billNumber}
                      </div>
                      <div>
                        <strong>Retailer:</strong> {selectedBill.retailer}
                      </div>
                      <div>
                        <strong>Due Amount:</strong>{" "}
                        {formatCurrency(
                          selectedBill.dueAmount || selectedBill.amount
                        )}
                      </div>
                    </SelectedBillInfo>

                    <FormGroup>
                      <Label htmlFor="paymentAmount">Amount Paid</Label>
                      <Input
                        type="number"
                        id="paymentAmount"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="Enter amount paid"
                        max={selectedBill.dueAmount || selectedBill.amount}
                        min="1"
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label htmlFor="paymentMode">Payment Mode</Label>
                      <Select
                        id="paymentMode"
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value)}
                      >
                        <option value="cash">Cash</option>
                        <option value="cheque">Cheque</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="upi">UPI</option>
                      </Select>
                    </FormGroup>

                    {submitError && <ErrorText>{submitError}</ErrorText>}

                    <ButtonGroup>
                      <BackButton
                        onClick={() => {
                          setSelectedBill(null);
                          setPaymentAmount("");
                          setSubmitError("");
                        }}
                      >
                        Back to Bill Selection
                      </BackButton>
                      <SubmitButton
                        onClick={handleCollectionSubmit}
                        disabled={isSubmitting || !paymentAmount}
                      >
                        {isSubmitting ? "Processing..." : "Submit Collection"}
                      </SubmitButton>
                    </ButtonGroup>
                  </>
                )}
              </ModalBody>
            </Modal>
          </ModalOverlay>
        )}
      </MainContent>
    </DashboardLayout>
  );
};

// Styled Components (consistent with StaffDashboard)
const NoBillsMessage = styled.div`
  text-align: center;
  padding: 20px;
  color: #1cc88a;

  svg {
    margin-bottom: 15px;
    color: #1cc88a;
  }

  p {
    margin: 5px 0;
    font-size: 0.95rem;

    &:first-of-type {
      font-weight: 500;
      font-size: 1.1rem;
    }
  }
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
const NewCollectionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #1cc88a;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background-color: #17a673;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const Modal = styled.div`
  background-color: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  color: #2e3a59;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6c757d;
  padding: 0;
  line-height: 1;

  &:hover {
    color: #2e3a59;
  }
`;

const ModalBody = styled.div`
  padding: 20px;
`;

const ModalSubtitle = styled.h3`
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1rem;
  color: #4e73df;
`;

const BillSelection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 20px;
`;

const BillOption = styled.div`
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: #f8f9fc;
    border-color: #4e73df;
  }

  & > div {
    margin-bottom: 5px;
  }

  & > div:last-child {
    margin-bottom: 0;
    color: #e74a3b;
    font-weight: 500;
  }
`;

const SelectedBillInfo = styled.div`
  background-color: #f8f9fc;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;

  & > div {
    margin-bottom: 8px;
  }

  & > div:last-child {
    margin-bottom: 0;
    color: #e74a3b;
    font-weight: 500;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: #6c757d;
  font-weight: 500;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: #4e73df;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: white;

  &:focus {
    outline: none;
    border-color: #4e73df;
  }
`;

const ErrorText = styled.div`
  color: #e74a3b;
  font-size: 0.9rem;
  margin-bottom: 20px;
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 30px;
`;

const BackButton = styled.button`
  flex: 1;
  padding: 10px;
  background-color: #f8f9fc;
  color: #6c757d;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background-color: #e9ecef;
  }
`;

const SubmitButton = styled.button`
  flex: 1;
  padding: 10px;
  background-color: #4e73df;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background-color: #3a5bc7;
  }

  &:disabled {
    background-color: #b0b7d4;
    cursor: not-allowed;
  }
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

const NavCheckmark = styled.span`
  margin-left: auto;
  font-size: 0.9rem;
  color: ${(props) => (props.active ? "#4e73df" : "#6c757d")};
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

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: #4e73df;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background-color: #3a5bc7;
  }

  &:disabled {
    background-color: #b0b7d4;
    cursor: not-allowed;
  }

  .spinning {
    animation: ${spin} 1s linear infinite;
  }
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

const ErrorIcon = styled.div`
  color: #e74a3b;
  font-size: 2rem;
  margin-bottom: 15px;
`;

const ErrorMessage = styled.div`
  font-size: 1rem;
  color: #e74a3b;
  margin-bottom: 20px;
`;

const RetryButton = styled.button`
  background-color: #e74a3b;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 20px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background-color: #d62c1a;
  }

  &:disabled {
    background-color: #ee9b95;
    cursor: not-allowed;
  }
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

// New styled components for the Bills page
const SummaryCard = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 0 28px 0 rgba(82, 63, 105, 0.08);
`;

const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
`;

const SummaryLabel = styled.div`
  font-size: 0.9rem;
  color: #6c757d;
  margin-bottom: 8px;
`;

const SummaryValue = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: #4e73df;
`;

const BillsList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
`;

const BillCard = styled.div`
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 0 28px 0 rgba(82, 63, 105, 0.08);
  position: relative;
  overflow: hidden;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }
`;

const BillHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const BillNumber = styled.div`
  font-weight: 600;
  color: #2e3a59;
  font-size: 1.1rem;
`;

const BillStatus = styled.div`
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: ${(props) =>
    props.status === "Paid"
      ? "#1cc88a20"
      : props.status === "Pending"
      ? "#f6c23e20"
      : "#e74a3b20"};
  color: ${(props) =>
    props.status === "Paid"
      ? "#1cc88a"
      : props.status === "Pending"
      ? "#f6c23e"
      : "#e74a3b"};
`;

const BillRetailer = styled.div`
  font-size: 0.9rem;
  color: #6c757d;
  margin-bottom: 15px;
`;

const BillDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const DetailItem = styled.div`
  display: flex;
  justify-content: space-between;
`;

const DetailLabel = styled.div`
  font-size: 0.85rem;
  color: #6c757d;
`;

const DetailValue = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
  color: #2e3a59;
`;

const BillIcon = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  color: rgba(78, 115, 223, 0.1);
  font-size: 3rem;
  z-index: 0;
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

export default BillAssignedToday;
