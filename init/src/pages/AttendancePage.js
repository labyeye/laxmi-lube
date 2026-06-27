import React, { useState, useEffect } from "react";
import styled from "styled-components";
import axios from "axios";
import Layout from "../components/Layout";
import {
  FaCalendarAlt,
  FaCheck,
  FaTimes,
  FaClock,
  FaFileExport,
  FaEdit,
  FaTrash,
  FaSave,
} from "react-icons/fa";

const AttendancePage = () => {
  const [view, setView] = useState("daily"); // daily or monthly
  const [users, setUsers] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [attendance, setAttendance] = useState([]);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form state for daily attendance
  const [formData, setFormData] = useState({
    status: "Present",
    inTime: "",
    outTime: "",
    remarks: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (selectedStaff) {
      if (view === "daily") {
        fetchDailyAttendance();
      } else {
        fetchMonthlyAttendance();
      }
    }
  }, [selectedStaff, selectedDate, selectedMonth, selectedYear, view]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:2500/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const staffUsers = response.data.filter((user) => user.role === "staff");
      setUsers(staffUsers);
      if (staffUsers.length > 0) {
        setSelectedStaff(staffUsers[0]._id);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      alert("Failed to fetch staff list");
    }
  };

  const fetchDailyAttendance = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:2500/api/attendance/staff/${selectedStaff}/range/${selectedDate}/${selectedDate}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.length > 0) {
        const record = response.data[0];
        setFormData({
          status: record.status,
          inTime: record.inTime || "",
          outTime: record.outTime || "",
          remarks: record.remarks || "",
        });
        setEditingId(record._id);
      } else {
        setFormData({
          status: "Present",
          inTime: "",
          outTime: "",
          remarks: "",
        });
        setEditingId(null);
      }
    } catch (error) {
      console.error("Error fetching daily attendance:", error);
    }
  };

  const fetchMonthlyAttendance = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:2500/api/attendance/summary/${selectedStaff}/${selectedMonth}/${selectedYear}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setMonthlySummary(response.data);
      setAttendance(response.data.attendance || []);
    } catch (error) {
      console.error("Error fetching monthly attendance:", error);
      alert("Failed to fetch monthly attendance");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAttendance = async () => {
    try {
      const token = localStorage.getItem("token");
      const staffUser = users.find((u) => u._id === selectedStaff);

      const payload = {
        staffId: selectedStaff,
        staffName: staffUser?.name || "",
        attendanceDate: selectedDate,
        ...formData,
      };

      if (editingId) {
        // Update existing
        await axios.put(
          `http://localhost:2500/api/attendance/${editingId}`,
          formData,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        alert("Attendance updated successfully!");
      } else {
        // Create new
        await axios.post("http://localhost:2500/api/attendance", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Attendance saved successfully!");
      }

      fetchDailyAttendance();
    } catch (error) {
      console.error("Error saving attendance:", error);
      alert(error.response?.data?.message || "Failed to save attendance");
    }
  };

  const handleDeleteAttendance = async (id) => {
    if (
      !window.confirm("Are you sure you want to delete this attendance record?")
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:2500/api/attendance/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Attendance deleted successfully!");

      if (view === "daily") {
        fetchDailyAttendance();
      } else {
        fetchMonthlyAttendance();
      }
    } catch (error) {
      console.error("Error deleting attendance:", error);
      alert(error.response?.data?.message || "Failed to delete attendance");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Present":
        return "var(--nb-blue)";
      case "Absent":
        return "var(--nb-orange)";
      case "Half Day":
        return "var(--nb-orange)";
      case "Leave":
        return "var(--nb-blue)";
      default:
        return "var(--nb-ink)";
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      Present: { bg: "var(--nb-muted)", text: "var(--nb-blue)", label: "P" },
      Absent: { bg: "var(--nb-muted)", text: "var(--nb-orange)", label: "A" },
      "Half Day": { bg: "var(--nb-muted)", text: "var(--nb-ink)", label: "H" },
      Leave: { bg: "var(--nb-muted)", text: "var(--nb-ink)", label: "L" },
    };
    const color = colors[status] || colors.Present;
    return (
      <StatusBadge bg={color.bg} color={color.text}>
        {color.label}
      </StatusBadge>
    );
  };

  const exportToExcel = () => {
    if (!monthlySummary || attendance.length === 0) {
      alert("No data to export");
      return;
    }

    const staffUser = users.find((u) => u._id === selectedStaff);
    let csv = `Attendance Report - ${staffUser?.name || "Staff"}\n`;
    csv += `Month: ${monthlySummary.monthName} ${monthlySummary.year}\n\n`;
    csv += `Summary:\n`;
    csv += `Total Days,${monthlySummary.totalDays}\n`;
    csv += `Present Days,${monthlySummary.presentDays}\n`;
    csv += `Absent Days,${monthlySummary.absentDays}\n`;
    csv += `Half Days,${monthlySummary.halfDays}\n`;
    csv += `Leave Days,${monthlySummary.leaveDays}\n`;
    csv += `Total Working Hours,${monthlySummary.totalWorkingHours}\n\n`;
    csv += `Date,Status,In Time,Out Time,Working Hours,Remarks\n`;

    attendance.forEach((record) => {
      const date = new Date(record.attendanceDate).toLocaleDateString();
      csv += `${date},${record.status},${record.inTime || "-"},${record.outTime || "-"},${record.workingHours || 0},${record.remarks || ""}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Attendance_${staffUser?.name}_${monthlySummary.monthName}_${monthlySummary.year}.csv`;
    a.click();
  };

  return (
    <Layout>
      <Container>
        <Header>
          <Title>
            <FaCalendarAlt /> Attendance Management
          </Title>
          <ViewToggle>
            <ToggleButton
              active={view === "daily"}
              onClick={() => setView("daily")}
            >
              Daily Entry
            </ToggleButton>
            <ToggleButton
              active={view === "monthly"}
              onClick={() => setView("monthly")}
            >
              Monthly Summary
            </ToggleButton>
          </ViewToggle>
        </Header>

        <FiltersCard>
          <FilterGroup>
            <Label>Select Staff</Label>
            <Select
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
            >
              <option value="">-- Select Staff --</option>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name}
                </option>
              ))}
            </Select>
          </FilterGroup>

          {view === "daily" ? (
            <FilterGroup>
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </FilterGroup>
          ) : (
            <>
              <FilterGroup>
                <Label>Month</Label>
                <Select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleString("default", {
                        month: "long",
                      })}
                    </option>
                  ))}
                </Select>
              </FilterGroup>
              <FilterGroup>
                <Label>Year</Label>
                <Select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  {[...Array(5)].map((_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </Select>
              </FilterGroup>
            </>
          )}
        </FiltersCard>

        {view === "daily" ? (
          <DailyEntryCard>
            <CardTitle>Daily Attendance Entry</CardTitle>
            <FormGrid>
              <FormGroup>
                <Label>Status *</Label>
                <StatusButtonGroup>
                  {["Present", "Absent", "Half Day", "Leave"].map((status) => (
                    <StatusButton
                      key={status}
                      active={formData.status === status}
                      color={getStatusColor(status)}
                      onClick={() => setFormData({ ...formData, status })}
                    >
                      {status === "Present" && <FaCheck />}
                      {status === "Absent" && <FaTimes />}
                      {status === "Half Day" && <FaClock />}
                      {status === "Leave" && <FaCalendarAlt />}
                      <span>{status}</span>
                    </StatusButton>
                  ))}
                </StatusButtonGroup>
              </FormGroup>

              <FormGroup>
                <Label>In Time (Optional)</Label>
                <Input
                  type="time"
                  value={formData.inTime}
                  onChange={(e) =>
                    setFormData({ ...formData, inTime: e.target.value })
                  }
                />
              </FormGroup>

              <FormGroup>
                <Label>Out Time (Optional)</Label>
                <Input
                  type="time"
                  value={formData.outTime}
                  onChange={(e) =>
                    setFormData({ ...formData, outTime: e.target.value })
                  }
                />
              </FormGroup>

              <FormGroup fullWidth>
                <Label>Remarks / Notes</Label>
                <TextArea
                  rows="3"
                  value={formData.remarks}
                  onChange={(e) =>
                    setFormData({ ...formData, remarks: e.target.value })
                  }
                  placeholder="Enter any remarks or notes..."
                />
              </FormGroup>
            </FormGrid>

            <ButtonGroup>
              <SaveButton onClick={handleSaveAttendance}>
                <FaSave /> {editingId ? "Update" : "Save"} Attendance
              </SaveButton>
              {editingId && (
                <DeleteButton onClick={() => handleDeleteAttendance(editingId)}>
                  <FaTrash /> Delete
                </DeleteButton>
              )}
            </ButtonGroup>
          </DailyEntryCard>
        ) : (
          <>
            {monthlySummary && (
              <>
                <SummaryCards>
                  <SummaryCard color="var(--nb-blue)">
                    <CardValue>{monthlySummary.totalDays}</CardValue>
                    <CardLabel>Total Days</CardLabel>
                  </SummaryCard>
                  <SummaryCard color="var(--nb-blue)">
                    <CardValue>{monthlySummary.presentDays}</CardValue>
                    <CardLabel>Present Days</CardLabel>
                  </SummaryCard>
                  <SummaryCard color="var(--nb-orange)">
                    <CardValue>{monthlySummary.absentDays}</CardValue>
                    <CardLabel>Absent Days</CardLabel>
                  </SummaryCard>
                  <SummaryCard color="var(--nb-orange)">
                    <CardValue>{monthlySummary.halfDays}</CardValue>
                    <CardLabel>Half Days</CardLabel>
                  </SummaryCard>
                  <SummaryCard color="var(--nb-blue)">
                    <CardValue>{monthlySummary.leaveDays}</CardValue>
                    <CardLabel>Leave Days</CardLabel>
                  </SummaryCard>
                  <SummaryCard color="var(--nb-blue)">
                    <CardValue>{monthlySummary.totalWorkingHours}</CardValue>
                    <CardLabel>Working Hours</CardLabel>
                  </SummaryCard>
                </SummaryCards>

                <TableCard>
                  <TableHeader>
                    <h3>
                      Monthly Attendance - {monthlySummary.monthName}{" "}
                      {monthlySummary.year}
                    </h3>
                    <ExportButton onClick={exportToExcel}>
                      <FaFileExport /> Export to Excel
                    </ExportButton>
                  </TableHeader>

                  <TableWrapper>
                    <Table>
                      <thead>
                        <tr>
                          <Th>Date</Th>
                          <Th>Day</Th>
                          <Th>Status</Th>
                          <Th>In Time</Th>
                          <Th>Out Time</Th>
                          <Th>Working Hours</Th>
                          <Th>Remarks</Th>
                          <Th>Actions</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendance.length > 0 ? (
                          attendance.map((record) => {
                            const date = new Date(record.attendanceDate);
                            return (
                              <tr key={record._id}>
                                <Td>{date.toLocaleDateString()}</Td>
                                <Td>
                                  {date.toLocaleDateString("en-US", {
                                    weekday: "short",
                                  })}
                                </Td>
                                <Td>{getStatusBadge(record.status)}</Td>
                                <Td>{record.inTime || "-"}</Td>
                                <Td>{record.outTime || "-"}</Td>
                                <Td>{record.workingHours || 0} hrs</Td>
                                <Td>{record.remarks || "-"}</Td>
                                <Td>
                                  <ActionButtons>
                                    <ActionButton
                                      color="var(--nb-blue)"
                                      onClick={() => {
                                        setView("daily");
                                        setSelectedDate(
                                          new Date(record.attendanceDate)
                                            .toISOString()
                                            .split("T")[0],
                                        );
                                      }}
                                    >
                                      <FaEdit />
                                    </ActionButton>
                                    <ActionButton
                                      color="var(--nb-orange)"
                                      onClick={() =>
                                        handleDeleteAttendance(record._id)
                                      }
                                      disabled={record.isLocked}
                                    >
                                      <FaTrash />
                                    </ActionButton>
                                  </ActionButtons>
                                </Td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <Td colSpan="8" style={{ textAlign: "center" }}>
                              No attendance records found for this month
                            </Td>
                          </tr>
                        )}
                      </tbody>
                    </Table>
                  </TableWrapper>
                </TableCard>
              </>
            )}
          </>
        )}
      </Container>
    </Layout>
  );
};

// Styled Components
const Container = styled.div`
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
  flex-wrap: wrap;
  gap: 15px;
`;

const Title = styled.h1`
  font-size: 1.8rem;
  color: var(--nb-ink);
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;

  svg {
    color: var(--nb-blue);
  }
`;

const ViewToggle = styled.div`
  display: flex;
  gap: 10px;
  background: var(--nb-muted);
  padding: 5px;
  border-radius: 8px;
`;

const ToggleButton = styled.button`
  padding: 10px 20px;
  border: none;
  background: ${(props) => (props.active ? "var(--nb-blue)" : "transparent")};
  color: ${(props) => (props.active ? "var(--nb-white)" : "var(--nb-ink)")};
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;

  &:hover {
    background: ${(props) => (props.active ? "var(--nb-blue)" : "var(--nb-muted)")};
  }
`;

const FiltersCard = styled.div`
  background: var(--nb-white);
  padding: 25px;
  border-radius: 10px;
  box-shadow: var(--nb-shadow-md);
  margin-bottom: 25px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-weight: 600;
  color: var(--nb-ink);
  font-size: 0.9rem;
`;

const Select = styled.select`
  padding: 10px 12px;
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  font-size: 0.95rem;
  color: var(--nb-ink);
  background: var(--nb-white);
  cursor: pointer;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--nb-blue);
    box-shadow: var(--nb-shadow-md);
  }
`;

const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  font-size: 0.95rem;
  color: var(--nb-ink);
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--nb-blue);
    box-shadow: var(--nb-shadow-md);
  }
`;

const DailyEntryCard = styled.div`
  background: var(--nb-white);
  padding: 30px;
  border-radius: 10px;
  box-shadow: var(--nb-shadow-md);
`;

const CardTitle = styled.h2`
  font-size: 1.4rem;
  color: var(--nb-ink);
  margin-bottom: 25px;
  padding-bottom: 15px;
  border-bottom: 1px solid var(--nb-border);
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 25px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  grid-column: ${(props) => (props.fullWidth ? "1 / -1" : "auto")};
`;

const StatusButtonGroup = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
`;

const StatusButton = styled.button`
  padding: 12px 16px;
  border: 1px solid ${(props) => (props.active ? props.color : "var(--nb-border)")};
  background: ${(props) => (props.active ? props.color : "var(--nb-white)")};
  color: ${(props) => (props.active ? "var(--nb-white)" : "var(--nb-ink)")};
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--nb-shadow-md);
  }

  svg {
    font-size: 1rem;
  }
`;

const TextArea = styled.textarea`
  padding: 10px 12px;
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  font-size: 0.95rem;
  color: var(--nb-ink);
  font-family: inherit;
  resize: vertical;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: var(--nb-blue);
    box-shadow: var(--nb-shadow-md);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
`;

const SaveButton = styled.button`
  padding: 12px 30px;
  background: var(--nb-blue);
  color: var(--nb-white);
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;

  &:hover {
    background: var(--nb-blue);
    transform: translateY(-2px);
    box-shadow: var(--nb-shadow-md);
  }
`;

const DeleteButton = styled.button`
  padding: 12px 30px;
  background: var(--nb-orange);
  color: var(--nb-white);
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;

  &:hover {
    background: var(--nb-orange);
    transform: translateY(-2px);
    box-shadow: var(--nb-shadow-md);
  }
`;

const SummaryCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 20px;
  margin-bottom: 25px;
`;

const SummaryCard = styled.div`
  background: var(--nb-white);
  padding: 25px;
  border-radius: 10px;
  box-shadow: var(--nb-shadow-md);
  border-left: 4px solid ${(props) => props.color};
  text-align: center;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-5px);
    box-shadow: var(--nb-shadow-md);
  }
`;

const CardValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: var(--nb-ink);
  margin-bottom: 8px;
`;

const CardLabel = styled.div`
  font-size: 0.9rem;
  color: var(--nb-ink);
  font-weight: 500;
`;

const TableCard = styled.div`
  background: var(--nb-white);
  padding: 25px;
  border-radius: 10px;
  box-shadow: var(--nb-shadow-md);
`;

const TableHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;

  h3 {
    font-size: 1.3rem;
    color: var(--nb-ink);
    margin: 0;
  }
`;

const ExportButton = styled.button`
  padding: 10px 20px;
  background: var(--nb-blue);
  color: var(--nb-white);
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.3s ease;

  &:hover {
    background: var(--nb-blue);
    transform: translateY(-2px);
    box-shadow: var(--nb-shadow-md);
  }
`;

const TableWrapper = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
`;

const Th = styled.th`
  background: var(--nb-muted);
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: var(--nb-ink);
  border-bottom: 1px solid var(--nb-border);
  white-space: nowrap;
`;

const Td = styled.td`
  padding: 12px;
  border-bottom: 1px solid var(--nb-border);
  color: var(--nb-ink);
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 6px 12px;
  background: ${(props) => props.bg};
  color: ${(props) => props.color};
  border-radius: 20px;
  font-weight: 700;
  font-size: 0.85rem;
  min-width: 35px;
  text-align: center;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  padding: 8px 12px;
  background: ${(props) => props.color};
  color: var(--nb-white);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  opacity: ${(props) => (props.disabled ? 0.5 : 1)};
  cursor: ${(props) => (props.disabled ? "not-allowed" : "pointer")};

  &:hover {
    opacity: ${(props) => (props.disabled ? 0.5 : 0.8)};
    transform: ${(props) => (props.disabled ? "none" : "scale(1.05)")};
  }

  svg {
    font-size: 0.9rem;
  }
`;

export default AttendancePage;
