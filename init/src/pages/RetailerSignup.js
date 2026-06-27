import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import styled from "styled-components";

const RetailerSignup = () => {
  const [formData, setFormData] = useState({
    shopName: "",
    address1: "",
    address2: "",
    assignedStaff: "",
    collectionDays: [],
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [staffList, setStaffList] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();

  const daysOfWeek = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  useEffect(() => {
    fetchStaffList();
  }, []);

  const fetchStaffList = async () => {
    try {
      const res = await axios.get("http://localhost:2500/api/users");
      const staffMembers = res.data.filter(
        (user) => user.role === "staff" && user.isActive !== false,
      );
      setStaffList(staffMembers);
    } catch (err) {
      console.error("Error fetching staff:", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDayToggle = (day) => {
    setFormData((prev) => ({
      ...prev,
      collectionDays: prev.collectionDays.includes(day)
        ? prev.collectionDays.filter((d) => d !== day)
        : [...prev.collectionDays, day],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (
      !formData.shopName ||
      !formData.address1 ||
      !formData.email ||
      !formData.password ||
      !formData.assignedStaff
    ) {
      setError("Please fill in all required fields");
      return;
    }

    if (formData.collectionDays.length === 0) {
      setError("Please select at least one collection day");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setIsLoading(true);

    try {
      const res = await axios.post(
        "http://localhost:2500/api/auth/retailer/signup",
        {
          shopName: formData.shopName,
          address1: formData.address1,
          address2: formData.address2,
          assignedStaff: formData.assignedStaff,
          collectionDays: formData.collectionDays,
          email: formData.email,
          password: formData.password,
        },
      );

      setSuccess(res.data.message);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SignupContainer>
      <SignupWrapper>
        <SignupFormSection>
          <Logo>
            <div
              style={{
                fontSize: "1.8rem",
                fontWeight: "bold",
                color: "var(--nb-blue)",
              }}
            >
              Laxmi Lube Private Limited
            </div>
          </Logo>

          <FormTitle>Retailer Registration</FormTitle>
          <SubTitle>Join our distribution network</SubTitle>

          <form onSubmit={handleSubmit}>
            <InputGroup>
              <InputLabel>Shop Name *</InputLabel>
              <InputField
                type="text"
                name="shopName"
                placeholder="Enter your shop name"
                value={formData.shopName}
                onChange={handleChange}
                required
              />
            </InputGroup>

            <InputGroup>
              <InputLabel>Address Line 1 *</InputLabel>
              <InputField
                type="text"
                name="address1"
                placeholder="Street address, P.O. Box"
                value={formData.address1}
                onChange={handleChange}
                required
              />
            </InputGroup>

            <InputGroup>
              <InputLabel>Address Line 2</InputLabel>
              <InputField
                type="text"
                name="address2"
                placeholder="Apartment, suite, unit, building, floor, etc."
                value={formData.address2}
                onChange={handleChange}
              />
            </InputGroup>

            <InputGroup>
              <InputLabel>Assigned Staff *</InputLabel>
              <SelectField
                name="assignedStaff"
                value={formData.assignedStaff}
                onChange={handleChange}
                required
              >
                <option value="">Select a staff member</option>
                {staffList.map((staff) => (
                  <option key={staff._id} value={staff._id}>
                    {staff.name}
                  </option>
                ))}
              </SelectField>
            </InputGroup>

            <InputGroup>
              <InputLabel>Collection Days *</InputLabel>
              <DaysGrid>
                {daysOfWeek.map((day) => (
                  <DayCheckbox
                    key={day}
                    selected={formData.collectionDays.includes(day)}
                    onClick={() => handleDayToggle(day)}
                  >
                    {day.substring(0, 3)}
                  </DayCheckbox>
                ))}
              </DaysGrid>
            </InputGroup>

            <InputGroup>
              <InputLabel>Email Address *</InputLabel>
              <InputField
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </InputGroup>

            <InputGroup>
              <InputLabel>Password *</InputLabel>
              <InputField
                type="password"
                name="password"
                placeholder="Create a password (min. 6 characters)"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </InputGroup>

            <InputGroup>
              <InputLabel>Confirm Password *</InputLabel>
              <InputField
                type="password"
                name="confirmPassword"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </InputGroup>

            <SubmitButton type="submit" disabled={isLoading}>
              {isLoading ? "Registering..." : "Register"}
            </SubmitButton>

            {error && <ErrorMessage>{error}</ErrorMessage>}
            {success && <SuccessMessage>{success}</SuccessMessage>}
          </form>

          <FooterText>
            Already have an account? <Link to="/login">Login here</Link>
          </FooterText>
        </SignupFormSection>
      </SignupWrapper>
    </SignupContainer>
  );
};

// Styled Components
const SignupContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: var(--nb-cream);
  padding: 20px;
`;

const SignupWrapper = styled.div`
  background: var(--nb-white);
  border-radius: 15px;
  box-shadow: var(--nb-shadow-md);
  overflow: hidden;
  width: 100%;
  max-width: 600px;
`;

const SignupFormSection = styled.div`
  padding: 2.5rem;

  @media (max-width: 480px) {
    padding: 1.5rem;
  }
`;

const Logo = styled.div`
  text-align: center;
  margin-bottom: 1.5rem;
`;

const FormTitle = styled.h2`
  color: var(--nb-ink);
  text-align: center;
  margin-bottom: 0.5rem;
  font-weight: 600;
  font-size: 1.8rem;
`;

const SubTitle = styled.p`
  color: var(--nb-ink);
  text-align: center;
  margin-bottom: 2rem;
  font-size: 0.95rem;
`;

const InputGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const InputLabel = styled.label`
  display: block;
  margin-bottom: 0.5rem;
  color: var(--nb-ink);
  font-size: 0.9rem;
  font-weight: 500;
`;

const InputField = styled.input`
  width: 100%;
  padding: 0.8rem 1rem;
  border: 1px solid var(--nb-border);
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;

  &:focus {
    border-color: var(--nb-blue);
    box-shadow: var(--nb-shadow-md);
    outline: none;
  }
`;

const SelectField = styled.select`
  width: 100%;
  padding: 0.8rem 1rem;
  border: 1px solid var(--nb-border);
  border-radius: 8px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background-color: var(--nb-white);

  &:focus {
    border-color: var(--nb-blue);
    box-shadow: var(--nb-shadow-md);
    outline: none;
  }
`;

const DaysGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.5rem;

  @media (max-width: 480px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const DayCheckbox = styled.div`
  padding: 0.6rem;
  border: 1px solid ${(props) => (props.selected ? "var(--nb-blue)" : "var(--nb-border)")};
  background-color: ${(props) => (props.selected ? "var(--nb-blue)" : "var(--nb-white)")};
  color: ${(props) => (props.selected ? "var(--nb-white)" : "var(--nb-ink)")};
  border-radius: 8px;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--nb-blue);
    background-color: ${(props) => (props.selected ? "var(--nb-blue)" : "var(--nb-muted)")};
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 0.8rem;
  background: var(--nb-cream);
  color: var(--nb-white);
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 0.5rem;

  &:hover {
    opacity: 0.9;
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    background: var(--nb-border);
    cursor: not-allowed;
    transform: none;
  }
`;

const ErrorMessage = styled.p`
  color: var(--nb-orange);
  text-align: center;
  margin-top: 1rem;
  font-size: 0.9rem;
  background-color: var(--nb-muted);
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--nb-border);
`;

const SuccessMessage = styled.p`
  color: var(--nb-blue);
  text-align: center;
  margin-top: 1rem;
  font-size: 0.9rem;
  background-color: var(--nb-muted);
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid var(--nb-border);
`;

const FooterText = styled.p`
  text-align: center;
  margin-top: 2rem;
  color: var(--nb-ink);
  font-size: 0.9rem;

  a {
    color: var(--nb-blue);
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
`;

export default RetailerSignup;
