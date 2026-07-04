import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { fmtDate } from "../utils/dateFormat";
import styled, { keyframes } from "styled-components";
import {
  FaMoneyBillWave,
  FaHome,
  FaMoneyCheckAlt,
  FaSignOutAlt,
  FaUserCircle,
  FaChevronDown,
  FaChevronRight,
  FaSync,
  FaExclamationTriangle,
  FaFilePdf,
  FaCheckCircle,
  FaSearch,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";
import { generateReceiptPdf } from "../utils/generateReceipt";

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const BillAssignedToday = () => {
  const [paymentDetails, setPaymentDetails] = useState({
    upiId: "",
    upiTransactionId: "",
    bankName: "",
    chequeNumber: "",
    bankTransactionId: "",
    receiptNumber: "",
  });
  const [staffInfo, setStaffInfo] = useState({
    name: "Loading...",
    role: "Collections",
  });
  const [collectionDate, setCollectionDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [bills, setBills] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [sidebarCollapsed] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerBills, setCustomerBills] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [allAssignedCustomers, setAllAssignedCustomers] = useState([]);
  const [lastCollection, setLastCollection] = useState(null);
  const [collectionSuccess, setCollectionSuccess] = useState(false);
  const [waProgress, setWaProgress] = useState(null); // { step1, step2, result, collectionId }
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [standalonePreviewUrl, setStandalonePreviewUrl] = useState(null);
  const [pdfError, setPdfError] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [totalCollectAmount, setTotalCollectAmount] = useState("");
  const [allocations, setAllocations] = useState([]); // [{ billId, billNumber, dueAmount, amount }]
  const [splitConfirmed, setSplitConfirmed] = useState(false);
  const [cachedLocation, setCachedLocation] = useState(null);
  const BANK_LIST = [
    "ALLAHABAD BANK",
    "ANDHRA BANK",
    "AXIS BANK LTD",
    "BANDHAN BANK",
    "BANK OF BARODA",
    "BANK OF INDIA",
    "CANARA BANK",
    "CENTRAL BANK OF INDIA",
    "CORPORATION BANK",
    "DENA BANK",
    "FEDERAL BANK",
    "HDFC BANK LTD",
    "ICICI BANK",
    "IDBI BANK",
    "INDIAN OVERSEAS BANK",
    "INDUSIND BANK",
    "INDIAN BANK",
    "ORIENTAL BANK OF COMMERCE",
    "PUNJAB NATIONAL BANK",
    "STATE BANK OF INDIA",
    "STANDARD CHARTERED BANK",
    "SYNDICATE BANK",
    "UCO BANK",
    "UNION BANK OF INDIA",
    "UNITED BANK OF INDIA",
    "UTKARSH SMALL FINANCE BANK",
    "UTTAR BIHAR GRAMIN BANK",
    "VIJAYA BANK",
    "BANK OF MAHARASHTRA",
    "KOTAK MAHINDRA BANK",
    "UJJIVAN SMALL FINANCE BANK",
  ];

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
  const navigate = useNavigate();
  const fetchNextReceiptNumber = async () => {
    try {
      const res = await axios.get(
        "https://backend.laxmilube.in/api/collections/next-receipt-number",
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setPaymentDetails((prev) => ({
        ...prev,
        receiptNumber: res.data.receiptNumber,
      }));
    } catch (err) {
      console.error("Failed to fetch receipt number:", err);
    }
  };

  const fetchAllAssignedCustomers = async () => {
    try {
      const response = await axios.get(
        "https://backend.laxmilube.in/api/bills/assigned-customers",
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      setAllAssignedCustomers(response.data);
    } catch (error) {
      console.error("Error fetching assigned customers:", error);
    }
  };
  const handleDaySelect = (day) => {
    setSelectedDay(day === "All" ? null : day);
    setSelectedCustomer(null);
  };

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setCustomerBills(bills.filter((bill) => bill.retailer === customer));
  };
  useEffect(() => {
    if (bills.length > 0) {
      const uniqueCustomers = [...new Set(bills.map((bill) => bill.retailer))];
      setCustomers(uniqueCustomers);
    }
  }, [bills]);

  const fetchBillsAssignedToday = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        "https://backend.laxmilube.in/api/bills/bills-assigned-today",
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          params: {
            collectionDay: selectedDay || null,
          },
        },
      );

      const billsWithDates = response.data.map((bill) => ({
        ...bill,
        billDate: new Date(bill.billDate),
        assignedDate: bill.assignedDate ? new Date(bill.assignedDate) : null,
      }));

      setBills(billsWithDates);

      // Extract unique customers from the bills
      const uniqueCustomers = [
        ...new Set(billsWithDates.map((bill) => bill.retailer)),
      ];
      setCustomers(uniqueCustomers);
    } catch (error) {
      console.error("Error fetching bills assigned today:", error);
      setError("Failed to fetch bills assigned today. Please try again.");
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };
  useEffect(() => {
    fetchUserInfo();
  }, [fetchUserInfo]);
  useEffect(() => {
    fetchBillsAssignedToday();
    fetchAllAssignedCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDay]);

  // Silently acquire and refresh GPS location in background
  useEffect(() => {
    if (!navigator.geolocation) return;
    const captureLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCachedLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            recordedAt: new Date().toISOString(),
          });
        },
        () => {}, // silently ignore errors
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
      );
    };
    captureLocation();
    // Refresh every 5 minutes so location stays current
    const interval = setInterval(captureLocation, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  const imageWidth = window.innerWidth < 768 ? "80%" : "50%";

  const dueBillsForCustomer = selectedCustomer
    ? bills.filter((b) => b.retailer === selectedCustomer && b.dueAmount > 0)
    : [];
  const isSplitMode = dueBillsForCustomer.length > 1;

  // Auto-fill allocations across due bills, smallest due first
  const autoSplitAllocations = (totalStr, dueBills) => {
    const total = parseFloat(totalStr);
    const sorted = [...dueBills].sort((a, b) => a.dueAmount - b.dueAmount);
    let remaining = isNaN(total) ? 0 : total;
    return sorted.map((b) => {
      const alloc = Math.max(0, Math.min(remaining, b.dueAmount));
      remaining = Math.round((remaining - alloc) * 100) / 100;
      return {
        billId: b._id,
        billNumber: b.billNumber,
        dueAmount: b.dueAmount,
        amount: alloc > 0 ? alloc.toFixed(2) : "",
      };
    });
  };

  const handleTotalAmountChange = (value) => {
    if (!(/^\d*\.?\d{0,2}$/.test(value) || value === "")) return;
    setTotalCollectAmount(value);
    setAllocations(autoSplitAllocations(value, dueBillsForCustomer));
  };

  const handleAllocationChange = (billId, value) => {
    if (!(/^\d*\.?\d{0,2}$/.test(value) || value === "")) return;
    setAllocations((prev) =>
      prev.map((a) => (a.billId === billId ? { ...a, amount: value } : a)),
    );
  };

  const allocatedSum = allocations.reduce(
    (sum, a) => sum + (parseFloat(a.amount) || 0),
    0,
  );
  const remainingToAllocate =
    Math.round(((parseFloat(totalCollectAmount) || 0) - allocatedSum) * 100) /
    100;

  const handleSplitCollectionSubmit = async () => {
    if (remainingToAllocate !== 0 || !(parseFloat(totalCollectAmount) > 0)) {
      setSubmitError("Allocated amount must exactly match the total entered");
      return;
    }
    const finalAllocations = allocations.filter(
      (a) => parseFloat(a.amount) > 0,
    );
    if (finalAllocations.length === 0) {
      setSubmitError("Allocate the amount to at least one bill");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setWaProgress({
      step1: "loading",
      step2: "done",
      result: null,
      collectionId: null,
    });

    try {
      const pd =
        paymentMode === "Cash"
          ? { receiptNumber: paymentDetails.receiptNumber || "Money Received" }
          : {
              ...paymentDetails,
              transactionId:
                paymentDetails.upiTransactionId ||
                paymentDetails.bankTransactionId,
            };

      const formData = new FormData();
      if (cachedLocation)
        formData.append("location", JSON.stringify(cachedLocation));
      formData.append(
        "allocations",
        JSON.stringify(
          finalAllocations.map((a) => ({
            billId: a.billId,
            amount: a.amount,
          })),
        ),
      );
      formData.append("paymentMode", paymentMode);
      formData.append("remarks", paymentRemarks);
      formData.append("collectedOn", collectionDate);
      formData.append("paymentDetails", JSON.stringify(pd));
      if (screenshotFile) formData.append("screenshot", screenshotFile);

      await axios.post(
        "https://backend.laxmilube.in/api/collections/split",
        formData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      setWaProgress({
        step1: "done",
        step2: "done",
        result: "success",
        message: `Payment adjusted across ${finalAllocations.length} bills`,
        collectionId: null,
      });

      const d = new Date(collectionDate);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = String(d.getFullYear());
      setLastCollection({
        rawDate: `${dd}/${mm}/${yyyy}`,
        retailerName: selectedCustomer,
        billNumber: finalAllocations.map((a) => a.billNumber).join(", "),
        amount: parseFloat(totalCollectAmount),
        paymentMode,
        collectedBy: staffInfo.name,
        remarks: paymentRemarks,
        receiptNumber: paymentDetails.receiptNumber,
        upiId: paymentDetails.upiId,
        transactionId:
          paymentDetails.upiTransactionId || paymentDetails.bankTransactionId,
        chequeNumber: paymentDetails.chequeNumber,
        chequeDate: paymentDetails.chequeNumber
          ? `${dd}/${mm}/${yyyy}`
          : undefined,
        bankName: paymentDetails.bankName,
        isSplit: true,
        allocations: finalAllocations,
      });

      setCollectionSuccess(true);
      await fetchBillsAssignedToday();
    } catch (err) {
      console.error("Split collection save error:", err);
      setWaProgress(null);
      setSubmitError(
        err.response?.data?.message || "Failed to record collection",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCollectionSubmit = async () => {
    const paidAmount = parseFloat(paymentAmount);
    if (isNaN(paidAmount)) {
      setSubmitError("Please enter a valid amount");
      return;
    }

    const roundedAmount = Math.round(paidAmount * 100) / 100;
    const dueAmount = parseFloat(selectedBill.dueAmount);
    if (roundedAmount <= 0 || roundedAmount > dueAmount) {
      setSubmitError(
        `Amount must be between ₹0.01 and ₹${dueAmount.toFixed(2)}`,
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");

    // Open progress modal — step 1 in progress
    setWaProgress({
      step1: "loading",
      step2: "waiting",
      result: null,
      collectionId: null,
    });

    try {
      const pd =
        paymentMode === "Cash"
          ? { receiptNumber: paymentDetails.receiptNumber || "Money Received" }
          : {
              ...paymentDetails,
              transactionId:
                paymentDetails.upiTransactionId ||
                paymentDetails.bankTransactionId,
            };

      const formData = new FormData();
      if (cachedLocation)
        formData.append("location", JSON.stringify(cachedLocation));
      formData.append("bill", selectedBill._id);
      formData.append("amountCollected", roundedAmount);
      formData.append("paymentMode", paymentMode);
      formData.append("remarks", paymentRemarks);
      formData.append("collectedOn", collectionDate);
      formData.append("paymentDetails", JSON.stringify(pd));
      if (screenshotFile) formData.append("screenshot", screenshotFile);

      const saveRes = await axios.post(
        "https://backend.laxmilube.in/api/collections",
        formData,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      const savedId = saveRes.data._id;

      // Step 1 done — step 2 starts
      setWaProgress({
        step1: "done",
        step2: "loading",
        result: null,
        collectionId: savedId,
      });

      // Build local collection data for receipt preview
      const d = new Date(collectionDate);
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = String(d.getFullYear());
      setLastCollection({
        rawDate: `${dd}/${mm}/${yyyy}`,
        retailerName: selectedBill.retailer,
        billNumber: selectedBill.billNumber,
        amount: roundedAmount,
        paymentMode,
        collectedBy: staffInfo.name,
        remarks: paymentRemarks,
        receiptNumber: paymentDetails.receiptNumber,
        upiId: paymentDetails.upiId,
        transactionId:
          paymentDetails.upiTransactionId || paymentDetails.bankTransactionId,
        chequeNumber: paymentDetails.chequeNumber,
        chequeDate: paymentDetails.chequeNumber
          ? `${dd}/${mm}/${yyyy}`
          : undefined,
        bankName: paymentDetails.bankName,
      });

      // Step 2: send WhatsApp
      try {
        const waRes = await axios.post(
          `https://backend.laxmilube.in/api/collections/${savedId}/send-whatsapp`,
          {},
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        setWaProgress({
          step1: "done",
          step2: "done",
          result: waRes.data.hasPhone ? "success" : "no_phone",
          message: waRes.data.message,
          collectionId: savedId,
        });
      } catch {
        setWaProgress({
          step1: "done",
          step2: "error",
          result: "error",
          message:
            "WhatsApp send failed. You can retry from Collection History.",
          collectionId: savedId,
        });
      }

      setCollectionSuccess(true);
      await fetchBillsAssignedToday();
    } catch (err) {
      console.error("Collection save error:", err);
      setWaProgress(null);
      setSubmitError(
        err.response?.data?.message || "Failed to record collection",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPdfInTab = async (data) => {
    setPdfError("");
    try {
      const bytes = await generateReceiptPdf(data);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      // revoke after a short delay so the tab has time to load it
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setPdfError(err.message || "PDF generation failed");
    }
  };

  const handleOpenPreview = () => {
    const dummy = {
      rawDate: "15/06/2026",
      retailerName: "Sample Retailer Pvt. Ltd.",
      billNumber: "1234",
      amount: 5750,
      paymentMode: "Cash",
      collectedBy: staffInfo.name || "Staff Name",
      receiptNumber: "RC-001",
      chequeNumber: "",
      chequeDate: "",
      bankName: "",
      upiId: "",
      transactionId: "",
      remarks: "",
    };
    openPdfInTab(dummy);
  };

  const handleClosePreview = () => {
    if (standalonePreviewUrl) URL.revokeObjectURL(standalonePreviewUrl);
    setStandalonePreviewUrl(null);
    setShowPreviewModal(false);
  };

  const handleDownloadReceipt = () => {
    if (!lastCollection) return;
    openPdfInTab(lastCollection);
  };

  const handleCloseModal = () => {
    setShowCollectionModal(false);
    setCollectionSuccess(false);
    setLastCollection(null);
    setSelectedBill(null);
    setSelectedCustomer(null);
    setCustomerSearch("");
    setPaymentAmount("");
    setPaymentMode("Cash");
    setPaymentRemarks("");
    setScreenshotFile(null);
    setTotalCollectAmount("");
    setAllocations([]);
    setSplitConfirmed(false);
    setPaymentDetails({
      upiId: "",
      upiTransactionId: "",
      bankName: "",
      chequeNumber: "",
      bankTransactionId: "",
      receiptNumber: "",
    });
  };

  const totalBills = bills.length;
  const totalAmount = bills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
  const totalDueAmount = bills.reduce(
    (sum, bill) => sum + (bill.dueAmount > 0 ? bill.dueAmount : 0),
    0,
  );
  const averageAmount = totalBills > 0 ? totalAmount / totalBills : 0;

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

  const formatDate = fmtDate;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleOpenCollectionModal = () => {
    setSelectedBill(null);
    setSelectedCustomer(null);
    setCustomerSearch("");
    setPaymentAmount("");
    setPaymentMode("Cash");
    setPaymentRemarks("");
    setScreenshotFile(null);
    setTotalCollectAmount("");
    setAllocations([]);
    setSplitConfirmed(false);
    setSubmitError("");
    setShowCollectionModal(true);
    fetchNextReceiptNumber();
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
                <SubmenuItem
                  active
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
            <NewCollectionButton onClick={handleOpenCollectionModal}>
              New Collection
            </NewCollectionButton>
            <PreviewReceiptButton onClick={handleOpenPreview}>
              <FaFilePdf style={{ marginRight: 6 }} />
              Preview Receipt
            </PreviewReceiptButton>
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
                  <SummaryValue>
                    {formatCurrency(totalDueAmount.toFixed(2))}
                  </SummaryValue>
                </SummaryItem>
                <SummaryItem>
                  <SummaryLabel>Average Amount</SummaryLabel>
                  <SummaryValue>{formatCurrency(averageAmount)}</SummaryValue>
                </SummaryItem>
              </SummaryCard>

              <DayFilterContainer>
                <DayButton
                  active={!selectedDay}
                  onClick={() => handleDaySelect("All")}
                >
                  All
                </DayButton>
                {[
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ].map((day) => (
                  <DayButton
                    key={day}
                    active={selectedDay === day}
                    onClick={() => handleDaySelect(day)}
                  >
                    {day.substring(0, 10)}
                  </DayButton>
                ))}
              </DayFilterContainer>

              <CustomerSelector>
                <Label>Select Customer:</Label>
                <Select
                  value={selectedCustomer || ""}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                >
                  <option value="">All Customers</option>
                  {customers.map((customer) => (
                    <option key={customer} value={customer}>
                      {customer}
                    </option>
                  ))}
                </Select>
              </CustomerSelector>

              {bills.length > 0 ? (
                <BillsList>
                  {(selectedCustomer ? customerBills : bills).map((bill) => (
                    <BillCard key={bill._id} paid={bill.dueAmount <= 0}>
                      <BillRetailer>{bill.retailer}</BillRetailer>
                      <BillHeader>
                        <BillNumber>Bill #{bill.billNumber}</BillNumber>
                        <BillStatus status={bill.status}>
                          {bill.dueAmount <= 0 ? "Paid" : bill.status}
                        </BillStatus>
                      </BillHeader>
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
                            {bill.dueAmount <= 0 ? (
                              <PaidText>Cleared</PaidText>
                            ) : (
                              formatCurrency(bill.dueAmount.toFixed(2))
                            )}
                          </DetailValue>
                        </DetailItem>
                        <DetailItem>
                          <DetailLabel>Bill Date:</DetailLabel>
                          <DetailValue>{formatDate(bill.billDate)}</DetailValue>
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
                      {bill.dueAmount <= 0 && <PaidBadge>PAID</PaidBadge>}
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

        {/* Updated Collection Modal */}
        {showCollectionModal && (
          <ModalOverlay>
            <Modal>
              <ModalHeader>
                <ModalTitle>Record New Collection</ModalTitle>
                <CloseButton onClick={handleCloseModal}>&times;</CloseButton>
              </ModalHeader>
              <ModalBody>
                {collectionSuccess ? (
                  // Success state with receipt download
                  <SuccessContainer>
                    <SuccessIcon>
                      <FaCheckCircle size={48} />
                    </SuccessIcon>
                    <SuccessTitle>Collection Recorded!</SuccessTitle>
                    <SuccessDetail>
                      <strong>{lastCollection?.retailerName}</strong> — Bill #
                      {lastCollection?.billNumber}
                    </SuccessDetail>
                    <SuccessDetail>
                      Amount:{" "}
                      <strong>
                        Rs. {parseFloat(lastCollection?.amount).toFixed(2)}
                      </strong>{" "}
                      via {lastCollection?.paymentMode}
                    </SuccessDetail>
                    <ReceiptButtonGroup>
                      {pdfError && (
                        <PdfErrorText>Error: {pdfError}</PdfErrorText>
                      )}
                      <PreviewReceiptButton
                        onClick={() => openPdfInTab(lastCollection)}
                      >
                        <FaFilePdf style={{ marginRight: 6 }} />
                        Preview Receipt
                      </PreviewReceiptButton>
                      <DownloadReceiptButton onClick={handleDownloadReceipt}>
                        <FaFilePdf style={{ marginRight: 8 }} />
                        Download Receipt PDF
                      </DownloadReceiptButton>
                      <BackButton onClick={handleCloseModal}>Close</BackButton>
                    </ReceiptButtonGroup>
                  </SuccessContainer>
                ) : !selectedCustomer ? (
                  // Step 1: Select Customer
                  <div>
                    <ModalSubtitle>Select Customer</ModalSubtitle>
                    <CustomerSearchContainer>
                      <FaSearch color="var(--nb-ink)" />
                      <CustomerSearchInput
                        type="text"
                        placeholder="Search retailer..."
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        autoFocus
                      />
                    </CustomerSearchContainer>
                    <CustomerBillsContainer>
                      {allAssignedCustomers
                        .filter((c) =>
                          c
                            .toLowerCase()
                            .includes(customerSearch.toLowerCase()),
                        )
                        .map((customer) => (
                          <BillOption
                            key={customer}
                            onClick={() => setSelectedCustomer(customer)}
                          >
                            <div>{customer}</div>
                          </BillOption>
                        ))}
                    </CustomerBillsContainer>
                  </div>
                ) : isSplitMode && !splitConfirmed ? (
                  // Step 2a: Adjust amount across multiple bills
                  <div>
                    <ModalSubtitle>
                      Adjust Amount for {selectedCustomer}
                    </ModalSubtitle>
                    <ButtonGroup>
                      <BackButton
                        onClick={() => {
                          setSelectedCustomer(null);
                          setTotalCollectAmount("");
                          setAllocations([]);
                        }}
                      >
                        Back to Customer Selection
                      </BackButton>
                    </ButtonGroup>

                    <FormGroup>
                      <Label>Total Amount Collected</Label>
                      <Input
                        type="text"
                        value={totalCollectAmount}
                        onChange={(e) =>
                          handleTotalAmountChange(e.target.value)
                        }
                        placeholder="0.00"
                        autoFocus
                      />
                    </FormGroup>

                    <ModalSubtitle style={{ fontSize: "0.95rem" }}>
                      Allocate across {dueBillsForCustomer.length} due bills
                    </ModalSubtitle>
                    {[...allocations]
                      .sort((a, b) => a.dueAmount - b.dueAmount)
                      .map((a) => (
                        <AllocationRow key={a.billId}>
                          <div>
                            <strong>Bill #{a.billNumber}</strong>
                            <div>Due: {formatCurrency(a.dueAmount)}</div>
                          </div>
                          <Input
                            type="text"
                            value={a.amount}
                            onChange={(e) =>
                              handleAllocationChange(a.billId, e.target.value)
                            }
                            placeholder="0.00"
                            style={{ maxWidth: "120px" }}
                          />
                        </AllocationRow>
                      ))}

                    <AllocationSummary balanced={remainingToAllocate === 0}>
                      Remaining to allocate:{" "}
                      {formatCurrency(remainingToAllocate)}
                    </AllocationSummary>

                    {submitError && <ErrorText>{submitError}</ErrorText>}

                    <ButtonGroup>
                      <SubmitButton
                        onClick={() => {
                          if (
                            remainingToAllocate !== 0 ||
                            !(parseFloat(totalCollectAmount) > 0)
                          ) {
                            setSubmitError(
                              "Allocated amount must exactly match the total entered",
                            );
                            return;
                          }
                          setSubmitError("");
                          setSplitConfirmed(true);
                        }}
                        disabled={
                          remainingToAllocate !== 0 ||
                          !(parseFloat(totalCollectAmount) > 0)
                        }
                      >
                        Continue
                      </SubmitButton>
                    </ButtonGroup>
                  </div>
                ) : !isSplitMode && !selectedBill ? (
                  // Step 2b: Select a single bill
                  <div>
                    <ModalSubtitle>
                      Select Bill for {selectedCustomer}
                    </ModalSubtitle>
                    <ButtonGroup>
                      <BackButton onClick={() => setSelectedCustomer(null)}>
                        Back to Customer Selection
                      </BackButton>
                    </ButtonGroup>
                    <CustomerBillsContainer>
                      {bills
                        .filter(
                          (bill) =>
                            bill.retailer === selectedCustomer &&
                            bill.dueAmount > 0,
                        )
                        .map((bill) => (
                          <BillOption
                            key={bill._id}
                            onClick={() => setSelectedBill(bill)}
                          >
                            <div>Bill #{bill.billNumber}</div>
                            <div>Amount: {formatCurrency(bill.amount)}</div>
                            <div>Due: {formatCurrency(bill.dueAmount)}</div>
                            <div>Bill Date: {formatDate(bill.billDate)}</div>
                            {bill.outstandingDays > 0 && (
                              <OverdueBadge>
                                Overdue: {bill.outstandingDays} days
                              </OverdueBadge>
                            )}
                          </BillOption>
                        ))}
                    </CustomerBillsContainer>
                  </div>
                ) : (
                  // Step 3: Payment Details
                  <>
                    {isSplitMode ? (
                      <SelectedBillInfo>
                        <div>
                          <strong>Retailer:</strong> {selectedCustomer}
                        </div>
                        <div>
                          <strong>Total Amount:</strong>{" "}
                          {formatCurrency(totalCollectAmount)}
                        </div>
                        <div>
                          <strong>Adjusted Across:</strong>{" "}
                          {allocations
                            .filter((a) => parseFloat(a.amount) > 0)
                            .map(
                              (a) =>
                                `#${a.billNumber} (${formatCurrency(a.amount)})`,
                            )
                            .join(", ")}
                        </div>
                      </SelectedBillInfo>
                    ) : (
                      <SelectedBillInfo>
                        <div>
                          <strong>Bill #:</strong> {selectedBill.billNumber}
                        </div>
                        <div>
                          <strong>Retailer:</strong> {selectedBill.retailer}
                        </div>
                        <div>
                          <strong>Due Amount:</strong>{" "}
                          {formatCurrency(selectedBill.dueAmount.toFixed(2))}
                        </div>
                      </SelectedBillInfo>
                    )}
                    <FormGroup>
                      <Label>Collection Date</Label>
                      <Input
                        type="date"
                        value={collectionDate}
                        onChange={(e) => setCollectionDate(e.target.value)}
                        max={new Date().toISOString().split("T")[0]} // Can't be future date
                      />
                    </FormGroup>

                    {!isSplitMode && (
                      <FormGroup>
                        <Label>Amount Paid</Label>
                        <AmountInputContainer>
                          <Input
                            type="number"
                            value={paymentAmount}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (
                                /^\d*\.?\d{0,2}$/.test(value) ||
                                value === ""
                              ) {
                                setPaymentAmount(value);
                              }
                            }}
                            placeholder="0.00"
                            step="0.01"
                            min="0.01"
                            max={selectedBill?.dueAmount}
                          />
                          <MaxButton
                            type="button"
                            onClick={() =>
                              setPaymentAmount(
                                selectedBill?.dueAmount.toFixed(2),
                              )
                            }
                          >
                            All Dues
                          </MaxButton>
                        </AmountInputContainer>
                      </FormGroup>
                    )}

                    <FormGroup>
                      <Label>Payment Mode</Label>
                      <Select
                        value={paymentMode}
                        onChange={(e) => {
                          const mode = e.target.value;
                          setPaymentMode(mode);
                          setPaymentDetails({
                            upiId: "",
                            upiTransactionId: "",
                            bankName: "",
                            chequeNumber: "",
                            bankTransactionId: "",
                            receiptNumber: "",
                          });
                          if (mode === "Cash") fetchNextReceiptNumber();
                        }}
                      >
                        <option value="Cash">Cash</option>
                        <option value="cheque">Cheque</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="upi">UPI</option>
                      </Select>
                    </FormGroup>
                    {paymentMode === "Cash" && (
                      <FormGroup>
                        <Label>Receipt Number</Label>
                        <Input
                          type="text"
                          value={paymentDetails.receiptNumber}
                          readOnly
                          style={{
                            background: "#f5f5f5",
                            cursor: "not-allowed",
                          }}
                        />
                      </FormGroup>
                    )}
                    {/* Payment mode specific fields */}
                    {paymentMode === "upi" && (
                      <>
                        <img
                          style={{
                            maxWidth: "100%",
                            width: imageWidth,
                            height: "auto",
                            borderRadius: 10,
                            margin: "10px auto",
                            display: "block",
                          }}
                          src={require("../../src/image/qr.jpeg")}
                          alt="QR Code"
                        />
                        <FormGroup>
                          <Label>UPI ID</Label>

                          <Input
                            type="text"
                            value={paymentDetails.upiId}
                            onChange={(e) =>
                              setPaymentDetails({
                                ...paymentDetails,
                                upiId: e.target.value,
                              })
                            }
                            placeholder="Enter UPI ID"
                          />
                        </FormGroup>
                        <FormGroup>
                          <Label>Transaction ID</Label>
                          <Input
                            type="text"
                            value={paymentDetails.upiTransactionId}
                            onChange={(e) =>
                              setPaymentDetails({
                                ...paymentDetails,
                                upiTransactionId: e.target.value,
                              })
                            }
                            placeholder="Enter UPI Transaction ID"
                          />
                        </FormGroup>
                      </>
                    )}

                    {(paymentMode === "cheque" ||
                      paymentMode === "bank_transfer") && (
                      <FormGroup>
                        <Label>Bank Name</Label>
                        <Select
                          value={paymentDetails.bankName}
                          onChange={(e) =>
                            setPaymentDetails({
                              ...paymentDetails,
                              bankName: e.target.value,
                            })
                          }
                        >
                          <option value="">Select Bank</option>
                          {BANK_LIST.map((bank) => (
                            <option key={bank} value={bank}>
                              {bank}
                            </option>
                          ))}
                        </Select>
                      </FormGroup>
                    )}
                    {paymentMode === "cheque" && (
                      <FormGroup>
                        <Label>Cheque Number</Label>
                        <Input
                          type="text"
                          value={paymentDetails.chequeNumber}
                          onChange={(e) =>
                            setPaymentDetails({
                              ...paymentDetails,
                              chequeNumber: e.target.value,
                            })
                          }
                          placeholder="Enter Cheque Number"
                        />
                      </FormGroup>
                    )}

                    {paymentMode === "bank_transfer" && (
                      <FormGroup>
                        <Label>Transaction ID</Label>
                        <Input
                          type="text"
                          value={paymentDetails.bankTransactionId}
                          onChange={(e) =>
                            setPaymentDetails({
                              ...paymentDetails,
                              bankTransactionId: e.target.value,
                            })
                          }
                          placeholder="Enter Bank Transaction ID"
                        />
                      </FormGroup>
                    )}

                    <FormGroup>
                      <Label>Remarks (Optional)</Label>
                      <Input
                        as="textarea"
                        value={paymentRemarks}
                        onChange={(e) => setPaymentRemarks(e.target.value)}
                        placeholder="Add any additional notes..."
                        rows={3}
                      />
                    </FormGroup>

                    <FormGroup>
                      <Label>Screenshot (Optional)</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        required
                        onChange={(e) =>
                          setScreenshotFile(e.target.files[0] || null)
                        }
                      />
                      {screenshotFile && (
                        <img
                          src={URL.createObjectURL(screenshotFile)}
                          alt="preview"
                          style={{
                            marginTop: "0.5rem",
                            maxWidth: "100%",
                            maxHeight: "180px",
                            borderRadius: "8px",
                            objectFit: "contain",
                          }}
                        />
                      )}
                    </FormGroup>

                    {submitError && <ErrorText>{submitError}</ErrorText>}

                    <ButtonGroup>
                      <BackButton
                        onClick={() => {
                          if (isSplitMode) {
                            setSplitConfirmed(false);
                          } else {
                            setSelectedBill(null);
                            setPaymentAmount("");
                          }
                          setSubmitError("");
                        }}
                      >
                        {isSplitMode
                          ? "Back to Adjustment"
                          : "Back to Bill Selection"}
                      </BackButton>
                      <SubmitButton
                        onClick={
                          isSplitMode
                            ? handleSplitCollectionSubmit
                            : handleCollectionSubmit
                        }
                        disabled={
                          isSubmitting ||
                          (isSplitMode ? !totalCollectAmount : !paymentAmount)
                        }
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

        {showPreviewModal && (
          <ModalOverlay onClick={handleClosePreview}>
            <PreviewModal onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <ModalTitle>Receipt Preview (Sample Data)</ModalTitle>
                <CloseButton onClick={handleClosePreview}>&times;</CloseButton>
              </ModalHeader>
              <ModalBody>
                <PreviewHint>
                  Adjust X/Y positions in{" "}
                  <code>src/utils/generateReceipt.js</code> → <code>POS</code>{" "}
                  object, then click Preview Receipt again.
                </PreviewHint>
                {standalonePreviewUrl ? (
                  <PreviewFrame
                    src={standalonePreviewUrl}
                    title="Receipt Position Preview"
                  />
                ) : (
                  <PreviewPlaceholder>Generating…</PreviewPlaceholder>
                )}
              </ModalBody>
            </PreviewModal>
          </ModalOverlay>
        )}

        {/* ── WhatsApp Progress Modal ── */}
        {waProgress && (
          <WaProgressOverlay>
            <WaProgressCard>
              <WaProgressTitle>Recording Collection</WaProgressTitle>

              <WaStep status={waProgress.step1}>
                <WaStepIcon status={waProgress.step1}>
                  {waProgress.step1 === "done" ? (
                    "✓"
                  ) : waProgress.step1 === "loading" ? (
                    <WaSpinner />
                  ) : (
                    "○"
                  )}
                </WaStepIcon>
                <WaStepText>
                  <strong>Saving collection data</strong>
                  <span>
                    {waProgress.step1 === "loading"
                      ? "Please wait…"
                      : waProgress.step1 === "done"
                        ? "Saved successfully"
                        : ""}
                  </span>
                </WaStepText>
              </WaStep>

              <WaStep status={waProgress.step2}>
                <WaStepIcon status={waProgress.step2}>
                  {waProgress.step2 === "done" ? (
                    "✓"
                  ) : waProgress.step2 === "error" ? (
                    "✗"
                  ) : waProgress.step2 === "loading" ? (
                    <WaSpinner />
                  ) : (
                    "○"
                  )}
                </WaStepIcon>
                <WaStepText>
                  <strong>Sending WhatsApp receipt</strong>
                  <span>
                    {waProgress.step2 === "loading"
                      ? "Sending to retailer…"
                      : waProgress.step2 === "done"
                        ? "Message dispatched"
                        : waProgress.step2 === "error"
                          ? "Send failed"
                          : "Waiting…"}
                  </span>
                </WaStepText>
              </WaStep>

              {waProgress.result && (
                <WaResultBanner result={waProgress.result}>
                  {waProgress.result === "success" &&
                    "✅ WhatsApp receipt sent successfully!"}
                  {waProgress.result === "no_phone" &&
                    "⚠️ Saved! No phone number for this retailer — please add one."}
                  {waProgress.result === "error" &&
                    "⚠️ Saved! WhatsApp failed — retry from Collection History."}
                </WaResultBanner>
              )}

              {waProgress.result && (
                <WaCloseBtn onClick={() => setWaProgress(null)}>
                  Close
                </WaCloseBtn>
              )}
            </WaProgressCard>
          </WaProgressOverlay>
        )}
      </MainContent>
    </DashboardLayout>
  );
};

// Responsive Styled Components for BillAssignedToday
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
    width: ${(props) => (props.collapsed === "true" ? "80px" : "250px")};
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

const PageTitle = styled.h1`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--nb-ink);
  margin: 0;

  @media (min-width: 768px) {
    font-size: 1.5rem;
  }
`;
const PaidBadge = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  background-color: var(--nb-blue);
  color: var(--nb-white);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
`;

const PaidText = styled.span`
  color: var(--nb-blue);
  font-weight: bold;
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 10px;
  flex-wrap: wrap;

  @media (min-width: 768px) {
    gap: 15px;
    flex-wrap: nowrap;
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

const SummaryCard = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
  margin-bottom: 20px;
  background-color: var(--nb-white);
  border-radius: 8px;
  padding: 15px;
  box-shadow: var(--nb-shadow-md);

  @media (min-width: 576px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 992px) {
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    padding: 20px;
    margin-bottom: 30px;
  }
`;

const DayFilterContainer = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 15px;
  overflow-x: auto;
  padding-bottom: 10px;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */

  &::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }

  @media (min-width: 768px) {
    margin-bottom: 20px;
  }
`;

const CustomerSelector = styled.div`
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  @media (min-width: 576px) {
    flex-direction: row;
    align-items: center;
    gap: 10px;
  }
`;

const BillsList = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;

  @media (min-width: 576px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: 992px) {
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  }
`;

const BillCard = styled.div`
  background-color: var(--nb-white);
  border-radius: 8px;
  padding: 15px;
  box-shadow: var(--nb-shadow-md);
  position: relative;
  overflow: hidden;
  transition: all 0.3s;

  &:hover {
    transform: translateY(-5px);
    box-shadow: var(--nb-shadow-md);
  }

  @media (min-width: 768px) {
    padding: 20px;
  }
`;

const Modal = styled.div`
  background-color: var(--nb-white);
  border-radius: 8px;
  width: 95%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--nb-shadow-md);
  margin: 20px auto;

  @media (min-width: 576px) {
    width: 90%;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;

  @media (min-width: 576px) {
    flex-direction: row;
    gap: 10px;
    margin-top: 30px;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 15px;
  @media (min-width: 768px) {
    margin-bottom: 20px;
  }
`;

const CustomerBillsContainer = styled.div`
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 15px;
  border: 1px solid var(--nb-border);
  border-radius: 8px;
  padding: 10px;

  @media (min-width: 768px) {
    margin-bottom: 20px;
  }
`;

const AmountInputContainer = styled.div`
  display: flex;
  gap: 8px;
  flex-direction: column;

  @media (min-width: 576px) {
    flex-direction: row;
    align-items: center;
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

// Update existing components with responsive styles
const NewCollectionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: var(--nb-blue);
  color: var(--nb-white);
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  width: 100%;

  &:hover {
    background-color: var(--nb-blue);
  }

  @media (min-width: 576px) {
    width: auto;
    padding: 8px 16px;
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background-color: var(--nb-blue);
  color: var(--nb-white);
  border: none;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  width: 100%;

  &:hover {
    background-color: var(--nb-blue);
  }

  &:disabled {
    background-color: var(--nb-border);
    cursor: not-allowed;
  }

  .spinning {
    animation: ${spin} 1s linear infinite;
  }

  @media (min-width: 576px) {
    width: auto;
    padding: 8px 16px;
  }
`;

const DayButton = styled.button`
  padding: 6px 10px;
  border: 1px solid
    ${(props) => (props.active ? "var(--nb-blue)" : "var(--nb-border)")};
  border-radius: 20px;
  background-color: ${(props) => (props.active ? "var(--nb-blue)" : "var(--nb-white)")};
  color: ${(props) => (props.active ? "var(--nb-white)" : "var(--nb-ink)")};
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background-color: ${(props) => (props.active ? "var(--nb-blue)" : "var(--nb-muted)")};
    border-color: ${(props) => (props.active ? "var(--nb-blue)" : "var(--nb-blue)")};
  }

  @media (min-width: 576px) {
    padding: 8px 12px;
    font-size: 0.8rem;
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--nb-border);
  border-radius: 4px;
  font-size: 0.9rem;
  background-color: var(--nb-white);

  &:focus {
    outline: none;
    border-color: var(--nb-blue);
  }

  @media (min-width: 576px) {
    width: auto;
    min-width: 200px;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--nb-border);
  border-radius: 4px;
  font-size: 0.9rem;

  &:focus {
    outline: none;
    border-color: var(--nb-blue);
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 10px;
  background-color: var(--nb-blue);
  color: var(--nb-white);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background-color: var(--nb-blue);
  }

  &:disabled {
    background-color: var(--nb-border);
    cursor: not-allowed;
  }

  @media (min-width: 576px) {
    width: auto;
    flex: 1;
  }
`;

const BackButton = styled.button`
  width: 100%;
  padding: 10px;
  background-color: var(--nb-muted);
  color: var(--nb-ink);
  border: 1px solid var(--nb-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background-color: var(--nb-muted);
  }

  @media (min-width: 576px) {
    width: auto;
    flex: 1;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: var(--nb-muted);
  padding: 20px;
  text-align: center;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid var(--nb-muted);
  border-radius: 50%;
  border-top-color: var(--nb-blue);
  animation: ${spin} 1s linear infinite;
  margin-bottom: 20px;

  @media (min-width: 768px) {
    width: 50px;
    height: 50px;
  }
`;
// Styled Components (consistent with StaffDashboard)

const SidebarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 70px;
  border-bottom: 1px solid var(--nb-border);
`;

const MaxButton = styled.button`
  padding: 0 12px;
  background-color: var(--nb-muted);
  color: var(--nb-blue);
  border: 1px solid var(--nb-blue);
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;

  &:hover {
    background-color: var(--nb-blue);
    color: var(--nb-white);
  }

  &:active {
    transform: scale(0.98);
  }
`;
const OverdueBadge = styled.span`
  background-color: var(--nb-orange);
  color: var(--nb-white);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  margin-left: auto;
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

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--nb-muted);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--nb-border);
`;

const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  color: var(--nb-ink);
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--nb-ink);
  padding: 0;
  line-height: 1;

  &:hover {
    color: var(--nb-ink);
  }
`;

const ModalBody = styled.div`
  padding: 20px;
`;

const ModalSubtitle = styled.h3`
  margin-top: 0;
  margin-bottom: 15px;
  font-size: 1rem;
  color: var(--nb-blue);
`;

const BillOption = styled.div`
  padding: 15px;
  border: 1px solid var(--nb-border);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background-color: var(--nb-muted);
    border-color: var(--nb-blue);
  }

  & > div {
    margin-bottom: 5px;
  }

  & > div:last-child {
    margin-bottom: 0;
    color: var(--nb-orange);
    font-weight: 500;
  }
`;

const SelectedBillInfo = styled.div`
  background-color: var(--nb-muted);
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 20px;

  & > div {
    margin-bottom: 8px;
  }

  & > div:last-child {
    margin-bottom: 0;
    color: var(--nb-orange);
    font-weight: 500;
  }
`;

const AllocationRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  margin-bottom: 10px;

  & > div:first-child {
    font-size: 0.9rem;
  }
`;

const AllocationSummary = styled.div`
  padding: 10px 12px;
  border-radius: 6px;
  font-weight: 600;
  margin: 10px 0 16px;
  background-color: ${(props) =>
    props.balanced ? "#dcfce7" : "var(--nb-muted)"};
  color: ${(props) => (props.balanced ? "#15803d" : "var(--nb-orange)")};
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 0.9rem;
  color: var(--nb-ink);
  font-weight: 500;
`;

const ErrorText = styled.div`
  color: var(--nb-orange);
  font-size: 0.9rem;
  margin-bottom: 20px;
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

const NavCheckmark = styled.span`
  margin-left: auto;
  font-size: 0.9rem;
  color: ${(props) => (props.active ? "var(--nb-blue)" : "var(--nb-ink)")};
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

const ErrorIcon = styled.div`
  color: var(--nb-orange);
  font-size: 2rem;
  margin-bottom: 15px;
`;

const ErrorMessage = styled.div`
  font-size: 1rem;
  color: var(--nb-orange);
  margin-bottom: 20px;
`;

const RetryButton = styled.button`
  background-color: var(--nb-orange);
  color: var(--nb-white);
  border: none;
  border-radius: 4px;
  padding: 8px 20px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background-color: var(--nb-orange);
  }

  &:disabled {
    background-color: var(--nb-orange);
    cursor: not-allowed;
  }
`;

const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
`;

const SummaryLabel = styled.div`
  font-size: 0.9rem;
  color: var(--nb-ink);
  margin-bottom: 8px;
`;

const SummaryValue = styled.div`
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--nb-blue);
`;

const BillHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
`;

const BillNumber = styled.div`
  font-weight: 600;
  color: var(--nb-ink);
  font-size: 0.9rem;
`;

const BillStatus = styled.div`
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: ${(props) =>
    props.status === "Paid"
      ? "var(--nb-blue)20"
      : props.status === "Pending"
        ? "var(--nb-orange)20"
        : "var(--nb-orange)20"};
  color: ${(props) =>
    props.status === "Paid"
      ? "var(--nb-blue)"
      : props.status === "Pending"
        ? "var(--nb-orange)"
        : "var(--nb-orange)"};
`;

const BillRetailer = styled.div`
  font-size: 1.2rem;
  color: var(--nb-blue);
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
  color: var(--nb-ink);
`;

const DetailValue = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--nb-ink);
`;

const BillIcon = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  color: var(--nb-muted);
  font-size: 3rem;
  z-index: 0;
`;

const EmptyMessage = styled.p`
  font-size: 1rem;
  color: var(--nb-ink);
  margin: 20px 0;
`;

const SuccessContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 16px;
  text-align: center;
  width: 100%;
`;

const SuccessIcon = styled.div`
  color: #22c55e;
  margin-bottom: 16px;
`;

const SuccessTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--nb-ink);
  margin: 0 0 12px;
`;

const SuccessDetail = styled.p`
  font-size: 0.95rem;
  color: var(--nb-ink);
  margin: 4px 0;
`;

const ReceiptButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 24px;
  width: 100%;
  max-width: 280px;
`;

const PreviewFrame = styled.iframe`
  width: 100%;
  height: 260px;
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  margin-top: 16px;
  background: #f5f5f5;
`;

const PreviewPlaceholder = styled.div`
  width: 100%;
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--nb-muted);
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  margin-top: 16px;
  font-size: 0.85rem;
  color: var(--nb-ink);
`;

const DownloadReceiptButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 20px;
  background-color: ${(props) => (props.disabled ? "var(--nb-border)" : "#dc2626")};
  color: var(--nb-white);
  border: none;
  border-radius: 6px;
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};
  font-size: 0.9rem;
  font-weight: 600;
  transition: opacity 0.2s;

  &:hover:not(:disabled) {
    opacity: 0.85;
  }
`;

const CustomerSearchContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--nb-border);
  border-radius: 4px;
  padding: 8px 12px;
  margin-bottom: 12px;
  background-color: var(--nb-white);

  &:focus-within {
    border-color: var(--nb-blue);
  }
`;

const CustomerSearchInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  font-size: 0.9rem;
  background: transparent;
`;

const PreviewModal = styled.div`
  background: var(--nb-white);
  border-radius: 8px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--nb-shadow-md);
`;

const PreviewHint = styled.p`
  font-size: 0.8rem;
  color: var(--nb-ink);
  background: var(--nb-muted);
  border-radius: 4px;
  padding: 8px 12px;
  margin-bottom: 10px;

  code {
    font-family: monospace;
    background: var(--nb-border);
    padding: 1px 4px;
    border-radius: 3px;
  }
`;

const PdfErrorText = styled.p`
  color: #dc2626;
  font-size: 0.8rem;
  margin: 4px 0 0;
  text-align: center;
`;

const PreviewReceiptButton = styled.button`
  display: flex;
  align-items: center;
  padding: 8px 14px;
  background: transparent;
  color: var(--nb-blue);
  border: 1px solid var(--nb-blue);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: background 0.2s;

  &:hover {
    background: var(--nb-muted);
  }
`;

// ── WhatsApp Progress Modal Styles ───────────────────────────────────────────
const waSpin = keyframes`
  to { transform: rotate(360deg); }
`;

const WaProgressOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
`;

const WaProgressCard = styled.div`
  background: #fff;
  border-radius: 16px;
  padding: 2rem 2.4rem;
  width: 360px;
  max-width: 92vw;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
`;

const WaProgressTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  color: #111;
  font-weight: 700;
  text-align: center;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid #f0f0f0;
`;

const WaStep = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  opacity: ${(p) => (p.status === "waiting" ? 0.4 : 1)};
  transition: opacity 0.3s;
`;

const WaStepIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  flex-shrink: 0;
  background: ${(p) =>
    p.status === "done"
      ? "#dcfce7"
      : p.status === "error"
        ? "#fee2e2"
        : p.status === "loading"
          ? "#eff6ff"
          : "#f3f4f6"};
  color: ${(p) =>
    p.status === "done"
      ? "#16a34a"
      : p.status === "error"
        ? "#dc2626"
        : p.status === "loading"
          ? "#2563eb"
          : "#9ca3af"};
`;

const WaSpinner = styled.div`
  width: 14px;
  height: 14px;
  border: 2px solid #bfdbfe;
  border-top-color: #2563eb;
  border-radius: 50%;
  animation: ${waSpin} 0.7s linear infinite;
`;

const WaStepText = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 4px;

  strong {
    font-size: 0.9rem;
    color: #111;
  }
  span {
    font-size: 0.78rem;
    color: #666;
  }
`;

const WaResultBanner = styled.div`
  border-radius: 10px;
  padding: 0.8rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  text-align: center;
  background: ${(p) =>
    p.result === "success"
      ? "#dcfce7"
      : p.result === "no_phone"
        ? "#fef9c3"
        : "#fee2e2"};
  color: ${(p) =>
    p.result === "success"
      ? "#15803d"
      : p.result === "no_phone"
        ? "#92400e"
        : "#991b1b"};
`;

const WaCloseBtn = styled.button`
  align-self: center;
  padding: 0.5rem 2rem;
  background: #1a73e8;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: #1558b0;
  }
`;

export default BillAssignedToday;
