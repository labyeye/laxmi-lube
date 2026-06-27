import { useState, useEffect, useRef } from "react";
import styled, { keyframes } from "styled-components";
import axios from "axios";
import Layout from "../components/Layout";

const API = "https://backend.laxmilube.in/api";
const getHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const PAYMENT_LABELS = {
  Cash: "Cash", cheque: "Cheque", bank_transfer: "Bank Transfer", upi: "UPI",
};

const STATUS_META = {
  received:     { ticks: "✓✓", tickColor: "#4fc3f7", label: "Received",     dot: "#22c55e" },
  not_received: { ticks: "✗",  tickColor: "#ef4444", label: "Not Received", dot: "#ef4444" },
  sent:         { ticks: "✓✓", tickColor: "#aaa",    label: "Sent",         dot: "#3b82f6" },
  pending:      { ticks: "⏱",  tickColor: "#aaa",    label: "Pending",      dot: "#f59e0b" },
  no_phone:     { ticks: "—",  tickColor: "#ccc",    label: "No Phone",     dot: "#9ca3af" },
};

function fmt(date) {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  }
  if (diff < 172800000) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function fmtFull(date) {
  if (!date) return "";
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

function formatINR(n) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default function WhatsAppLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedRetailer, setSelectedRetailer] = useState(null);
  const [resending, setResending] = useState(null);
  const chatEndRef = useRef(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/collections/whatsapp-logs?limit=500`, { headers: getHeaders() });
      setLogs(res.data);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedRetailer, logs]);

  // Group by retailer
  const contacts = (() => {
    const map = {};
    logs.forEach((l) => {
      const key = l.retailerName;
      if (!map[key]) map[key] = { retailerName: key, phone: l.retailerPhone, messages: [] };
      map[key].messages.push(l);
    });
    return Object.values(map).sort((a, b) =>
      new Date(b.messages[0].collectedOn) - new Date(a.messages[0].collectedOn)
    );
  })();

  const filtered = contacts.filter((c) => {
    const matchSearch = c.retailerName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || c.messages.some((m) => m.whatsappStatus === filter);
    return matchSearch && matchFilter;
  });

  const activeContact = selectedRetailer
    ? contacts.find((c) => c.retailerName === selectedRetailer)
    : null;

  const handleResend = async (collectionId) => {
    setResending(collectionId);
    try {
      await axios.post(
        `${API}/collections/${collectionId}/send-whatsapp`,
        {},
        { headers: getHeaders() }
      );
      await fetchLogs();
    } catch {
      // silent
    } finally {
      setResending(null);
    }
  };

  return (
    <Layout>
      <WaRoot>
        {/* ── LEFT PANEL ── */}
        <LeftPanel>
          <WaHeader>
            <HeaderTitle>WhatsApp Logs</HeaderTitle>
            <HeaderActions>
              <FilterSelect value={filter} onChange={(e) => { setFilter(e.target.value); setSelectedRetailer(null); }}>
                <option value="all">All</option>
                <option value="received">Received</option>
                <option value="not_received">Not Received</option>
                <option value="sent">Sent</option>
                <option value="pending">Pending</option>
                <option value="no_phone">No Phone</option>
              </FilterSelect>
            </HeaderActions>
          </WaHeader>

          <SearchBar>
            <SearchIcon>🔍</SearchIcon>
            <SearchInput
              placeholder="Search retailer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </SearchBar>

          <ContactList>
            {loading ? (
              <LoadingWrap><Spinner /></LoadingWrap>
            ) : filtered.length === 0 ? (
              <EmptyContacts>No contacts found</EmptyContacts>
            ) : (
              filtered.map((c) => {
                const last = c.messages[0];
                const sm = STATUS_META[last.whatsappStatus] || STATUS_META.pending;
                const isActive = selectedRetailer === c.retailerName;
                const unreadCount = c.messages.filter((m) => m.whatsappStatus === "not_received").length;
                return (
                  <ContactItem key={c.retailerName} active={isActive} onClick={() => setSelectedRetailer(c.retailerName)}>
                    <Avatar>{c.retailerName.charAt(0).toUpperCase()}</Avatar>
                    <ContactInfo>
                      <ContactRow>
                        <ContactName>{c.retailerName}</ContactName>
                        <ContactTime>{fmt(last.collectedOn)}</ContactTime>
                      </ContactRow>
                      <ContactRow>
                        <ContactPreview>
                          <Ticks color={sm.tickColor}>{sm.ticks}</Ticks>
                          {" "}{formatINR(last.amount)} · Bill #{last.billNumber}
                        </ContactPreview>
                        <StatusRow>
                          <StatusDot color={sm.dot} />
                          {unreadCount > 0 && <UnreadBadge>{unreadCount}</UnreadBadge>}
                        </StatusRow>
                      </ContactRow>
                    </ContactInfo>
                  </ContactItem>
                );
              })
            )}
          </ContactList>
        </LeftPanel>

        {/* ── RIGHT PANEL ── */}
        <RightPanel>
          {!activeContact ? (
            <EmptyChat>
              <EmptyChatIcon>💬</EmptyChatIcon>
              <EmptyChatTitle>WhatsApp Receipt Logs</EmptyChatTitle>
              <EmptyChatSub>Select a retailer to view message history</EmptyChatSub>
            </EmptyChat>
          ) : (
            <>
              {/* Chat header */}
              <ChatHeader>
                <ChatAvatar>{activeContact.retailerName.charAt(0).toUpperCase()}</ChatAvatar>
                <ChatHeaderInfo>
                  <ChatName>{activeContact.retailerName}</ChatName>
                  <ChatSub>{activeContact.phone ? `+91 ${activeContact.phone}` : "No phone number"}</ChatSub>
                </ChatHeaderInfo>
                <MsgCount>{activeContact.messages.length} message{activeContact.messages.length !== 1 ? "s" : ""}</MsgCount>
              </ChatHeader>

              {/* Messages */}
              <ChatBody>
                <WaWallpaper />
                {[...activeContact.messages].reverse().map((msg) => {
                  const sm = STATUS_META[msg.whatsappStatus] || STATUS_META.pending;
                  return (
                    <BubbleWrap key={msg._id}>
                      <Bubble>
                        <BubbleHeader>
                          📄 Receipt — Bill #{msg.billNumber}
                        </BubbleHeader>
                        <BubbleBody>
                          <BubbleRow><BubbleLabel>Amount</BubbleLabel><BubbleVal bold>{formatINR(msg.amount)}</BubbleVal></BubbleRow>
                          <BubbleRow><BubbleLabel>Mode</BubbleLabel><BubbleVal>{PAYMENT_LABELS[msg.paymentMode] || msg.paymentMode}</BubbleVal></BubbleRow>
                          <BubbleRow><BubbleLabel>Collected By</BubbleLabel><BubbleVal>{msg.collectedBy}</BubbleVal></BubbleRow>
                          <BubbleRow><BubbleLabel>Date</BubbleLabel><BubbleVal>{fmtFull(msg.collectedOn)}</BubbleVal></BubbleRow>
                        </BubbleBody>

                        {msg.whatsappConfirmedAt && (
                          <ConfirmedNote status={msg.whatsappStatus}>
                            {msg.whatsappStatus === "received" ? "✅ Retailer confirmed receipt" : "❌ Retailer reported not received"}
                            {" · "}{fmtFull(msg.whatsappConfirmedAt)}
                          </ConfirmedNote>
                        )}

                        <BubbleFooter>
                          <BubbleTime>{fmt(msg.collectedOn)}</BubbleTime>
                          <TickStatus color={sm.tickColor} title={sm.label}>{sm.ticks}</TickStatus>
                        </BubbleFooter>

                        {(msg.whatsappStatus === "pending" || msg.whatsappStatus === "no_phone") && (
                          <ResendBtn
                            disabled={resending === msg._id}
                            onClick={() => handleResend(msg._id)}
                          >
                            {resending === msg._id ? "Sending…" : "↺ Resend"}
                          </ResendBtn>
                        )}
                      </Bubble>
                    </BubbleWrap>
                  );
                })}
                <div ref={chatEndRef} />
              </ChatBody>

              {/* Status legend */}
              <ChatLegend>
                {Object.entries(STATUS_META).map(([key, v]) => (
                  <LegendItem key={key}>
                    <Ticks color={v.tickColor}>{v.ticks}</Ticks>
                    <LegendLabel>{v.label}</LegendLabel>
                  </LegendItem>
                ))}
              </ChatLegend>
            </>
          )}
        </RightPanel>
      </WaRoot>
    </Layout>
  );
}

// ── Animations ────────────────────────────────────────────────────────────────
const spin = keyframes`to { transform: rotate(360deg); }`;

// ── Root layout ───────────────────────────────────────────────────────────────
const WaRoot = styled.div`
  display: flex;
  height: calc(100vh - 60px);
  background: #f0f2f5;
  overflow: hidden;
`;

// ── Left panel ────────────────────────────────────────────────────────────────
const LeftPanel = styled.div`
  width: 360px;
  min-width: 280px;
  max-width: 380px;
  background: #fff;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e9edef;
  @media (max-width: 640px) { width: 100%; max-width: 100%; display: ${(p) => p.hide ? "none" : "flex"}; }
`;

const WaHeader = styled.div`
  background: #128c7e;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 56px;
`;

const HeaderTitle = styled.h2`
  color: #fff;
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0;
`;

const HeaderActions = styled.div`display: flex; gap: 8px;`;

const FilterSelect = styled.select`
  background: rgba(255,255,255,0.15);
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 0.8rem;
  cursor: pointer;
  option { color: #111; background: #fff; }
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  background: #f0f2f5;
  margin: 8px 12px;
  border-radius: 8px;
  padding: 6px 12px;
  gap: 8px;
`;

const SearchIcon = styled.span`font-size: 0.9rem; color: #667781;`;

const SearchInput = styled.input`
  border: none;
  background: none;
  outline: none;
  flex: 1;
  font-size: 0.9rem;
  color: #111;
  &::placeholder { color: #aaa; }
`;

const ContactList = styled.div`
  flex: 1;
  overflow-y: auto;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
`;

const ContactItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid #f0f2f5;
  background: ${(p) => p.active ? "#e8f5e9" : "transparent"};
  transition: background 0.15s;
  &:hover { background: ${(p) => p.active ? "#e8f5e9" : "#f5f6f6"}; }
`;

const Avatar = styled.div`
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: linear-gradient(135deg, #25d366, #128c7e);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  font-weight: 700;
  flex-shrink: 0;
`;

const ContactInfo = styled.div`flex: 1; overflow: hidden;`;

const ContactRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
`;

const ContactName = styled.span`
  font-size: 0.92rem;
  font-weight: 600;
  color: #111;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ContactTime = styled.span`
  font-size: 0.72rem;
  color: #667781;
  white-space: nowrap;
`;

const ContactPreview = styled.span`
  font-size: 0.78rem;
  color: #667781;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
`;

const StatusRow = styled.div`display: flex; align-items: center; gap: 4px; flex-shrink: 0;`;

const StatusDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${(p) => p.color};
`;

const UnreadBadge = styled.span`
  background: #25d366;
  color: #fff;
  border-radius: 50%;
  min-width: 18px;
  height: 18px;
  font-size: 0.7rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
`;

const Ticks = styled.span`
  color: ${(p) => p.color || "#aaa"};
  font-size: 0.8rem;
  font-weight: 700;
`;

// ── Right panel ───────────────────────────────────────────────────────────────
const RightPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
`;

const EmptyChat = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: #667781;
  background: #f0f2f5;
`;

const EmptyChatIcon = styled.div`font-size: 4rem;`;
const EmptyChatTitle = styled.h3`margin: 0; font-size: 1.2rem; color: #41525d;`;
const EmptyChatSub = styled.p`margin: 0; font-size: 0.88rem;`;

const ChatHeader = styled.div`
  background: #f0f2f5;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid #e9edef;
  min-height: 56px;
  z-index: 2;
`;

const ChatAvatar = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #25d366, #128c7e);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  font-weight: 700;
  flex-shrink: 0;
`;

const ChatHeaderInfo = styled.div`flex: 1;`;
const ChatName = styled.div`font-size: 0.95rem; font-weight: 600; color: #111;`;
const ChatSub = styled.div`font-size: 0.78rem; color: #667781;`;
const MsgCount = styled.div`font-size: 0.75rem; color: #667781; background: #e9edef; padding: 2px 8px; border-radius: 10px;`;

const WaWallpaper = styled.div`
  position: absolute;
  inset: 0;
  background-color: #eae6df;
  background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c9c3bb' fill-opacity='0.25'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  opacity: 0.5;
  z-index: 0;
`;

const ChatBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 8%;
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #ccc; border-radius: 4px; }
`;

const BubbleWrap = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const Bubble = styled.div`
  background: #dcf8c6;
  border-radius: 12px 0 12px 12px;
  max-width: 460px;
  width: 100%;
  box-shadow: 0 1px 2px rgba(0,0,0,0.15);
  padding: 10px 12px 6px;
  position: relative;
`;

const BubbleHeader = styled.div`
  font-size: 0.82rem;
  font-weight: 700;
  color: #128c7e;
  margin-bottom: 8px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  padding-bottom: 6px;
`;

const BubbleBody = styled.div`display: flex; flex-direction: column; gap: 4px; margin-bottom: 6px;`;

const BubbleRow = styled.div`display: flex; gap: 8px; align-items: baseline;`;
const BubbleLabel = styled.span`font-size: 0.72rem; color: #667781; min-width: 90px;`;
const BubbleVal = styled.span`
  font-size: 0.82rem;
  color: #111;
  font-weight: ${(p) => p.bold ? "700" : "400"};
`;

const ConfirmedNote = styled.div`
  font-size: 0.72rem;
  padding: 4px 8px;
  border-radius: 6px;
  margin-bottom: 4px;
  background: ${(p) => p.status === "received" ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.1)"};
  color: ${(p) => p.status === "received" ? "#15803d" : "#991b1b"};
`;

const BubbleFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  margin-top: 2px;
`;

const BubbleTime = styled.span`font-size: 0.68rem; color: #667781;`;

const TickStatus = styled.span`
  font-size: 0.82rem;
  font-weight: 700;
  color: ${(p) => p.color};
`;

const ResendBtn = styled.button`
  display: block;
  width: 100%;
  margin-top: 6px;
  padding: 4px;
  background: none;
  border: 1px solid #128c7e;
  border-radius: 6px;
  color: #128c7e;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s;
  &:hover:not(:disabled) { background: rgba(18,140,126,0.08); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const ChatLegend = styled.div`
  display: flex;
  gap: 16px;
  padding: 8px 16px;
  background: #f0f2f5;
  border-top: 1px solid #e9edef;
  flex-wrap: wrap;
  z-index: 2;
`;

const LegendItem = styled.div`display: flex; align-items: center; gap: 4px;`;
const LegendLabel = styled.span`font-size: 0.72rem; color: #667781;`;

const LoadingWrap = styled.div`display: flex; justify-content: center; padding: 40px;`;
const EmptyContacts = styled.div`padding: 40px 16px; text-align: center; color: #aaa; font-size: 0.88rem;`;

const Spinner = styled.div`
  width: 28px; height: 28px;
  border: 3px solid #e9edef;
  border-top-color: #128c7e;
  border-radius: 50%;
  animation: ${spin} 0.7s linear infinite;
`;
