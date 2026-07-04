import React, { useState, useEffect, useCallback } from "react";
import styled from "styled-components";
import axios from "axios";
import Layout from "../components/Layout";
import { fmtDate } from "../utils/dateFormat";

const SalaryLedgerPage = () => {
  const [users, setUsers] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [ledgerData, setLedgerData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        "https://backend.laxmilube.in/api/users",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      // Filter to show only staff members, not admin
      const staffMembers = response.data.filter(
        (user) => user.role === "staff",
      );
      setUsers(staffMembers);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchLedgerData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      // Fetch salaries for the year
      const salariesResponse = await axios.get(
        `https://backend.laxmilube.in/api/salaries/staff/${selectedStaff}`,
        config,
      );
      const salaries = salariesResponse.data.filter(
        (s) => s.salaryYear === parseInt(selectedYear),
      );

      // Fetch advances for the year
      const advancesResponse = await axios.get(
        `https://backend.laxmilube.in/api/advances/staff/${selectedStaff}`,
        config,
      );
      const advances = advancesResponse.data.filter((adv) => {
        const advDate = new Date(adv.advanceDate);
        return advDate.getFullYear() === parseInt(selectedYear);
      });

      // Combine and sort by month
      const combined = [];

      for (let month = 1; month <= 12; month++) {
        const monthlySalary = salaries.find((s) => s.salaryMonth === month);
        const monthlyAdvances = advances.filter((adv) => {
          const advDate = new Date(adv.advanceDate);
          return advDate.getMonth() + 1 === month;
        });

        if (monthlySalary || monthlyAdvances.length > 0) {
          combined.push({
            month,
            salary: monthlySalary,
            advances: monthlyAdvances,
          });
        }
      }

      setLedgerData(combined);
    } catch (error) {
      console.error("Error fetching ledger data:", error);
      alert("Failed to fetch ledger data");
    } finally {
      setLoading(false);
    }
  }, [selectedStaff, selectedYear]);

  useEffect(() => {
    if (selectedStaff) {
      fetchLedgerData();
    }
  }, [selectedStaff, selectedYear, fetchLedgerData]);

  const getMonthName = (month) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[month - 1];
  };

  const calculateRunningBalance = () => {
    let balance = 0;
    return ledgerData.map((item) => {
      const salaryCredit = item.salary ? item.salary.basicSalary : 0;
      const advanceDebit = item.advances.reduce(
        (sum, adv) => sum + adv.advanceAmount,
        0,
      );
      const netPaid = item.salary ? item.salary.paidAmount : 0;

      balance += salaryCredit - advanceDebit - netPaid;

      return {
        ...item,
        salaryCredit,
        advanceDebit,
        netPaid,
        runningBalance: balance,
      };
    });
  };

  const getTotals = () => {
    const ledgerWithBalance = calculateRunningBalance();
    return {
      totalSalary: ledgerWithBalance.reduce(
        (sum, item) => sum + item.salaryCredit,
        0,
      ),
      totalAdvance: ledgerWithBalance.reduce(
        (sum, item) => sum + item.advanceDebit,
        0,
      ),
      totalPaid: ledgerWithBalance.reduce((sum, item) => sum + item.netPaid, 0),
      finalBalance:
        ledgerWithBalance.length > 0
          ? ledgerWithBalance[ledgerWithBalance.length - 1].runningBalance
          : 0,
    };
  };

  const selectedStaffName =
    users.find((u) => u._id === selectedStaff)?.name || "";

  return (
    <Layout>
      <Container>
        <Header>
          <Title>Salary Ledger</Title>
        </Header>

        <FilterCard>
          <FilterRow>
            <FilterGroup>
              <Label>Select Staff Member</Label>
              <Select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
              >
                <option value="">-- Select Staff --</option>
                {users.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name} - {user.role}
                  </option>
                ))}
              </Select>
            </FilterGroup>

            <FilterGroup>
              <Label>Select Year</Label>
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {[...Array(5)].map((_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  );
                })}
              </Select>
            </FilterGroup>
          </FilterRow>
        </FilterCard>

        {selectedStaff && (
          <>
            <LedgerHeader>
              <LedgerTitle>Ledger Account: {selectedStaffName}</LedgerTitle>
              <LedgerPeriod>Financial Year: {selectedYear}</LedgerPeriod>
            </LedgerHeader>

            {loading ? (
              <LoadingMessage>Loading ledger data...</LoadingMessage>
            ) : ledgerData.length === 0 ? (
              <NoDataMessage>
                No transactions found for the selected period
              </NoDataMessage>
            ) : (
              <>
                <LedgerTable>
                  <thead>
                    <tr>
                      <Th>Month</Th>
                      <Th>Particulars</Th>
                      <Th className="debit">Debit (Dr.)</Th>
                      <Th className="credit">Credit (Cr.)</Th>
                      <Th className="balance">Running Balance</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {calculateRunningBalance().map((item, index) => (
                      <React.Fragment key={index}>
                        {/* Salary Entry */}
                        {item.salary && (
                          <tr>
                            <Td>{getMonthName(item.month)}</Td>
                            <Td>
                              <Particulars>
                                <strong>Salary Credited</strong>
                                <Details>
                                  Basic: ₹{item.salary.basicSalary.toFixed(2)} |
                                  Advance Adj: ₹
                                  {item.salary.advanceDeducted.toFixed(2)} |
                                  Net: ₹
                                  {item.salary.netSalaryPayable.toFixed(2)}
                                </Details>
                              </Particulars>
                            </Td>
                            <Td className="debit">-</Td>
                            <Td className="credit">
                              ₹ {item.salaryCredit.toFixed(2)}
                            </Td>
                            <Td className="balance">-</Td>
                          </tr>
                        )}

                        {/* Advance Entries */}
                        {item.advances.map((adv, advIndex) => (
                          <tr key={`adv-${advIndex}`}>
                            <Td>
                              {advIndex === 0 ? getMonthName(item.month) : ""}
                            </Td>
                            <Td>
                              <Particulars>
                                <strong>Advance Taken</strong>
                                <Details>
                                  Date:{" "}
                                  {fmtDate(adv.advanceDate)}{" "}
                                  | Reason: {adv.reason || "N/A"} | Status:{" "}
                                  {adv.status}
                                </Details>
                              </Particulars>
                            </Td>
                            <Td className="debit">
                              ₹ {adv.advanceAmount.toFixed(2)}
                            </Td>
                            <Td className="credit">-</Td>
                            <Td className="balance">-</Td>
                          </tr>
                        ))}

                        {/* Payment Entry */}
                        {item.salary && item.salary.paidAmount > 0 && (
                          <tr>
                            <Td></Td>
                            <Td>
                              <Particulars>
                                <strong>Salary Paid</strong>
                                <Details>
                                  Mode: {item.salary.paymentMode} | Date:{" "}
                                  {item.salary.paidDate
                                    ? fmtDate(item.salary.paidDate)
                                    : "N/A"}{" "}
                                  | Status: {item.salary.paymentStatus}
                                </Details>
                              </Particulars>
                            </Td>
                            <Td className="debit">
                              ₹ {item.netPaid.toFixed(2)}
                            </Td>
                            <Td className="credit">-</Td>
                            <Td className="balance">-</Td>
                          </tr>
                        )}

                        {/* Monthly Balance */}
                        <BalanceRow>
                          <Td colSpan="2">
                            <strong>
                              Balance c/f - {getMonthName(item.month)}
                            </strong>
                          </Td>
                          <Td className="debit">-</Td>
                          <Td className="credit">-</Td>
                          <Td className="balance">
                            <BalanceAmount positive={item.runningBalance >= 0}>
                              ₹ {Math.abs(item.runningBalance).toFixed(2)}
                              {item.runningBalance >= 0 ? " Dr." : " Cr."}
                            </BalanceAmount>
                          </Td>
                        </BalanceRow>
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <TotalRow>
                      <Td colSpan="2">
                        <strong>TOTAL</strong>
                      </Td>
                      <Td className="debit">
                        <strong>
                          ₹{" "}
                          {(
                            getTotals().totalAdvance + getTotals().totalPaid
                          ).toFixed(2)}
                        </strong>
                      </Td>
                      <Td className="credit">
                        <strong>₹ {getTotals().totalSalary.toFixed(2)}</strong>
                      </Td>
                      <Td className="balance">
                        <strong>
                          <BalanceAmount
                            positive={getTotals().finalBalance >= 0}
                          >
                            ₹ {Math.abs(getTotals().finalBalance).toFixed(2)}
                            {getTotals().finalBalance >= 0 ? " Dr." : " Cr."}
                          </BalanceAmount>
                        </strong>
                      </Td>
                    </TotalRow>
                  </tfoot>
                </LedgerTable>

                <SummaryCard>
                  <SummaryTitle>Year Summary - {selectedYear}</SummaryTitle>
                  <SummaryGrid>
                    <SummaryItem>
                      <SummaryLabel>Total Salary Credited</SummaryLabel>
                      <SummaryValue color="var(--nb-blue)">
                        ₹ {getTotals().totalSalary.toFixed(2)}
                      </SummaryValue>
                    </SummaryItem>
                    <SummaryItem>
                      <SummaryLabel>Total Advance Taken</SummaryLabel>
                      <SummaryValue color="var(--nb-orange)">
                        ₹ {getTotals().totalAdvance.toFixed(2)}
                      </SummaryValue>
                    </SummaryItem>
                    <SummaryItem>
                      <SummaryLabel>Total Paid</SummaryLabel>
                      <SummaryValue color="var(--nb-orange)">
                        ₹ {getTotals().totalPaid.toFixed(2)}
                      </SummaryValue>
                    </SummaryItem>
                    <SummaryItem>
                      <SummaryLabel>Final Balance</SummaryLabel>
                      <SummaryValue
                        color={
                          getTotals().finalBalance >= 0
                            ? "var(--nb-blue)"
                            : "var(--nb-orange)"
                        }
                      >
                        ₹ {Math.abs(getTotals().finalBalance).toFixed(2)}
                        {getTotals().finalBalance >= 0
                          ? " (Receivable)"
                          : " (Payable)"}
                      </SummaryValue>
                    </SummaryItem>
                  </SummaryGrid>
                </SummaryCard>
              </>
            )}
          </>
        )}
      </Container>
    </Layout>
  );
};

// Styled Components
const Container = styled.div`
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 25px;
`;

const Title = styled.h1`
  font-size: 28px;
  color: var(--nb-ink);
  margin: 0;
  font-weight: 600;
`;

const FilterCard = styled.div`
  background: var(--nb-white);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 25px;
  box-shadow: var(--nb-shadow-md);
  border: 1px solid var(--nb-border);
`;

const FilterRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  font-size: 13px;
  color: var(--nb-ink);
  margin-bottom: 6px;
  font-weight: 500;
`;

const Select = styled.select`
  padding: 10px 12px;
  border: 1px solid var(--nb-border);
  border-radius: 4px;
  font-size: 14px;
  background: var(--nb-white);
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--nb-blue);
  }
`;

const LedgerHeader = styled.div`
  background: var(--nb-blue);
  color: var(--nb-white);
  padding: 20px;
  border-radius: 8px 8px 0 0;
  margin-bottom: 0;
`;

const LedgerTitle = styled.h2`
  font-size: 20px;
  margin: 0 0 5px 0;
  font-weight: 600;
`;

const LedgerPeriod = styled.div`
  font-size: 14px;
  opacity: 0.9;
`;

const LoadingMessage = styled.div`
  background: var(--nb-white);
  padding: 40px;
  text-align: center;
  border-radius: 8px;
  color: var(--nb-ink);
  font-size: 16px;
`;

const NoDataMessage = styled.div`
  background: var(--nb-white);
  padding: 40px;
  text-align: center;
  border-radius: 8px;
  color: var(--nb-ink);
  font-size: 16px;
`;

const LedgerTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: var(--nb-white);
  box-shadow: var(--nb-shadow-md);
  font-size: 13px;

  .debit {
    background: var(--nb-muted);
  }

  .credit {
    background: var(--nb-muted);
  }

  .balance {
    background: var(--nb-muted);
  }
`;

const Th = styled.th`
  background: var(--nb-muted);
  padding: 12px;
  text-align: left;
  font-weight: 600;
  color: var(--nb-ink);
  border: 1px solid var(--nb-border);
  text-transform: uppercase;
  font-size: 12px;
`;

const Td = styled.td`
  padding: 10px 12px;
  border: 1px solid var(--nb-border);
  color: var(--nb-ink);
  vertical-align: top;
`;

const Particulars = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Details = styled.div`
  font-size: 11px;
  color: var(--nb-ink);
`;

const BalanceRow = styled.tr`
  background: var(--nb-muted);
  font-weight: 600;
  border-top: 1px solid var(--nb-blue);
  border-bottom: 1px solid var(--nb-blue);
`;

const BalanceAmount = styled.span`
  color: ${(props) => (props.positive ? "var(--nb-blue)" : "var(--nb-orange)")};
  font-weight: 700;
`;

const TotalRow = styled.tr`
  background: var(--nb-ink);
  color: var(--nb-white);

  td {
    color: var(--nb-white);
    font-weight: 700;
    padding: 15px 12px;
    border-color: var(--nb-ink);
  }
`;

const SummaryCard = styled.div`
  background: var(--nb-white);
  border-radius: 0 0 8px 8px;
  padding: 25px;
  box-shadow: var(--nb-shadow-md);
  margin-top: -1px;
`;

const SummaryTitle = styled.h3`
  font-size: 16px;
  color: var(--nb-ink);
  margin: 0 0 20px 0;
  font-weight: 600;
  text-transform: uppercase;
  border-bottom: 1px solid var(--nb-border);
  padding-bottom: 10px;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
`;

const SummaryItem = styled.div`
  text-align: center;
  padding: 15px;
  background: var(--nb-muted);
  border-radius: 6px;
`;

const SummaryLabel = styled.div`
  font-size: 12px;
  color: var(--nb-ink);
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 8px;
`;

const SummaryValue = styled.div`
  font-size: 20px;
  color: ${(props) => props.color};
  font-weight: 700;
`;

export default SalaryLedgerPage;
