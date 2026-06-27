import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import RetailerLayout from "../components/RetailerLayout";
import { FaPlus, FaBox, FaShoppingCart, FaTrash } from "react-icons/fa";

const RetailerOrders = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderItems, setOrderItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await axios.get(
        "https://backend.laxmilube.in/api/retailer/orders",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        setOrders(response.data.orders);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      if (error.response?.status === 401) {
        navigate("/login");
      } else {
        setError(error.response?.data?.message || "Failed to load orders");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("https://backend.laxmilube.in/api/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchProducts();
  }, [fetchOrders]);

  const handleAddItem = () => {
    setOrderItems([
      ...orderItems,
      {
        product: "",
        quantity: 1,
        price: 0,
        totalSale: 0,
        totalLitres: 0,
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...orderItems];
    updatedItems[index][field] = value;

    // If product is selected, auto-fill price
    if (field === "product" && value) {
      const selectedProduct = products.find((p) => p._id === value);
      if (selectedProduct) {
        updatedItems[index].price = selectedProduct.price;
        updatedItems[index].productName = selectedProduct.name;
      }
    }

    // Calculate totals
    if (field === "quantity" || field === "price") {
      const quantity = parseFloat(updatedItems[index].quantity) || 0;
      const price = parseFloat(updatedItems[index].price) || 0;
      updatedItems[index].totalSale = quantity * price;
      updatedItems[index].totalLitres = quantity;
    }

    setOrderItems(updatedItems);
  };

  const handleSubmitOrder = async () => {
    if (orderItems.length === 0) {
      alert("Please add at least one item to the order");
      return;
    }

    // Validate all items have product selected
    const invalidItems = orderItems.filter(
      (item) => !item.product || item.quantity <= 0,
    );
    if (invalidItems.length > 0) {
      alert("Please fill all order items correctly");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");

      const response = await axios.post(
        "https://backend.laxmilube.in/api/retailer/orders",
        { items: orderItems },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        alert("Order placed successfully! Awaiting admin approval.");
        setShowOrderForm(false);
        setOrderItems([]);
        fetchOrders();
      }
    } catch (error) {
      console.error("Error placing order:", error);
      alert(error.response?.data?.message || "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  const getTotalOrderValue = () => {
    return orderItems.reduce((sum, item) => sum + (item.totalSale || 0), 0);
  };

  const getTotalLitres = () => {
    return orderItems.reduce((sum, item) => sum + (item.totalLitres || 0), 0);
  };

  return (
    <RetailerLayout>
      <PageContainer>
        <Header>
          <div>
            <h1>My Orders</h1>
            <SubTitle>View your order history and place new orders</SubTitle>
          </div>
          <ActionButton onClick={() => setShowOrderForm(!showOrderForm)}>
            <FaPlus /> {showOrderForm ? "Cancel" : "Place New Order"}
          </ActionButton>
        </Header>

        {/* New Order Form */}
        {showOrderForm && (
          <OrderFormSection>
            <FormHeader>
              <h2>Place New Order</h2>
            </FormHeader>

            <OrderItemsContainer>
              {orderItems.map((item, index) => (
                <OrderItemRow key={index}>
                  <FormGroup>
                    <Label>Product</Label>
                    <Select
                      value={item.product}
                      onChange={(e) =>
                        handleItemChange(index, "product", e.target.value)
                      }
                    >
                      <option value="">Select Product</option>
                      {products.map((product) => (
                        <option key={product._id} value={product._id}>
                          {product.name} - {product.code}
                        </option>
                      ))}
                    </Select>
                  </FormGroup>

                  <FormGroup>
                    <Label>Quantity (Litres)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, "quantity", e.target.value)
                      }
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>Price per Litre</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.price}
                      onChange={(e) =>
                        handleItemChange(index, "price", e.target.value)
                      }
                    />
                  </FormGroup>

                  <FormGroup>
                    <Label>Total</Label>
                    <TotalText>
                      ₹{item.totalSale?.toFixed(2) || "0.00"}
                    </TotalText>
                  </FormGroup>

                  <RemoveButton onClick={() => handleRemoveItem(index)}>
                    <FaTrash />
                  </RemoveButton>
                </OrderItemRow>
              ))}

              <AddItemButton onClick={handleAddItem}>
                <FaPlus /> Add Item
              </AddItemButton>
            </OrderItemsContainer>

            {orderItems.length > 0 && (
              <OrderSummary>
                <SummaryRow>
                  <span>Total Litres:</span>
                  <strong>{getTotalLitres().toFixed(2)} L</strong>
                </SummaryRow>
                <SummaryRow>
                  <span>Total Amount:</span>
                  <strong>₹{getTotalOrderValue().toFixed(2)}</strong>
                </SummaryRow>
              </OrderSummary>
            )}

            <FormActions>
              <CancelButton
                onClick={() => {
                  setShowOrderForm(false);
                  setOrderItems([]);
                }}
              >
                Cancel
              </CancelButton>
              <SubmitButton
                onClick={handleSubmitOrder}
                disabled={submitting || orderItems.length === 0}
              >
                {submitting ? "Placing Order..." : "Place Order"}
              </SubmitButton>
            </FormActions>
          </OrderFormSection>
        )}

        {/* Orders List */}
        <ContentSection>
          <SectionHeader>
            <h2>Order History</h2>
          </SectionHeader>

          {loading ? (
            <LoadingIndicator>
              <div className="spinner"></div>
              <p>Loading orders...</p>
            </LoadingIndicator>
          ) : error ? (
            <ErrorMessage>{error}</ErrorMessage>
          ) : orders.length === 0 ? (
            <EmptyState>
              <FaShoppingCart size={48} />
              <p>No orders yet</p>
              <small>Click "Place New Order" to create your first order</small>
            </EmptyState>
          ) : (
            <OrdersList>
              {orders.map((order) => (
                <OrderCard key={order.id}>
                  <OrderHeader>
                    <div>
                      <OrderTitle>Order #{order.id.slice(-6)}</OrderTitle>
                      <OrderDate>
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </OrderDate>
                    </div>
                    <StatusBadge status={order.status}>
                      {order.status}
                    </StatusBadge>
                  </OrderHeader>

                  <OrderItems>
                    {order.items.map((item, idx) => (
                      <OrderItem key={idx}>
                        <FaBox />
                        <ItemDetails>
                          <ItemName>
                            {item.productName || item.product?.name}
                          </ItemName>
                          <ItemQuantity>
                            {item.quantity} L × ₹{item.price}
                          </ItemQuantity>
                        </ItemDetails>
                        <ItemTotal>₹{item.totalSale.toFixed(2)}</ItemTotal>
                      </OrderItem>
                    ))}
                  </OrderItems>

                  <OrderFooter>
                    <FooterItem>
                      <span>Total Litres:</span>
                      <strong>{order.totalLitres} L</strong>
                    </FooterItem>
                    <FooterItem>
                      <span>Total Amount:</span>
                      <strong>₹{order.totalOrderValue.toFixed(2)}</strong>
                    </FooterItem>
                  </OrderFooter>
                </OrderCard>
              ))}
            </OrdersList>
          )}
        </ContentSection>
      </PageContainer>
    </RetailerLayout>
  );
};

// Styled Components
const PageContainer = styled.div`
  width: 100%;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;

  h1 {
    color: var(--nb-ink);
    font-size: 1.5rem;
    margin: 0 0 0.5rem 0;
    font-weight: 600;

    @media (min-width: 768px) {
      font-size: 1.8rem;
    }
  }
`;

const SubTitle = styled.p`
  color: var(--nb-ink);
  font-size: 0.95rem;
  margin: 0;
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: var(--nb-cream);
  color: var(--nb-white);
  border: none;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--nb-shadow-md);
  }
`;

const OrderFormSection = styled.div`
  background: var(--nb-white);
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: var(--nb-shadow-md);
  margin-bottom: 2rem;
`;

const FormHeader = styled.div`
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--nb-border);

  h2 {
    color: var(--nb-ink);
    font-size: 1.25rem;
    margin: 0;
    font-weight: 600;
  }
`;

const OrderItemsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const OrderItemRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr auto;
  gap: 1rem;
  align-items: end;
  padding: 1rem;
  background: var(--nb-muted);
  border-radius: 0.5rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  color: var(--nb-ink);
  font-size: 0.85rem;
  font-weight: 500;
`;

const Select = styled.select`
  padding: 0.625rem;
  border: 1px solid var(--nb-border);
  border-radius: 0.375rem;
  font-size: 0.9rem;
  background: var(--nb-white);
  cursor: pointer;

  &:focus {
    border-color: var(--nb-blue);
    outline: none;
  }
`;

const Input = styled.input`
  padding: 0.625rem;
  border: 1px solid var(--nb-border);
  border-radius: 0.375rem;
  font-size: 0.9rem;

  &:focus {
    border-color: var(--nb-blue);
    outline: none;
  }
`;

const TotalText = styled.div`
  padding: 0.625rem;
  background: var(--nb-muted);
  border-radius: 0.375rem;
  color: var(--nb-blue);
  font-weight: 600;
  text-align: center;
`;

const RemoveButton = styled.button`
  padding: 0.625rem;
  background: var(--nb-muted);
  color: var(--nb-orange);
  border: 1px solid var(--nb-border);
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--nb-orange);
    color: var(--nb-white);
  }
`;

const AddItemButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--nb-muted);
  color: var(--nb-blue);
  border: 2px dashed var(--nb-blue);
  border-radius: 0.5rem;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--nb-blue);
    color: var(--nb-white);
  }
`;

const OrderSummary = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background: var(--nb-muted);
  border-radius: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 1rem;

  strong {
    color: var(--nb-ink);
  }
`;

const FormActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 1.5rem;
`;

const CancelButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: var(--nb-muted);
  color: var(--nb-ink);
  border: 1px solid var(--nb-border);
  border-radius: 0.5rem;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: var(--nb-muted);
  }
`;

const SubmitButton = styled.button`
  padding: 0.75rem 1.5rem;
  background: var(--nb-cream);
  color: var(--nb-white);
  border: none;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--nb-shadow-md);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ContentSection = styled.section`
  background-color: var(--nb-white);
  border-radius: 0.75rem;
  padding: 1.25rem;
  box-shadow: var(--nb-shadow-md);

  @media (min-width: 768px) {
    padding: 1.5rem;
  }
`;

const SectionHeader = styled.div`
  margin-bottom: 1.25rem;

  h2 {
    color: var(--nb-ink);
    font-size: 1.25rem;
    margin: 0;
    font-weight: 600;
  }
`;

const OrdersList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const OrderCard = styled.div`
  border: 1px solid var(--nb-border);
  border-radius: 0.75rem;
  padding: 1.25rem;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: var(--nb-shadow-md);
  }
`;

const OrderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--nb-border);
`;

const OrderTitle = styled.h3`
  color: var(--nb-ink);
  font-size: 1.1rem;
  margin: 0 0 0.25rem 0;
  font-weight: 600;
`;

const OrderDate = styled.div`
  color: var(--nb-ink);
  font-size: 0.85rem;
`;

const StatusBadge = styled.span`
  padding: 0.35rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.8rem;
  font-weight: 600;
  background-color: ${(props) =>
    props.status === "Completed" || props.status === "Approved"
      ? "var(--nb-muted)"
      : props.status === "Pending"
        ? "var(--nb-white)8e6"
        : props.status === "Rejected"
          ? "var(--nb-muted)"
          : "var(--nb-muted)"};
  color: ${(props) =>
    props.status === "Completed" || props.status === "Approved"
      ? "var(--nb-blue)"
      : props.status === "Pending"
        ? "var(--nb-orange)"
        : props.status === "Rejected"
          ? "var(--nb-orange)"
          : "var(--nb-blue)"};
`;

const OrderItems = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const OrderItem = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: var(--nb-muted);
  border-radius: 0.5rem;

  svg {
    color: var(--nb-blue);
    flex-shrink: 0;
  }
`;

const ItemDetails = styled.div`
  flex: 1;
`;

const ItemName = styled.div`
  color: var(--nb-ink);
  font-weight: 500;
  font-size: 0.95rem;
`;

const ItemQuantity = styled.div`
  color: var(--nb-ink);
  font-size: 0.85rem;
  margin-top: 0.25rem;
`;

const ItemTotal = styled.div`
  color: var(--nb-blue);
  font-weight: 600;
  font-size: 1rem;
`;

const OrderFooter = styled.div`
  display: flex;
  justify-content: space-between;
  padding-top: 1rem;
  border-top: 1px solid var(--nb-border);
`;

const FooterItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;

  span {
    color: var(--nb-ink);
    font-size: 0.85rem;
  }

  strong {
    color: var(--nb-ink);
    font-size: 1rem;
  }
`;

const LoadingIndicator = styled.div`
  padding: 2rem;
  text-align: center;
  color: var(--nb-ink);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--nb-muted);
    border-radius: 50%;
    border-top-color: var(--nb-blue);
    animation: spin 1s ease-in-out infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  p {
    margin: 0;
    font-size: 0.95rem;
  }
`;

const ErrorMessage = styled.div`
  padding: 2rem;
  text-align: center;
  color: var(--nb-orange);
  background-color: var(--nb-muted);
  border-radius: 0.75rem;
  border: 1px solid var(--nb-border);
`;

const EmptyState = styled.div`
  padding: 3rem 2rem;
  text-align: center;
  color: var(--nb-ink);

  svg {
    color: var(--nb-border);
    margin-bottom: 1rem;
  }

  p {
    font-size: 1.1rem;
    margin: 0 0 0.5rem 0;
    color: var(--nb-ink);
  }

  small {
    font-size: 0.9rem;
    color: var(--nb-ink);
  }
`;

export default RetailerOrders;
