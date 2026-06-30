import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { ModuleProvider } from "./contexts/ModuleContext";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import Users from "./pages/Users";
import Logout from "./pages/Logout";
import BillAssignedToday from "./pages/BillAssignedToday";
import BillsPage from "./pages/BillsPage";
import AdminCollectionHistory from "./pages/AdminCollectionHistory";
import CollectionsHistory from "./pages/CollectionHistoryPage";
import ReportPage from "./pages/ReportPage";
import DSRCollectionSummary from "./pages/DSRCollectionSummary";
import RetailerList from "./pages/RetailerList";
import ProductList from "./pages/ProductList";
import OrderCreate from "./pages/OrderCreate";
import OrderList from "./pages/OrderList";
import SalaryPage from "./pages/SalaryPage";
import AdvancePage from "./pages/AdvancePage";
import SalaryLedgerPage from "./pages/SalaryLedgerPage";
import RetailerDashboard from "./pages/RetailerDashboard";
import RetailerBilling from "./pages/RetailerBilling";
import RetailerCollectionHistory from "./pages/RetailerCollectionHistory";
import RetailerOrders from "./pages/RetailerOrders";
import RetailerSettings from "./pages/RetailerSettings";
import Settings from "./pages/Settings";
import TallyReportPage from "./pages/TallyReportPage";
import ReconciliationPage from "./pages/ReconciliationPage";
import WhatsAppLogsPage from "./pages/WhatsAppLogsPage";

// Helper: parse user/token from localStorage safely
const getStoredAuth = () => {
  try {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (!storedToken || !storedUser) return { user: null, token: null };

    // Check expiry
    const payload = JSON.parse(atob(storedToken.split(".")[1]));
    if (Date.now() > payload.exp * 1000) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return { user: null, token: null };
    }

    return { user: JSON.parse(storedUser), token: storedToken };
  } catch {
    return { user: null, token: null };
  }
};

const App = () => {
  // Initialize directly from localStorage so refresh doesn't flash to /login
  const initial = getStoredAuth();
  const [user, setUser] = useState(initial.user);
  const [, setToken] = useState(initial.token);

  // Keep in sync with storage changes (cross-tab / same-tab login)
  useEffect(() => {
    const loadUserData = () => {
      const { user: u, token: t } = getStoredAuth();
      setUser(u);
      setToken(t);
    };

    window.addEventListener("storage", loadUserData);
    window.addEventListener("userLogin", loadUserData);

    return () => {
      window.removeEventListener("storage", loadUserData);
      window.removeEventListener("userLogin", loadUserData);
    };
  }, []);

  return (
    <ModuleProvider>
      <Router>
        <Routes>
          {/* Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Redirect after login based on user role */}
          <Route
            path="/"
            element={
              user ? (
                <Navigate to={`/${user.role}`} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Admin Dashboard Route */}
          <Route
            path="/admin"
            element={
              user?.role === "admin" ? (
                <AdminDashboard />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Staff Dashboard Route */}
          <Route
            path="/staff"
            element={
              user?.role === "staff" ? (
                <StaffDashboard />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Retailer Dashboard Route */}
          <Route
            path="/retailer"
            element={
              user?.role === "retailer" ? (
                <RetailerDashboard />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Retailer Billing Route */}
          <Route
            path="/retailer/billing"
            element={
              user?.role === "retailer" ? (
                <RetailerBilling />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Retailer Collection History Route */}
          <Route
            path="/retailer/collections"
            element={
              user?.role === "retailer" ? (
                <RetailerCollectionHistory />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Retailer Orders Route */}
          <Route
            path="/retailer/orders"
            element={
              user?.role === "retailer" ? (
                <RetailerOrders />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Retailer Settings Route */}
          <Route
            path="/retailer/settings"
            element={
              user?.role === "retailer" ? (
                <RetailerSettings />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Bill Collection History Route */}
          <Route
            path="/admin/bill-collection-history"
            element={
              user?.role === "admin" ? (
                <DSRCollectionSummary />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          {/* Add Retailer (merged into Retailer List modal) */}
          <Route
            path="/admin/add-retailer"
            element={
              user?.role === "admin" ? (
                <Navigate to="/admin/view-retailer" replace />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          {/* Add Product (merged into Product List modal) */}
          <Route
            path="/admin/add-product"
            element={
              user?.role === "admin" ? (
                <Navigate to="/admin/view-product" replace />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          {/* View Retailer */}
          <Route
            path="/admin/view-retailer"
            element={
              user?.role === "admin" ? (
                <RetailerList />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          {/* View Product */}
          <Route
            path="/admin/view-product"
            element={
              user?.role === "admin" ? (
                <ProductList />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Bills Add Route (merged into Bills page modal) */}
          <Route
            path="/admin/bills-add"
            element={
              user?.role === "admin" ? (
                <Navigate to="/admin/bills" replace />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Users Management Route */}
          <Route
            path="/admin/users"
            element={
              user?.role === "admin" ? <Users /> : <Navigate to="/login" />
            }
          />

          {/* Bill Assigned Today (For Staff) */}
          <Route
            path="/staff/bill-assigned-today"
            element={
              user?.role === "staff" ? (
                <BillAssignedToday />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/staff/order-create"
            element={
              user?.role === "staff" ? (
                <OrderCreate />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/admin/order-list"
            element={
              user?.role === "admin" ? <OrderList /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/admin/reports"
            element={
              user?.role === "admin" ? <ReportPage /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/admin/tally-reports"
            element={
              user?.role === "admin" ? (
                <TallyReportPage />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/admin/reconciliation"
            element={
              user?.role === "admin" ? (
                <ReconciliationPage />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Admin Bills Page */}
          <Route
            path="/admin/bills"
            element={
              user?.role === "admin" ? <BillsPage /> : <Navigate to="/login" />
            }
          />

          {/* Admin Collection History Page */}
          <Route
            path="/admin/collections-history"
            element={
              user?.role === "admin" ? (
                <AdminCollectionHistory />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Salary Management Routes */}
          <Route
            path="/admin/salary"
            element={
              user?.role === "admin" ? <SalaryPage /> : <Navigate to="/login" />
            }
          />
          <Route
            path="/admin/advances"
            element={
              user?.role === "admin" ? (
                <AdvancePage />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/admin/salary-ledger"
            element={
              user?.role === "admin" ? (
                <SalaryLedgerPage />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/staff/collections-history"
            element={<CollectionsHistory />}
          />

          {/* Logout Route */}
          {/* WhatsApp Logs (Admin) */}
          <Route
            path="/admin/whatsapp-logs"
            element={
              user?.role === "admin" ? (
                <WhatsAppLogsPage />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          <Route path="/logout" element={<Logout />} />

          {/* Admin Settings - Combined */}
          <Route
            path="/admin/settings"
            element={
              user?.role === "admin" ? <Settings /> : <Navigate to="/login" />
            }
          />

          {/* Admin Settings - Modules (Legacy Route) */}
          <Route
            path="/admin/settings/modules"
            element={
              user?.role === "admin" ? <Settings /> : <Navigate to="/login" />
            }
          />

          {/* Admin Module Name Customization (Legacy Route) */}
          <Route
            path="/admin/settings/customize-modules"
            element={
              user?.role === "admin" ? <Settings /> : <Navigate to="/login" />
            }
          />
        </Routes>
      </Router>
    </ModuleProvider>
  );
};

export default App;
