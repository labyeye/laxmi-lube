import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Layout from "../components/Layout";
import axios from "axios";
import {
  FaBeer,
  FaBoxes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSearch,
  FaShippingFast,
  FaTruck,
  FaClock,
} from "react-icons/fa";

const DeliveryTracking = () => {
  const [loading, setLoading] = useState(false);
  const [deliveries, setDeliveries] = useState([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState([]);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDeliveries();
  }, []);

  useEffect(() => {
    let result = deliveries;

    if (filterStatus !== "all") {
      result = result.filter((d) => d.deliveryStatus === filterStatus);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (d) =>
          d.vehicleNumber.toLowerCase().includes(term) ||
          d.driverName.toLowerCase().includes(term) ||
          d.retailerName.toLowerCase().includes(term) ||
          d.orders.some((o) => o.orderNumber.toLowerCase().includes(term)),
      );
    }

    setFilteredDeliveries(result);
  }, [filterStatus, searchTerm, deliveries]);

  const fetchDeliveries = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:2500/api/deliveries", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeliveries(response.data.deliveries || []);
      setFilteredDeliveries(response.data.deliveries || []);
    } catch (err) {
      setError("Failed to fetch deliveries");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `http://localhost:2500/api/deliveries/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      fetchDeliveries(); // Refresh list
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "var(--nb-orange)";
      case "In Transit":
        return "var(--nb-blue)";
      case "Delivered":
        return "var(--nb-blue)";
      case "Cancelled":
        return "var(--nb-orange)";
      default:
        return "var(--nb-ink)";
    }
  };

  return (
    <Layout>
      <Container>
        <Header>
          <h1>Delivery Tracking Board</h1>
          <Controls>
            <SearchBox>
              <FaSearch />
              <input
                type="text"
                placeholder="Search vehicle, driver, retailer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </SearchBox>
            <FilterSelect
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="Pending">Pending</option>
              <option value="In Transit">In Transit</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </FilterSelect>
          </Controls>
        </Header>

        {loading ? (
          <p>Loading deliveries...</p>
        ) : error ? (
          <p style={{ color: "red" }}>{error}</p>
        ) : (
          <KanbanBoard>
            {/* Pending Column */}
            <Column>
              <ColumnHeader color="var(--nb-orange)">
                <FaClock /> Pending (
                {
                  filteredDeliveries.filter(
                    (d) => d.deliveryStatus === "Pending",
                  ).length
                }
                )
              </ColumnHeader>
              <DroppableArea>
                {filteredDeliveries
                  .filter((d) => d.deliveryStatus === "Pending")
                  .map((delivery) => (
                    <DeliveryCard key={delivery._id} status="Pending">
                      <CardHeader>
                        <span className="vehicle">
                          {delivery.vehicleNumber}
                        </span>
                        <span className="type">{delivery.vehicleType}</span>
                      </CardHeader>
                      <CardBody>
                        <div className="row">
                          <strong>Driver:</strong> {delivery.driverName}
                        </div>
                        <div className="row">
                          <strong>To:</strong> {delivery.retailerName}
                        </div>
                        <div className="row">
                          <strong>Orders:</strong> {delivery.orders.length} (₹
                          {delivery.totalOrderAmount})
                        </div>
                        <div className="row">
                          <strong>Expected:</strong>{" "}
                          {new Date(
                            delivery.expectedDeliveryDate,
                          ).toLocaleDateString()}
                        </div>
                      </CardBody>
                      <CardActions>
                        <ActionButton
                          color="var(--nb-blue)"
                          onClick={() =>
                            updateStatus(delivery._id, "In Transit")
                          }
                        >
                          Start Trip ➜
                        </ActionButton>
                      </CardActions>
                    </DeliveryCard>
                  ))}
              </DroppableArea>
            </Column>

            {/* In Transit Column */}
            <Column>
              <ColumnHeader color="var(--nb-blue)">
                <FaShippingFast /> In Transit (
                {
                  filteredDeliveries.filter(
                    (d) => d.deliveryStatus === "In Transit",
                  ).length
                }
                )
              </ColumnHeader>
              <DroppableArea>
                {filteredDeliveries
                  .filter((d) => d.deliveryStatus === "In Transit")
                  .map((delivery) => (
                    <DeliveryCard key={delivery._id} status="In Transit">
                      <CardHeader>
                        <span className="vehicle">
                          {delivery.vehicleNumber}
                        </span>
                        <span className="type">{delivery.vehicleType}</span>
                      </CardHeader>
                      <CardBody>
                        <div className="row">
                          <strong>Driver:</strong> {delivery.driverName}
                        </div>
                        <div className="row">
                          <strong>Mobile:</strong> {delivery.driverMobile}
                        </div>
                        <div className="row">
                          <strong>To:</strong> {delivery.retailerName}
                        </div>
                        {delivery.isDelayed && (
                          <div className="delayed">
                            <FaExclamationTriangle /> Delayed
                          </div>
                        )}
                      </CardBody>
                      <CardActions>
                        <ActionButton
                          color="var(--nb-blue)"
                          onClick={() =>
                            updateStatus(delivery._id, "Delivered")
                          }
                        >
                          Mark Delivered ✓
                        </ActionButton>
                      </CardActions>
                    </DeliveryCard>
                  ))}
              </DroppableArea>
            </Column>

            {/* Delivered Column (Recent) */}
            <Column>
              <ColumnHeader color="var(--nb-blue)">
                <FaCheckCircle /> Completed (Today)
              </ColumnHeader>
              <DroppableArea>
                {filteredDeliveries
                  .filter((d) => d.deliveryStatus === "Delivered")
                  .slice(0, 10) // Show only recent 10 to clear clutter
                  .map((delivery) => (
                    <DeliveryCard key={delivery._id} status="Delivered">
                      <CardHeader>
                        <span className="vehicle">
                          {delivery.vehicleNumber}
                        </span>
                        <span className="date">
                          {new Date(
                            delivery.actualDeliveryDateTime,
                          ).toLocaleTimeString()}
                        </span>
                      </CardHeader>
                      <CardBody>
                        <div className="row">
                          <strong>Driver:</strong> {delivery.driverName}
                        </div>
                        <div className="row">
                          <strong>To:</strong> {delivery.retailerName}
                        </div>
                      </CardBody>
                    </DeliveryCard>
                  ))}
              </DroppableArea>
            </Column>
          </KanbanBoard>
        )}
      </Container>
    </Layout>
  );
};

// Styled Components
const Container = styled.div`
  padding: 20px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 15px;

  h1 {
    color: var(--nb-ink);
    font-size: 1.8rem;
    margin: 0;
  }
`;

const Controls = styled.div`
  display: flex;
  gap: 15px;
`;

const SearchBox = styled.div`
  background: var(--nb-white);
  padding: 8px 15px;
  border-radius: 20px;
  display: flex;
  align-items: center;
  box-shadow: var(--nb-shadow-md);

  svg {
    color: var(--nb-ink);
    margin-right: 8px;
  }
  input {
    border: none;
    outline: none;
    font-size: 0.9rem;
    width: 200px;
  }
`;

const FilterSelect = styled.select`
  padding: 8px 15px;
  border-radius: 20px;
  border: 1px solid var(--nb-border);
  background: var(--nb-white);
  cursor: pointer;
`;

const KanbanBoard = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  align-items: start;
`;

const Column = styled.div`
  background: var(--nb-muted);
  border-radius: 8px;
  min-height: 500px;
  display: flex;
  flex-direction: column;
`;

const ColumnHeader = styled.div`
  padding: 15px;
  background: ${(props) => props.color};
  color: var(--nb-white);
  font-weight: bold;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const DroppableArea = styled.div`
  padding: 10px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const DeliveryCard = styled.div`
  background: var(--nb-white);
  border-radius: 6px;
  padding: 15px;
  box-shadow: var(--nb-shadow-md);
  border-left: 4px solid
    ${(props) =>
      props.status === "Pending"
        ? "var(--nb-orange)"
        : props.status === "In Transit"
          ? "var(--nb-blue)"
          : props.status === "Delivered"
            ? "var(--nb-blue)"
            : "var(--nb-border)"};
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;

  .vehicle {
    font-weight: bold;
    color: var(--nb-ink);
  }
  .type {
    background: var(--nb-border);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.8rem;
  }
  .date {
    font-size: 0.8rem;
    color: var(--nb-ink);
  }
`;

const CardBody = styled.div`
  font-size: 0.9rem;
  color: var(--nb-ink);

  .row {
    margin-bottom: 5px;
  }
  .delayed {
    color: var(--nb-orange);
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 5px;
  }
`;

const CardActions = styled.div`
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid var(--nb-border);
  display: flex;
  justify-content: flex-end;
`;

const ActionButton = styled.button`
  background: ${(props) => props.color};
  color: var(--nb-white);
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }
`;

export default DeliveryTracking;
