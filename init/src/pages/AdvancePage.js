import React, { useState, useEffect } from "react";
import styled from "styled-components";
import axios from "axios";
import Layout from "../components/Layout";
import { fmtDate } from "../utils/dateFormat";

const AdvancePage = () => {
  const [advances, setAdvances] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("All");
  const [formData, setFormData] = useState({
    staffId: "",
    staffName: "",
    advanceAmount: "",
    advanceDate: new Date().toISOString().split("T")[0],
    reason: "",
    notes: "",
  });

  useEffect(() => {
    fetchAdvances();
    fetchUsers();
  }, []);

  const fetchAdvances = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "https://backend.laxmilube.in/api/advances",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setAdvances(response.data);
    } catch (error) {
      console.error("Error fetching advances:", error);
      alert("Failed to fetch advances");
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "https://backend.laxmilube.in/api/users",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      // Filter to show only staff members, not admin
      const staffMembers = response.data.filter(
        (user) => user.role === "staff",
      );
      setUsers(staffMembers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleStaffChange = (e) => {
    const staffId = e.target.value;
    const selectedUser = users.find((u) => u._id === staffId);

    setFormData({
      ...formData,
      staffId,
      staffName: selectedUser ? selectedUser.name : "",
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.staffId || !formData.advanceAmount) {
      alert("Please fill all required fields");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      if (editingId) {
        await axios.put(
          `https://backend.laxmilube.in/api/advances/${editingId}`,
          formData,
          config,
        );
        alert("Advance updated successfully");
      } else {
        await axios.post(
          "https://backend.laxmilube.in/api/advances",
          formData,
          config,
        );
        alert("Advance added successfully");
      }

      resetForm();
      fetchAdvances();
      setShowForm(false);
    } catch (error) {
      console.error("Error saving advance:", error);
      alert(error.response?.data?.message || "Failed to save advance");
    }
  };

  const handleEdit = (advance) => {
    if (advance.status === "Adjusted") {
      alert("Cannot edit adjusted advance");
      return;
    }

    setFormData({
      staffId: advance.staffId,
      staffName: advance.staffName,
      advanceAmount: advance.advanceAmount,
      advanceDate: advance.advanceDate.split("T")[0],
      reason: advance.reason,
      notes: advance.notes,
    });
    setEditingId(advance._id);
    setShowForm(true);
  };

  const handleDelete = async (id, status) => {
    if (status === "Adjusted") {
      alert(
        "Cannot delete adjusted advance. Please delete the associated salary first.",
      );
      return;
    }

    if (!window.confirm("Are you sure you want to delete this advance?"))
      return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`https://backend.laxmilube.in/api/advances/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Advance deleted successfully");
      fetchAdvances();
    } catch (error) {
      console.error("Error deleting advance:", error);
      alert(error.response?.data?.message || "Failed to delete advance");
    }
  };

  const resetForm = () => {
    setFormData({
      staffId: "",
      staffName: "",
      advanceAmount: "",
      advanceDate: new Date().toISOString().split("T")[0],
      reason: "",
      notes: "",
    });
    setEditingId(null);
  };

  const getStatusColor = (status) => {
    return status === "Open" ? "var(--nb-orange)" : "var(--nb-blue)";
  };

  const getFilteredAdvances = () => {
    if (filterStatus === "All") return advances;
    return advances.filter((adv) => adv.status === filterStatus);
  };

  const getTotalAdvances = () => {
    const filtered = getFilteredAdvances();
    return filtered.reduce((sum, adv) => sum + adv.advanceAmount, 0);
  };

  const getOpenAdvancesTotal = () => {
    return advances
      .filter((adv) => adv.status === "Open")
      .reduce((sum, adv) => sum + adv.advanceAmount, 0);
  };

  return (
    <Layout>
      <Container>
        <Header>
          <Title>Advance Management</Title>
          <AddButton
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
          >
            {showForm ? "✕ Close" : "+ Add Advance"}
          </AddButton>
        </Header>

        <SummaryCards>
          <SummaryCard color="var(--nb-orange)">
            <SummaryLabel>Open Advances</SummaryLabel>
            <SummaryValue>₹ {getOpenAdvancesTotal().toFixed(2)}</SummaryValue>
            <SummaryCount>
              {advances.filter((adv) => adv.status === "Open").length} records
            </SummaryCount>
          </SummaryCard>

          <SummaryCard color="var(--nb-blue)">
            <SummaryLabel>Adjusted Advances</SummaryLabel>
            <SummaryValue>
              ₹{" "}
              {advances
                .filter((adv) => adv.status === "Adjusted")
                .reduce((sum, adv) => sum + adv.advanceAmount, 0)
                .toFixed(2)}
            </SummaryValue>
            <SummaryCount>
              {advances.filter((adv) => adv.status === "Adjusted").length}{" "}
              records
            </SummaryCount>
          </SummaryCard>

          <SummaryCard color="var(--nb-blue)">
            <SummaryLabel>Total Advances</SummaryLabel>
            <SummaryValue>
              ₹{" "}
              {advances
                .reduce((sum, adv) => sum + adv.advanceAmount, 0)
                .toFixed(2)}
            </SummaryValue>
            <SummaryCount>{advances.length} records</SummaryCount>
          </SummaryCard>
        </SummaryCards>

        {showForm && (
          <FormCard>
            <FormTitle>
              {editingId ? "Edit Advance" : "Add New Advance"}
            </FormTitle>
            <Form onSubmit={handleSubmit}>
              <FormRow>
                <FormGroup>
                  <Label>Staff Member *</Label>
                  <Select
                    name="staffId"
                    value={formData.staffId}
                    onChange={handleStaffChange}
                    required
                  >
                    <option value="">Select Staff</option>
                    {users.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.name} - {user.role}
                      </option>
                    ))}
                  </Select>
                </FormGroup>

                <FormGroup>
                  <Label>Advance Amount *</Label>
                  <Input
                    type="number"
                    name="advanceAmount"
                    value={formData.advanceAmount}
                    onChange={handleInputChange}
                    placeholder="Enter amount"
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Advance Date *</Label>
                  <Input
                    type="date"
                    name="advanceDate"
                    value={formData.advanceDate}
                    onChange={handleInputChange}
                    required
                  />
                </FormGroup>
              </FormRow>

              <FormGroup>
                <Label>Reason</Label>
                <Input
                  type="text"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  placeholder="Enter reason for advance"
                />
              </FormGroup>

              <FormGroup>
                <Label>Notes</Label>
                <TextArea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Enter any additional notes..."
                  rows="3"
                />
              </FormGroup>

              <ButtonGroup>
                <SubmitButton type="submit">
                  {editingId ? "Update Advance" : "Save Advance"}
                </SubmitButton>
                <CancelButton
                  type="button"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                >
                  Cancel
                </CancelButton>
              </ButtonGroup>
            </Form>
          </FormCard>
        )}

        <TableCard>
          <TableHeader>
            <TableTitle>Advance Records</TableTitle>
            <FilterGroup>
              <FilterLabel>Filter:</FilterLabel>
              <FilterSelect
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All">All</option>
                <option value="Open">Open</option>
                <option value="Adjusted">Adjusted</option>
              </FilterSelect>
              <FilterInfo>
                Showing: {getFilteredAdvances().length} records | Total: ₹{" "}
                {getTotalAdvances().toFixed(2)}
              </FilterInfo>
            </FilterGroup>
          </TableHeader>

          <Table>
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Staff Name</Th>
                <Th>Amount</Th>
                <Th>Reason</Th>
                <Th>Status</Th>
                <Th>Adjusted In</Th>
                <Th>Notes</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {getFilteredAdvances().length === 0 ? (
                <tr>
                  <Td
                    colSpan="8"
                    style={{ textAlign: "center", padding: "30px" }}
                  >
                    No advance records found
                  </Td>
                </tr>
              ) : (
                getFilteredAdvances().map((advance) => (
                  <tr key={advance._id}>
                    <Td>
                      {fmtDate(advance.advanceDate)}
                    </Td>
                    <Td>{advance.staffName}</Td>
                    <Td
                      style={{ fontWeight: "600", color: "var(--nb-orange)" }}
                    >
                      ₹ {advance.advanceAmount.toFixed(2)}
                    </Td>
                    <Td>{advance.reason || "-"}</Td>
                    <Td>
                      <StatusBadge color={getStatusColor(advance.status)}>
                        {advance.status}
                      </StatusBadge>
                    </Td>
                    <Td>
                      {advance.status === "Adjusted" && advance.adjustedMonth
                        ? `${getMonthName(advance.adjustedMonth)} ${advance.adjustedYear}`
                        : "-"}
                    </Td>
                    <Td>{advance.notes || "-"}</Td>
                    <Td>
                      <ActionButton
                        onClick={() => handleEdit(advance)}
                        disabled={advance.status === "Adjusted"}
                      >
                        Edit
                      </ActionButton>
                      <DeleteButton
                        onClick={() =>
                          handleDelete(advance._id, advance.status)
                        }
                      >
                        Delete
                      </DeleteButton>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </TableCard>
      </Container>
    </Layout>
  );
};

// Helper function
const getMonthName = (month) => {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  return months[month - 1];
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
`;

const Title = styled.h1`
  font-size: 28px;
  color: var(--nb-ink);
  margin: 0;
  font-weight: 600;
`;

const AddButton = styled.button`
  background: var(--nb-blue);
  color: var(--nb-white);
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;

  &:hover {
    background: var(--nb-blue);
    transform: translateY(-2px);
    box-shadow: var(--nb-shadow-md);
  }
`;

const SummaryCards = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 25px;
`;

const SummaryCard = styled.div`
  background: var(--nb-white);
  border-radius: 8px;
  padding: 20px;
  box-shadow: var(--nb-shadow-md);
  border-left: 4px solid ${(props) => props.color};
`;

const SummaryLabel = styled.div`
  font-size: 13px;
  color: var(--nb-ink);
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 8px;
`;

const SummaryValue = styled.div`
  font-size: 24px;
  color: var(--nb-ink);
  font-weight: 700;
  margin-bottom: 5px;
`;

const SummaryCount = styled.div`
  font-size: 12px;
  color: var(--nb-ink);
`;

const FormCard = styled.div`
  background: var(--nb-white);
  border-radius: 8px;
  padding: 25px;
  margin-bottom: 25px;
  box-shadow: var(--nb-shadow-md);
  border: 1px solid var(--nb-border);
`;

const FormTitle = styled.h2`
  font-size: 20px;
  color: var(--nb-ink);
  margin: 0 0 20px 0;
  font-weight: 600;
`;

const Form = styled.form``;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 15px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 15px;
`;

const Label = styled.label`
  font-size: 13px;
  color: var(--nb-ink);
  margin-bottom: 6px;
  font-weight: 500;
`;

const Input = styled.input`
  padding: 10px 12px;
  border: 1px solid var(--nb-border);
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.3s;

  &:focus {
    outline: none;
    border-color: var(--nb-blue);
  }
`;

const Select = styled.select`
  padding: 10px 12px;
  border: 1px solid var(--nb-border);
  border-radius: 4px;
  font-size: 14px;
  background: var(--nb-white);
  cursor: pointer;
  transition: border-color 0.3s;

  &:focus {
    outline: none;
    border-color: var(--nb-blue);
  }
`;

const TextArea = styled.textarea`
  padding: 10px 12px;
  border: 1px solid var(--nb-border);
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  transition: border-color 0.3s;

  &:focus {
    outline: none;
    border-color: var(--nb-blue);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 20px;
`;

const SubmitButton = styled.button`
  background: var(--nb-blue);
  color: var(--nb-white);
  border: none;
  padding: 12px 30px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;

  &:hover {
    background: var(--nb-blue);
    transform: translateY(-2px);
    box-shadow: var(--nb-shadow-md);
  }
`;

const CancelButton = styled.button`
  background: var(--nb-ink);
  color: var(--nb-white);
  border: none;
  padding: 12px 30px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s;

  &:hover {
    background: var(--nb-ink);
  }
`;

const TableCard = styled.div`
  background: var(--nb-white);
  border-radius: 8px;
  padding: 25px;
  box-shadow: var(--nb-shadow-md);
  border: 1px solid var(--nb-border);
  overflow-x: auto;
`;

const TableHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 15px;
`;

const TableTitle = styled.h2`
  font-size: 18px;
  color: var(--nb-ink);
  margin: 0;
  font-weight: 600;
`;

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const FilterLabel = styled.span`
  font-size: 13px;
  color: var(--nb-ink);
  font-weight: 500;
`;

const FilterSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid var(--nb-border);
  border-radius: 4px;
  font-size: 13px;
  background: var(--nb-white);
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--nb-blue);
  }
`;

const FilterInfo = styled.span`
  font-size: 12px;
  color: var(--nb-ink);
  margin-left: 10px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
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
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--nb-white);
  background: ${(props) => props.color};
`;

const ActionButton = styled.button`
  background: var(--nb-blue);
  color: var(--nb-white);
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-right: 5px;
  transition: all 0.3s;

  &:hover {
    background: var(--nb-blue);
  }

  &:disabled {
    background: var(--nb-border);
    cursor: not-allowed;
  }
`;

const DeleteButton = styled.button`
  background: var(--nb-orange);
  color: var(--nb-white);
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;

  &:hover {
    background: var(--nb-orange);
  }
`;

export default AdvancePage;
