import React, { useState, useEffect, useCallback } from "react";
import styled, { createGlobalStyle } from "styled-components";
import axios from "axios";
import { format } from "date-fns";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  FaStore,
  FaUserTie,
  FaWallet,
  FaFileAlt,
  FaPrint,
  FaSearch,
  FaSpinner,
  FaFilePdf,
  FaMoneyBillWave,
} from "react-icons/fa";
import Layout from "../components/Layout";

const API_BASE = "https://backend.laxmilube.in/api/reports";

const token = () => localStorage.getItem("token");
const auth = () => ({ headers: { Authorization: `Bearer ${token()}` } });

const fmt = (d) => (d ? format(new Date(d), "dd/MM/yyyy") : "—");

const INR = (n) =>
  "₹" +
  (Number(n) || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ─── Report type config ────────────────────────────────────────────────────
const REPORT_TYPES = [
  {
    id: "retailer",
    label: "Retailer Report",
    icon: <FaStore />,
    color: "#2563eb",
    desc: "Invoice-wise ledger for a selected retailer",
  },
  {
    id: "staff",
    label: "Staff Report",
    icon: <FaUserTie />,
    color: "#7c3aed",
    desc: "Collections & assignments for a staff member",
  },
  {
    id: "collection",
    label: "Collection Report",
    icon: <FaWallet />,
    color: "#059669",
    desc: "All collections for a date range",
  },
  {
    id: "salary",
    label: "Salary Report",
    icon: <FaMoneyBillWave />,
    color: "#d97706",
    desc: "Salary & advance details for staff",
  },
];

// ─── Main Page ─────────────────────────────────────────────────────────────
const TallyReportPage = () => {
  const [activeType, setActiveType] = useState(null);
  const [startDate, setStartDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  // selectors
  const [retailers, setRetailers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [selectedRetailer, setSelectedRetailer] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // extra filters
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());

  // fetch selectors
  useEffect(() => {
    if (activeType === "retailer" && retailers.length === 0) {
      axios
        .get(`${API_BASE}/tally/retailers`, auth())
        .then((r) => setRetailers(r.data.data || []))
        .catch(() => setError("Failed to load retailers"));
    }
    if (
      (activeType === "staff" || activeType === "salary") &&
      staffList.length === 0
    ) {
      axios
        .get(`${API_BASE}/tally/staff`, auth())
        .then((r) => setStaffList(r.data.data || []))
        .catch(() => setError("Failed to load staff"));
    }
    setReportData(null);
    setError(null);
  }, [activeType, retailers.length, staffList.length]);

  const generate = useCallback(async () => {
    setLoading(true);
    setReportData(null);
    setError(null);
    try {
      let url = "";
      if (activeType === "retailer") {
        if (!selectedRetailer) return setError("Please select a retailer");
        url = `${API_BASE}/tally/retailer-report?retailerId=${selectedRetailer._id}&startDate=${startDate}&endDate=${endDate}`;
      } else if (activeType === "staff") {
        if (!selectedStaff) return setError("Please select a staff member");
        url = `${API_BASE}/tally/staff-report?staffId=${selectedStaff._id}&startDate=${startDate}&endDate=${endDate}`;
      } else if (activeType === "collection") {
        url = `${API_BASE}/tally/collection-report?startDate=${startDate}&endDate=${endDate}`;
      } else if (activeType === "salary") {
        url =
          `${API_BASE}/tally/salary-report?month=${filterMonth}&year=${filterYear}` +
          (selectedStaff ? `&staffId=${selectedStaff._id}` : "");
      }
      const res = await axios.get(url, auth());
      setReportData(res.data);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  }, [
    activeType,
    selectedRetailer,
    selectedStaff,
    startDate,
    endDate,
    filterMonth,
    filterYear,
  ]);

  const handlePrint = () => window.print();

  const handleDownloadPDF = async () => {
    const element = document.getElementById("report-print-area");
    if (!element) return;
    setPdfLoading(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const printW = pageW - margin * 2;
      const printH = pageH - margin * 2;

      // total image height in mm
      const imgHeightMm = (canvas.height * printW) / canvas.width;
      let yOffset = 0;
      let page = 0;

      while (yOffset < imgHeightMm) {
        if (page > 0) pdf.addPage();
        // how many mm of image to put on this page
        const sliceH = Math.min(printH, imgHeightMm - yOffset);
        // pixel rows for this slice
        const slicePx = Math.round((sliceH / imgHeightMm) * canvas.height);
        const yPx = Math.round((yOffset / imgHeightMm) * canvas.height);

        // create a slice canvas
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = slicePx;
        const ctx = sliceCanvas.getContext("2d");
        ctx.drawImage(
          canvas,
          0,
          yPx,
          canvas.width,
          slicePx,
          0,
          0,
          canvas.width,
          slicePx,
        );
        const sliceData = sliceCanvas.toDataURL("image/png");

        pdf.addImage(sliceData, "PNG", margin, margin, printW, sliceH);
        yOffset += sliceH;
        page++;
      }

      const typeName = activeType || "report";
      const fileName = `${typeName}-report_${startDate}_to_${endDate}.pdf`;
      pdf.save(fileName);
    } catch (e) {
      console.error("PDF generation failed:", e);
      alert("PDF generation failed. Try using Print instead.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <Layout>
      <PrintGlobal />
      <PageWrap>
        {/* ── Header ────────────────────────────────────────── */}
        <PageHeader className="no-print">
          <div>
            <h1>
              <FaFileAlt /> Tally Reports
            </h1>
            <p>Select a report type, set filters, and generate</p>
          </div>
          {reportData && (
            <BtnGroup>
              <PrintBtn onClick={handlePrint}>
                <FaPrint /> Print
              </PrintBtn>
              <DownloadBtn onClick={handleDownloadPDF} disabled={pdfLoading}>
                {pdfLoading ? (
                  <>
                    <FaSpinner className="spin" /> Generating…
                  </>
                ) : (
                  <>
                    <FaFilePdf /> Download PDF
                  </>
                )}
              </DownloadBtn>
            </BtnGroup>
          )}
        </PageHeader>

        {/* ── Report Type Cards ──────────────────────────────── */}
        <TypeGrid className="no-print">
          {REPORT_TYPES.map((rt) => (
            <TypeCard
              key={rt.id}
              $active={activeType === rt.id}
              $color={rt.color}
              onClick={() => setActiveType(rt.id)}
            >
              <TypeIcon $color={rt.color}>{rt.icon}</TypeIcon>
              <TypeLabel>{rt.label}</TypeLabel>
              <TypeDesc>{rt.desc}</TypeDesc>
            </TypeCard>
          ))}
        </TypeGrid>

        {activeType && (
          <>
            {/* ── Filters ───────────────────────────────────── */}
            <FilterBar className="no-print">
              {/* Retailer selector */}
              {activeType === "retailer" && (
                <SelectGroup>
                  <SelectLabel>Retailer</SelectLabel>
                  <StyledSelect
                    value={selectedRetailer?._id || ""}
                    onChange={(e) =>
                      setSelectedRetailer(
                        retailers.find((r) => r._id === e.target.value) || null,
                      )
                    }
                  >
                    <option value="">-- Select Retailer --</option>
                    {retailers.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name}
                      </option>
                    ))}
                  </StyledSelect>
                </SelectGroup>
              )}

              {/* Staff selector */}
              {activeType === "staff" && (
                <SelectGroup>
                  <SelectLabel>Staff Member</SelectLabel>
                  <StyledSelect
                    value={selectedStaff?._id || ""}
                    onChange={(e) =>
                      setSelectedStaff(
                        staffList.find((s) => s._id === e.target.value) || null,
                      )
                    }
                  >
                    <option value="">-- Select Staff --</option>
                    {staffList.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </StyledSelect>
                </SelectGroup>
              )}

              {/* Optional staff filter for salary */}
              {activeType === "salary" && (
                <SelectGroup>
                  <SelectLabel>Staff (optional)</SelectLabel>
                  <StyledSelect
                    value={selectedStaff?._id || ""}
                    onChange={(e) =>
                      setSelectedStaff(
                        staffList.find((s) => s._id === e.target.value) || null,
                      )
                    }
                  >
                    <option value="">-- All Staff --</option>
                    {staffList.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </StyledSelect>
                </SelectGroup>
              )}

              {/* Month / Year for salary */}
              {activeType === "salary" && (
                <>
                  <DateGroup>
                    <SelectLabel>Month</SelectLabel>
                    <StyledSelect
                      value={filterMonth}
                      onChange={(e) => setFilterMonth(Number(e.target.value))}
                    >
                      {[
                        "Jan",
                        "Feb",
                        "Mar",
                        "Apr",
                        "May",
                        "Jun",
                        "Jul",
                        "Aug",
                        "Sep",
                        "Oct",
                        "Nov",
                        "Dec",
                      ].map((m, i) => (
                        <option key={i + 1} value={i + 1}>
                          {m}
                        </option>
                      ))}
                    </StyledSelect>
                  </DateGroup>
                  <DateGroup>
                    <SelectLabel>Year</SelectLabel>
                    <StyledSelect
                      value={filterYear}
                      onChange={(e) => setFilterYear(Number(e.target.value))}
                    >
                      {[2023, 2024, 2025, 2026, 2027].map((y) => (
                        <option key={y} value={y}>
                          {y}
                        </option>
                      ))}
                    </StyledSelect>
                  </DateGroup>
                </>
              )}

              {/* Date range (hide for salary) */}
              {activeType !== "salary" && (
                <>
                  <DateGroup>
                    <SelectLabel>From</SelectLabel>
                    <DateInput
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      max={endDate}
                    />
                  </DateGroup>
                  <DateGroup>
                    <SelectLabel>To</SelectLabel>
                    <DateInput
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      max={format(new Date(), "yyyy-MM-dd")}
                    />
                  </DateGroup>
                </>
              )}

              <GenerateBtn onClick={generate} disabled={loading}>
                {loading ? (
                  <>
                    <FaSpinner className="spin" /> Generating…
                  </>
                ) : (
                  <>
                    <FaSearch /> Generate Report
                  </>
                )}
              </GenerateBtn>
            </FilterBar>

            {error && <ErrorMsg className="no-print">{error}</ErrorMsg>}
          </>
        )}

        {!activeType && (
          <EmptyState className="no-print">
            <FaFileAlt />
            <span>Select a report type above to get started</span>
          </EmptyState>
        )}

        {/* ── Report Output ──────────────────────────────────── */}
        {reportData && (
          <ReportWrap id="report-print-area">
            {activeType === "retailer" && <RetailerReport data={reportData} />}
            {activeType === "staff" && <StaffReport data={reportData} />}
            {activeType === "collection" && (
              <CollectionReport data={reportData} />
            )}
            {activeType === "salary" && <SalaryReport data={reportData} />}
          </ReportWrap>
        )}
      </PageWrap>
    </Layout>
  );
};

// ─── Retailer Report ────────────────────────────────────────────────────────
const RetailerReport = ({ data }) => (
  <div>
    <TallyHeader>
      <CompanyName>RETAILER LEDGER</CompanyName>
      <EntityName>{data.retailer?.name}</EntityName>
      <EntitySub>{data.retailer?.address}</EntitySub>
      <PeriodLine>
        Period: {fmt(data.period?.start)} — {fmt(data.period?.end)}
      </PeriodLine>
    </TallyHeader>

    <SummaryGrid>
      <SummaryCard $accent="#1e293b">
        <SummaryVal>{INR(data.summary?.totalBillAmount)}</SummaryVal>
        <SummaryLbl>Total Bill Amount</SummaryLbl>
      </SummaryCard>
      <SummaryCard $accent="#059669">
        <SummaryVal style={{ color: "#059669" }}>
          {INR(data.summary?.totalCollected)}
        </SummaryVal>
        <SummaryLbl>Total Collected</SummaryLbl>
      </SummaryCard>
      <SummaryCard $accent="#dc2626">
        <SummaryVal style={{ color: "#dc2626" }}>
          {INR(data.summary?.totalDue)}
        </SummaryVal>
        <SummaryLbl>Balance Due</SummaryLbl>
      </SummaryCard>
    </SummaryGrid>

    <SectionTitle>Invoice-wise Ledger</SectionTitle>
    <TallyTable>
      <thead>
        <tr>
          <Th>Invoice No</Th>
          <Th>Date</Th>
          <Th>Assigned To</Th>
          <Th align="right">Bill Amount</Th>
          <Th align="right">Collected</Th>
          <Th align="right">Due</Th>
          <Th>Status</Th>
        </tr>
      </thead>
      <tbody>
        {(data.data || []).map((row, i) => (
          <React.Fragment key={i}>
            <tr style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
              <Td>
                <strong>{row.billNumber}</strong>
              </Td>
              <Td>{fmt(row.billDate)}</Td>
              <Td>{row.assignedTo}</Td>
              <Td align="right">{INR(row.amount)}</Td>
              <Td align="right" style={{ color: "#059669", fontWeight: 600 }}>
                {INR(row.collected)}
              </Td>
              <Td align="right" style={{ color: "#dc2626", fontWeight: 600 }}>
                {INR(row.dueAmount)}
              </Td>
              <Td>
                <StatusBadge $status={row.status}>{row.status}</StatusBadge>
              </Td>
            </tr>
            {(row.collections || []).map((c, j) => (
              <tr key={`c-${j}`} style={{ background: "#f0fdf4" }}>
                <Td
                  colSpan={7}
                  style={{
                    paddingLeft: 40,
                    fontSize: "0.8rem",
                    color: "#059669",
                  }}
                >
                  ↳ {fmt(c.date)} &nbsp;|&nbsp; {c.mode} &nbsp;|&nbsp;{" "}
                  {INR(c.amount)} &nbsp;|&nbsp; by {c.collectedBy}
                </Td>
              </tr>
            ))}
          </React.Fragment>
        ))}
        <tr style={{ background: "#1e293b" }}>
          <Td colSpan={3} style={{ color: "#fff", fontWeight: 700 }}>
            GRAND TOTAL
          </Td>
          <Td align="right" style={{ color: "#fff", fontWeight: 700 }}>
            {INR(data.summary?.totalBillAmount)}
          </Td>
          <Td align="right" style={{ color: "#4ade80", fontWeight: 700 }}>
            {INR(data.summary?.totalCollected)}
          </Td>
          <Td align="right" style={{ color: "#fca5a5", fontWeight: 700 }}>
            {INR(data.summary?.totalDue)}
          </Td>
          <Td />
        </tr>
      </tbody>
    </TallyTable>
  </div>
);

// ─── Staff Report ───────────────────────────────────────────────────────────
const StaffReport = ({ data }) => (
  <div>
    <TallyHeader>
      <CompanyName>STAFF COLLECTION REPORT</CompanyName>
      <EntityName>{data.staff?.name}</EntityName>
      <EntitySub>{data.staff?.email}</EntitySub>
      <PeriodLine>
        Period: {fmt(data.period?.start)} — {fmt(data.period?.end)}
      </PeriodLine>
    </TallyHeader>

    <SummaryGrid>
      <SummaryCard>
        <SummaryVal>{data.summary?.totalAssigned || 0}</SummaryVal>
        <SummaryLbl>Bills Assigned</SummaryLbl>
      </SummaryCard>
      <SummaryCard $accent="#059669">
        <SummaryVal style={{ color: "#059669" }}>
          {INR(data.summary?.totalCollectedAmount)}
        </SummaryVal>
        <SummaryLbl>Total Collected</SummaryLbl>
      </SummaryCard>
      <SummaryCard>
        <SummaryVal>{INR(data.summary?.cash)}</SummaryVal>
        <SummaryLbl>Cash</SummaryLbl>
      </SummaryCard>
      <SummaryCard>
        <SummaryVal>{INR(data.summary?.upi)}</SummaryVal>
        <SummaryLbl>UPI</SummaryLbl>
      </SummaryCard>
      <SummaryCard>
        <SummaryVal>{INR(data.summary?.cheque)}</SummaryVal>
        <SummaryLbl>Cheque</SummaryLbl>
      </SummaryCard>
      <SummaryCard>
        <SummaryVal>{INR(data.summary?.bankTransfer)}</SummaryVal>
        <SummaryLbl>Bank Transfer</SummaryLbl>
      </SummaryCard>
    </SummaryGrid>

    <SectionTitle>Collections Made</SectionTitle>
    <TallyTable>
      <thead>
        <tr>
          <Th>Date</Th>
          <Th>Retailer</Th>
          <Th>Invoice No</Th>
          <Th align="right">Amount</Th>
          <Th>Mode</Th>
        </tr>
      </thead>
      <tbody>
        {(data.collections || []).map((c, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
            <Td>{fmt(c.date)}</Td>
            <Td>{c.retailer}</Td>
            <Td>{c.billNumber}</Td>
            <Td align="right" style={{ color: "#059669", fontWeight: 600 }}>
              {INR(c.amount)}
            </Td>
            <Td>{c.mode}</Td>
          </tr>
        ))}
        <tr style={{ background: "#1e293b" }}>
          <Td colSpan={3} style={{ color: "#fff", fontWeight: 700 }}>
            TOTAL
          </Td>
          <Td align="right" style={{ color: "#4ade80", fontWeight: 700 }}>
            {INR(data.summary?.totalCollectedAmount)}
          </Td>
          <Td />
        </tr>
      </tbody>
    </TallyTable>

    <SectionTitle style={{ marginTop: 32 }}>Assigned Bills</SectionTitle>
    <TallyTable>
      <thead>
        <tr>
          <Th>Invoice No</Th>
          <Th>Retailer</Th>
          <Th>Bill Date</Th>
          <Th align="right">Amount</Th>
          <Th align="right">Due</Th>
          <Th>Status</Th>
        </tr>
      </thead>
      <tbody>
        {(data.bills || []).map((b, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
            <Td>
              <strong>{b.billNumber}</strong>
            </Td>
            <Td>{b.retailer}</Td>
            <Td>{fmt(b.billDate)}</Td>
            <Td align="right">{INR(b.amount)}</Td>
            <Td align="right" style={{ color: "#dc2626" }}>
              {INR(b.dueAmount)}
            </Td>
            <Td>
              <StatusBadge $status={b.status}>{b.status}</StatusBadge>
            </Td>
          </tr>
        ))}
      </tbody>
    </TallyTable>
  </div>
);

// ─── Collection Report ──────────────────────────────────────────────────────
const CollectionReport = ({ data }) => (
  <div>
    <TallyHeader>
      <CompanyName>COLLECTION REPORT</CompanyName>
      <PeriodLine>
        Period: {fmt(data.period?.start)} — {fmt(data.period?.end)}
      </PeriodLine>
    </TallyHeader>

    <SummaryGrid>
      <SummaryCard>
        <SummaryVal>{data.summary?.count || 0}</SummaryVal>
        <SummaryLbl>Total Entries</SummaryLbl>
      </SummaryCard>
      <SummaryCard $accent="#059669">
        <SummaryVal style={{ color: "#059669" }}>
          {INR(data.summary?.totalAmount)}
        </SummaryVal>
        <SummaryLbl>Total Collected</SummaryLbl>
      </SummaryCard>
      <SummaryCard>
        <SummaryVal>{INR(data.summary?.cash)}</SummaryVal>
        <SummaryLbl>Cash</SummaryLbl>
      </SummaryCard>
      <SummaryCard>
        <SummaryVal>{INR(data.summary?.upi)}</SummaryVal>
        <SummaryLbl>UPI</SummaryLbl>
      </SummaryCard>
      <SummaryCard>
        <SummaryVal>{INR(data.summary?.cheque)}</SummaryVal>
        <SummaryLbl>Cheque</SummaryLbl>
      </SummaryCard>
      <SummaryCard>
        <SummaryVal>{INR(data.summary?.bankTransfer)}</SummaryVal>
        <SummaryLbl>Bank Transfer</SummaryLbl>
      </SummaryCard>
    </SummaryGrid>

    <SectionTitle>Collection Ledger</SectionTitle>
    <TallyTable>
      <thead>
        <tr>
          <Th>Date</Th>
          <Th>Retailer</Th>
          <Th>Invoice No</Th>
          <Th align="right">Amount</Th>
          <Th>Mode</Th>
          <Th>Collected By</Th>
        </tr>
      </thead>
      <tbody>
        {(data.data || []).map((c, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
            <Td>{fmt(c.date)}</Td>
            <Td>{c.retailer}</Td>
            <Td>{c.billNumber}</Td>
            <Td align="right" style={{ color: "#059669", fontWeight: 600 }}>
              {INR(c.amount)}
            </Td>
            <Td>{c.mode}</Td>
            <Td>{c.collectedBy}</Td>
          </tr>
        ))}
        <tr style={{ background: "#1e293b" }}>
          <Td colSpan={3} style={{ color: "#fff", fontWeight: 700 }}>
            GRAND TOTAL
          </Td>
          <Td align="right" style={{ color: "#4ade80", fontWeight: 700 }}>
            {INR(data.summary?.totalAmount)}
          </Td>
          <Td colSpan={2} />
        </tr>
      </tbody>
    </TallyTable>
  </div>
);

// ─── Salary Report ───────────────────────────────────────────────────────────
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const SalaryReport = ({ data }) => (
  <div>
    <TallyHeader>
      <CompanyName>SALARY REPORT</CompanyName>
    </TallyHeader>

    <SummaryGrid>
      <SummaryCard>
        <SummaryVal>{INR(data.summary?.basicSalary)}</SummaryVal>
        <SummaryLbl>Basic Salary</SummaryLbl>
      </SummaryCard>
      <SummaryCard $accent="#dc2626">
        <SummaryVal style={{ color: "#dc2626" }}>
          {INR(data.summary?.advanceDeducted)}
        </SummaryVal>
        <SummaryLbl>Advance Deducted</SummaryLbl>
      </SummaryCard>
      <SummaryCard $accent="#059669">
        <SummaryVal style={{ color: "#059669" }}>
          {INR(data.summary?.netPayable)}
        </SummaryVal>
        <SummaryLbl>Net Payable</SummaryLbl>
      </SummaryCard>
      <SummaryCard $accent="#2563eb">
        <SummaryVal style={{ color: "#2563eb" }}>
          {INR(data.summary?.paidAmount)}
        </SummaryVal>
        <SummaryLbl>Paid Amount</SummaryLbl>
      </SummaryCard>
      <SummaryCard $accent="#d97706">
        <SummaryVal style={{ color: "#d97706" }}>
          {INR(data.summary?.pending)}
        </SummaryVal>
        <SummaryLbl>Pending</SummaryLbl>
      </SummaryCard>
    </SummaryGrid>

    <SectionTitle>Salary Ledger</SectionTitle>
    <TallyTable>
      <thead>
        <tr>
          <Th>Staff</Th>
          <Th>Month</Th>
          <Th align="right">Basic</Th>
          <Th align="right">Advance</Th>
          <Th align="right">Net Payable</Th>
          <Th align="right">Paid</Th>
          <Th>Mode</Th>
          <Th>Status</Th>
          <Th>Paid Date</Th>
        </tr>
      </thead>
      <tbody>
        {(data.data || []).map((s, i) => (
          <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
            <Td>
              <strong>{s.staffName}</strong>
            </Td>
            <Td>
              {MONTHS[(s.month || 1) - 1]} {s.year}
            </Td>
            <Td align="right">{INR(s.basicSalary)}</Td>
            <Td align="right" style={{ color: "#dc2626" }}>
              {INR(s.advanceDeducted)}
            </Td>
            <Td align="right" style={{ fontWeight: 700 }}>
              {INR(s.netSalaryPayable)}
            </Td>
            <Td align="right" style={{ color: "#059669", fontWeight: 600 }}>
              {INR(s.paidAmount)}
            </Td>
            <Td>{s.paymentMode || "—"}</Td>
            <Td>
              <StatusBadge $status={s.paymentStatus}>
                {s.paymentStatus}
              </StatusBadge>
            </Td>
            <Td>{s.paidDate ? fmt(s.paidDate) : "—"}</Td>
          </tr>
        ))}
        <tr style={{ background: "#1e293b" }}>
          <Td colSpan={2} style={{ color: "#fff", fontWeight: 700 }}>
            TOTAL
          </Td>
          <Td align="right" style={{ color: "#e2e8f0", fontWeight: 700 }}>
            {INR(data.summary?.basicSalary)}
          </Td>
          <Td align="right" style={{ color: "#fca5a5", fontWeight: 700 }}>
            {INR(data.summary?.advanceDeducted)}
          </Td>
          <Td align="right" style={{ color: "#4ade80", fontWeight: 700 }}>
            {INR(data.summary?.netPayable)}
          </Td>
          <Td align="right" style={{ color: "#4ade80", fontWeight: 700 }}>
            {INR(data.summary?.paidAmount)}
          </Td>
          <Td colSpan={3} />
        </tr>
      </tbody>
    </TallyTable>

    {(data.advances || []).length > 0 && (
      <>
        <SectionTitle style={{ marginTop: 28 }}>Advance Register</SectionTitle>
        <TallyTable>
          <thead>
            <tr>
              <Th>Staff</Th>
              <Th>Date</Th>
              <Th align="right">Amount</Th>
              <Th>Reason</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {data.advances.map((a, i) => (
              <tr
                key={i}
                style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}
              >
                <Td>{a.staffName}</Td>
                <Td>{fmt(a.date)}</Td>
                <Td align="right" style={{ color: "#dc2626", fontWeight: 600 }}>
                  {INR(a.amount)}
                </Td>
                <Td>{a.reason || "—"}</Td>
                <Td>
                  <StatusBadge $status={a.status}>{a.status}</StatusBadge>
                </Td>
              </tr>
            ))}
          </tbody>
        </TallyTable>
      </>
    )}
  </div>
);

// ─── Styled Components ──────────────────────────────────────────────────────
const PrintGlobal = createGlobalStyle`
  @media print {
    .no-print { display: none !important; }
    body { background: white; }
    #report-print-area { box-shadow: none; border: none; }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .spin { animation: spin 0.8s linear infinite; }
`;

const PageWrap = styled.div`
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
  h1 {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--nb-ink);
    margin: 0 0 4px;
  }
  p {
    margin: 0;
    color: #64748b;
    font-size: 0.9rem;
  }
`;

const BtnGroup = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
`;

const PrintBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #1e293b;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  &:hover {
    background: #334155;
  }
`;

const DownloadBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9rem;
  &:hover {
    background: #b91c1c;
  }
  &:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }
  .spin {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

const TypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const TypeCard = styled.div`
  padding: 20px;
  border-radius: 10px;
  border: 1px solid ${(p) => (p.$active ? p.$color : "var(--nb-border)")};
  background: ${(p) => (p.$active ? p.$color + "12" : "#fff")};
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    border-color: ${(p) => p.$color};
    background: ${(p) => p.$color + "08"};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
`;

const TypeIcon = styled.div`
  font-size: 1.6rem;
  color: ${(p) => p.$color};
  margin-bottom: 10px;
`;

const TypeLabel = styled.div`
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--nb-ink);
  margin-bottom: 4px;
`;

const TypeDesc = styled.div`
  font-size: 0.78rem;
  color: #64748b;
  line-height: 1.4;
`;

const FilterBar = styled.div`
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border: 1px solid var(--nb-border);
  border-radius: 10px;
  margin-bottom: 24px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
`;

const SelectGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 200px;
`;

const DateGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const SelectLabel = styled.label`
  font-size: 0.78rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const StyledSelect = styled.select`
  padding: 9px 12px;
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  font-size: 0.9rem;
  background: #f8fafc;
  color: var(--nb-ink);
  cursor: pointer;
  min-width: 200px;
  &:focus {
    outline: none;
    border-color: var(--nb-blue);
  }
`;

const DateInput = styled.input`
  padding: 9px 12px;
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  font-size: 0.9rem;
  background: #f8fafc;
  color: var(--nb-ink);
  &:focus {
    outline: none;
    border-color: var(--nb-blue);
  }
`;

const GenerateBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 24px;
  background: #1e293b;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.95rem;
  height: 40px;
  transition: background 0.2s;
  &:hover:not(:disabled) {
    background: #334155;
  }
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ErrorMsg = styled.div`
  padding: 14px 18px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 0.9rem;
  border-left: 4px solid #dc2626;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 20px;
  color: #94a3b8;
  svg {
    font-size: 4rem;
    opacity: 0.4;
  }
  span {
    font-size: 1rem;
  }
`;

const ReportWrap = styled.div`
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
`;

/* ── Tally print styles ─────────────────────────────────────────────────── */
const TallyHeader = styled.div`
  background: #1e293b;
  padding: 24px 32px;
  text-align: center;
`;
const CompanyName = styled.div`
  font-size: 0.75rem;
  letter-spacing: 3px;
  color: #94a3b8;
  text-transform: uppercase;
  margin-bottom: 6px;
`;
const EntityName = styled.div`
  font-size: 1.4rem;
  font-weight: 800;
  color: #fff;
`;
const EntitySub = styled.div`
  font-size: 0.85rem;
  color: #64748b;
  margin-top: 2px;
`;
const PeriodLine = styled.div`
  font-size: 0.8rem;
  color: #7dd3fc;
  margin-top: 8px;
`;

const SummaryGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
`;
const SummaryCard = styled.div`
  flex: 1;
  min-width: 140px;
  padding: 16px 20px;
  border-right: 1px solid #e2e8f0;
  &:last-child {
    border-right: none;
  }
`;
const SummaryVal = styled.div`
  font-size: 1.1rem;
  font-weight: 700;
  color: #1e293b;
`;
const SummaryLbl = styled.div`
  font-size: 0.72rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
`;

const SectionTitle = styled.div`
  background: #e2e8f0;
  padding: 8px 20px;
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const TallyTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
`;

const Th = styled.th`
  padding: 10px 14px;
  background: #334155;
  color: #e2e8f0;
  font-weight: 700;
  font-size: 0.75rem;
  text-align: ${(p) => p.align || "left"};
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 9px 14px;
  color: #334155;
  border-bottom: 1px solid #f1f5f9;
  text-align: ${(p) => p.align || "left"};
  vertical-align: top;
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 700;
  background: ${(p) =>
    p.$status === "Paid"
      ? "#dcfce7"
      : p.$status === "Unpaid"
        ? "#fee2e2"
        : "#fef9c3"};
  color: ${(p) =>
    p.$status === "Paid"
      ? "#166534"
      : p.$status === "Unpaid"
        ? "#991b1b"
        : "#854d0e"};
`;

export default TallyReportPage;
