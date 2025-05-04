import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { FaMoneyBillWave, FaClipboardList, FaTasks, FaHandHoldingUsd, FaExclamationTriangle, FaSync } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:2500/api';

const StaffDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    todayAmountAssigned: 0,
    todayAmountCollected: 0,
    amountRemainingToday: 0,
    billsAssignedToday: 0,
    overdueBillsCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Get token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }
      
      console.log('Fetching dashboard data from:', `${API_BASE_URL}/staff/dashboard`);
      
      const response = await axios.get(`${API_BASE_URL}/staff/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      console.log('Dashboard data received:', response.data);
      setDashboardData(response.data);
    } catch (err) {
      console.error('Error fetching staff dashboard data:', err);
      
      // Provide more specific error messages based on the error type
      if (err.response) {
        // Server responded with a status code outside of 2xx range
        if (err.response.status === 404) {
          setError('API endpoint not found. Please contact the administrator.');
        } else if (err.response.status === 401) {
          setError('Session expired. Please log in again.');
        } else {
          setError(`Server error: ${err.response.data.message || err.response.statusText}`);
        }
      } else if (err.request) {
        // Request was made but no response was received
        setError('Server is not responding. Please check your connection or try again later.');
      } else {
        // Something else caused the error
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleRetry = () => {
    setRetrying(true);
    fetchDashboardData();
  };

  if (loading) return <LoadingContainer>Loading dashboard data...</LoadingContainer>;

  return (
    <Container>
      <Sidebar>
        <h2>Staff Panel</h2>
        <Nav>
          <li><Link to="/staff">Dashboard</Link></li>
          <li><Link to="/staff/collections">Collections</Link></li>
          <li><Link to="/staff/bills-assigned-today">Bills Assigned Today</Link></li>
          <li><Link to="/logout">Logout</Link></li>
        </Nav>
      </Sidebar>
      <Main>
        <HeaderSection>
          <h1>Welcome, Staff Member</h1>
          <RefreshButton onClick={handleRetry} disabled={retrying}>
            <FaSync className={retrying ? 'spinning' : ''} />
            {retrying ? 'Refreshing...' : 'Refresh Data'}
          </RefreshButton>
        </HeaderSection>
        
        {error ? (
          <ErrorContainer>
            <ErrorMessage>{error}</ErrorMessage>
            <RetryButton onClick={handleRetry} disabled={retrying}>
              {retrying ? 'Retrying...' : 'Retry'}
            </RetryButton>
          </ErrorContainer>
        ) : (
          <CardContainer>
            <Card>
              <FaMoneyBillWave size={40} />
              <div>
                <h3>Today's Amount Assigned</h3>
                <p>₹{dashboardData.todayAmountAssigned.toLocaleString()}</p>
              </div>
            </Card>
            <Card>
              <FaClipboardList size={40} />
              <div>
                <h3>Amount Collected</h3>
                <p>₹{dashboardData.todayAmountCollected.toLocaleString()}</p>
              </div>
            </Card>
            <Card>
              <FaHandHoldingUsd size={40} />
              <div>
                <h3>Amount Remaining</h3>
                <p>₹{dashboardData.amountRemainingToday.toLocaleString()}</p>
              </div>
            </Card>
            <Card>
              <FaTasks size={40} />
              <div>
                <h3>Bills Assigned Today</h3>
                <p>{dashboardData.billsAssignedToday}</p>
              </div>
            </Card>
            <Card>
              <FaExclamationTriangle size={40} />
              <div>
                <h3>Overdue Bills</h3>
                <p>{dashboardData.overdueBillsCount}</p>
              </div>
            </Card>
          </CardContainer>
        )}
      </Main>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  min-height: 100vh;
`;

const Sidebar = styled.div`
  width: 220px;
  background-color: #242526;
  color: white;
  padding: 20px;
`;

const Nav = styled.ul`
  list-style: none;
  padding: 0;
  margin-top: 20px;

  li {
    padding: 10px 0;
    a {
      color: white;
      text-decoration: none;
      &:hover {
        color: #00bcd4;
      }
    }
  }
`;

const Main = styled.div`
  flex: 1;
  padding: 40px;
  background-color: #f5f5f5;
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const RefreshButton = styled.button`
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #45a049;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }

  .spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const CardContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 30px;
`;

const Card = styled.div`
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 15px;

  div {
    h3 {
      margin: 0 0 5px 0;
      font-size: 16px;
      color: #555;
    }
    p {
      margin: 0;
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }
  }
`;

const LoadingContainer = styled.div`
  padding: 40px;
  text-align: center;
  font-size: 18px;
`;

const ErrorContainer = styled.div`
  background-color: #ffebee;
  border: 1px solid #ffcdd2;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  margin: 40px 0;
`;

const ErrorMessage = styled.div`
  font-size: 18px;
  color: #d32f2f;
  margin-bottom: 20px;
`;

const RetryButton = styled.button`
  background-color: #2196f3;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 10px 20px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;

  &:hover {
    background-color: #1976d2;
  }

  &:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
  }
`;

export default StaffDashboard;