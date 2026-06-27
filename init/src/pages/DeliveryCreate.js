import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Layout from "../components/Layout";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaTruck, FaUser, FaStore, FaBoxOpen, FaSave } from "react-icons/fa";

const DeliveryCreate = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [retailers, setRetailers] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);

  const [formData, setFormData] = useState({
    vehicleNumber: "",
    vehicleType: "Bike",
    driverName: "",
    driverMobile: "",
    driverId: "",
    retailerId: "",
    totalQuantity: "",
    totalWeight: "",
    dispatchDateTime: new Date().toISOString().slice(0, 16),
    expectedDeliveryDate: "",
    remarks: "",
  });

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchRetailers();
    fetchStaff();
  }, []);

  useEffect(() => {
    if (formData.retailerId) {
      fetchOrdersForRetailer(formData.retailerId);
    } else {
      setAvailableOrders([]);
      setSelectedOrders([]);
    }
  }, [formData.retailerId]);

  const fetchRetailers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("https://backend.laxmilube.in/api/retailers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRetailers(response.data.data || response.data || []);
    } catch (err) {
      console.error("Error fetching retailers:", err);
    }
  };

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("https://backend.laxmilube.in/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const staff = response.data.filter((u) => u.role === "staff");
      setStaffList(staff);
    } catch (err) {
      console.error("Error fetching staff:", err);
    }
  };

  const fetchOrdersForRetailer = async (retailerId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `https://backend.laxmilube.in/api/orders?retailerId=${retailerId}&status=Approved`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setAvailableOrders(response.data || []);
    } catch (err) {
      console.error("Error fetching orders:", err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleOrderSelection = (order) => {
    const exists = selectedOrders.find((o) => o.orderId === order._id);
    if (exists) {
      setSelectedOrders(selectedOrders.filter((o) => o.orderId !== order._id));
    } else {
      // Initialise each item with deliverQty = orderedQty (full by default)
      const deliveredItems = (order.items || []).map((item) => ({
        productId: item.product,
        name: item.name,
        code: item.code || "",
        orderedQty: item.quantity,
        deliverQty: item.quantity, // default: deliver all
        netPrice: item.netPrice,
        totalSale: item.totalSale,
      }));
      setSelectedOrders([
        ...selectedOrders,
        {
          orderId: order._id,
          orderNumber: order._id.slice(-6).toUpperCase(),
          orderAmount: order.totalOrderValue,
          deliveredItems,
        },
      ]);
    }
  };

  const handleItemToggle = (orderId, itemIdx) => {
    setSelectedOrders((prev) =>
      prev.map((o) => {
        if (o.orderId !== orderId) return o;
        const items = o.deliveredItems.map((item, i) => {
          if (i !== itemIdx) return item;
          const isIncluded = item.deliverQty > 0;
          const dQty = isIncluded ? 0 : item.orderedQty;
          return { ...item, deliverQty: dQty, totalSale: dQty * item.netPrice };
        });
        const orderAmount = items.reduce((s, it) => s + it.totalSale, 0);
        return { ...o, deliveredItems: items, orderAmount };
      })
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("token");

      if (selectedOrders.length === 0) {
        throw new Error("Please select at least one order");
      }

      const payload = {
        ...formData,
        vehicleNumber: formData.vehicleNumber.toUpperCase(),
        orders: selectedOrders,
      };

      await axios.post("https://backend.laxmilube.in/api/deliveries", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccess("Delivery created successfully!");
      setTimeout(() => navigate("/admin/delivery-tracking"), 2000);
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Error creating delivery",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Container>
        <Header>
          <h1>Create New Delivery</h1>
        </Header>

        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        <Form onSubmit={handleSubmit}>
          <Section>
            <h3>
              <FaTruck /> Vehicle Information
            </h3>
            <Row>
              <FormGroup>
                <Label>Vehicle Number *</Label>
                <Input
                  type="text"
                  name="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={handleInputChange}
                  placeholder="MH-12-AB-1234"
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Vehicle Type *</Label>
                <Select
                  name="vehicleType"
                  value={formData.vehicleType}
                  onChange={handleInputChange}
                >
                  <option value="Bike">Bike</option>
                  <option value="Tempo">Tempo</option>
                  <option value="Truck">Truck</option>
                </Select>
              </FormGroup>
            </Row>
          </Section>

          <Section>
            <h3>
              <FaUser /> Driver Information
            </h3>
            <Row>
              <FormGroup>
                <Label>Select Staff (Optional)</Label>
                <Select
                  name="driverId"
                  value={formData.driverId}
                  onChange={(e) => {
                    const staff = staffList.find(
                      (s) => s._id === e.target.value,
                    );
                    setFormData({
                      ...formData,
                      driverId: e.target.value,
                      driverName: staff ? staff.name : formData.driverName,
                      driverMobile: "", // Reset mobile as backend doesn't send it usually, user fills manually
                    });
                  }}
                >
                  <option value="">-- Select Staff --</option>
                  {staffList.map((staff) => (
                    <option key={staff._id} value={staff._id}>
                      {staff.name}
                    </option>
                  ))}
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>Driver Name *</Label>
                <Input
                  type="text"
                  name="driverName"
                  value={formData.driverName}
                  onChange={handleInputChange}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Driver Mobile *</Label>
                <Input
                  type="text"
                  name="driverMobile"
                  value={formData.driverMobile}
                  onChange={handleInputChange}
                  pattern="[0-9]{10}"
                  placeholder="10 digit number"
                  required
                />
              </FormGroup>
            </Row>
          </Section>

          <Section>
            <h3>
              <FaStore /> Delivery Details
            </h3>
            <Row>
              <FormGroup>
                <Label>Select Retailer *</Label>
                <Select
                  name="retailerId"
                  value={formData.retailerId}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">-- Select Retailer --</option>
                  {retailers.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} - {r.address1}
                    </option>
                  ))}
                </Select>
              </FormGroup>
            </Row>

            {formData.retailerId && (
              <OrderSelectionContainer>
                <h4>
                  <FaBoxOpen /> Select Approved Orders *
                  {availableOrders.length > 0 && (
                    <span style={{ fontWeight: 400, fontSize: "0.85rem", color: "#64748b", marginLeft: 8 }}>
                      ({availableOrders.length} approved orders found)
                    </span>
                  )}
                </h4>
                {availableOrders.length === 0 ? (
                  <NoOrdersMsg>
                    ⚠️ No approved orders found for this retailer. Orders must be approved before creating a delivery.
                  </NoOrdersMsg>
                ) : (
                  <OrdersGrid>
                    {availableOrders.map((order) => {
                      const selOrder = selectedOrders.find((o) => o.orderId === order._id);
                      const isSelected = !!selOrder;
                      return (
                        <OrderCard
                          key={order._id}
                          selected={isSelected}
                        >
                          {/* Click header to toggle selection */}
                          <OrderCardTop onClick={() => handleOrderSelection(order)}>
                            <span className="order-num">Order #{order._id.slice(-6).toUpperCase()}</span>
                            {isSelected ? <SelectedBadge>✓ Selected</SelectedBadge> : <SelectHint>Click to select</SelectHint>}
                          </OrderCardTop>
                          <div className="order-date" onClick={() => handleOrderSelection(order)}>
                            📅 {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </div>
                          <div className="order-amount" onClick={() => handleOrderSelection(order)}>
                            💰 ₹{isSelected
                              ? selOrder.orderAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : order.totalOrderValue?.toLocaleString("en-IN")}
                            {isSelected && selOrder.orderAmount < order.totalOrderValue && (
                              <PartialTag>Partial</PartialTag>
                            )}
                          </div>

                          {/* Item-wise include/exclude toggle — shown only when selected */}
                          {isSelected && (
                            <ItemQtyEditor>
                              <ItemQtyHeader>
                                <span>Product</span><span>Qty</span><span>Send?</span>
                              </ItemQtyHeader>
                              {selOrder.deliveredItems.map((item, idx) => {
                                const included = item.deliverQty > 0;
                                return (
                                  <ItemQtyRow key={idx} $excluded={!included}>
                                    <ItemName title={item.name} $excluded={!included}>{item.name}</ItemName>
                                    <ItemOrdered $excluded={!included}>{item.orderedQty}</ItemOrdered>
                                    <ToggleSwitch
                                      $on={included}
                                      onClick={(e) => { e.stopPropagation(); handleItemToggle(order._id, idx); }}
                                    >
                                      <ToggleKnob $on={included} />
                                    </ToggleSwitch>
                                  </ItemQtyRow>
                                );
                              })}
                            </ItemQtyEditor>
                          )}

                          {order.approvedAt && (
                            <ApprovedOn onClick={() => handleOrderSelection(order)}>✅ Approved: {new Date(order.approvedAt).toLocaleDateString("en-IN")}</ApprovedOn>
                          )}
                        </OrderCard>
                      );
                    })}
                  </OrdersGrid>
                )}
                {selectedOrders.length > 0 && (
                  <SelectedSummary>
                    <strong>{selectedOrders.length} order{selectedOrders.length > 1 ? "s" : ""} selected</strong>
                    &nbsp;— Total: <strong>₹{selectedOrders.reduce((s, o) => s + (o.orderAmount || 0), 0).toLocaleString("en-IN")}</strong>
                  </SelectedSummary>
                )}
              </OrderSelectionContainer>
            )}

            <Row>
              <FormGroup>
                <Label>Dispatch Date & Time *</Label>
                <Input
                  type="datetime-local"
                  name="dispatchDateTime"
                  value={formData.dispatchDateTime}
                  onChange={handleInputChange}
                  required
                />
              </FormGroup>
              <FormGroup>
                <Label>Expected Delivery Date *</Label>
                <Input
                  type="date"
                  name="expectedDeliveryDate"
                  value={formData.expectedDeliveryDate}
                  onChange={handleInputChange}
                  required
                />
              </FormGroup>
            </Row>

            <Row>
              <FormGroup>
                <Label>Total Quantity</Label>
                <Input
                  type="number"
                  name="totalQuantity"
                  value={formData.totalQuantity}
                  onChange={handleInputChange}
                />
              </FormGroup>
              <FormGroup>
                <Label>Total Weight (kg)</Label>
                <Input
                  type="number"
                  name="totalWeight"
                  value={formData.totalWeight}
                  onChange={handleInputChange}
                />
              </FormGroup>
            </Row>

            <FormGroup style={{ width: "100%" }}>
              <Label>Remarks</Label>
              <TextArea
                name="remarks"
                value={formData.remarks}
                onChange={handleInputChange}
                rows="3"
              />
            </FormGroup>
          </Section>

          <SubmitButton type="submit" disabled={loading}>
            {loading ? (
              "Creating..."
            ) : (
              <>
                <FaSave /> Create Delivery
              </>
            )}
          </SubmitButton>
        </Form>
      </Container>
    </Layout>
  );
};

// Styled Components
const Container = styled.div`
  padding: 20px;
`;

const Header = styled.div`
  margin-bottom: 2rem;
  h1 {
    color: var(--nb-ink);
    font-size: 1.8rem;
  }
`;

const Section = styled.div`
  background: var(--nb-white);
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: var(--nb-shadow-md);

  h3 {
    margin-bottom: 15px;
    color: var(--nb-blue);
    display: flex;
    align-items: center;
    gap: 10px;
    border-bottom: 1px solid var(--nb-border);
    padding-bottom: 10px;
  }
`;

const Form = styled.form`
  max-width: 1000px;
  margin: 0 auto;
`;

const Row = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 15px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-weight: 500;
  color: var(--nb-ink);
  font-size: 0.9rem;
`;

const Input = styled.input`
  padding: 10px;
  border: 1px solid var(--nb-border);
  border-radius: 4px;
  font-size: 1rem;
  &:focus {
    border-color: var(--nb-blue);
    outline: none;
  }
`;

const Select = styled.select`
  padding: 10px;
  border: 1px solid var(--nb-border);
  border-radius: 4px;
  font-size: 1rem;
  background: var(--nb-white);
`;

const TextArea = styled.textarea`
  padding: 10px;
  border: 1px solid var(--nb-border);
  border-radius: 4px;
  font-size: 1rem;
  resize: vertical;
`;

const OrderSelectionContainer = styled.div`
  border: 1px solid var(--nb-border);
  padding: 15px;
  border-radius: 6px;
  background: var(--nb-muted);
  margin-bottom: 15px;
`;

const OrdersGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
  margin-top: 10px;
`;

const OrderCard = styled.div`
  border: 1px solid ${(props) => (props.selected ? "#2563eb" : "var(--nb-border)")};
  background-color: ${(props) => (props.selected ? "#eff6ff" : "var(--nb-white)")};
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--nb-shadow-md);
    border-color: #2563eb;
  }

  .order-num {
    font-weight: 700;
    color: var(--nb-ink);
    font-size: 0.9rem;
  }
  .order-amount {
    color: #059669;
    font-weight: 700;
    font-size: 1rem;
    margin: 4px 0;
  }
  .order-date {
    font-size: 0.8rem;
    color: #64748b;
    margin-bottom: 6px;
  }
`;

const OrderCardTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`;

const SelectedBadge = styled.span`
  background: #2563eb;
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 20px;
`;

const ItemsList = styled.ul`
  list-style: none;
  padding: 6px 0 0;
  margin: 6px 0 0;
  border-top: 1px solid #e2e8f0;
  font-size: 0.78rem;
  color: #475569;
  li {
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
  }
`;

const ApprovedOn = styled.div`
  font-size: 0.75rem;
  color: #059669;
  margin-top: 6px;
  cursor: pointer;
`;

const SelectHint = styled.span`
  font-size: 0.72rem;
  color: #94a3b8;
  font-style: italic;
`;

const PartialTag = styled.span`
  background: #fef3c7;
  color: #92400e;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 10px;
  margin-left: 6px;
  vertical-align: middle;
`;

const ItemQtyEditor = styled.div`
  margin-top: 10px;
  border-top: 1px dashed #cbd5e1;
  padding-top: 8px;
`;

const ItemQtyHeader = styled.div`
  display: grid;
  grid-template-columns: 1fr 40px 44px;
  gap: 4px;
  font-size: 0.72rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 4px;
  text-align: center;
  span:first-child { text-align: left; }
`;

const ItemQtyRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 40px 44px;
  gap: 4px;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid #f1f5f9;
  &:last-child { border-bottom: none; }
  opacity: ${(p) => (p.$excluded ? 0.4 : 1)};
  transition: opacity 0.2s;
`;

const ItemName = styled.span`
  font-size: 0.8rem;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-decoration: ${(p) => (p.$excluded ? "line-through" : "none")};
`;

const ItemOrdered = styled.span`
  font-size: 0.8rem;
  color: #64748b;
  text-align: center;
`;

const ToggleSwitch = styled.div`
  width: 36px;
  height: 20px;
  border-radius: 20px;
  background: ${(p) => (p.$on ? "#22c55e" : "#cbd5e1")};
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
  margin: 0 auto;
`;

const ToggleKnob = styled.div`
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  position: absolute;
  top: 3px;
  left: ${(p) => (p.$on ? "19px" : "3px")};
  transition: left 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
`;

const NoOrdersMsg = styled.div`
  background: #fef9c3;
  border: 1px solid #fde047;
  color: #854d0e;
  padding: 12px 16px;
  border-radius: 6px;
  margin-top: 10px;
  font-size: 0.9rem;
`;

const SelectedSummary = styled.div`
  margin-top: 12px;
  padding: 10px 14px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  color: #1e40af;
  font-size: 0.9rem;
`;

const SubmitButton = styled.button`
  background-color: var(--nb-blue);
  color: var(--nb-white);
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  justify-content: center;
  transition: background 0.3s;

  &:hover {
    background-color: var(--nb-blue);
  }

  &:disabled {
    background-color: var(--nb-border);
    cursor: not-allowed;
  }
`;

const Alert = styled.div`
  padding: 15px;
  margin-bottom: 20px;
  border-radius: 4px;
  background-color: ${(props) =>
    props.type === "error" ? "var(--nb-muted)" : "var(--nb-muted)"};
  color: ${(props) => (props.type === "error" ? "var(--nb-orange)" : "var(--nb-blue)")};
  border: 1px solid
    ${(props) => (props.type === "error" ? "var(--nb-border)" : "var(--nb-border)")};
`;

export default DeliveryCreate;
