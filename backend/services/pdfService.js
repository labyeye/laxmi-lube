const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

const RECEIPT_PDF_PATH = path.join(
  __dirname,
  "../../init/src/assets/Receipt.pdf",
);

// Mirrors the POS constants in the frontend generateReceipt.js
const POS = {
  receiptNo: { x: 86, y: 189 },
  dateD1: { x: 430, y: 235 },
  dateD2: { x: 445, y: 235 },
  dateM1: { x: 460, y: 235 },
  dateM2: { x: 476, y: 235 },
  dateY1: { x: 492, y: 235 },
  dateY2: { x: 507, y: 235 },
  dateY3: { x: 523, y: 235 },
  dateY4: { x: 538, y: 235 },
  retailerName: { x: 120, y: 160 },
  amountWords: { x: 120, y: 137 },
  amountNum: { x: 440, y: 132 },
  cashMark: { x: 132, y: 107 },
  upiMark: { x: 190, y: 107 },
  chequeMark: { x: 220, y: 107 },
  bankMark: { x: 220, y: 107 },
  chequeNo: { x: 342, y: 110.5 },
  chequeDt: { x: 440, y: 110.5 },
  invoiceNo: { x: 130, y: 85 },
};

const _ones = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const _tens = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

function _words(n) {
  if (n === 0) return "";
  if (n < 20) return _ones[n];
  if (n < 100)
    return _tens[Math.floor(n / 10)] + (n % 10 ? " " + _ones[n % 10] : "");
  return (
    _ones[Math.floor(n / 100)] +
    " Hundred" +
    (n % 100 ? " " + _words(n % 100) : "")
  );
}

function toWords(amount) {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return "Zero Only";
  let rem = n,
    parts = [];
  if (rem >= 10000000) {
    parts.push(_words(Math.floor(rem / 10000000)) + " Crore");
    rem %= 10000000;
  }
  if (rem >= 100000) {
    parts.push(_words(Math.floor(rem / 100000)) + " Lakh");
    rem %= 100000;
  }
  if (rem >= 1000) {
    parts.push(_words(Math.floor(rem / 1000)) + " Thousand");
    rem %= 1000;
  }
  if (rem > 0) parts.push(_words(rem));
  return parts.join(" ") + " Only";
}

async function generateReceiptPDF(collection, bill, retailer) {
  const templateBytes = fs.readFileSync(RECEIPT_PDF_PATH);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.getPages()[0];

  const put = (text, pos, size = 10, bold = false) => {
    if (!text || !pos) return;
    page.drawText(String(text), {
      x: pos.x,
      y: pos.y,
      size,
      font: bold ? boldFont : font,
      color: rgb(0, 0, 0),
    });
  };

  const putTick = (pos) => {
    if (!pos) return;
    const { x, y } = pos;
    const green = rgb(0, 0.6, 0);
    page.drawLine({
      start: { x, y: y + 3 },
      end: { x: x + 3, y },
      thickness: 1.5,
      color: green,
    });
    page.drawLine({
      start: { x: x + 3, y },
      end: { x: x + 9, y: y + 8 },
      thickness: 1.5,
      color: green,
    });
  };

  const putX = (pos, size = 11) => {
    page.drawText("X", {
      x: pos.x,
      y: pos.y,
      size,
      font: boldFont,
      color: rgb(0.85, 0, 0),
    });
  };

  // Receipt number
  const pd = collection.paymentDetails || {};
  if (pd.receiptNumber) put(pd.receiptNumber, POS.receiptNo, 10, true);

  // Date in DD/MM/YYYY format
  const dateObj = new Date(collection.collectedOn);
  const dd = String(dateObj.getDate()).padStart(2, "0");
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const yyyy = String(dateObj.getFullYear());
  put(dd[0], POS.dateD1, 10, true);
  put(dd[1], POS.dateD2, 10, true);
  put(mm[0], POS.dateM1, 10, true);
  put(mm[1], POS.dateM2, 10, true);
  put(yyyy[0], POS.dateY1, 10, true);
  put(yyyy[1], POS.dateY2, 10, true);
  put(yyyy[2], POS.dateY3, 10, true);
  put(yyyy[3], POS.dateY4, 10, true);

  // Retailer name
  put(retailer?.name || bill?.retailer || "", POS.retailerName, 10, true);

  // Amount
  put(toWords(collection.amountCollected), POS.amountWords, 9);
  put(
    parseFloat(collection.amountCollected).toFixed(2),
    POS.amountNum,
    10,
    true,
  );

  // Payment mode marks
  const mode = collection.paymentMode;
  if (mode === "cheque") {
    putX(POS.cashMark);
    putX(POS.upiMark);
  } else if (mode === "Cash") {
    putTick(POS.cashMark);
  } else if (mode === "upi") {
    putX(POS.upiMark);
  } else if (mode === "bank_transfer") {
    putX(POS.bankMark);
  }

  // Cheque details
  if (mode === "cheque") {
    put(pd.chequeNumber || "", POS.chequeNo, 9);
    put(pd.chequeDate || "", POS.chequeDt, 9);
  } else {
    put("NA", POS.chequeNo, 9);
    put("NA", POS.chequeDt, 9);
  }

  // Invoice / Bill number
  put(String(bill?.billNumber || ""), POS.invoiceNo, 10, true);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Generate ONE combined receipt PDF for a split-payment group.
 *
 * @param {Object[]} members  - populated Collection docs (bill.billNumber, amountCollected, paymentMode, paymentDetails, collectedOn)
 * @param {Object}   retailer - Retailer doc (name, phone, …)
 */
async function generateGroupReceiptPDF(members, retailer) {
  const templateBytes = fs.readFileSync(RECEIPT_PDF_PATH);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const page = pdfDoc.getPages()[0];

  const put = (text, pos, size = 10, bold = false) => {
    if (!text || !pos) return;
    page.drawText(String(text), {
      x: pos.x,
      y: pos.y,
      size,
      font: bold ? boldFont : font,
      color: rgb(0, 0, 0),
    });
  };

  const putTick = (pos) => {
    if (!pos) return;
    const { x, y } = pos;
    const g = rgb(0, 0.6, 0);
    page.drawLine({
      start: { x, y: y + 3 },
      end: { x: x + 3, y },
      thickness: 1.5,
      color: g,
    });
    page.drawLine({
      start: { x: x + 3, y },
      end: { x: x + 9, y: y + 8 },
      thickness: 1.5,
      color: g,
    });
  };

  const putX = (pos, size = 11) => {
    page.drawText("X", {
      x: pos.x,
      y: pos.y,
      size,
      font: boldFont,
      color: rgb(0.85, 0, 0),
    });
  };

  const first = members[0];
  const totalAmount = members.reduce((sum, m) => sum + m.amountCollected, 0);
  const pd = first.paymentDetails || {};
  const mode = first.paymentMode;

  // Receipt number (from first collection)
  if (pd.receiptNumber) put(pd.receiptNumber, POS.receiptNo, 10, true);

  // Date
  const dateObj = new Date(first.collectedOn);
  const dd = String(dateObj.getDate()).padStart(2, "0");
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const yyyy = String(dateObj.getFullYear());
  put(dd[0], POS.dateD1, 10, true);
  put(dd[1], POS.dateD2, 10, true);
  put(mm[0], POS.dateM1, 10, true);
  put(mm[1], POS.dateM2, 10, true);
  put(yyyy[0], POS.dateY1, 10, true);
  put(yyyy[1], POS.dateY2, 10, true);
  put(yyyy[2], POS.dateY3, 10, true);
  put(yyyy[3], POS.dateY4, 10, true);

  // Retailer name
  put(retailer?.name || first.bill?.retailer || "", POS.retailerName, 10, true);

  // Total amount
  put(toWords(totalAmount), POS.amountWords, 9);
  put(parseFloat(totalAmount).toFixed(2), POS.amountNum, 10, true);

  // Payment mode marks
  if (mode === "cheque") {
    putX(POS.cashMark);
    putX(POS.upiMark);
  } else if (mode === "Cash") {
    putTick(POS.cashMark);
  } else if (mode === "upi") {
    putX(POS.upiMark);
  } else if (mode === "bank_transfer") {
    putX(POS.bankMark);
  }

  // Cheque details
  if (mode === "cheque") {
    put(pd.chequeNumber || "", POS.chequeNo, 9);
    put(pd.chequeDate || "", POS.chequeDt, 9);
  } else {
    put("NA", POS.chequeNo, 9);
    put("NA", POS.chequeDt, 9);
  }

  // Combined invoice line: #1042(Rs.5000), #1043(Rs.3000), ...
  // pdf-lib built-in fonts use WinAnsi encoding which cannot encode ₹ (U+20B9)
  const billStr = members
    .map((m) => `#${m.bill?.billNumber}(Rs.${Math.round(m.amountCollected)})`)
    .join(", ");
  const fontSize = billStr.length > 70 ? 6.5 : billStr.length > 50 ? 7.5 : 9;
  put(billStr, POS.invoiceNo, fontSize, true);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

module.exports = { generateReceiptPDF, generateGroupReceiptPDF };
