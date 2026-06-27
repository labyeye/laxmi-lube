// RetailerAdd.js
import React, { useState, useEffect } from "react";
import * as xlsx from "xlsx";
import styled, { keyframes } from "styled-components";
import Layout from "../components/Layout";
import { useNavigate } from "react-router-dom";
import { useModules } from "../contexts/ModuleContext";
import axios from "axios";

const API_BASE = "https://backend.laxmilube.in/api";

const getAuthHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

const DAYS = [
  "Monday", "Tuesday", "Wednesday", "Thursday",
  "Friday", "Saturday", "Sunday",
];

const RetailerAdd = () => {
  const navigate = useNavigate();
  const { getModuleName } = useModules();

  const [form, setForm] = useState({
    name: "", address1: "", address2: "",
    phone: "",
    assignedTo: "", dayAssigned: "",
    email: "", password: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [createLogin, setCreateLogin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [activeTab, setActiveTab] = useState("manual");

  const [file, setFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importMessage, setImportMessage] = useState("");
  const [importError, setImportError] = useState("");

  useEffect(() => {
    axios.get(`${API_BASE}/users`, { headers: getAuthHeaders() })
      .then((res) => {
        const staff = (res.data || []).filter(
          (u) => u.role === "staff" || u.role === "admin"
        );
        setStaffList(staff);
      })
      .catch(() => {});
  }, []);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) setFieldErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = "Retailer name is required";
    if (!form.address1.trim()) errs.address1 = "Address is required";
    if (form.phone && !/^[6-9]\d{9}$/.test(form.phone)) errs.phone = "Enter a valid 10-digit mobile number";
    if (createLogin) {
      if (!form.email.trim()) errs.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = "Enter a valid email";
      if (!form.password) errs.password = "Password is required";
      else if (form.password.length < 6) errs.password = "Minimum 6 characters";
      if (form.password !== confirmPassword) errs.confirmPassword = "Passwords do not match";
    }
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(""); setError("");
    const errs = validate();
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }
    setLoading(true);
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
      await axios.post(`${API_BASE}/retailers`, payload, { headers: getAuthHeaders() });
      setMessage(createLogin
        ? "Retailer added with login credentials!"
        : "Retailer added successfully!");
      setForm({ name: "", address1: "", address2: "", phone: "", assignedTo: "", dayAssigned: "", email: "", password: "" });
      setConfirmPassword(""); setCreateLogin(false); setFieldErrors({});
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add retailer");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setImportMessage(""); setImportError("");
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!file) { setImportError("Please select a file"); return; }
    setImportLoading(true); setImportError(""); setImportMessage("");
    setImportProgress({ current: 0, total: 0 });
    const formData = new FormData();
    formData.append("file", file);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/retailers/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
            if (data.type === "progress") setImportProgress({ current: data.current, total: data.total });
            else if (data.type === "result") {
              setImportMessage(`Successfully imported ${data.importedCount} retailers. ${data.errorCount} records had errors.`);
              if (data.errorCount > 0) setImportError(`Some rows had errors:\n${data.errors?.join(";\n") || ""}`);
            } else if (data.type === "error") setImportError(data.message || "Failed to import retailers");
          } catch {}
        }
      }
      setFile(null);
      const fi = document.getElementById("fileInput");
      if (fi) fi.value = "";
    } catch (err) {
      setImportError(err.message || "Failed to import retailers");
    } finally {
      setImportLoading(false);
    }
  };

  const retailerLabel = getModuleName("retailer");
  const retailersLabel = getModuleName("retailer", "plural");

  return (
    <Layout>
      <PageWrapper>
        <PageHeader>
          <HeaderLeft>
            <BackBtn onClick={() => navigate("/admin/view-retailer")}>← Back</BackBtn>
            <div>
              <PageTitle>Add {retailerLabel}</PageTitle>
              <PageSubtitle>Create a new {retailerLabel.toLowerCase()} account</PageSubtitle>
            </div>
          </HeaderLeft>
        </PageHeader>

        <TabRow>
          <Tab active={activeTab === "manual"} onClick={() => setActiveTab("manual")}>
            ✏️ Manual Entry
          </Tab>
          <Tab active={activeTab === "excel"} onClick={() => setActiveTab("excel")}>
            📊 Excel Import
          </Tab>
        </TabRow>

        {activeTab === "manual" && (
          <Card>
            <CardHeader>
              <CardTitle>Retailer Details</CardTitle>
              <CardSubtitle>Fill in the information below to add a {retailerLabel.toLowerCase()}</CardSubtitle>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <Section>
                <SectionLabel>Basic Information</SectionLabel>
                <FormGrid>
                  <FieldGroup fullWidth>
                    <Label>Retailer Name <Required>*</Required></Label>
                    <Input type="text" placeholder="Enter retailer / shop name"
                      value={form.name} onChange={(e) => handleChange("name", e.target.value)}
                      hasError={!!fieldErrors.name} />
                    {fieldErrors.name && <FieldError>{fieldErrors.name}</FieldError>}
                  </FieldGroup>
                  <FieldGroup fullWidth>
                    <Label>Address Line 1 <Required>*</Required></Label>
                    <Input type="text" placeholder="Street, building, area"
                      value={form.address1} onChange={(e) => handleChange("address1", e.target.value)}
                      hasError={!!fieldErrors.address1} />
                    {fieldErrors.address1 && <FieldError>{fieldErrors.address1}</FieldError>}
                  </FieldGroup>
                  <FieldGroup fullWidth>
                    <Label>Address Line 2 <Optional>(optional)</Optional></Label>
                    <Input type="text" placeholder="Landmark, city, pincode"
                      value={form.address2} onChange={(e) => handleChange("address2", e.target.value)} />
                  </FieldGroup>
                  <FieldGroup fullWidth>
                    <Label>WhatsApp / Mobile Number <Optional>(for receipt delivery)</Optional></Label>
                    <Input
                      type="tel"
                      placeholder="10-digit mobile number e.g. 9876543210"
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                      hasError={!!fieldErrors.phone}
                    />
                    {fieldErrors.phone && <FieldError>{fieldErrors.phone}</FieldError>}
                  </FieldGroup>
                </FormGrid>
              </Section>

              <Divider />

              <Section>
                <SectionLabel>Assignment</SectionLabel>
                <FormGrid>
                  <FieldGroup>
                    <Label>Assign To Staff</Label>
                    <StyledSelect value={form.assignedTo} onChange={(e) => handleChange("assignedTo", e.target.value)}>
                      <option value="">— Select staff member —</option>
                      {staffList.map((s) => (
                        <option key={s._id} value={s._id}>{s.name || s.email}</option>
                      ))}
                    </StyledSelect>
                  </FieldGroup>
                  <FieldGroup>
                    <Label>Collection Day</Label>
                    <StyledSelect value={form.dayAssigned} onChange={(e) => handleChange("dayAssigned", e.target.value)}>
                      <option value="">— Select day —</option>
                      {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </StyledSelect>
                  </FieldGroup>
                </FormGrid>
              </Section>

              <Divider />

              <Section>
                <ToggleSection onClick={() => { setCreateLogin((v) => !v); setFieldErrors({}); }}>
                  <ToggleInfo>
                    <ToggleTitle>Create Login Account</ToggleTitle>
                    <ToggleDesc>Give this retailer portal access with an email &amp; password</ToggleDesc>
                  </ToggleInfo>
                  <ToggleSwitch active={createLogin}>
                    <ToggleKnob active={createLogin} />
                  </ToggleSwitch>
                </ToggleSection>

                {createLogin && (
                  <CredentialsBox>
                    <SectionLabel style={{ marginBottom: "1rem" }}>Login Credentials</SectionLabel>
                    <FormGrid>
                      <FieldGroup fullWidth>
                        <Label>Email / Login ID <Required>*</Required></Label>
                        <InputWithIcon>
                          <InputIcon>✉</InputIcon>
                          <InputPadded type="email" placeholder="retailer@example.com"
                            value={form.email} onChange={(e) => handleChange("email", e.target.value)}
                            hasError={!!fieldErrors.email} />
                        </InputWithIcon>
                        {fieldErrors.email && <FieldError>{fieldErrors.email}</FieldError>}
                      </FieldGroup>
                      <FieldGroup>
                        <Label>Password <Required>*</Required></Label>
                        <InputWithIcon>
                          <InputIcon>🔒</InputIcon>
                          <InputPadded type={showPassword ? "text" : "password"} placeholder="Min. 6 characters"
                            value={form.password} onChange={(e) => handleChange("password", e.target.value)}
                            hasError={!!fieldErrors.password} />
                          <EyeBtn type="button" onClick={() => setShowPassword((v) => !v)}>
                            {showPassword ? "🙈" : "👁"}
                          </EyeBtn>
                        </InputWithIcon>
                        {fieldErrors.password && <FieldError>{fieldErrors.password}</FieldError>}
                      </FieldGroup>
                      <FieldGroup>
                        <Label>Confirm Password <Required>*</Required></Label>
                        <InputWithIcon>
                          <InputIcon>🔒</InputIcon>
                          <InputPadded type={showPassword ? "text" : "password"} placeholder="Re-enter password"
                            value={confirmPassword}
                            onChange={(e) => { setConfirmPassword(e.target.value); if (fieldErrors.confirmPassword) setFieldErrors((p) => ({ ...p, confirmPassword: "" })); }}
                            hasError={!!fieldErrors.confirmPassword} />
                        </InputWithIcon>
                        {fieldErrors.confirmPassword && <FieldError>{fieldErrors.confirmPassword}</FieldError>}
                      </FieldGroup>
                    </FormGrid>
                    <InfoNote>ℹ The retailer will use this email and password to log into the portal.</InfoNote>
                  </CredentialsBox>
                )}
              </Section>

              {message && <SuccessBanner>{message}</SuccessBanner>}
              {error && <ErrorBanner>{error}</ErrorBanner>}

              <FormActions>
                <CancelBtn type="button" onClick={() => navigate("/admin/view-retailer")}>Cancel</CancelBtn>
                <SubmitBtn type="submit" disabled={loading}>
                  {loading && <Spinner />}
                  {loading ? "Saving..." : `Add ${retailerLabel}`}
                </SubmitBtn>
              </FormActions>
            </form>
          </Card>
        )}

        {activeTab === "excel" && (
          <Card>
            <CardHeader>
              <CardTitle>Import {retailersLabel} from Excel</CardTitle>
              <CardSubtitle>Upload a spreadsheet to add multiple {retailersLabel.toLowerCase()} at once</CardSubtitle>
            </CardHeader>

            <form onSubmit={handleImport}>
              <Section>
                <DropZone onClick={() => document.getElementById("fileInput").click()} hasFile={!!file}>
                  <DropIcon>{file ? "📄" : "📂"}</DropIcon>
                  <DropText>{file ? file.name : "Click to choose an Excel file"}</DropText>
                  <DropHint>{file ? "Click to change file" : "Supports .xlsx and .xls"}</DropHint>
                  <FileInputHidden id="fileInput" type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
                </DropZone>

                {importLoading && importProgress.total > 0 && (
                  <ProgressWrap>
                    <ProgressHeader>
                      <span>Importing...</span>
                      <span>{importProgress.current} / {importProgress.total}</span>
                    </ProgressHeader>
                    <ProgressBar>
                      <ProgressFill pct={Math.round((importProgress.current / importProgress.total) * 100)} />
                    </ProgressBar>
                  </ProgressWrap>
                )}

                <TemplateNote>
                  <strong>Required columns:</strong> Retailer Name, Address 1 &nbsp;|&nbsp;
                  <strong>Optional:</strong> Address 2, Assigned To, Day Assigned
                </TemplateNote>
              </Section>

              {importMessage && <SuccessBanner style={{ margin: "0 1.5rem" }}>{importMessage}</SuccessBanner>}
              {importError && <ErrorBanner style={{ margin: "0 1.5rem" }}>{importError}</ErrorBanner>}

              <FormActions>
                <CancelBtn type="button" onClick={() => { setFile(null); setImportError(""); setImportMessage(""); }}>Clear</CancelBtn>
                <SubmitBtn type="submit" disabled={importLoading || !file}>
                  {importLoading && <Spinner />}
                  {importLoading ? "Uploading..." : `Upload ${retailersLabel}`}
                </SubmitBtn>
              </FormActions>
            </form>
          </Card>
        )}
      </PageWrapper>
    </Layout>
  );
};

/* ─── Animations ─── */
const spin = keyframes`to { transform: rotate(360deg); }`;

/* ─── Styled Components ─── */

const PageWrapper = styled.div`
  max-width: 780px;
  margin: 0 auto;
  padding: 1.5rem 1rem 3rem;
`;

const PageHeader = styled.div`
  display: flex;
  align-items: flex-start;
  margin-bottom: 1.5rem;
`;

const HeaderLeft = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 1rem;
`;

const BackBtn = styled.button`
  margin-top: 4px;
  padding: 0.4rem 0.9rem;
  background: var(--nb-white);
  color: var(--nb-ink);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--nb-shadow-sm);
  white-space: nowrap;
  transition: box-shadow var(--nb-transition);
  &:hover { box-shadow: var(--nb-shadow-md); }
`;

const PageTitle = styled.h1`
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--nb-ink);
  margin: 0;
`;

const PageSubtitle = styled.p`
  font-size: 0.88rem;
  color: var(--nb-ink);
  opacity: 0.6;
  margin: 2px 0 0;
`;

const TabRow = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const Tab = styled.button`
  flex: 1;
  padding: 0.7rem 1rem;
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--nb-transition);
  background: ${(p) => (p.active ? "var(--nb-blue)" : "var(--nb-white)")};
  color: ${(p) => (p.active ? "var(--nb-white)" : "var(--nb-ink)")};
  box-shadow: ${(p) => (p.active ? "var(--nb-shadow-md)" : "var(--nb-shadow-sm)")};
`;

const Card = styled.div`
  background: var(--nb-white);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius-lg);
  box-shadow: var(--nb-shadow-md);
  overflow: hidden;
`;

const CardHeader = styled.div`
  background: var(--nb-blue);
  padding: 1.25rem 1.5rem;
`;

const CardTitle = styled.h2`
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--nb-white);
  margin: 0;
`;

const CardSubtitle = styled.p`
  font-size: 0.83rem;
  color: var(--nb-white);
  opacity: 0.8;
  margin: 4px 0 0;
`;

const Section = styled.div`
  padding: 1.5rem;
`;

const SectionLabel = styled.p`
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--nb-blue);
  margin: 0 0 1rem;
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid var(--nb-border);
  margin: 0;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;

const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  grid-column: ${(p) => (p.fullWidth ? "1 / -1" : "auto")};
`;

const Label = styled.label`
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--nb-ink);
`;

const Required = styled.span`
  color: var(--nb-orange);
  margin-left: 2px;
`;

const Optional = styled.span`
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--nb-ink);
  opacity: 0.5;
  margin-left: 4px;
`;

const sharedInput = `
  width: 100%;
  padding: 0.6rem 0.85rem;
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius);
  font-size: 0.9rem;
  font-family: inherit;
  background: var(--nb-white);
  color: var(--nb-ink);
  transition: border-color 120ms ease, box-shadow 120ms ease;
  outline: none;
  &:focus {
    border-color: var(--nb-blue);
    box-shadow: 0 0 0 3px rgba(70, 92, 136, 0.15);
  }
`;

const Input = styled.input`
  ${sharedInput}
  border-color: ${(p) => (p.hasError ? "var(--nb-orange)" : "var(--nb-border)")};
`;

const StyledSelect = styled.select`
  ${sharedInput}
  cursor: pointer;
`;

const InputWithIcon = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const InputIcon = styled.span`
  position: absolute;
  left: 0.75rem;
  font-size: 0.9rem;
  pointer-events: none;
  opacity: 0.6;
`;

const EyeBtn = styled.button`
  position: absolute;
  right: 0.6rem;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  padding: 0;
  opacity: 0.6;
  &:hover { opacity: 1; }
`;

const InputPadded = styled.input`
  ${sharedInput}
  padding-left: 2.1rem;
  padding-right: 2.1rem;
  border-color: ${(p) => (p.hasError ? "var(--nb-orange)" : "var(--nb-border)")};
`;

const FieldError = styled.span`
  font-size: 0.78rem;
  color: var(--nb-orange);
  font-weight: 500;
`;

const ToggleSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius);
  background: var(--nb-white);
  cursor: pointer;
  box-shadow: var(--nb-shadow-sm);
  user-select: none;
`;

const ToggleInfo = styled.div``;

const ToggleTitle = styled.p`
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--nb-ink);
  margin: 0;
`;

const ToggleDesc = styled.p`
  font-size: 0.8rem;
  color: var(--nb-ink);
  opacity: 0.6;
  margin: 2px 0 0;
`;

const ToggleSwitch = styled.div`
  width: 48px;
  height: 26px;
  border-radius: 13px;
  border: 1px solid var(--nb-border);
  background: ${(p) => (p.active ? "var(--nb-blue)" : "var(--nb-white)")};
  position: relative;
  flex-shrink: 0;
  transition: background 120ms ease;
  box-shadow: var(--nb-shadow-sm);
`;

const ToggleKnob = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--nb-ink);
  position: absolute;
  top: 3px;
  left: ${(p) => (p.active ? "calc(100% - 19px)" : "3px")};
  transition: left 120ms ease;
`;

const CredentialsBox = styled.div`
  margin-top: 1rem;
  padding: 1.25rem;
  border: 2px dashed var(--nb-blue);
  border-radius: var(--nb-radius);
  background: rgba(70, 92, 136, 0.04);
`;

const InfoNote = styled.p`
  margin-top: 1rem;
  font-size: 0.8rem;
  color: var(--nb-blue);
  font-weight: 500;
  padding: 0.6rem 0.9rem;
  background: rgba(70, 92, 136, 0.08);
  border-radius: var(--nb-radius-sm);
  border-left: 3px solid var(--nb-blue);
`;

const SuccessBanner = styled.div`
  margin: 0 1.5rem;
  padding: 0.8rem 1rem;
  background: rgba(70, 92, 136, 0.1);
  border: 1px solid var(--nb-blue);
  border-radius: var(--nb-radius);
  color: var(--nb-blue);
  font-size: 0.875rem;
  font-weight: 600;
`;

const ErrorBanner = styled.div`
  margin: 0 1.5rem;
  padding: 0.8rem 1rem;
  background: rgba(255, 122, 48, 0.08);
  border: 1px solid var(--nb-orange);
  border-radius: var(--nb-radius);
  color: var(--nb-orange);
  font-size: 0.875rem;
  font-weight: 600;
  white-space: pre-line;
`;

const FormActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid var(--nb-border);
  background: rgba(0, 0, 0, 0.02);
`;

const CancelBtn = styled.button`
  padding: 0.65rem 1.4rem;
  background: var(--nb-white);
  color: var(--nb-ink);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--nb-shadow-sm);
  transition: box-shadow var(--nb-transition);
  &:hover { box-shadow: var(--nb-shadow-md); }
`;

const SubmitBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.6rem;
  background: var(--nb-blue);
  color: var(--nb-white);
  border: 1px solid var(--nb-border);
  border-radius: var(--nb-radius);
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: var(--nb-shadow-md);
  transition: box-shadow var(--nb-transition), opacity var(--nb-transition);
  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &:not(:disabled):hover { box-shadow: var(--nb-shadow-lg); }
`;

const Spinner = styled.div`
  width: 14px;
  height: 14px;
  border: 1px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;

const DropZone = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2.5rem 1.5rem;
  border: 2px dashed ${(p) => (p.hasFile ? "var(--nb-blue)" : "var(--nb-border)")};
  border-radius: var(--nb-radius);
  cursor: pointer;
  background: ${(p) => (p.hasFile ? "rgba(70,92,136,0.05)" : "transparent")};
  transition: all var(--nb-transition);
  &:hover { border-color: var(--nb-blue); background: rgba(70, 92, 136, 0.04); }
`;

const DropIcon = styled.div`font-size: 2.5rem;`;

const DropText = styled.p`
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--nb-ink);
  margin: 0;
`;

const DropHint = styled.p`
  font-size: 0.8rem;
  color: var(--nb-ink);
  opacity: 0.5;
  margin: 0;
`;

const FileInputHidden = styled.input`display: none;`;

const ProgressWrap = styled.div`margin-top: 1rem;`;

const ProgressHeader = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--nb-ink);
  margin-bottom: 0.4rem;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: var(--nb-border);
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid var(--nb-border);
`;

const ProgressFill = styled.div`
  height: 100%;
  background: var(--nb-blue);
  width: ${(p) => p.pct || 0}%;
  transition: width 0.3s ease;
`;

const TemplateNote = styled.p`
  margin-top: 1rem;
  font-size: 0.82rem;
  color: var(--nb-ink);
  opacity: 0.7;
  text-align: center;
`;

export default RetailerAdd;
