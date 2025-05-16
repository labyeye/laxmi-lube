import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import StaffDashboard from "./pages/StaffDashboard";
import BillCollectionHistory from "./pages/DSRCollectionSummary";
import BillsAdd from "./pages/BillAdd";
import Users from "./pages/Users";
import Logout from "./pages/Logout";
import BillAssignedToday from "./pages/BillAssignedToday";
import BillsPage from "./pages/BillsPage";
import CollectionsHistory from "./pages/CollectionHistoryPage";
import ReportPage from "./pages/ReportPage";
import DSRCollectionSummary from "./pages/DSRCollectionSummary";
import RetailerAdd from "./pages/RetailerAdd";
import ProductAdd from "./pages/ProductAdd";
import RetailerList from "./pages/RetailerList";
import ProductList from "./pages/ProductList";
import OrderCreate from "./pages/OrderCreate";
import OrderList from "./pages/OrderList";
const App = () => {
  const [user, setUser] = useState(null);
const [token, setToken] = useState(null);
const [authChecked, setAuthChecked] = useState(false);

useEffect(() => {
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const storedToken = localStorage.getItem("token");

  if (storedToken) {
    try {
      const decoded = JSON.parse(atob(storedToken.split(".")[1]));
      const isExpired = Date.now() > decoded.exp * 1000;

      if (!isExpired) {
        setUser(storedUser);
        setToken(storedToken);
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    } catch (err) {
      console.error("Token validation error:", err);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }

  setAuthChecked(true);
}, []);

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to={`/${user.role}`} replace /> : <Login />}
        />

        <Route
          path="/"
          element={
            user ? (
              <Navigate to={`/${user.role}`} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/admin"
          element={
            user?.role === "admin" ? (
              <AdminDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        <Route
          path="/staff"
          element={
            user?.role === "staff" ? (
              <StaffDashboard />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

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
        <Route
          path="/admin/add-retailer"
          element={
            user?.role === "admin" ? <RetailerAdd /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/admin/add-product"
          element={
            user?.role === "admin" ? <ProductAdd /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/admin/view-retailer"
          element={
            user?.role === "admin" ? <RetailerList /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/admin/view-product"
          element={
            user?.role === "admin" ? <ProductList /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/admin/bills-add"
          element={
            user?.role === "admin" ? <BillsAdd /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/admin/users"
          element={
            user?.role === "admin" ? <Users /> : <Navigate to="/login" />
          }
        />
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
            user?.role === "staff" ? <OrderCreate /> : <Navigate to="/login" />
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
          path="/admin/bills"
          element={
            user?.role === "admin" ? <BillsPage /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/staff/collections-history"
          element={<CollectionsHistory />}
        />
        <Route path="/logout" element={<Logout />} />
      </Routes>
    </Router>
  );
};

export default App;
