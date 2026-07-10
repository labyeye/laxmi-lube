// OrderList.js
import React, { useState, useEffect } from "react";
import axios from "axios";
import styled from "styled-components";
import Layout from "../components/Layout";
import {
  FaSearch,
  FaFileExcel,
  FaPlus,
  FaTrash,
  FaTimes,
} from "react-icons/fa";
import { format } from "date-fns";

const OrderList = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [retailers, setRetailers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filters, setFilters] = useState({
    retailer: "",
    startDate: "",
    endDate: "",
    status: "",
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({ retailerId: "", items: [] });
  const [createError, setCreateError] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const [ordersRes, retailersRes, productsRes] = await Promise.all([
        axios.get("https://backend.laxmilube.in/api/orders", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("https://backend.laxmilube.in/api/retailers", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get("https://backend.laxmilube.in/api/products", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setOrders(ordersRes.data);
      setFilteredOrders(ordersRes.data);
      setRetailers(retailersRes.data);
      setProducts(productsRes.data);
    } catch (err) {
      setError("Failed to fetch orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let result = [...orders];

    // Apply search term filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (order) =>
          order.retailerName.toLowerCase().includes(term) ||
          order.createdByName.toLowerCase().includes(term) ||
          order.items.some(
            (item) =>
              item.name.toLowerCase().includes(term) ||
              item.code.toLowerCase().includes(term),
          ),
      );
    }

    // Apply other filters
    if (filters.retailer) {
      result = result.filter(
        (order) => order.retailer._id === filters.retailer,
      );
    }

    if (filters.status) {
      result = result.filter((order) => order.status === filters.status);
    }

    if (filters.startDate) {
      const start = new Date(filters.startDate);
      result = result.filter((order) => new Date(order.createdAt) >= start);
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((order) => new Date(order.createdAt) <= end);
    }

    setFilteredOrders(result);
  }, [orders, searchTerm, filters]);

  const handleExport = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "https://backend.laxmilube.in/api/orders/export/excel",
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: "blob",
          params: {
            status: filters.status,
            retailerId: filters.retailer,
            startDate: filters.startDate,
            endDate: filters.endDate,
          },
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `orders_${format(new Date(), "yyyyMMdd")}.xlsx`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      setError("Failed to export orders. Please try again.");
    }
  };

  const handleApprove = async (orderId) => {
    if (!window.confirm("Are you sure you want to approve this order?")) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `https://backend.laxmilube.in/api/orders/${orderId}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        alert("Order approved successfully!");
        // Refresh orders
        const ordersRes = await axios.get(
          "https://backend.laxmilube.in/api/orders",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setOrders(ordersRes.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to approve order");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (orderId) => {
    const reason = window.prompt("Please enter rejection reason:");
    if (!reason) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.put(
        `https://backend.laxmilube.in/api/orders/${orderId}/reject`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        alert("Order rejected successfully!");
        // Refresh orders
        const ordersRes = await axios.get(
          "https://backend.laxmilube.in/api/orders",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setOrders(ordersRes.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reject order");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateBill = async (orderId) => {
    if (!window.confirm("Generate bill from this approved order?")) return;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `https://backend.laxmilube.in/api/orders/${orderId}/generate-bill`,
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        alert(
          `Bill generated successfully! Bill Number: ${response.data.bill.billNumber}`,
        );
        // Refresh orders
        const ordersRes = await axios.get(
          "https://backend.laxmilube.in/api/orders",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        setOrders(ordersRes.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate bill");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setNewOrder({
      retailerId: "",
      items: [{ productId: "", quantity: 1, otherScheme: 0, remarks: "" }],
    });
    setCreateError("");
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setCreateError("");
  };

  const addOrderItem = () => {
    setNewOrder((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { productId: "", quantity: 1, otherScheme: 0, remarks: "" },
      ],
    }));
  };

  const removeOrderItem = (index) => {
    setNewOrder((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateOrderItem = (index, key, value) => {
    setNewOrder((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? {
              ...item,
              [key]:
                key === "quantity" || key === "otherScheme"
                  ? Number(value)
                  : value,
            }
          : item,
      ),
    }));
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setCreateError("");

    if (!newOrder.retailerId) {
      setCreateError("Please select retailer");
      return;
    }

    if (!newOrder.items.length) {
      setCreateError("Please add at least one item");
      return;
    }

    for (const item of newOrder.items) {
      if (!item.productId || !item.quantity || item.quantity <= 0) {
        setCreateError(
          "Please select product and valid quantity for all items",
        );
        return;
      }
    }

    setCreateLoading(true);
    try {
      const token = localStorage.getItem("token");
      const payloadItems = newOrder.items.map((item) => {
        const product = products.find((p) => p._id === item.productId) || {};
        return {
          productId: item.productId,
          quantity: Number(item.quantity),
          otherScheme: Number(item.otherScheme || 0),
          remarks: item.remarks || "",
          price: Number(product.price || 0),
          scheme: Number(product.scheme || 0),
        };
      });

      await axios.post(
        "https://backend.laxmilube.in/api/orders",
        { retailerId: newOrder.retailerId, items: payloadItems },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      setSuccess("Order created successfully");
      setTimeout(() => setSuccess(""), 3000);
      closeCreateModal();
      await fetchData();
    } catch (err) {
      setCreateError(err.response?.data?.message || "Failed to create order");
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <Layout>
      <PageHeader>Order Management</PageHeader>

      <ControlsContainer>
        <SearchContainer>
          <FaSearch />
          <SearchInput
            type="text"
            placeholder="Search orders..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </SearchContainer>

        <ExportButton onClick={handleExport}>
          <FaFileExcel /> Export to Excel
        </ExportButton>
        <CreateButton onClick={openCreateModal}>
          <FaPlus /> Create Order
        </CreateButton>
      </ControlsContainer>

      <FiltersContainer>
        <FilterGroup>
          <Label>Retailer</Label>
          <Select
            value={filters.retailer}
            onChange={(e) =>
              setFilters({ ...filters, retailer: e.target.value })
            }
          >
            <option value="">All Retailers</option>
            {retailers.map((retailer) => (
              <option key={retailer._id} value={retailer._id}>
                {retailer.name}
              </option>
            ))}
          </Select>
        </FilterGroup>

        <FilterGroup>
          <Label>Status</Label>
          <Select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Completed">Completed</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </Select>
        </FilterGroup>

        <FilterGroup>
          <Label>From Date</Label>
          <Input
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters({ ...filters, startDate: e.target.value })
            }
          />
        </FilterGroup>

        <FilterGroup>
          <Label>To Date</Label>
          <Input
            type="date"
            value={filters.endDate}
            onChange={(e) =>
              setFilters({ ...filters, endDate: e.target.value })
            }
          />
        </FilterGroup>
      </FiltersContainer>

      {error && <ErrorMessage>{error}</ErrorMessage>}
      {success && <SuccessMessage>{success}</SuccessMessage>}

      {loading ? (
        <LoadingMessage>Loading orders...</LoadingMessage>
      ) : filteredOrders.length === 0 ? (
        <EmptyMessage>No orders found</EmptyMessage>
      ) : (
        <OrdersTable>
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Retailer</th>
              <th>Items</th>
              <th>Total Value</th>
              <th>Total Litres</th>
              <th>Created By</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order._id}>
                <td>{order._id.slice(-6)}</td>
                <td>
                  <div>{order.retailerName}</div>
                  <small>{order.retailer?.address1}</small>
                </td>
                <td>
                  <ItemsList>
                    {order.items.map((item, index) => (
                      <Item key={index}>
                        <div>
                          <strong>{item.code}</strong> - {item.name}
                        </div>
                        <div>
                          Qty: {item.quantity}, Price: ₹{item.price}, Scheme: ₹
                          {item.scheme}, Other: ₹{item.otherScheme}
                        </div>
                        <div>
                          Net: ₹{item.netPrice.toFixed(2)}, Litres:{" "}
                          {item.totalLitres.toFixed(2)}, Total: ₹
                          {item.totalSale.toFixed(2)}
                        </div>
                        {item.remarks && <div>Remarks: {item.remarks}</div>}
                      </Item>
                    ))}
                  </ItemsList>
                </td>
                <td>₹{order.totalOrderValue.toFixed(2)}</td>
                <td>{order.totalLitres.toFixed(2)}</td>
                <td>{order.createdByName}</td>
                <td>{format(new Date(order.createdAt), "dd/MM/yyyy HH:mm")}</td>
                <td>
                  <StatusBadge status={order.status}>
                    {order.status}
                  </StatusBadge>
                </td>
                <td>
                  {order.status === "Pending" && (
                    <ActionButtons>
                      <StatusButton
                        onClick={() => handleApprove(order._id)}
                        color="var(--nb-blue)"
                      >
                        Approve
                      </StatusButton>
                      <StatusButton
                        onClick={() => handleReject(order._id)}
                        color="var(--nb-orange)"
                      >
                        Reject
                      </StatusButton>
                    </ActionButtons>
                  )}
                  {order.status === "Approved" && !order.billGenerated && (
                    <ActionButtons>
                      <StatusButton
                        onClick={() => handleGenerateBill(order._id)}
                        color="var(--nb-blue)"
                      >
                        Generate Bill
                      </StatusButton>
                    </ActionButtons>
                  )}
                  {order.billGenerated && (
                    <BillGenerated>Bill Generated ✓</BillGenerated>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </OrdersTable>
      )}

      {isCreateModalOpen && (
        <ModalOverlay onClick={closeCreateModal}>
          <ModalCard onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h3>Create Order</h3>
              <IconButton type="button" onClick={closeCreateModal}>
                <FaTimes />
              </IconButton>
            </ModalHeader>

            <ModalBody>
              {createError && <ErrorMessage>{createError}</ErrorMessage>}
              <form onSubmit={handleCreateOrder}>
                <FilterGroup>
                  <Label>Retailer</Label>
                  <Select
                    value={newOrder.retailerId}
                    onChange={(e) =>
                      setNewOrder((prev) => ({
                        ...prev,
                        retailerId: e.target.value,
                      }))
                    }
                  >
                    <option value="">Select Retailer</option>
                    {retailers.map((retailer) => (
                      <option key={retailer._id} value={retailer._id}>
                        {retailer.name}
                      </option>
                    ))}
                  </Select>
                </FilterGroup>

                {newOrder.items.map((item, index) => (
                  <ItemCard key={index}>
                    <FormRow>
                      <FilterGroup>
                        <Label>Product</Label>
                        <Select
                          value={item.productId}
                          onChange={(e) =>
                            updateOrderItem(index, "productId", e.target.value)
                          }
                        >
                          <option value="">Select Product</option>
                          {products.map((product) => (
                            <option key={product._id} value={product._id}>
                              {product.code} - {product.name}
                            </option>
                          ))}
                        </Select>
                      </FilterGroup>

                      <FilterGroup>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateOrderItem(index, "quantity", e.target.value)
                          }
                        />
                      </FilterGroup>

                      <FilterGroup>
                        <Label>Other Scheme</Label>
                        <Input
                          type="number"
                          min="0"
                          value={item.otherScheme}
                          onChange={(e) =>
                            updateOrderItem(
                              index,
                              "otherScheme",
                              e.target.value,
                            )
                          }
                        />
                      </FilterGroup>
                    </FormRow>

                    <FilterGroup>
                      <Label>Remarks</Label>
                      <Input
                        type="text"
                        value={item.remarks}
                        onChange={(e) =>
                          updateOrderItem(index, "remarks", e.target.value)
                        }
                        placeholder="Optional"
                      />
                    </FilterGroup>

                    {newOrder.items.length > 1 && (
                      <DeleteItemBtn
                        type="button"
                        onClick={() => removeOrderItem(index)}
                      >
                        <FaTrash /> Remove Item
                      </DeleteItemBtn>
                    )}
                  </ItemCard>
                ))}

                <ModalActions>
                  <SecondaryButton type="button" onClick={addOrderItem}>
                    <FaPlus /> Add Item
                  </SecondaryButton>
                  <PrimaryButton type="submit" disabled={createLoading}>
                    {createLoading ? "Creating..." : "Create Order"}
                  </PrimaryButton>
                </ModalActions>
              </form>
            </ModalBody>
          </ModalCard>
        </ModalOverlay>
      )}
    </Layout>
  );
};

// Styled components
const PageHeader = styled.h1`
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: var(--nb-ink);
  text-align: center;
`;

const ControlsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  background-color: var(--nb-muted);
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  width: 300px;
`;

const SearchInput = styled.input`
  border: none;
  background: transparent;
  margin-left: 0.5rem;
  width: 100%;
  outline: none;
`;

const ExportButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--nb-blue);
  color: var(--nb-white);
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
`;

const CreateButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: var(--nb-blue);
  color: var(--nb-white);
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  cursor: pointer;
`;

const FiltersContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: var(--nb-muted);
  border-radius: 0.375rem;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-size: 0.75rem;
  color: var(--nb-ink);
  margin-bottom: 0.25rem;
`;

const Select = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--nb-border);
  border-radius: 0.25rem;
  font-size: 0.875rem;
`;

const Input = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--nb-border);
  border-radius: 0.25rem;
  font-size: 0.875rem;
`;

const ErrorMessage = styled.div`
  padding: 0.75rem 1rem;
  background-color: var(--nb-muted);
  color: var(--nb-orange);
  border-radius: 0.375rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
`;

const SuccessMessage = styled.div`
  padding: 0.75rem 1rem;
  background-color: var(--nb-muted);
  color: var(--nb-blue);
  border-radius: 0.375rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
`;

const LoadingMessage = styled.div`
  padding: 1rem;
  text-align: center;
  color: var(--nb-ink);
`;

const EmptyMessage = styled.div`
  padding: 1rem;
  text-align: center;
  color: var(--nb-ink);
  border: 1px dashed var(--nb-border);
  border-radius: 0.375rem;
`;

const OrdersTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;

  th,
  td {
    padding: 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--nb-border);
  }

  th {
    background-color: var(--nb-muted);
    font-weight: 600;
    color: var(--nb-ink);
  }

  tr:hover {
    background-color: var(--nb-muted);
  }
`;

const ItemsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Item = styled.div`
  padding: 0.5rem;
  background-color: var(--nb-muted);
  border-radius: 0.25rem;
  font-size: 0.75rem;

  > div {
    margin-bottom: 0.25rem;
  }

  > div:last-child {
    margin-bottom: 0;
  }
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  background-color: ${(props) =>
    props.status === "Completed"
      ? "var(--nb-muted)"
      : props.status === "Approved"
        ? "var(--nb-muted)"
        : props.status === "Rejected"
          ? "var(--nb-muted)"
          : props.status === "Cancelled"
            ? "var(--nb-muted)"
            : "var(--nb-muted)"};
  color: ${(props) =>
    props.status === "Completed"
      ? "var(--nb-ink)"
      : props.status === "Approved"
        ? "var(--nb-ink)"
        : props.status === "Rejected"
          ? "var(--nb-ink)"
          : props.status === "Cancelled"
            ? "var(--nb-ink)"
            : "var(--nb-ink)"};
`;

const BillGenerated = styled.div`
  color: var(--nb-blue);
  font-size: 0.75rem;
  font-weight: 600;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const StatusButton = styled.button`
  padding: 0.25rem 0.5rem;
  background-color: ${(props) => props.color || "var(--nb-blue)"};
  color: var(--nb-white);
  border: none;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  cursor: pointer;
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalCard = styled.div`
  width: 100%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--nb-white);
  border-radius: 0.5rem;
  box-shadow: var(--nb-shadow-md);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--nb-border);

  h3 {
    margin: 0;
    color: var(--nb-ink);
  }
`;

const IconButton = styled.button`
  border: 1px solid var(--nb-border);
  background: var(--nb-white);
  color: var(--nb-ink);
  width: 34px;
  height: 34px;
  border-radius: 8px;
  cursor: pointer;
`;

const ModalBody = styled.div`
  padding: 1rem;
`;

const ItemCard = styled.div`
  border: 1px solid var(--nb-border);
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  background: var(--nb-muted);
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 0.75rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const DeleteItemBtn = styled.button`
  margin-top: 0.3rem;
  border: 1px solid var(--nb-orange);
  background: var(--nb-white);
  color: var(--nb-orange);
  border-radius: 0.25rem;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 1rem;
`;

const SecondaryButton = styled.button`
  border: 1px solid var(--nb-border);
  background: var(--nb-white);
  color: var(--nb-ink);
  border-radius: 0.25rem;
  padding: 0.5rem 0.9rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
`;

const PrimaryButton = styled.button`
  border: 1px solid var(--nb-blue);
  background: var(--nb-blue);
  color: var(--nb-white);
  border-radius: 0.25rem;
  padding: 0.5rem 0.9rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
`;

export default OrderList;
