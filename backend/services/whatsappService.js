const axios = require("axios");
const FormData = require("form-data");

const BASE_URL = "https://graph.facebook.com/v19.0";
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

// ── Template names (must match approved Meta templates) ───────────────────────
// Retailer receipt template: sends PDF + two quick-reply buttons
const RETAILER_RECEIPT_TEMPLATE =
  process.env.WHATSAPP_RETAILER_TEMPLATE || "collection_receipt";
// Admin notification template: plain text update for admin
const ADMIN_NOTIFY_TEMPLATE =
  process.env.WHATSAPP_ADMIN_TEMPLATE || "collection_admin_notify";

function headers() {
  return {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  };
}

/**
 * Upload a PDF buffer as a WhatsApp media asset.
 * Returns the media_id string.
 */
async function uploadPDF(pdfBuffer, filename) {
  const form = new FormData();
  form.append("file", pdfBuffer, { filename, contentType: "application/pdf" });
  form.append("messaging_product", "whatsapp");
  form.append("type", "application/pdf");

  const res = await axios.post(`${BASE_URL}/${PHONE_NUMBER_ID}/media`, form, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, ...form.getHeaders() },
  });
  return res.data.id;
}

/**
 * Send the retailer receipt template message.
 *
 * Meta template (collection_receipt) must be approved with:
 *   Header  : DOCUMENT (the PDF receipt)
 *   Body    : "Dear {{1}}, ₹{{2}} has been collected against Bill #{{3}} on {{4}} by {{5}}."
 *   Buttons : QUICK_REPLY "I have received" | QUICK_REPLY "Not received"
 *
 * @param {string} phone      - retailer phone (10-digit, no country code)
 * @param {Buffer} pdfBuffer  - receipt PDF
 * @param {string} filename   - filename for the PDF
 * @param {Object} params     - { retailerName, amount, billNumber, date, staffName }
 * @param {string} collectionId - used as button payload so webhook can identify which collection
 */
async function sendRetailerReceipt(
  phone,
  pdfBuffer,
  filename,
  params,
  collectionId,
) {
  const mediaId = await uploadPDF(pdfBuffer, filename);
  const to = `91${phone}`; // India country code

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: RETAILER_RECEIPT_TEMPLATE,
      language: { code: "en" },
      components: [
        {
          type: "header",
          parameters: [
            { type: "document", document: { id: mediaId, filename } },
          ],
        },
        {
          type: "body",
          parameters: [
            { type: "text", text: params.retailerName },
            { type: "text", text: `₹${params.amount}` },
            { type: "text", text: params.billNumber },
            { type: "text", text: params.date },
            { type: "text", text: params.staffName },
          ],
        },
        {
          type: "button",
          sub_type: "quick_reply",
          index: "0",
          parameters: [
            { type: "payload", payload: `RECEIVED:${collectionId}` },
          ],
        },
        {
          type: "button",
          sub_type: "quick_reply",
          index: "1",
          parameters: [
            { type: "payload", payload: `NOT_RECEIVED:${collectionId}` },
          ],
        },
      ],
    },
  };

  const res = await axios.post(
    `${BASE_URL}/${PHONE_NUMBER_ID}/messages`,
    body,
    { headers: headers() },
  );
  return res.data;
}

/**
 * Send admin notification template.
 *
 * Meta template (collection_admin_notify) must be approved with:
 *   Body : "New collection recorded:\nRetailer: {{1}}\nAmount: {{2}}\nBill: {{3}}\nMode: {{4}}\nCollected by: {{5}}\nDate: {{6}}"
 *
 * @param {string} adminPhone - 10-digit admin phone number
 * @param {Object} params     - { retailerName, amount, billNumber, paymentMode, staffName, date }
 */
async function sendAdminNotification(adminPhone, params) {
  const to = `91${adminPhone}`;

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: ADMIN_NOTIFY_TEMPLATE,
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: params.retailerName },
            { type: "text", text: `₹${params.amount}` },
            { type: "text", text: params.billNumber },
            { type: "text", text: params.paymentMode },
            { type: "text", text: params.staffName },
            { type: "text", text: params.date },
          ],
        },
      ],
    },
  };

  const res = await axios.post(
    `${BASE_URL}/${PHONE_NUMBER_ID}/messages`,
    body,
    { headers: headers() },
  );
  return res.data;
}

module.exports = { sendRetailerReceipt, sendAdminNotification };
