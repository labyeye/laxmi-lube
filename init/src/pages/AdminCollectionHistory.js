import React, { useState, useEffect } from "react";
import axios from "axios";
import { fmtDate } from "../utils/dateFormat";
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
  FaDownload,
  FaEdit,
} from "react-icons/fa";
import { jsPDF } from "jspdf";
import Layout from "../components/Layout";

const AdminCollectionHistory = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState(
    () => localStorage.getItem("adminColl_search") || "",
  );
  const [startDate, setStartDate] = useState(
    () => localStorage.getItem("adminColl_startDate") || "",
  );
  const [endDate, setEndDate] = useState(
    () => localStorage.getItem("adminColl_endDate") || "",
  );
  const [verificationFilter, setVerificationFilter] = useState(
    () => localStorage.getItem("adminColl_verifFilter") || "",
  );
  const [paymentModeFilter, setPaymentModeFilter] = useState(
    () => localStorage.getItem("adminColl_paymentFilter") || "",
  );
  const [viewGroup, setViewGroup] = useState(null); // array of collections shown in modal
  const [expandedGroups, setExpandedGroups] = useState({});
  const [zoomImage, setZoomImage] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [verifyRemarks, setVerifyRemarks] = useState({}); // { [groupKey]: string }
  const [lastFiveDigits, setLastFiveDigits] = useState("");
  const [digitMatchResult, setDigitMatchResult] = useState(null); // "verified" | "not_verified" | null
  const [forceVerifyQueue, setForceVerifyQueue] = useState([]); // bills that didn't match, awaiting force-confirm
  const [editCollection, setEditCollection] = useState(null); // single collection being edited
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editGroup, setEditGroup] = useState(null); // group (array) being edited together
  const [editGroupForm, setEditGroupForm] = useState({
    paymentMode: "Cash",
    collectedOn: "",
    remarks: "",
    transactionId: "",
    upiId: "",
    chequeNumber: "",
    bankName: "",
    receiptNumber: "",
  });
  const [editGroupAmounts, setEditGroupAmounts] = useState({}); // { [collectionId]: amount }
  const [editGroupSaving, setEditGroupSaving] = useState(false);
  const [editGroupError, setEditGroupError] = useState("");

  const fetchCollections = async () => {
    try {
      setLoading(true);
      setError("");

      let url = "http://localhost:1200/api/collections";
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

  const formatDate = fmtDate;

  const formatCurrency = (amount) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);

  const generateCollectionPDF = (group, remarkText) => {
    const doc = new jsPDF();
    const first = group[0];
    const totalAmount = group.reduce((sum, c) => sum + c.amountCollected, 0);

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Collection Verification Receipt", 105, 20, { align: "center" });
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 26, 190, 26);

    doc.setFontSize(10);
    let y = 36;
    const addRow = (label, value) => {
      doc.setFont("helvetica", "bold");
      doc.text(`${label}:`, 20, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(value || "-"), 75, y);
      y += 8;
    };
    addRow("Retailer", first.bill?.retailer);
    addRow("Payment Mode", first.paymentMode);
    addRow("Collected On", formatDate(first.collectedOn));
    addRow("Collected By", first.collectedBy?.name);
    addRow("Total Amount", formatCurrency(totalAmount));
    addRow("Verification Status", "Verified");

    y += 2;
    doc.line(20, y, 190, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text("Bills:", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    group.forEach((c) => {
      doc.text(
        `  Bill #${c.bill?.billNumber}  –  ${formatCurrency(c.amountCollected)}`,
        20,
        y,
      );
      y += 7;
    });

    if (remarkText) {
      y += 4;
      doc.line(20, y, 190, y);
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.text("Verification Remarks:", 20, y);
      y += 7;
      doc.setFont("helvetica", "normal");
      doc.text(doc.splitTextToSize(remarkText, 160), 20, y);
    }

    const fileName =
      group.length > 1
        ? `collection-receipt-group-${first.bill?.billNumber}.pdf`
        : `collection-receipt-${first.bill?.billNumber}.pdf`;
    doc.save(fileName);
  };

  const filteredCollections = collections.filter((collection) => {
    // Verified collections are shown in Approved Collections page
    if (collection.verificationStatus === "verified") return false;
    const matchesSearch =
      !searchTerm ||
      collection.bill?.billNumber?.toString().includes(searchTerm) ||
      collection.bill?.retailer
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesVerification =
      !verificationFilter ||
      collection.verificationStatus === verificationFilter;
    const matchesPayment =
      !paymentModeFilter ||
      collection.paymentMode?.toLowerCase() === paymentModeFilter.toLowerCase();
    return matchesSearch && matchesVerification && matchesPayment;
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

  const handleVerify = async (collectionId, status, digits) => {
    setVerifyingId(collectionId);
    const groupKey = viewGroup
      ? viewGroup[0].paymentGroupId || viewGroup[0]._id
      : collectionId;
    const remarkText = verifyRemarks[groupKey] || "";
    try {
      const body = { status, remarks: remarkText };
      if (digits) body.lastFiveDigits = digits;
      const res = await axios.patch(
        `http://localhost:1200/api/collections/${collectionId}/verify`,
        body,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      const resolved = res.data.matchResult || res.data.verificationStatus;
      setCollections((prev) =>
        prev.map((c) => (c._id === collectionId ? { ...c, ...res.data } : c)),
      );
      const updatedGroup = viewGroup
        ? viewGroup.map((c) =>
            c._id === collectionId ? { ...c, ...res.data } : c,
          )
        : null;
      setViewGroup(updatedGroup);
      if (resolved === "verified" && updatedGroup) {
        const allVerified = updatedGroup.every(
          (c) => c.verificationStatus === "verified",
        );
        if (allVerified) generateCollectionPDF(updatedGroup, remarkText);
      }
      return resolved;
    } catch (err) {
      console.error("Verification update failed:", err);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleVerifyAll = async () => {
    if (!viewGroup) return;
    const pending = viewGroup.filter(
      (c) =>
        c.verificationStatus === "pending" ||
        c.verificationStatus === "not_verified",
    );
    if (pending.length === 0) return;
    const digits = lastFiveDigits.trim();
    const mode = (viewGroup[0].paymentMode || "").toLowerCase();
    if (mode !== "cash" && digits.length === 0) return;

    setVerifyingId("__group__");
    setForceVerifyQueue([]);
    const notMatched = [];
    for (const c of pending) {
      // Cash: always force-verified with no digit check
      const result = await handleVerify(
        c._id,
        "verified",
        mode === "cash" ? undefined : digits || undefined,
      );
      if (result === "not_verified") notMatched.push(c._id);
    }
    if (notMatched.length > 0) {
      setForceVerifyQueue(notMatched);
      setDigitMatchResult("not_verified");
    } else {
      setDigitMatchResult("verified");
    }
    setVerifyingId(null);
  };

  const handleForceVerifyAll = async () => {
    if (forceVerifyQueue.length === 0) return;
    setVerifyingId("__force__");
    for (const id of forceVerifyQueue) {
      await handleVerify(id, "verified", undefined);
    }
    setForceVerifyQueue([]);
    setDigitMatchResult("verified");
    setVerifyingId(null);
  };

  const openEditGroupModal = (members) => {
    const first = members[0];
    const pd = first.paymentDetails || {};
    setEditGroup(members);
    setEditGroupError("");
    setEditGroupForm({
      paymentMode: first.paymentMode || "Cash",
      collectedOn: first.collectedOn
        ? new Date(first.collectedOn).toISOString().slice(0, 16)
        : "",
      remarks: first.remarks || "",
      transactionId:
        pd.transactionId || pd.upiTransactionId || pd.bankTransactionId || "",
      upiId: pd.upiId || "",
      chequeNumber: pd.chequeNumber || pd.chequeNo || "",
      bankName: pd.bankName || "",
      receiptNumber: pd.receiptNumber || "",
    });
    const amounts = {};
    members.forEach((m) => {
      amounts[m._id] = m.amountCollected || "";
    });
    setEditGroupAmounts(amounts);
  };

  const handleEditGroupSave = async () => {
    if (!editGroup) return;
    setEditGroupSaving(true);
    setEditGroupError("");
    try {
      const mode = editGroupForm.paymentMode;
      let paymentDetails = {};
      if (mode === "upi")
        paymentDetails = {
          transactionId: editGroupForm.transactionId,
          upiId: editGroupForm.upiId,
        };
      else if (mode === "cheque")
        paymentDetails = {
          chequeNumber: editGroupForm.chequeNumber,
          bankName: editGroupForm.bankName,
        };
      else if (mode === "bank_transfer")
        paymentDetails = {
          transactionId: editGroupForm.transactionId,
          bankName: editGroupForm.bankName,
        };
      else if (mode === "Cash")
        paymentDetails = { receiptNumber: editGroupForm.receiptNumber };

      const token = localStorage.getItem("token");
      await Promise.all(
        editGroup.map((m) =>
          axios.put(
            `https://backend.laxmilube.in/api/collections/${m._id}`,
            {
              amountCollected: Number(editGroupAmounts[m._id]),
              paymentMode: mode,
              paymentDetails,
              remarks: editGroupForm.remarks,
              collectedOn: editGroupForm.collectedOn,
            },
            { headers: { Authorization: `Bearer ${token}` } },
          ),
        ),
      );
      setEditGroup(null);
      await fetchCollections();
    } catch (err) {
      setEditGroupError(
        err.response?.data?.message || "Failed to save changes",
      );
    } finally {
      setEditGroupSaving(false);
    }
  };

  const openEditModal = (collection) => {
    setEditCollection(collection);
    setEditError("");
    // Pre-fill form with current values
    const pd = collection.paymentDetails || {};
    setEditForm({
      amountCollected: collection.amountCollected || "",
      paymentMode: collection.paymentMode || "Cash",
      collectedOn: collection.collectedOn
        ? new Date(collection.collectedOn).toISOString().slice(0, 16)
        : "",
      remarks: collection.remarks || "",
      // payment detail fields
      transactionId:
        pd.transactionId || pd.upiTransactionId || pd.bankTransactionId || "",
      upiId: pd.upiId || "",
      chequeNumber: pd.chequeNumber || pd.chequeNo || "",
      bankName: pd.bankName || "",
      receiptNumber: pd.receiptNumber || "",
    });
  };

  const handleEditSave = async () => {
    if (!editCollection) return;
    setEditSaving(true);
    setEditError("");
    try {
      const mode = editForm.paymentMode;
      let paymentDetails = {};
      if (mode === "upi") {
        paymentDetails = {
          transactionId: editForm.transactionId,
          upiId: editForm.upiId,
        };
      } else if (mode === "cheque") {
        paymentDetails = {
          chequeNumber: editForm.chequeNumber,
          bankName: editForm.bankName,
        };
      } else if (mode === "bank_transfer") {
        paymentDetails = {
          transactionId: editForm.transactionId,
          bankName: editForm.bankName,
        };
      } else if (mode === "Cash") {
        paymentDetails = { receiptNumber: editForm.receiptNumber };
      }

      await axios.put(
        `http://localhost:1200/api/collections/${editCollection._id}`,
        {
          amountCollected: Number(editForm.amountCollected),
          paymentMode: mode,
          paymentDetails,
          remarks: editForm.remarks,
          collectedOn: editForm.collectedOn,
        },
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      setEditCollection(null);
      await fetchCollections();
    } catch (err) {
      setEditError(err.response?.data?.message || "Failed to save changes");
    } finally {
      setEditSaving(false);
    }
  };

  const verificationBadge = (status) => {
    if (status === "verified")
      return <VerifyBadge status="verified">Verified</VerifyBadge>;
    if (status === "not_verified")
      return <VerifyBadge status="not_verified">Not Verified</VerifyBadge>;
    return <VerifyBadge status="pending">Pending</VerifyBadge>;
  };

  const activeGroupKey = viewGroup
    ? viewGroup[0].paymentGroupId || viewGroup[0]._id
    : null;
  const allGroupVerified = viewGroup
    ? viewGroup.every((c) => c.verificationStatus === "verified")
    : false;

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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  localStorage.setItem("adminColl_search", e.target.value);
                }}
              />
            </SearchBox>
            <DateBox>
              <FaCalendarAlt />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  localStorage.setItem("adminColl_startDate", e.target.value);
                }}
              />
            </DateBox>
            <DateBox>
              <FaCalendarAlt />
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  localStorage.setItem("adminColl_endDate", e.target.value);
                }}
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
                <tr>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th></th>
                  <th>
                    <FilterSelect
                      value={paymentModeFilter}
                      onChange={(e) => {
                        setPaymentModeFilter(e.target.value);
                        localStorage.setItem(
                          "adminColl_paymentFilter",
                          e.target.value,
                        );
                      }}
                    >
                      <option value="">All Modes</option>
                      <option value="Cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cheque">Cheque</option>
                    </FilterSelect>
                  </th>
                  <th></th>
                  <th></th>
                  <th>
                    <FilterSelect
                      value={verificationFilter}
                      onChange={(e) => {
                        setVerificationFilter(e.target.value);
                        localStorage.setItem(
                          "adminColl_verifFilter",
                          e.target.value,
                        );
                      }}
                    >
                      <option value="">All Status</option>
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="not_verified">Not Verified</option>
                    </FilterSelect>
                  </th>
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
                          {verificationBadge(
                            row.isGroup
                              ? row.members.every(
                                  (m) => m.verificationStatus === "verified",
                                )
                                ? "verified"
                                : row.members.some(
                                      (m) =>
                                        m.verificationStatus === "not_verified",
                                    )
                                  ? "not_verified"
                                  : "pending"
                              : first.verificationStatus,
                          )}
                        </td>
                        <td>
                          <ActionBtns>
                            <EyeBtn
                              title="View details"
                              onClick={() => {
                                setViewGroup(row.members);
                                setLastFiveDigits("");
                                setDigitMatchResult(null);
                                setForceVerifyQueue([]);
                              }}
                            >
                              <FaEye />
                            </EyeBtn>
                            <EditBtn
                              title="Edit collection"
                              onClick={() =>
                                row.isGroup
                                  ? openEditGroupModal(row.members)
                                  : openEditModal(first)
                              }
                            >
                              <FaEdit />
                            </EditBtn>
                            {(row.isGroup
                              ? row.members.every(
                                  (m) => m.verificationStatus === "verified",
                                )
                              : first.verificationStatus === "verified") && (
                              <EyeBtn
                                title="Download PDF"
                                onClick={() =>
                                  generateCollectionPDF(
                                    row.members,
                                    row.members[0].verificationRemarks || "",
                                  )
                                }
                              >
                                <FaDownload />
                              </EyeBtn>
                            )}
                          </ActionBtns>
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
                              <ActionBtns>
                                <EyeBtn
                                  title="View bill"
                                  onClick={() => {
                                    setViewGroup([m]);
                                    setLastFiveDigits("");
                                    setDigitMatchResult(null);
                                    setForceVerifyQueue([]);
                                  }}
                                >
                                  <FaEye />
                                </EyeBtn>
                                <EditBtn
                                  title="Edit collection"
                                  onClick={() => openEditModal(m)}
                                >
                                  <FaEdit />
                                </EditBtn>
                                {m.verificationStatus === "verified" && (
                                  <EyeBtn
                                    title="Download PDF"
                                    onClick={() =>
                                      generateCollectionPDF(
                                        [m],
                                        m.verificationRemarks || "",
                                      )
                                    }
                                  >
                                    <FaDownload />
                                  </EyeBtn>
                                )}
                              </ActionBtns>
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
            {(searchTerm ||
              startDate ||
              endDate ||
              verificationFilter ||
              paymentModeFilter) && (
              <ClearFiltersBtn
                onClick={() => {
                  setSearchTerm("");
                  setStartDate("");
                  setEndDate("");
                  setVerificationFilter("");
                  setPaymentModeFilter("");
                  localStorage.removeItem("adminColl_search");
                  localStorage.removeItem("adminColl_startDate");
                  localStorage.removeItem("adminColl_endDate");
                  localStorage.removeItem("adminColl_verifFilter");
                  localStorage.removeItem("adminColl_paymentFilter");
                  fetchCollections();
                }}
              >
                Clear all filters
              </ClearFiltersBtn>
            )}
          </EmptyState>
        )}
      </PageContainer>

      {viewGroup && (
        <ModalOverlay
          onClick={() => {
            setViewGroup(null);
            setLastFiveDigits("");
            setDigitMatchResult(null);
            setForceVerifyQueue([]);
          }}
        >
          <DetailModal onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h3>
                Collection Details
                {viewGroup.length > 1 ? ` (${viewGroup.length} bills)` : ""}
              </h3>
              <CloseBtn
                onClick={() => {
                  setViewGroup(null);
                  setLastFiveDigits("");
                  setDigitMatchResult(null);
                  setForceVerifyQueue([]);
                }}
              >
                ×
              </CloseBtn>
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
                <DetailLabel>Bills</DetailLabel>
                {viewGroup.map((c) => (
                  <BillVerifyRow key={c._id}>
                    <BillVerifyTopLine>
                      <div>
                        <strong>#{c.bill?.billNumber}</strong>{" "}
                        <span>{formatCurrency(c.amountCollected)}</span>
                        <div>{verificationBadge(c.verificationStatus)}</div>
                      </div>
                    </BillVerifyTopLine>
                  </BillVerifyRow>
                ))}

                {viewGroup.some((c) => c.verificationStatus === "pending") && (
                  <DigitVerifyBox>
                    {(viewGroup[0].paymentMode || "").toLowerCase() !==
                    "cash" ? (
                      <>
                        <DigitVerifyLabel>
                          Enter last 5 digits of{" "}
                          {(viewGroup[0].paymentMode || "").toLowerCase() ===
                          "upi"
                            ? "UTR / Transaction ID"
                            : (viewGroup[0].paymentMode || "").toLowerCase() ===
                                "cheque"
                              ? "Cheque Number"
                              : "Transaction ID"}
                        </DigitVerifyLabel>
                        <DigitVerifyRow>
                          <DigitInput
                            type="text"
                            maxLength={5}
                            placeholder="e.g. 43210"
                            value={lastFiveDigits}
                            onChange={(e) => {
                              setLastFiveDigits(
                                e.target.value.replace(/[^a-zA-Z0-9]/g, ""),
                              );
                              setDigitMatchResult(null);
                            }}
                          />
                          <VerifyAllBtn
                            onClick={handleVerifyAll}
                            disabled={
                              verifyingId === "__group__" ||
                              lastFiveDigits.trim().length === 0
                            }
                          >
                            {verifyingId === "__group__" ? (
                              "Verifying…"
                            ) : (
                              <>
                                <FaCheckCircle /> Verify
                              </>
                            )}
                          </VerifyAllBtn>
                        </DigitVerifyRow>
                      </>
                    ) : (
                      <DigitVerifyRow>
                        <VerifyAllBtn
                          onClick={handleVerifyAll}
                          disabled={verifyingId === "__group__"}
                        >
                          {verifyingId === "__group__" ? (
                            "Verifying…"
                          ) : (
                            <>
                              <FaCheckCircle /> Mark as Verified
                            </>
                          )}
                        </VerifyAllBtn>
                      </DigitVerifyRow>
                    )}
                    {digitMatchResult === "verified" &&
                      forceVerifyQueue.length === 0 && (
                        <MatchResultBadge $match={true}>
                          {(viewGroup[0].paymentMode || "").toLowerCase() ===
                          "cash"
                            ? "✓ Marked as Verified"
                            : "✓ Digits matched — All Verified"}
                        </MatchResultBadge>
                      )}
                    {forceVerifyQueue.length > 0 && (
                      <ForceConfirmBox>
                        <ForceConfirmText>
                          ⚠️ {forceVerifyQueue.length} bill
                          {forceVerifyQueue.length > 1 ? "s" : ""} did not match
                          the digits. Do you still want to verify{" "}
                          {forceVerifyQueue.length > 1 ? "them" : "it"}?
                        </ForceConfirmText>
                        <ForceConfirmBtns>
                          <ForceYesBtn
                            onClick={handleForceVerifyAll}
                            disabled={verifyingId === "__force__"}
                          >
                            {verifyingId === "__force__"
                              ? "Verifying…"
                              : "Yes, Verify Anyway"}
                          </ForceYesBtn>
                          <ForceNoBtn onClick={() => setForceVerifyQueue([])}>
                            Cancel
                          </ForceNoBtn>
                        </ForceConfirmBtns>
                      </ForceConfirmBox>
                    )}
                  </DigitVerifyBox>
                )}
                <RemarksInput
                  placeholder="Add a collection remark (optional)..."
                  value={
                    verifyRemarks[activeGroupKey] !== undefined
                      ? verifyRemarks[activeGroupKey]
                      : viewGroup[0].verificationRemarks || ""
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    setVerifyRemarks((prev) => ({
                      ...prev,
                      [activeGroupKey]: val,
                    }));
                    // Auto-fill last 5 digits only for non-cash payments
                    if (
                      (viewGroup[0].paymentMode || "").toLowerCase() !== "cash"
                    ) {
                      const last5 = val
                        .replace(/[^a-zA-Z0-9]/g, "")
                        .slice(-5)
                        .toUpperCase();
                      setLastFiveDigits(last5);
                      setDigitMatchResult(null);
                    }
                  }}
                  maxLength={300}
                />
                {allGroupVerified && viewGroup[0].verificationRemarks && (
                  <SavedRemark>
                    Saved remark: "{viewGroup[0].verificationRemarks}"
                  </SavedRemark>
                )}
                {allGroupVerified && (
                  <DownloadPdfBtn
                    onClick={() =>
                      generateCollectionPDF(
                        viewGroup,
                        verifyRemarks[activeGroupKey] ||
                          viewGroup[0].verificationRemarks ||
                          "",
                      )
                    }
                  >
                    <FaDownload /> Download PDF
                  </DownloadPdfBtn>
                )}
              </BillsSection>

              {viewGroup[0].location?.lat && (
                <LocationSection>
                  <DetailLabel>Collection Location</DetailLabel>
                  <LocationLink
                    href={`https://www.google.com/maps?q=${viewGroup[0].location.lat},${viewGroup[0].location.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    📍 View on Google Maps
                    {viewGroup[0].location.accuracy && (
                      <span>
                        {" "}
                        (±{Math.round(viewGroup[0].location.accuracy)}m)
                      </span>
                    )}
                  </LocationLink>
                  <LocationCoords>
                    {viewGroup[0].location.lat.toFixed(6)},{" "}
                    {viewGroup[0].location.lng.toFixed(6)}
                    {viewGroup[0].location.recordedAt && (
                      <>
                        {" "}
                        ·{" "}
                        {new Date(
                          viewGroup[0].location.recordedAt,
                        ).toLocaleTimeString("en-IN", {
                          timeZone: "Asia/Kolkata",
                        })}
                      </>
                    )}
                  </LocationCoords>
                </LocationSection>
              )}

              {viewGroup[0].screenshotPath ? (
                <SSSection>
                  <DetailLabel>Payment Screenshot</DetailLabel>
                  <SSImageWrap
                    onClick={() =>
                      setZoomImage(
                        `http://localhost:1200/${viewGroup[0].screenshotPath.replace(/\\/g, "/")}`,
                      )
                    }
                  >
                    <SSImage
                      src={`http://localhost:1200/${viewGroup[0].screenshotPath.replace(/\\/g, "/")}`}
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

      {/* Edit Collection Modal */}
      {editCollection && (
        <EditOverlay onClick={() => setEditCollection(null)}>
          <EditModal onClick={(e) => e.stopPropagation()}>
            <EditModalHeader>
              <h3>Edit Collection — #{editCollection.bill?.billNumber}</h3>
              <CloseBtn onClick={() => setEditCollection(null)}>×</CloseBtn>
            </EditModalHeader>
            <EditModalBody>
              <EditFieldRow>
                <EditLabel>Amount Collected (₹)</EditLabel>
                <EditInput
                  type="number"
                  min="1"
                  value={editForm.amountCollected}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      amountCollected: e.target.value,
                    }))
                  }
                />
              </EditFieldRow>

              <EditFieldRow>
                <EditLabel>Payment Mode</EditLabel>
                <EditSelect
                  value={editForm.paymentMode}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, paymentMode: e.target.value }))
                  }
                >
                  <option value="Cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </EditSelect>
              </EditFieldRow>

              {editForm.paymentMode === "upi" && (
                <>
                  <EditFieldRow>
                    <EditLabel>Transaction / UTR ID</EditLabel>
                    <EditInput
                      value={editForm.transactionId}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          transactionId: e.target.value,
                        }))
                      }
                    />
                  </EditFieldRow>
                  <EditFieldRow>
                    <EditLabel>UPI ID</EditLabel>
                    <EditInput
                      value={editForm.upiId}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, upiId: e.target.value }))
                      }
                    />
                  </EditFieldRow>
                </>
              )}
              {editForm.paymentMode === "cheque" && (
                <>
                  <EditFieldRow>
                    <EditLabel>Cheque Number</EditLabel>
                    <EditInput
                      value={editForm.chequeNumber}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          chequeNumber: e.target.value,
                        }))
                      }
                    />
                  </EditFieldRow>
                  <EditFieldRow>
                    <EditLabel>Bank Name</EditLabel>
                    <EditInput
                      value={editForm.bankName}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, bankName: e.target.value }))
                      }
                    />
                  </EditFieldRow>
                </>
              )}
              {editForm.paymentMode === "bank_transfer" && (
                <>
                  <EditFieldRow>
                    <EditLabel>Transaction ID</EditLabel>
                    <EditInput
                      value={editForm.transactionId}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          transactionId: e.target.value,
                        }))
                      }
                    />
                  </EditFieldRow>
                  <EditFieldRow>
                    <EditLabel>Bank Name</EditLabel>
                    <EditInput
                      value={editForm.bankName}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, bankName: e.target.value }))
                      }
                    />
                  </EditFieldRow>
                </>
              )}
              {editForm.paymentMode === "Cash" && (
                <EditFieldRow>
                  <EditLabel>Receipt Number</EditLabel>
                  <EditInput
                    value={editForm.receiptNumber}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        receiptNumber: e.target.value,
                      }))
                    }
                  />
                </EditFieldRow>
              )}

              <EditFieldRow>
                <EditLabel>Collection Date &amp; Time</EditLabel>
                <EditInput
                  type="datetime-local"
                  value={editForm.collectedOn}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, collectedOn: e.target.value }))
                  }
                />
              </EditFieldRow>

              <EditFieldRow>
                <EditLabel>Remarks</EditLabel>
                <EditTextarea
                  rows={2}
                  value={editForm.remarks}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, remarks: e.target.value }))
                  }
                />
              </EditFieldRow>

              {editError && <EditErrorMsg>{editError}</EditErrorMsg>}
            </EditModalBody>
            <EditModalFooter>
              <EditCancelBtn onClick={() => setEditCollection(null)}>
                Cancel
              </EditCancelBtn>
              <EditSaveBtn onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? "Saving…" : "Save Changes"}
              </EditSaveBtn>
            </EditModalFooter>
          </EditModal>
        </EditOverlay>
      )}

      {/* Edit Group Modal — shared fields + per-bill amounts */}
      {editGroup && (
        <EditOverlay onClick={() => setEditGroup(null)}>
          <EditModal onClick={(e) => e.stopPropagation()}>
            <EditModalHeader>
              <h3>Edit Group ({editGroup.length} bills)</h3>
              <CloseBtn onClick={() => setEditGroup(null)}>×</CloseBtn>
            </EditModalHeader>
            <EditModalBody>
              {/* Per-bill amounts */}
              <EditGroupSection>
                <EditGroupSectionTitle>Amount per Bill</EditGroupSectionTitle>
                {editGroup.map((m) => (
                  <EditFieldRow key={m._id}>
                    <EditLabel>
                      #{m.bill?.billNumber} — {m.bill?.retailer}
                    </EditLabel>
                    <EditInput
                      type="number"
                      min="1"
                      value={editGroupAmounts[m._id] ?? ""}
                      onChange={(e) =>
                        setEditGroupAmounts((p) => ({
                          ...p,
                          [m._id]: e.target.value,
                        }))
                      }
                    />
                  </EditFieldRow>
                ))}
              </EditGroupSection>

              {/* Shared fields */}
              <EditGroupSection>
                <EditGroupSectionTitle>
                  Shared Details (applied to all bills)
                </EditGroupSectionTitle>
                <EditFieldRow>
                  <EditLabel>Payment Mode</EditLabel>
                  <EditSelect
                    value={editGroupForm.paymentMode}
                    onChange={(e) =>
                      setEditGroupForm((p) => ({
                        ...p,
                        paymentMode: e.target.value,
                      }))
                    }
                  >
                    <option value="Cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="cheque">Cheque</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </EditSelect>
                </EditFieldRow>

                {editGroupForm.paymentMode === "upi" && (
                  <>
                    <EditFieldRow>
                      <EditLabel>Transaction / UTR ID</EditLabel>
                      <EditInput
                        value={editGroupForm.transactionId}
                        onChange={(e) =>
                          setEditGroupForm((p) => ({
                            ...p,
                            transactionId: e.target.value,
                          }))
                        }
                      />
                    </EditFieldRow>
                    <EditFieldRow>
                      <EditLabel>UPI ID</EditLabel>
                      <EditInput
                        value={editGroupForm.upiId}
                        onChange={(e) =>
                          setEditGroupForm((p) => ({
                            ...p,
                            upiId: e.target.value,
                          }))
                        }
                      />
                    </EditFieldRow>
                  </>
                )}
                {editGroupForm.paymentMode === "cheque" && (
                  <>
                    <EditFieldRow>
                      <EditLabel>Cheque Number</EditLabel>
                      <EditInput
                        value={editGroupForm.chequeNumber}
                        onChange={(e) =>
                          setEditGroupForm((p) => ({
                            ...p,
                            chequeNumber: e.target.value,
                          }))
                        }
                      />
                    </EditFieldRow>
                    <EditFieldRow>
                      <EditLabel>Bank Name</EditLabel>
                      <EditInput
                        value={editGroupForm.bankName}
                        onChange={(e) =>
                          setEditGroupForm((p) => ({
                            ...p,
                            bankName: e.target.value,
                          }))
                        }
                      />
                    </EditFieldRow>
                  </>
                )}
                {editGroupForm.paymentMode === "bank_transfer" && (
                  <>
                    <EditFieldRow>
                      <EditLabel>Transaction ID</EditLabel>
                      <EditInput
                        value={editGroupForm.transactionId}
                        onChange={(e) =>
                          setEditGroupForm((p) => ({
                            ...p,
                            transactionId: e.target.value,
                          }))
                        }
                      />
                    </EditFieldRow>
                    <EditFieldRow>
                      <EditLabel>Bank Name</EditLabel>
                      <EditInput
                        value={editGroupForm.bankName}
                        onChange={(e) =>
                          setEditGroupForm((p) => ({
                            ...p,
                            bankName: e.target.value,
                          }))
                        }
                      />
                    </EditFieldRow>
                  </>
                )}
                {editGroupForm.paymentMode === "Cash" && (
                  <EditFieldRow>
                    <EditLabel>Receipt Number</EditLabel>
                    <EditInput
                      value={editGroupForm.receiptNumber}
                      onChange={(e) =>
                        setEditGroupForm((p) => ({
                          ...p,
                          receiptNumber: e.target.value,
                        }))
                      }
                    />
                  </EditFieldRow>
                )}

                <EditFieldRow>
                  <EditLabel>Collection Date &amp; Time</EditLabel>
                  <EditInput
                    type="datetime-local"
                    value={editGroupForm.collectedOn}
                    onChange={(e) =>
                      setEditGroupForm((p) => ({
                        ...p,
                        collectedOn: e.target.value,
                      }))
                    }
                  />
                </EditFieldRow>

                <EditFieldRow>
                  <EditLabel>Remarks</EditLabel>
                  <EditTextarea
                    rows={2}
                    value={editGroupForm.remarks}
                    onChange={(e) =>
                      setEditGroupForm((p) => ({
                        ...p,
                        remarks: e.target.value,
                      }))
                    }
                  />
                </EditFieldRow>
              </EditGroupSection>

              {editGroupError && <EditErrorMsg>{editGroupError}</EditErrorMsg>}
            </EditModalBody>
            <EditModalFooter>
              <EditCancelBtn onClick={() => setEditGroup(null)}>
                Cancel
              </EditCancelBtn>
              <EditSaveBtn
                onClick={handleEditGroupSave}
                disabled={editGroupSaving}
              >
                {editGroupSaving ? "Saving…" : "Save All"}
              </EditSaveBtn>
            </EditModalFooter>
          </EditModal>
        </EditOverlay>
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
  background-color: ${(p) =>
    (VERIFY_COLORS[p.status] || VERIFY_COLORS.pending).bg};
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

const DigitVerifyBox = styled.div`
  margin-top: 12px;
  padding: 14px 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
`;

const DigitVerifyLabel = styled.div`
  font-size: 0.78rem;
  font-weight: 700;
  color: #475569;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
`;

const DigitVerifyRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const DigitInput = styled.input`
  width: 120px;
  padding: 8px 12px;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 4px;
  border: 2px solid #cbd5e1;
  border-radius: 8px;
  outline: none;
  text-align: center;
  text-transform: uppercase;
  transition: border-color 0.15s;
  &:focus {
    border-color: #3b82f6;
  }
`;

const VerifyAllBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  background: #1e293b;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
  &:hover:not(:disabled) {
    background: #334155;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MatchResultBadge = styled.div`
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 700;
  background: ${(p) => (p.$match ? "#dcfce7" : "#fee2e2")};
  color: ${(p) => (p.$match ? "#15803d" : "#991b1b")};
  border-left: 4px solid ${(p) => (p.$match ? "#22c55e" : "#ef4444")};
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

const FilterSelect = styled.select`
  border: 1px solid var(--nb-border);
  border-radius: 4px;
  padding: 3px 6px;
  font-size: 0.72rem;
  color: var(--nb-ink);
  background: var(--nb-white);
  cursor: pointer;
  outline: none;
  width: 100%;

  &:focus {
    border-color: var(--nb-blue);
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

const ClearFiltersBtn = styled.button`
  margin-top: 0.75rem;
  padding: 0.4rem 1rem;
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  background: var(--nb-white);
  color: var(--nb-blue);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: var(--nb-muted);
  }
`;

const DownloadPdfBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.85rem;
  border-radius: 6px;
  border: 1px solid var(--nb-blue);
  background: var(--nb-white);
  color: var(--nb-blue);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 0.25rem;

  &:hover {
    background: var(--nb-muted);
  }
`;

const ActionBtns = styled.div`
  display: flex;
  gap: 4px;
  align-items: center;
`;

const LocationSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  border-top: 1px solid var(--nb-border);
  padding-top: 0.75rem;
  margin-bottom: 0.75rem;
`;

const LocationLink = styled.a`
  font-size: 0.85rem;
  font-weight: 600;
  color: #1d6ed8;
  text-decoration: none;
  span {
    font-weight: 400;
    color: #6b7280;
    font-size: 0.78rem;
  }
  &:hover {
    text-decoration: underline;
  }
`;

const LocationCoords = styled.div`
  font-size: 0.75rem;
  color: #9ca3af;
  font-family: monospace;
`;

const ForceConfirmBox = styled.div`
  margin-top: 10px;
  padding: 12px 14px;
  background: #fffbeb;
  border: 1px solid #f59e0b;
  border-left: 4px solid #f59e0b;
  border-radius: 8px;
`;

const ForceConfirmText = styled.div`
  font-size: 0.83rem;
  font-weight: 600;
  color: #92400e;
  margin-bottom: 10px;
`;

const ForceConfirmBtns = styled.div`
  display: flex;
  gap: 8px;
`;

const ForceYesBtn = styled.button`
  padding: 7px 16px;
  background: #d97706;
  color: #fff;
  border: none;
  border-radius: 7px;
  font-size: 0.83rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
  &:hover:not(:disabled) {
    background: #b45309;
  }
  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const ForceNoBtn = styled.button`
  padding: 7px 16px;
  background: transparent;
  color: #6b7280;
  border: 1px solid #d1d5db;
  border-radius: 7px;
  font-size: 0.83rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  &:hover {
    background: #f3f4f6;
  }
`;

const EditOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
  padding: 1rem;
`;

const EditModal = styled.div`
  background: #fff;
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
`;

const EditModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #111827;
  }
`;

const EditModalBody = styled.div`
  padding: 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
`;

const EditModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid #e5e7eb;
`;

const EditFieldRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
`;

const EditLabel = styled.label`
  font-size: 0.8rem;
  font-weight: 600;
  color: #374151;
`;

const EditInput = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1.5px solid #d1d5db;
  border-radius: 7px;
  font-size: 0.9rem;
  color: #111827;
  outline: none;
  &:focus {
    border-color: #2563eb;
  }
`;

const EditSelect = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1.5px solid #d1d5db;
  border-radius: 7px;
  font-size: 0.9rem;
  color: #111827;
  outline: none;
  background: #fff;
  &:focus {
    border-color: #2563eb;
  }
`;

const EditTextarea = styled.textarea`
  padding: 0.5rem 0.75rem;
  border: 1.5px solid #d1d5db;
  border-radius: 7px;
  font-size: 0.9rem;
  color: #111827;
  resize: vertical;
  outline: none;
  &:focus {
    border-color: #2563eb;
  }
`;

const EditErrorMsg = styled.div`
  color: #dc2626;
  font-size: 0.82rem;
  padding: 0.5rem 0.75rem;
  background: #fef2f2;
  border-radius: 6px;
`;

const EditSaveBtn = styled.button`
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 7px;
  padding: 0.55rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  &:hover:not(:disabled) {
    background: #1d4ed8;
  }
`;

const EditCancelBtn = styled.button`
  background: #f3f4f6;
  color: #374151;
  border: none;
  border-radius: 7px;
  padding: 0.55rem 1.25rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  &:hover {
    background: #e5e7eb;
  }
`;

const EditGroupSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.85rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
`;

const EditGroupSectionTitle = styled.div`
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #6b7280;
`;

const EditBtn = styled.button`
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  padding: 5px 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  font-size: 0.8rem;
  &:hover {
    background: #dbeafe;
  }
`;

export default AdminCollectionHistory;
