import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import styled from "styled-components";
import {
  FaHistory,
  FaFileInvoiceDollar,
  FaPlusCircle,
  FaSignOutAlt,
  FaShoppingCart,
  FaBoxes,
  FaStore,
  FaChevronDown,
  FaChevronRight,
  FaMoneyBillWave,
  FaBook,
  FaCalendarCheck,
  FaTruck,
  FaCogs,
  FaBars,
  FaTimes,
  FaFileAlt,
  FaWallet,
  FaUserTie,
  FaRoute,
  FaLayerGroup,
  FaChartLine,
  FaIdBadge,
  FaHome,
  FaWhatsapp,
  FaBalanceScale,
} from "react-icons/fa";
import logo from "../image/logo.png";
const Layout = ({ children }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [openDropdowns, setOpenDropdowns] = useState({
    retailers: false,
    products: false,
    orders: false,
    collections: false,
    salary: false,
    attendance: false,
    logistics: false,
    reports: false,
    hrstaff: false,
    finance: false,
  });

  // Ref to the nav menu to detect scrolling and toggle scrollbar visibility
  const navRef = useRef(null);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;

    let hideTimeout = null;

    const showScrollbar = () => {
      el.classList.add("show-scrollbar");
      if (hideTimeout) clearTimeout(hideTimeout);
      hideTimeout = setTimeout(() => {
        el.classList.remove("show-scrollbar");
      }, 1000);
    };

    const onScroll = () => showScrollbar();

    el.addEventListener("scroll", onScroll, { passive: true });

    // Show when mouse enters (optional UX improvement)
    const onEnter = () => el.classList.add("show-scrollbar");
    const onLeave = () => el.classList.remove("show-scrollbar");
    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);

    return () => {
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      if (hideTimeout) clearTimeout(hideTimeout);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  };

  const toggleDropdown = (category) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <Container>
      {/* Mobile top bar */}
      <MobileTopBar>
        <HamburgerBtn onClick={() => setSidebarOpen(true)}>
          <FaBars />
        </HamburgerBtn>
        <img src={logo} alt="Admin" />
        <MobileTitle>LLPL CRM</MobileTitle>
      </MobileTopBar>

      {/* Overlay for mobile */}
      {sidebarOpen && <Overlay onClick={closeSidebar} />}

      <Sidebar $open={sidebarOpen}>
        <LogoContainer>
          <img src={logo} alt="Admin" />
          <h2>LLPL CRM</h2>
          <CloseBtn onClick={closeSidebar}>
            <FaTimes />
          </CloseBtn>
        </LogoContainer>
        <NavMenu ref={navRef}>
          {/* ── DASHBOARD ─────────────────────────────────── */}
          <NavItem
            active={location.pathname === "/admin"}
            onClick={closeSidebar}
          >
            <CategoryIcon>
              <FaHome />
            </CategoryIcon>
            <span>Dashboard</span>
            <Link to="/admin" />
          </NavItem>

          {/* ── SALES ─────────────────────────────────────── */}
          <SectionLabel>Sales</SectionLabel>

          <NavItem
            active={
              location.pathname === "/admin/view-retailer" ||
              location.pathname === "/admin/add-retailer"
            }
            onClick={closeSidebar}
          >
            <CategoryIcon>
              <FaStore />
            </CategoryIcon>
            <span>Retailers</span>
            <Link to="/admin/view-retailer" />
          </NavItem>

          <NavItem
            active={location.pathname === "/admin/order-list"}
            onClick={closeSidebar}
          >
            <CategoryIcon>
              <FaShoppingCart />
            </CategoryIcon>
            <span>Orders</span>
            <Link to="/admin/order-list" />
          </NavItem>

          <NavItem
            active={
              location.pathname === "/admin/bills" ||
              location.pathname === "/admin/bills-add" ||
              location.pathname === "/admin/bill-collection-history"
            }
            onClick={closeSidebar}
          >
            <CategoryIcon>
              <FaFileInvoiceDollar />
            </CategoryIcon>
            <span>Billing &amp; Collections</span>
            <Link to="/admin/bills" />
          </NavItem>

          {/* ── COMMUNICATIONS ───────────────────────────── */}
          <SectionLabel>Communications</SectionLabel>

          <NavItem
            active={location.pathname === "/admin/whatsapp-logs"}
            onClick={closeSidebar}
          >
            <CategoryIcon>
              <FaWhatsapp />
            </CategoryIcon>
            <span>WhatsApp Logs</span>
            <Link to="/admin/whatsapp-logs" />
          </NavItem>

          {/* ── INVENTORY ─────────────────────────────────── */}
          <SectionLabel>Inventory</SectionLabel>

          <NavItem
            active={
              location.pathname === "/admin/view-product" ||
              location.pathname === "/admin/add-product"
            }
            onClick={closeSidebar}
          >
            <CategoryIcon>
              <FaBoxes />
            </CategoryIcon>
            <span>Products</span>
            <Link to="/admin/view-product" />
          </NavItem>

          {/* ── LOGISTICS ─────────────────────────────────── */}
          <SectionLabel>Logistics</SectionLabel>

          <NavCategory onClick={() => toggleDropdown("logistics")}>
            <CategoryHeader>
              <CategoryIcon>
                <FaTruck />
                <span>Distribution</span>
              </CategoryIcon>
              <ChevronIcon>
                {openDropdowns.logistics ? (
                  <FaChevronDown />
                ) : (
                  <FaChevronRight />
                )}
              </ChevronIcon>
            </CategoryHeader>
          </NavCategory>
          <DropdownMenu $isOpen={openDropdowns.logistics}>
            <NavItem
              active={location.pathname === "/admin/delivery-create"}
              onClick={closeSidebar}
            >
              <FaPlusCircle />
              <span>New Dispatch</span>
              <Link to="/admin/delivery-create" />
            </NavItem>
            <NavItem
              active={location.pathname === "/admin/delivery-tracking"}
              onClick={closeSidebar}
            >
              <FaRoute />
              <span>Live Tracking</span>
              <Link to="/admin/delivery-tracking" />
            </NavItem>
            <NavItem
              active={location.pathname === "/admin/delivery-history"}
              onClick={closeSidebar}
            >
              <FaHistory />
              <span>Dispatch History</span>
              <Link to="/admin/delivery-history" />
            </NavItem>
          </DropdownMenu>

          {/* ── FINANCE ───────────────────────────────────── */}
          <SectionLabel>Finance</SectionLabel>

          <NavCategory onClick={() => toggleDropdown("finance")}>
            <CategoryHeader>
              <CategoryIcon>
                <FaMoneyBillWave />
                <span>Payroll</span>
              </CategoryIcon>
              <ChevronIcon>
                {openDropdowns.finance ? <FaChevronDown /> : <FaChevronRight />}
              </ChevronIcon>
            </CategoryHeader>
          </NavCategory>
          <DropdownMenu $isOpen={openDropdowns.finance}>
            <NavItem
              active={location.pathname === "/admin/salary"}
              onClick={closeSidebar}
            >
              <FaMoneyBillWave />
              <span>Process Salary</span>
              <Link to="/admin/salary" />
            </NavItem>
            <NavItem
              active={location.pathname === "/admin/advances"}
              onClick={closeSidebar}
            >
              <FaWallet />
              <span>Advance Register</span>
              <Link to="/admin/advances" />
            </NavItem>
            <NavItem
              active={location.pathname === "/admin/salary-ledger"}
              onClick={closeSidebar}
            >
              <FaBook />
              <span>Salary Ledger</span>
              <Link to="/admin/salary-ledger" />
            </NavItem>
          </DropdownMenu>

          {/* ── HR / STAFF ────────────────────────────────── */}
          <SectionLabel>HR &amp; Staff</SectionLabel>

          <NavCategory onClick={() => toggleDropdown("hrstaff")}>
            <CategoryHeader>
              <CategoryIcon>
                <FaUserTie />
                <span>Staff Management</span>
              </CategoryIcon>
              <ChevronIcon>
                {openDropdowns.hrstaff ? <FaChevronDown /> : <FaChevronRight />}
              </ChevronIcon>
            </CategoryHeader>
          </NavCategory>
          <DropdownMenu $isOpen={openDropdowns.hrstaff}>
            <NavItem
              active={location.pathname === "/admin/attendance"}
              onClick={closeSidebar}
            >
              <FaCalendarCheck />
              <span>Attendance</span>
              <Link to="/admin/attendance" />
            </NavItem>
            <NavItem
              active={location.pathname === "/admin/users"}
              onClick={closeSidebar}
            >
              <FaIdBadge />
              <span>Staff Directory</span>
              <Link to="/admin/users" />
            </NavItem>
          </DropdownMenu>

          {/* ── REPORTS ───────────────────────────────────── */}
          <SectionLabel>Reports</SectionLabel>

          <NavCategory onClick={() => toggleDropdown("reports")}>
            <CategoryHeader>
              <CategoryIcon>
                <FaChartLine />
                <span>Analytics &amp; Reports</span>
              </CategoryIcon>
              <ChevronIcon>
                {openDropdowns.reports ? <FaChevronDown /> : <FaChevronRight />}
              </ChevronIcon>
            </CategoryHeader>
          </NavCategory>
          <DropdownMenu $isOpen={openDropdowns.reports}>
            <NavItem
              active={location.pathname === "/admin/tally-reports"}
              onClick={closeSidebar}
            >
              <FaLayerGroup />
              <span>Tally Reports</span>
              <Link to="/admin/tally-reports" />
            </NavItem>
            <NavItem
              active={location.pathname === "/admin/reports"}
              onClick={closeSidebar}
            >
              <FaFileAlt />
              <span>Collection Reports</span>
              <Link to="/admin/reports" />
            </NavItem>
            <NavItem
              active={location.pathname === "/admin/reconciliation"}
              onClick={closeSidebar}
            >
              <FaBalanceScale />
              <span>Collection Reconciliation</span>
              <Link to="/admin/reconciliation" />
            </NavItem>
          </DropdownMenu>

          {/* ── ADMINISTRATION ────────────────────────────── */}
          <SectionLabel>Administration</SectionLabel>

          <NavItem
            active={location.pathname === "/admin/settings"}
            onClick={closeSidebar}
          >
            <FaCogs />
            <span>Settings</span>
            <Link to="/admin/settings" />
          </NavItem>

          <NavItem onClick={handleLogout}>
            <FaSignOutAlt />
            <span>Logout</span>
          </NavItem>
        </NavMenu>
        <UserProfile>
          <img
            src={`https://ui-avatars.com/api/?name=${
              user?.name || "Admin"
            }&background=14213d&color=ffffff`}
            alt="User"
          />
          <div>
            <UserName>{user?.name || "Admin"}</UserName>
            <UserRole>{user?.role || "Administrator"}</UserRole>
          </div>
        </UserProfile>
      </Sidebar>
      <MainContent>{children}</MainContent>
    </Container>
  );
};

// ── Styled Components ──────────────────────────────────────────────────────────

const MobileTopBar = styled.div`
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 56px;
  background: var(--nb-cream);
  border-bottom: 1px solid var(--nb-border);
  box-shadow: var(--nb-shadow-sm);
  align-items: center;
  padding: 0 16px;
  gap: 12px;
  z-index: 100;

  @media (max-width: 768px) {
    display: flex;
  }
`;

const MobileTitle = styled.span`
  font-weight: 700;
  font-size: 1rem;
  color: var(--nb-ink);
`;

const HamburgerBtn = styled.button`
  background: none;
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--nb-ink);
  font-size: 1.1rem;
  flex-shrink: 0;

  &:hover {
    background: var(--nb-blue);
    color: var(--nb-white);
    border-color: var(--nb-blue);
  }
`;

const Overlay = styled.div`
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 150;

  @media (max-width: 768px) {
    display: block;
  }
`;

const Container = styled.div`
  display: flex;
  min-height: 100vh;
  background: #ffffff;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const Sidebar = styled.div`
  width: 270px;
  background: #ffffff;
  border-right: 1px solid transparent;
  display: flex;
  flex-direction: column;
  z-index: 10;
  flex-shrink: 0;
  height: 100vh;
  position: sticky;
  top: 0;

  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    height: 100%;
    width: 270px;
    z-index: 200;
    background: var(--nb-white);
    transform: translateX(${(p) => (p.$open ? "0" : "-100%")});
    transition: transform 0.3s ease;
    overflow-y: auto;
  }
`;

const LogoContainer = styled.div`
  padding: 24px 24px;
  border-bottom: 1px solid transparent;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: space-between;
  background: transparent;
  gap: 20px h2 {
    color: var(--nb-ink);
    margin: 0;
    font-size: 0.4rem;
    font-weight: 700;
  }
`;

const CloseBtn = styled.button`
  display: none;
  background: none;
  border: 1px solid var(--nb-border);
  border-radius: 6px;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--nb-ink);
  font-size: 1rem;
  flex-shrink: 0;

  &:hover {
    background: var(--nb-orange);
    color: var(--nb-white);
    border-color: var(--nb-orange);
  }

  @media (max-width: 768px) {
    display: flex;
  }
`;

const SectionLabel = styled.li`
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--nb-text-secondary);
  padding: 24px 24px 8px 24px;
  margin-top: 8px;
  list-style: none;
  pointer-events: none;
  user-select: none;

  &:first-child {
    padding-top: 8px;
    margin-top: 0;
  }
`;

const NavMenu = styled.ul`
  list-style: none;
  padding: 20px 0;
  margin: 0;
  flex-grow: 1;
  overflow-y: auto;
  min-height: 0;
  /* Hide scrollbar visual by default; reveal on scroll/hover */
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;

  &::-webkit-scrollbar {
    width: 8px;
    background: transparent;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: transparent; /* hidden by default */
    border-radius: 6px;
    transition:
      background 180ms ease,
      opacity 180ms ease;
    opacity: 0;
  }

  /* When user is interacting (scrolling) or hovers over the menu, show thumb */
  &.show-scrollbar::-webkit-scrollbar-thumb,
  &:hover::-webkit-scrollbar-thumb {
    background: var(--nb-ink);
    opacity: 1;
  }

  &.show-scrollbar {
    scrollbar-color: var(--nb-ink) transparent;
  }
`;

const NavCategory = styled.div`
  cursor: pointer;
  user-select: none;
`;

const CategoryHeader = styled.div`
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--nb-ink);
  transition: all var(--nb-transition);
  border-radius: var(--nb-radius);
  margin: 4px 16px;
  background: transparent;

  &:hover {
    background: rgba(0, 0, 0, 0.02);
  }
`;

const CategoryIcon = styled.div`
  display: flex;
  align-items: center;

  span {
    font-size: 0.95rem;
    font-weight: 600;
  }

  svg {
    width: 32px;
    height: 32px;
    padding: 8px; /* space around icon */
    background: #0072bc;
    color: #ffffff;
    border-radius: 8px;
    box-shadow: var(--nb-shadow-sm);
    flex-shrink: 0;
    transition: all var(--nb-transition);
    margin-right: 16px;
  }
`;

const ChevronIcon = styled.div`
  display: flex;
  align-items: center;
  transition: transform 0.3s ease;

  svg {
    font-size: 0.75rem;
    color: var(--nb-ink);
    transition: color var(--nb-transition);
  }
`;

const DropdownMenu = styled.div`
  max-height: ${(props) => (props.$isOpen ? "500px" : "0")};
  overflow: hidden;
  transition: max-height var(--nb-transition);
  padding-left: 20px;
`;

const NavItem = styled.li`
  position: relative;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  color: ${(props) => (props.active ? "var(--nb-blue)" : "var(--nb-ink)")};
  cursor: pointer;
  transition:
    background-color var(--nb-transition),
    color var(--nb-transition);
  border-radius: var(--nb-radius-sm);
  background: ${(props) => (props.active ? "var(--nb-white)" : "transparent")};
  margin: 4px 12px;

  svg {
    margin-right: 15px;
    font-size: 1rem;
    color: var(--nb-white);
    flex-shrink: 0;
    transition: color var(--nb-transition);
  }

  span {
    font-size: 0.95rem;
    font-weight: 500;
    transition: color var(--nb-transition);
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
    background: ${(props) =>
      props.active ? "var(--nb-blue)" : "var(--nb-muted)"};
    color: var(--nb-white);

    svg {
      color: var(--nb-white);
    }

    span {
      color: ${(props) => (props.active ? "var(--nb-white)" : "var(--nb-ink)")};
    }
  }
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  padding: 20px;
  border-top: 1px solid var(--nb-border);
  margin-top: auto;
  background: var(--nb-cream);

  img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    margin-right: 12px;
    border: 1px solid var(--nb-border);
    flex-shrink: 0;
  }
`;

const UserName = styled.div`
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--nb-ink);
`;

const UserRole = styled.div`
  font-size: 0.75rem;
  color: var(--nb-blue);
  margin-top: 2px;
  text-transform: capitalize;
`;

const MainContent = styled.div`
  flex: 1;
  background: #ffffff;
  padding: 30px;
  overflow-x: hidden;
  position: relative;
  min-width: 0;

  @media (max-width: 768px) {
    padding: 72px 16px 24px;
  }

  @media (min-width: 1200px) {
    padding: 40px;
  }
`;

export default Layout;
