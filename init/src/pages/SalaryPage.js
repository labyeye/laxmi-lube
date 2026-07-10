import React, { useState, useEffect } from "react";
import styled from "styled-components";
import axios from "axios";
import Layout from "../components/Layout";
import { fmtDate } from "../utils/dateFormat";

const SalaryPage = () => {
  const [salaries, setSalaries] = useState([]);
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [openAdvances, setOpenAdvances] = useState([]);
  const [formData, setFormData] = useState({
    staffId: "",
    staffName: "",
    salaryMonth: new Date().getMonth() + 1,
    salaryYear: new Date().getFullYear(),
    basicSalary: "",
    paymentMode: "Cash",
    paymentStatus: "Pending",
    paidAmount: "",
    paidDate: "",
    remarks: "",
  });

  useEffect(() => {
    fetchSalaries();
    fetchUsers();
  }, []);

  const fetchSalaries = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:1200/api/salaries",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setSalaries(response.data);
    } catch (error) {
      console.error("Error fetching salaries:", error);
      alert("Failed to fetch salaries");
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "http://localhost:1200/api/users",
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

  const fetchOpenAdvances = async (staffId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:1200/api/advances/open/${staffId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setOpenAdvances(response.data.advances || []);
      return response.data.totalAmount || 0;
    } catch (error) {
      console.error("Error fetching advances:", error);
      return 0;
    }
  };

  const handleStaffChange = async (e) => {
    const staffId = e.target.value;
    const selectedUser = users.find((u) => u._id === staffId);

    setFormData({
      ...formData,
      staffId,
      staffName: selectedUser ? selectedUser.name : "",
    });

    if (staffId) {
      await fetchOpenAdvances(staffId);
    } else {
      setOpenAdvances([]);
    }
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

    if (!formData.staffId || !formData.basicSalary) {
      alert("Please fill all required fields");
      return;
    }

    // Confirmation before marking as paid
    if (formData.paymentStatus === "Paid") {
      const confirm = window.confirm(
        `Are you sure you want to mark salary as PAID?\n\nStaff: ${formData.staffName}\nMonth: ${getMonthName(formData.salaryMonth)} ${formData.salaryYear}\nNet Amount: ₹${calculateNetSalary()}`,
      );
      if (!confirm) return;
    }

    try {
      const token = localStorage.getItem("token");
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      if (editingId) {
        await axios.put(
          `http://localhost:1200/api/salaries/${editingId}`,
          formData,
          config,
        );
        alert("Salary updated successfully");
      } else {
        await axios.post(
          "http://localhost:1200/api/salaries",
          formData,
          config,
        );
        alert("Salary created successfully");
      }

      resetForm();
      fetchSalaries();
      setShowForm(false);
    } catch (error) {
      console.error("Error saving salary:", error);
      alert(error.response?.data?.message || "Failed to save salary");
    }
  };

  const handleEdit = (salary) => {
    setFormData({
      staffId: salary.staffId,
      staffName: salary.staffName,
      salaryMonth: salary.salaryMonth,
      salaryYear: salary.salaryYear,
      basicSalary: salary.basicSalary,
      paymentMode: salary.paymentMode,
      paymentStatus: salary.paymentStatus,
      paidAmount: salary.paidAmount,
      paidDate: salary.paidDate ? salary.paidDate.split("T")[0] : "",
      remarks: salary.remarks,
    });
    setEditingId(salary._id);
    setShowForm(true);
    fetchOpenAdvances(salary.staffId);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this salary record?"))
      return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://localhost:1200/api/salaries/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Salary deleted successfully");
      fetchSalaries();
    } catch (error) {
      console.error("Error deleting salary:", error);
      alert("Failed to delete salary");
    }
  };

  const resetForm = () => {
    setFormData({
      staffId: "",
      staffName: "",
      salaryMonth: new Date().getMonth() + 1,
      salaryYear: new Date().getFullYear(),
      basicSalary: "",
      paymentMode: "Cash",
      paymentStatus: "Pending",
      paidAmount: "",
      paidDate: "",
      remarks: "",
    });
    setEditingId(null);
    setOpenAdvances([]);
  };

  const calculateNetSalary = () => {
    const basic = parseFloat(formData.basicSalary) || 0;
    const advanceTotal = openAdvances.reduce(
      (sum, adv) => sum + adv.advanceAmount,
      0,
    );
    return basic - advanceTotal;
  };

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

  const getStatusColor = (status) => {
    switch (status) {
      case "Paid":
        return "var(--nb-blue)";
      case "Partially Paid":
        return "var(--nb-orange)";
      case "Pending":
        return "var(--nb-orange)";
      default:
        return "var(--nb-ink)";
    }
  };

  return (
    <Layout>
      <Container>
        <Header>
          <Title>Salary Management</Title>
          <AddButton
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
          >
            {showForm ? "✕ Close" : "+ Add Salary"}
          </AddButton>
        </Header>

        {showForm && (
          <FormCard>
            <FormTitle>
              {editingId ? "Edit Salary" : "Add New Salary"}
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
                    disabled={editingId}
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
                  <Label>Month *</Label>
                  <Select
                    name="salaryMonth"
                    value={formData.salaryMonth}
                    onChange={handleInputChange}
                    required
                    disabled={editingId}
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {getMonthName(i + 1)}
                      </option>
                    ))}
                  </Select>
                </FormGroup>

                <FormGroup>
                  <Label>Year *</Label>
                  <Input
                    type="number"
                    name="salaryYear"
                    value={formData.salaryYear}
                    onChange={handleInputChange}
                    required
                    disabled={editingId}
                  />
                </FormGroup>
              </FormRow>

              <FormRow>
                <FormGroup>
                  <Label>Basic Salary *</Label>
                  <Input
                    type="number"
                    name="basicSalary"
                    value={formData.basicSalary}
                    onChange={handleInputChange}
                    placeholder="Enter basic salary"
                    required
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Advance Deducted (Auto)</Label>
                  <ReadOnlyInput
                    type="text"
                    value={`₹ ${openAdvances.reduce((sum, adv) => sum + adv.advanceAmount, 0).toFixed(2)}`}
                    readOnly
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Net Salary Payable</Label>
                  <NetSalaryInput
                    type="text"
                    value={`₹ ${calculateNetSalary().toFixed(2)}`}
                    readOnly
                  />
                </FormGroup>
              </FormRow>

              {openAdvances.length > 0 && (
                <AdvanceList>
                  <AdvanceTitle>
                    Open Advances ({openAdvances.length})
                  </AdvanceTitle>
                  {openAdvances.map((adv) => (
                    <AdvanceItem key={adv._id}>
                      <span>{fmtDate(adv.advanceDate)}</span>
                      <span>{adv.reason || "No reason"}</span>
                      <AdvanceAmount>
                        ₹ {adv.advanceAmount.toFixed(2)}
                      </AdvanceAmount>
                    </AdvanceItem>
                  ))}
                </AdvanceList>
              )}

              <FormRow>
                <FormGroup>
                  <Label>Payment Mode</Label>
                  <Select
                    name="paymentMode"
                    value={formData.paymentMode}
                    onChange={handleInputChange}
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank Transfer</option>
                    <option value="UPI">UPI</option>
                  </Select>
                </FormGroup>

                <FormGroup>
                  <Label>Payment Status</Label>
                  <Select
                    name="paymentStatus"
                    value={formData.paymentStatus}
                    onChange={handleInputChange}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Paid">Paid</option>
                  </Select>
                </FormGroup>

                <FormGroup>
                  <Label>Paid Amount</Label>
                  <Input
                    type="number"
                    name="paidAmount"
                    value={formData.paidAmount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </FormGroup>

                <FormGroup>
                  <Label>Paid Date</Label>
                  <Input
                    type="date"
                    name="paidDate"
                    value={formData.paidDate}
                    onChange={handleInputChange}
                  />
                </FormGroup>
              </FormRow>

              <FormGroup>
                <Label>Remarks</Label>
                <TextArea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleInputChange}
                  placeholder="Enter any remarks..."
                  rows="3"
                />
              </FormGroup>

              <ButtonGroup>
                <SubmitButton type="submit">
                  {editingId ? "Update Salary" : "Save Salary"}
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
          <TableTitle>Salary Records</TableTitle>
          <Table>
            <thead>
              <tr>
                <Th>Month/Year</Th>
                <Th>Staff Name</Th>
                <Th>Basic Salary</Th>
                <Th>Advance Deducted</Th>
                <Th>Net Payable</Th>
                <Th>Paid Amount</Th>
                <Th>Status</Th>
                <Th>Payment Mode</Th>
                <Th>Paid Date</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {salaries.length === 0 ? (
                <tr>
                  <Td
                    colSpan="10"
                    style={{ textAlign: "center", padding: "30px" }}
                  >
                    No salary records found
                  </Td>
                </tr>
              ) : (
                salaries.map((salary) => (
                  <tr key={salary._id}>
                    <Td>
                      {getMonthName(salary.salaryMonth)} {salary.salaryYear}
                    </Td>
                    <Td>{salary.staffName}</Td>
                    <Td>₹ {salary.basicSalary.toFixed(2)}</Td>
                    <Td style={{ color: "var(--nb-orange)" }}>
                      ₹ {salary.advanceDeducted.toFixed(2)}
                    </Td>
                    <Td style={{ fontWeight: "600" }}>
                      ₹ {salary.netSalaryPayable.toFixed(2)}
                    </Td>
                    <Td>₹ {salary.paidAmount.toFixed(2)}</Td>
                    <Td>
                      <StatusBadge color={getStatusColor(salary.paymentStatus)}>
                        {salary.paymentStatus}
                      </StatusBadge>
                    </Td>
                    <Td>{salary.paymentMode}</Td>
                    <Td>{salary.paidDate ? fmtDate(salary.paidDate) : "-"}</Td>
                    <Td>
                      <ActionButton onClick={() => handleEdit(salary)}>
                        Edit
                      </ActionButton>
                      <DeleteButton onClick={() => handleDelete(salary._id)}>
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

const ReadOnlyInput = styled(Input)`
  background: var(--nb-muted);
  color: var(--nb-orange);
  font-weight: 600;
  cursor: not-allowed;
`;

const NetSalaryInput = styled(Input)`
  background: var(--nb-muted);
  color: var(--nb-blue);
  font-weight: 700;
  font-size: 16px;
  cursor: not-allowed;
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

const AdvanceList = styled.div`
  background: var(--nb-muted);
  border: 1px solid var(--nb-orange);
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 15px;
`;

const AdvanceTitle = styled.div`
  font-weight: 600;
  color: var(--nb-ink);
  margin-bottom: 10px;
  font-size: 14px;
`;

const AdvanceItem = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--nb-orange);
  font-size: 13px;
  color: var(--nb-ink);

  &:last-child {
    border-bottom: none;
  }
`;

const AdvanceAmount = styled.span`
  font-weight: 600;
  color: var(--nb-orange);
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

const TableTitle = styled.h2`
  font-size: 18px;
  color: var(--nb-ink);
  margin: 0 0 20px 0;
  font-weight: 600;
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

export default SalaryPage;
