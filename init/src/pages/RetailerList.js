import React, { useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";
import Layout from "../components/Layout";
import {
  FaSearch,
  FaPlus,
  FaFilter,
  FaDownload,
  FaTh,
  FaList,
  FaSync,
  FaStore,
  FaCheckCircle,
  FaTimesCircle,
  FaUserPlus,
  FaSortUp,
  FaSortDown,
  FaSort,
  FaTimes,
  FaUpload,
} from "react-icons/fa";
import axios from "axios";

const API_BASE = "https://backend.laxmilube.in/api";
const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const STATUS_OPTIONS = ["all", "active", "pending", "rejected"];
const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const RetailerList = () => {
  const [records, setRecords] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("table");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState("manual");
  const [form, setForm] = useState({
    name: "",
    address1: "",
    address2: "",
    phone: "",
    assignedTo: "",
    dayAssigned: "",
    email: "",
    password: "",
  });
  const [createLogin, setCreateLogin] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingRetailer, setSavingRetailer] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [modalMessage, setModalMessage] = useState("");
  const [modalError, setModalError] = useState("");
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });
  const fileInputRef = useRef(null);

  const fetchRetailers = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API_BASE}/retailers`, {
        headers: getAuthHeaders(),
      });
      setRecords(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError("Failed to fetch retailers. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRetailers();
  }, []);

  useEffect(() => {
    const fetchStaff = async () => {
      try {
        const res = await axios.get(`${API_BASE}/users`, {
          headers: getAuthHeaders(),
        });
        const staff = (res.data || []).filter(
          (u) => u.role === "staff" || u.role === "admin",
        );
        setStaffList(staff);
      } catch {
        setStaffList([]);
      }
    };
    fetchStaff();
  }, []);

  // Stats
  const stats = useMemo(() => {
    const now = new Date();
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate(),
    );
    return {
      total: records.length,
      active: records.filter((r) => r.status === "ACTIVE").length,
      pending: records.filter((r) => r.status === "PENDING").length,
      recent: records.filter((r) => {
        const d = new Date(r.createdAt);
        return !isNaN(d) && d >= oneMonthAgo;
      }).length,
    };
  }, [records]);

  const filteredRecords = useMemo(() => {
    let list = [...records];
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      list = list.filter((r) =>
        [r.name, r.address1, r.address2, r.dayAssigned, r.assignedTo?.name]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(query)),
      );
    }
    if (filterStatus !== "all") {
      list = list.filter(
        (r) =>
          (r.status || "ACTIVE").toLowerCase() === filterStatus.toLowerCase(),
      );
    }
    if (sortField) {
      list.sort((a, b) => {
        const av = String(a[sortField] || "").toLowerCase();
        const bv = String(b[sortField] || "").toLowerCase();
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return list;
  }, [records, searchTerm, filterStatus, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const resetModalState = () => {
    setForm({
      name: "",
      address1: "",
      address2: "",
      phone: "",
      assignedTo: "",
      dayAssigned: "",
      email: "",
      password: "",
    });
    setCreateLogin(false);
    setConfirmPassword("");
    setFieldErrors({});
    setModalMessage("");
    setModalError("");
    setImportFile(null);
    setImportProgress({ current: 0, total: 0 });
  };

  const handleAddNew = () => {
    resetModalState();
    setModalTab("manual");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleFormChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const validateRetailerForm = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Retailer name is required";
    if (!form.address1.trim()) errs.address1 = "Address is required";
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone))
      errs.phone = "Enter a valid 10-digit mobile number";
    if (createLogin) {
      if (!form.email.trim()) errs.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(form.email))
        errs.email = "Enter a valid email";
      if (!form.password) errs.password = "Password is required";
      else if (form.password.length < 6) errs.password = "Minimum 6 characters";
      if (form.password !== confirmPassword)
        errs.confirmPassword = "Passwords do not match";
    }
    return errs;
  };

  const handleRetailerSubmit = async (e) => {
    e.preventDefault();
    setModalMessage("");
    setModalError("");
    const errs = validateRetailerForm();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }

    setSavingRetailer(true);
    try {
      const payload = {
        name: form.name.trim(),
        address1: form.address1.trim(),
        address2: form.address2.trim(),
        phone: form.phone.trim() || undefined,
        assignedTo: form.assignedTo || undefined,
        dayAssigned: form.dayAssigned || undefined,
      };

      if (createLogin && form.email && form.password) {
        payload.email = form.email.trim();
        payload.password = form.password;
      }

      await axios.post(`${API_BASE}/retailers`, payload, {
        headers: getAuthHeaders(),
      });
      setModalMessage(
        createLogin
          ? "Retailer added with login credentials"
          : "Retailer added successfully",
      );
      await fetchRetailers();
      resetModalState();
      setIsModalOpen(false);
    } catch (err) {
      setModalError(err.response?.data?.message || "Failed to add retailer");
    } finally {
      setSavingRetailer(false);
    }
  };

  const handleImportFileChange = (e) => {
    setImportFile(e.target.files?.[0] || null);
    setModalError("");
    setModalMessage("");
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      setModalError("Please choose a file");
      return;
    }

    setImportLoading(true);
    setModalError("");
    setModalMessage("");
    setImportProgress({ current: 0, total: 0 });

    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_BASE}/retailers/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === "progress") {
              setImportProgress({ current: data.current, total: data.total });
            } else if (data.type === "result") {
              setModalMessage(
                `Imported ${data.importedCount} retailers. ${data.errorCount} rows had errors.`,
              );
              if (data.errorCount > 0) {
                setModalError(
                  data.errors?.join("; ") || "Some rows had errors",
                );
              }
            } else if (data.type === "error") {
              setModalError(data.message || "Failed to import retailers");
            }
          } catch {
            // ignore parse errors for non-json chunks
          }
        }
      }

      await fetchRetailers();
      setImportFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setModalError(err.message || "Failed to import retailers");
    } finally {
      setImportLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = [
      "Name",
      "Address 1",
      "Address 2",
      "Day Assigned",
      "Assigned To",
      "Status",
    ];
    const rows = filteredRecords.map((r) => [
      r.name || "",
      r.address1 || "",
      r.address2 || "",
      r.dayAssigned || "",
      r.assignedTo?.name || "",
      r.status || "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${v}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "retailers.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Card view
  const RecordCard = ({ record }) => {
    const name = record.name || record._id;
    const address = [record.address1, record.address2]
      .filter(Boolean)
      .join(", ");
    const status = record.status || "ACTIVE";
    const initials = (name || "?")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const isActive = status === "ACTIVE";
    return (
      <RCard>
        <RCardAvatar>{initials}</RCardAvatar>
        <RCardName>{name}</RCardName>
        {address && <RCardSub>{address}</RCardSub>}
        {record.dayAssigned && <RCardSub>📅 {record.dayAssigned}</RCardSub>}
        {record.assignedTo?.name && (
          <RCardSub>👤 {record.assignedTo.name}</RCardSub>
        )}
        <RCardStatus active={isActive}>
          {isActive ? (
            <>
              <FaCheckCircle /> Active
            </>
          ) : status === "PENDING" ? (
            <>
              <FaTimesCircle /> Pending
            </>
          ) : (
            <>
              <FaTimesCircle /> {status}
            </>
          )}
        </RCardStatus>
      </RCard>
    );
  };

  // Compact row
  const CompactRow = ({ record, idx }) => {
    const name = record.name || record._id;
    const address = [record.address1, record.address2]
      .filter(Boolean)
      .join(", ");
    const status = record.status || "ACTIVE";
    return (
      <CRow alt={idx % 2 === 1}>
        <CCell bold>{name}</CCell>
        <CCell>{address}</CCell>
        <CCell>{record.dayAssigned || "—"}</CCell>
        <CCell>{record.assignedTo?.name || "—"}</CCell>
        <CCell>
          <RCardStatus active={status === "ACTIVE"} compact>
            {status}
          </RCardStatus>
        </CCell>
      </CRow>
    );
  };

  return (
    <Layout>
      <PageWrapper>
        {/* Header */}
        <PageHeaderBar>
          <PageTitleGroup>
            <FaStore size={22} />
            <h1>Retailer List</h1>
          </PageTitleGroup>
          <HeaderActions>
            <RefreshBtn onClick={fetchRetailers} title="Refresh">
              <FaSync />
            </RefreshBtn>
            <ExportBtn onClick={exportCSV}>
              <FaDownload /> Export CSV
            </ExportBtn>
            <AddBtn onClick={handleAddNew}>
              <FaPlus /> Add Retailer
            </AddBtn>
          </HeaderActions>
        </PageHeaderBar>

        {error && <Alert>{error}</Alert>}

        {/* Stats Strip */}
        <StatsGrid>
          <StatCard accent="var(--nb-blue)">
            <div className="val">{stats.total}</div>
            <div className="lbl">Total Retailers</div>
          </StatCard>
          <StatCard accent="var(--nb-blue-medium)">
            <div className="val">{stats.active}</div>
            <div className="lbl">Active</div>
          </StatCard>
          <StatCard accent="var(--nb-orange)">
            <div className="val">{stats.pending}</div>
            <div className="lbl">Pending</div>
          </StatCard>
          <StatCard accent="var(--nb-blue)">
            <div className="val">{stats.recent}</div>
            <div className="lbl">Added This Month</div>
          </StatCard>
        </StatsGrid>

        {/* Toolbar */}
        <Toolbar>
          <SearchBox>
            <FaSearch />
            <input
              placeholder="Search retailers"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </SearchBox>
          <FilterGroup>
            <FilterLabel>
              <FaFilter /> Status:
            </FilterLabel>
            <FilterSelect
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "all"
                    ? "All Status"
                    : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </FilterSelect>
          </FilterGroup>
          <ResultsInfo>
            {filteredRecords.length} of {records.length} retailers
          </ResultsInfo>
          <ViewToggle>
            <ViewBtn
              active={viewMode === "table"}
              onClick={() => setViewMode("table")}
              title="Table"
            >
              <FaList />
            </ViewBtn>
            <ViewBtn
              active={viewMode === "cards"}
              onClick={() => setViewMode("cards")}
              title="Cards"
            >
              <FaTh />
            </ViewBtn>
            <ViewBtn
              active={viewMode === "compact"}
              onClick={() => setViewMode("compact")}
              title="Compact"
            >
              <span style={{ fontSize: "0.7rem", fontWeight: 700 }}></span>
            </ViewBtn>
          </ViewToggle>
        </Toolbar>

        {/* Content */}
        {loading ? (
          <LoadingState>
            <div className="spinner" />
            <p>Loading retailers</p>
          </LoadingState>
        ) : filteredRecords.length === 0 ? (
          <EmptyState>
            <FaStore size={40} />
            <p>
              {searchTerm || filterStatus !== "all"
                ? "No retailers match your search/filter"
                : "No retailers yet"}
            </p>
            <AddBtn onClick={handleAddNew} style={{ marginTop: "0.5rem" }}>
              <FaUserPlus /> Add First Retailer
            </AddBtn>
          </EmptyState>
        ) : viewMode === "cards" ? (
          <CardsGrid>
            {filteredRecords.map((r) => (
              <RecordCard key={r._id} record={r} />
            ))}
          </CardsGrid>
        ) : viewMode === "compact" ? (
          <TableWrapper>
            <CompactTable>
              <CHead>
                <tr>
                  <CTh
                    onClick={() => handleSort("name")}
                    style={{ cursor: "pointer" }}
                  >
                    Name{" "}
                    {sortField === "name" ? (
                      sortDir === "asc" ? (
                        <FaSortUp />
                      ) : (
                        <FaSortDown />
                      )
                    ) : (
                      <FaSort style={{ opacity: 0.3 }} />
                    )}
                  </CTh>
                  <CTh>Address</CTh>
                  <CTh>Day</CTh>
                  <CTh>Assigned To</CTh>
                  <CTh>Status</CTh>
                </tr>
              </CHead>
              <tbody>
                {filteredRecords.map((r, i) => (
                  <CompactRow key={r._id} record={r} idx={i} />
                ))}
              </tbody>
            </CompactTable>
          </TableWrapper>
        ) : (
          /* Default table view */
          <TableWrapper>
            <CompactTable>
              <CHead>
                <tr>
                  <CTh
                    onClick={() => handleSort("name")}
                    style={{ cursor: "pointer" }}
                  >
                    Name{" "}
                    {sortField === "name" ? (
                      sortDir === "asc" ? (
                        <FaSortUp />
                      ) : (
                        <FaSortDown />
                      )
                    ) : (
                      <FaSort style={{ opacity: 0.3 }} />
                    )}
                  </CTh>
                  <CTh>Address 1</CTh>
                  <CTh>Address 2</CTh>
                  <CTh>Collection Day</CTh>
                  <CTh>Assigned To</CTh>
                  <CTh>Status</CTh>
                </tr>
              </CHead>
              <tbody>
                {filteredRecords.map((r, i) => (
                  <CRow key={r._id} alt={i % 2 === 1}>
                    <CCell bold>{r.name || "—"}</CCell>
                    <CCell>{r.address1 || "—"}</CCell>
                    <CCell>{r.address2 || "—"}</CCell>
                    <CCell>{r.dayAssigned || "—"}</CCell>
                    <CCell>{r.assignedTo?.name || "—"}</CCell>
                    <CCell>
                      <RCardStatus active={r.status === "ACTIVE"} compact>
                        {r.status || "ACTIVE"}
                      </RCardStatus>
                    </CCell>
                  </CRow>
                ))}
              </tbody>
            </CompactTable>
          </TableWrapper>
        )}

        {isModalOpen && (
          <ModalOverlay onClick={closeModal}>
            <ModalCard onClick={(e) => e.stopPropagation()}>
              <ModalHeader>
                <h3>
                  {modalTab === "manual" ? "Add Retailer" : "Import Retailers"}
                </h3>
                <IconBtn type="button" onClick={closeModal}>
                  <FaTimes />
                </IconBtn>
              </ModalHeader>

              <ModalTabs>
                <ModalTabButton
                  type="button"
                  active={modalTab === "manual"}
                  onClick={() => setModalTab("manual")}
                >
                  Manual Entry
                </ModalTabButton>
                <ModalTabButton
                  type="button"
                  active={modalTab === "import"}
                  onClick={() => setModalTab("import")}
                >
                  Excel Import
                </ModalTabButton>
              </ModalTabs>

              {modalMessage && <SuccessMsg>{modalMessage}</SuccessMsg>}
              {modalError && <ErrorMsg>{modalError}</ErrorMsg>}

              {modalTab === "manual" ? (
                <form onSubmit={handleRetailerSubmit}>
                  <ModalBody>
                    <Field>
                      <label>Retailer Name *</label>
                      <input
                        value={form.name}
                        onChange={(e) =>
                          handleFormChange("name", e.target.value)
                        }
                        placeholder="Enter retailer name"
                      />
                      {fieldErrors.name && (
                        <InlineError>{fieldErrors.name}</InlineError>
                      )}
                    </Field>

                    <Field>
                      <label>Address Line 1 *</label>
                      <input
                        value={form.address1}
                        onChange={(e) =>
                          handleFormChange("address1", e.target.value)
                        }
                        placeholder="Enter address"
                      />
                      {fieldErrors.address1 && (
                        <InlineError>{fieldErrors.address1}</InlineError>
                      )}
                    </Field>

                    <Field>
                      <label>Address Line 2</label>
                      <input
                        value={form.address2}
                        onChange={(e) =>
                          handleFormChange("address2", e.target.value)
                        }
                        placeholder="Optional"
                      />
                    </Field>

                    <Field>
                      <label>
                        WhatsApp / Mobile Number{" "}
                        <span style={{ color: "#888", fontSize: "0.8em" }}>
                          (for receipt delivery)
                        </span>
                      </label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={(e) =>
                          handleFormChange(
                            "phone",
                            e.target.value.replace(/\D/g, "").slice(0, 10),
                          )
                        }
                        placeholder="10-digit number e.g. 9876543210"
                      />
                      {fieldErrors.phone && (
                        <InlineError>{fieldErrors.phone}</InlineError>
                      )}
                    </Field>

                    <ModalGrid>
                      <Field>
                        <label>Assign To</label>
                        <select
                          value={form.assignedTo}
                          onChange={(e) =>
                            handleFormChange("assignedTo", e.target.value)
                          }
                        >
                          <option value="">Select staff</option>
                          {staffList.map((staff) => (
                            <option key={staff._id} value={staff._id}>
                              {staff.name || staff.email}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field>
                        <label>Collection Day</label>
                        <select
                          value={form.dayAssigned}
                          onChange={(e) =>
                            handleFormChange("dayAssigned", e.target.value)
                          }
                        >
                          <option value="">Select day</option>
                          {DAYS.map((day) => (
                            <option key={day} value={day}>
                              {day}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </ModalGrid>

                    <CheckboxRow>
                      <input
                        id="createLogin"
                        type="checkbox"
                        checked={createLogin}
                        onChange={(e) => setCreateLogin(e.target.checked)}
                      />
                      <label htmlFor="createLogin">
                        Create retailer login account
                      </label>
                    </CheckboxRow>

                    {createLogin && (
                      <ModalGrid>
                        <Field>
                          <label>Email *</label>
                          <input
                            type="email"
                            value={form.email}
                            onChange={(e) =>
                              handleFormChange("email", e.target.value)
                            }
                            placeholder="retailer@example.com"
                          />
                          {fieldErrors.email && (
                            <InlineError>{fieldErrors.email}</InlineError>
                          )}
                        </Field>

                        <Field>
                          <label>Password *</label>
                          <input
                            type="password"
                            value={form.password}
                            onChange={(e) =>
                              handleFormChange("password", e.target.value)
                            }
                            placeholder="Minimum 6 characters"
                          />
                          {fieldErrors.password && (
                            <InlineError>{fieldErrors.password}</InlineError>
                          )}
                        </Field>

                        <Field>
                          <label>Confirm Password *</label>
                          <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Re-enter password"
                          />
                          {fieldErrors.confirmPassword && (
                            <InlineError>
                              {fieldErrors.confirmPassword}
                            </InlineError>
                          )}
                        </Field>
                      </ModalGrid>
                    )}
                  </ModalBody>

                  <ModalFooter>
                    <SecondaryBtn type="button" onClick={closeModal}>
                      Cancel
                    </SecondaryBtn>
                    <PrimaryBtn type="submit" disabled={savingRetailer}>
                      {savingRetailer ? "Saving..." : "Save Retailer"}
                    </PrimaryBtn>
                  </ModalFooter>
                </form>
              ) : (
                <form onSubmit={handleImportSubmit}>
                  <ModalBody>
                    <Field>
                      <label>Upload Excel File (.xlsx / .xls)</label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleImportFileChange}
                      />
                    </Field>

                    {importFile && (
                      <FileText>Selected: {importFile.name}</FileText>
                    )}

                    {importLoading && importProgress.total > 0 && (
                      <ProgressWrap>
                        <ProgressTop>
                          <span>Importing...</span>
                          <span>
                            {importProgress.current}/{importProgress.total}
                          </span>
                        </ProgressTop>
                        <ProgressBar>
                          <ProgressFill
                            style={{
                              width: `${Math.round((importProgress.current / importProgress.total) * 100)}%`,
                            }}
                          />
                        </ProgressBar>
                      </ProgressWrap>
                    )}

                    <Hint>
                      Required: Retailer Name, Address 1. Optional: Address 2,
                      Assigned To, Day Assigned.
                    </Hint>
                  </ModalBody>

                  <ModalFooter>
                    <SecondaryBtn
                      type="button"
                      onClick={() => {
                        setImportFile(null);
                        if (fileInputRef.current)
                          fileInputRef.current.value = "";
                        setModalError("");
                        setModalMessage("");
                      }}
                    >
                      Clear
                    </SecondaryBtn>
                    <PrimaryBtn
                      type="submit"
                      disabled={importLoading || !importFile}
                    >
                      <FaUpload />{" "}
                      {importLoading ? "Uploading..." : "Import Retailers"}
                    </PrimaryBtn>
                  </ModalFooter>
                </form>
              )}
            </ModalCard>
          </ModalOverlay>
        )}
      </PageWrapper>
    </Layout>
  );
};

/* ================================================================ STYLED COMPONENTS ================================================================ */

const PageWrapper = styled.div`
  padding: 1rem;
  min-height: 100vh;
  background: #ffffff;
  @media (min-width: 768px) {
    padding: 1.5rem 2rem;
  }
`;

const PageHeaderBar = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--nb-border);
`;

const PageTitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  h1 {
    font-size: 1.6rem;
    color: var(--nb-ink);
    margin: 0;
  }
  svg {
    color: var(--nb-ink);
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
`;

const RefreshBtn = styled.button`
  background: var(--nb-muted);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--nb-ink);
  &:hover {
    background: var(--nb-blue);
    color: var(--nb-white);
  }
`;

const ExportBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  background: var(--nb-muted);
  color: var(--nb-ink);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--nb-shadow-sm);
  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--nb-shadow-md);
  }
`;

const AddBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.1rem;
  background: var(--nb-blue);
  color: var(--nb-white);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--nb-shadow-sm);
  &:hover {
    transform: translateY(-1px);
    box-shadow: var(--nb-shadow-md);
  }
`;

const Alert = styled.div`
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  border-radius: var(--nb-radius-sm);
  background: var(--nb-muted);
  border-left: 4px solid var(--nb-orange);
  color: var(--nb-orange);
  font-weight: 500;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const StatCard = styled.div`
  background: var(--nb-cream);
  border: 1px solid var(--nb-border);
  border-left: 5px solid ${(p) => p.accent || "var(--nb-blue)"};
  border-radius: var(--nb-radius);
  padding: 1rem 1.25rem;
  box-shadow: var(--nb-shadow-sm);
  .val {
    font-size: 1.8rem;
    font-weight: 700;
    color: var(--nb-ink);
  }
  .lbl {
    font-size: 0.78rem;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--nb-blue-medium);
    letter-spacing: 0.5px;
    margin-top: 0.25rem;
  }
`;

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: var(--nb-cream);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius);
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 200px;
  background: var(--nb-white);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  padding: 0.4rem 0.75rem;
  svg {
    color: var(--nb-ink);
    flex-shrink: 0;
  }
  input {
    border: none;
    outline: none;
    background: transparent;
    width: 100%;
    font-size: 0.9rem;
    color: var(--nb-ink);
  }
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
`;

const FilterLabel = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--nb-ink);
  display: flex;
  align-items: center;
  gap: 0.3rem;
  white-space: nowrap;
`;

const FilterSelect = styled.select`
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  background: var(--nb-white);
  color: var(--nb-ink);
  font-size: 0.85rem;
  cursor: pointer;
  &:focus {
    outline: none;
    border-color: var(--nb-blue);
  }
`;

const ResultsInfo = styled.div`
  font-size: 0.8rem;
  color: var(--nb-blue-medium);
  margin-left: auto;
`;

const ViewToggle = styled.div`
  display: flex;
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-sm);
  overflow: hidden;
`;

const ViewBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  padding: 0.35rem 0.7rem;
  border: none;
  cursor: pointer;
  min-width: 36px;
  font-size: 0.85rem;
  font-weight: 600;
  background: ${(p) => (p.active ? "var(--nb-blue)" : "var(--nb-white)")};
  color: ${(p) => (p.active ? "var(--nb-white)" : "var(--nb-ink)")};
  transition: all var(--nb-transition);
`;

/* Cards */
const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
`;

const RCard = styled.div`
  background: var(--nb-white);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius);
  padding: 1.25rem;
  box-shadow: var(--nb-shadow-md);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  text-align: center;
  transition:
    transform var(--nb-transition),
    box-shadow var(--nb-transition);
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--nb-shadow-lg);
  }
`;

const RCardAvatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--nb-blue);
  color: var(--nb-white);
  border: 1px solid var(--nb-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  font-weight: 700;
  box-shadow: var(--nb-shadow-sm);
`;

const RCardName = styled.div`
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--nb-ink);
`;
const RCardSub = styled.div`
  font-size: 0.75rem;
  color: var(--nb-blue-medium);
`;

const RCardStatus = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.25rem;
  padding: ${(p) => (p.compact ? "0.15rem 0.4rem" : "0.2rem 0.6rem")};
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  border: 1px solid var(--nb-border);
  background: ${(p) => (p.active ? "var(--nb-blue-light)" : "var(--nb-muted)")};
  color: ${(p) => (p.active ? "var(--nb-ink)" : "var(--nb-border)")};
`;

/* Compact table */
const TableWrapper = styled.div`
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius);
  box-shadow: var(--nb-shadow-md);
`;

const CompactTable = styled.table`
  width: 100%;
  min-width: 600px;
  border-collapse: collapse;
  background: var(--nb-white);
  overflow: hidden;
`;

const CHead = styled.thead``;

const CTh = styled.th`
  background: var(--nb-muted);
  color: var(--nb-ink);
  font-weight: 700;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid var(--nb-border);
  text-align: left;
  svg {
    font-size: 0.65rem;
    margin-left: 0.3rem;
    vertical-align: middle;
  }
`;

const CRow = styled.tr`
  background: ${(p) => (p.alt ? "var(--nb-muted)" : "var(--nb-white)")};
  cursor: pointer;
  td {
    padding: 0.6rem 1rem;
    border-bottom: 1px solid var(--nb-border);
  }
  &:hover td {
    background: var(--nb-cream);
  }
`;

const CCell = styled.td`
  font-size: 0.875rem;
  color: var(--nb-ink);
  font-weight: ${(p) => (p.bold ? "600" : "400")};
`;

const LoadingState = styled.div`
  padding: 3rem;
  text-align: center;
  color: var(--nb-ink);
  .spinner {
    width: 36px;
    height: 36px;
    border: 4px solid var(--nb-muted);
    border-top: 4px solid var(--nb-blue);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin: 0 auto 1rem;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const EmptyState = styled.div`
  padding: 3rem;
  text-align: center;
  color: var(--nb-ink);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  svg {
    color: var(--nb-blue);
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 1rem;
`;

const ModalCard = styled.div`
  width: 100%;
  max-width: 720px;
  background: var(--nb-white);
  border-radius: var(--nb-radius);
  border: 1px solid var(--nb-border);
  box-shadow: var(--nb-shadow-lg);
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--nb-border);
  h3 {
    margin: 0;
    color: var(--nb-ink);
  }
`;

const IconBtn = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid var(--nb-border);
  background: var(--nb-white);
  color: var(--nb-ink);
  cursor: pointer;
`;

const ModalTabs = styled.div`
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.25rem 0;
`;

const ModalTabButton = styled.button`
  border: 1px solid var(--nb-border);
  background: ${(p) => (p.active ? "var(--nb-blue)" : "var(--nb-white)")};
  color: ${(p) => (p.active ? "var(--nb-white)" : "var(--nb-ink)")};
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
`;

const ModalBody = styled.div`
  padding: 1rem 1.25rem;
`;

const ModalGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin-bottom: 0.8rem;

  label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--nb-ink);
  }

  input,
  select {
    border: 1px solid var(--nb-border);
    border-radius: 8px;
    padding: 0.55rem 0.7rem;
    font-size: 0.9rem;
    color: var(--nb-ink);
    background: var(--nb-white);
    outline: none;
  }
`;

const CheckboxRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0 1rem;
  label {
    color: var(--nb-ink);
    font-size: 0.9rem;
  }
`;

const InlineError = styled.span`
  color: var(--nb-orange);
  font-size: 0.78rem;
  font-weight: 600;
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
  padding: 0.9rem 1.25rem 1.2rem;
  border-top: 1px solid var(--nb-border);
`;

const SecondaryBtn = styled.button`
  border: 1px solid var(--nb-border);
  background: var(--nb-white);
  color: var(--nb-ink);
  border-radius: 8px;
  padding: 0.5rem 0.9rem;
  font-weight: 600;
  cursor: pointer;
`;

const PrimaryBtn = styled.button`
  border: 1px solid var(--nb-blue);
  background: var(--nb-blue);
  color: var(--nb-white);
  border-radius: 8px;
  padding: 0.5rem 1rem;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const SuccessMsg = styled.div`
  margin: 0.8rem 1.25rem 0;
  background: var(--nb-blue-light);
  border: 1px solid var(--nb-border);
  color: var(--nb-ink);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  font-size: 0.85rem;
`;

const ErrorMsg = styled.div`
  margin: 0.8rem 1.25rem 0;
  background: var(--nb-muted);
  border: 1px solid var(--nb-orange);
  color: var(--nb-orange);
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  font-size: 0.85rem;
`;

const FileText = styled.div`
  font-size: 0.85rem;
  color: var(--nb-blue-medium);
  margin-top: -0.2rem;
  margin-bottom: 0.75rem;
`;

const Hint = styled.div`
  font-size: 0.8rem;
  color: var(--nb-blue-medium);
  padding: 0.7rem;
  background: var(--nb-cream);
  border: 1px solid var(--nb-border);
  border-radius: 8px;
`;

const ProgressWrap = styled.div`
  margin: 0.75rem 0;
`;

const ProgressTop = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--nb-ink);
  margin-bottom: 0.35rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: var(--nb-muted);
  border-radius: 999px;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  background: var(--nb-blue);
  transition: width 0.2s ease;
`;

export default RetailerList;
