import React from "react";
import { Link, useLocation } from "react-router-dom";
import styled from "styled-components";
import {
  FaTachometerAlt,
  FaFileInvoiceDollar,
  FaMoneyBillWave,
  FaShoppingCart,
  FaUser,
  FaSignOutAlt,
  FaCog,
} from "react-icons/fa";

const RetailerLayout = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  return (
    <Container>
      <Sidebar>
        <LogoContainer>
          <h2>Laxmi Lube Private Limited</h2>
          <RoleBadge>Retailer Portal</RoleBadge>
        </LogoContainer>
        <NavMenu>
          {/* Dashboard */}
          <NavItem active={location.pathname === "/retailer"}>
            <FaTachometerAlt />
            <span>Dashboard</span>
            <Link to="/retailer" />
          </NavItem>

          {/* Billing & Payments */}
          <NavItem active={location.pathname === "/retailer/billing"}>
            <FaFileInvoiceDollar />
            <span>Billing & Payments</span>
            <Link to="/retailer/billing" />
          </NavItem>

          {/* Collection History */}
          <NavItem active={location.pathname === "/retailer/collections"}>
            <FaMoneyBillWave />
            <span>Collection History</span>
            <Link to="/retailer/collections" />
          </NavItem>

          {/* Orders */}
          <NavItem active={location.pathname === "/retailer/orders"}>
            <FaShoppingCart />
            <span>My Orders</span>
            <Link to="/retailer/orders" />
          </NavItem>

          {/* Profile */}
          <NavItem active={location.pathname === "/retailer/profile"}>
            <FaUser />
            <span>Profile</span>
            <Link to="/retailer/profile" />
          </NavItem>

          {/* Settings */}
          <NavItem active={location.pathname === "/retailer/settings"}>
            <FaCog />
            <span>Settings</span>
            <Link to="/retailer/settings" />
          </NavItem>

          {/* Logout */}
          <NavItem onClick={handleLogout}>
            <FaSignOutAlt />
            <span>Logout</span>
          </NavItem>
        </NavMenu>
        <UserProfile>
          <img
            src={`https://ui-avatars.com/api/?name=${user?.name || "Retailer"}&background=1f5eff&color=ffffff`}
            alt="User"
          />
          <div>
            <UserName>{user?.name || "Retailer"}</UserName>
            <UserRole>Retailer</UserRole>
          </div>
        </UserProfile>
      </Sidebar>
      <MainContent>{children}</MainContent>
    </Container>
  );
};

// Styled Components
const Container = styled.div`
  display: flex;
  min-height: 100vh;
  background: var(--nb-white);
`;

const Sidebar = styled.div`
  width: 280px;
  background-color: var(--nb-white);
  border-right: 1px solid var(--nb-border);
  box-shadow: var(--nb-shadow-md);
  display: flex;
  flex-direction: column;
  z-index: 10;
  transition: width var(--nb-transition);

  @media (max-width: 768px) {
    width: 80px;

    span {
      display: none;
    }
  }
`;

const LogoContainer = styled.div`
  padding: 25px 20px;
  border-bottom: 1px solid var(--nb-border);
  text-align: center;

  h2 {
    color: var(--nb-ink);
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 700;
  }

  @media (max-width: 768px) {
    h2 {
      display: none;
    }
  }
`;

const RoleBadge = styled.div`
  display: inline-block;
  background: var(--nb-orange);
  color: var(--nb-white);
  padding: 0.35rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border: 1px solid var(--nb-border);

  @media (max-width: 768px) {
    display: none;
  }
`;

const NavMenu = styled.ul`
  list-style: none;
  padding: 20px 0;
  margin: 0;
  flex-grow: 1;
`;

const NavItem = styled.li`
  position: relative;
  padding: 12px 25px;
  display: flex;
  align-items: center;
  color: ${(props) => (props.active ? "var(--nb-white)" : "var(--nb-ink)")};
  cursor: pointer;
  transition:
    background-color var(--nb-transition),
    color var(--nb-transition);
  border-left: 4px solid
    ${(props) => (props.active ? "var(--nb-orange)" : "transparent")};
  background-color: ${(props) =>
    props.active ? "var(--nb-blue)" : "transparent"};

  svg {
    margin-right: 15px;
    font-size: 1rem;
    color: ${(props) => (props.active ? "var(--nb-white)" : "var(--nb-ink)")};
    flex-shrink: 0;
  }

  span {
    font-size: 0.95rem;
    font-weight: 500;
    transition: all 0.3s ease;

    @media (max-width: 768px) {
      display: none;
    }
  }

  a {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1;
  }

  &:hover {
    background-color: var(--nb-muted);
    color: var(--nb-ink);

    svg {
      color: var(--nb-ink);
    }
  }
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  padding: 20px;
  border-top: 1px solid var(--nb-border);
  margin-top: auto;
  background: var(--nb-muted);

  img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    margin-right: 12px;
    border: 1px solid var(--nb-border);
  }

  div {
    @media (max-width: 768px) {
      display: none;
    }
  }
`;

const UserName = styled.div`
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--nb-ink);
`;

const UserRole = styled.div`
  font-size: 0.75rem;
  color: var(--nb-blue-medium);
  margin-top: 2px;
`;

const MainContent = styled.div`
  flex: 1;
  background-color: var(--nb-white);
  padding: 30px;
  overflow-x: hidden;

  @media (max-width: 768px) {
    padding: 20px;
  }

  @media (min-width: 1200px) {
    padding: 40px;
  }
`;

export default RetailerLayout;
