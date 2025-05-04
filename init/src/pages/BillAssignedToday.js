import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BillAssignedToday = () => {
  const [bills, setBills] = useState([]);

  useEffect(() => {
    const fetchBillsAssignedToday = async () => {
      try {
        const response = await axios.get('http://localhost:2500/api/staff/bills-assigned-today', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setBills(response.data); // Set bills assigned today
      } catch (error) {
        console.error('Error fetching bills assigned today:', error);
      }
    };

    fetchBillsAssignedToday();
  }, []);

  return (
    <div>
      <h1>Bills Assigned Today</h1>
      <ul>
        {bills.map((bill) => (
          <li key={bill._id}>
            Bill ID: {bill.billNumber}, Amount: ₹{bill.amount}, Assigned on: {new Date(bill.billDate).toLocaleDateString()}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BillAssignedToday;
