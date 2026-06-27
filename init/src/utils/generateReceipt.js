import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import receiptPdfUrl from "../assets/Receipt.pdf";

// ─── PAGE: 576 × 263.25 pts (landscape receipt) ───────────────────────────────
// Origin: BOTTOM-LEFT.  x→ right,  y↑ up.
// To adjust: change the numbers below, then use the Preview button to verify.
// ─────────────────────────────────────────────────────────────────────────────
const POS = {
  receiptNo: { x: 86, y: 189 }, // after "RECEIPT NO."
  // Date placed as DD/MM/YYYY starting in the first date box (top-right)
  dateD1: { x: 430, y: 235 }, // D
  dateD2: { x: 445, y: 235 }, // D
  dateM1: { x: 460, y: 235 }, // M
  dateM2: { x: 476, y: 235 }, // M
  dateY1: { x: 492, y: 235 }, // Y
  dateY2: { x: 507, y: 235 }, // Y
  dateY3: { x: 523, y: 235 }, // Y
  dateY4: { x: 538, y: 235 }, // Y
  retailerName: { x: 120, y: 160 }, // after "RECEIVED FROM M/s"
  amountWords: { x: 120, y: 137 }, // after "AMOUNT IN WORDS"
  amountNum: { x: 440, y: 132 }, // inside ₹ box (right side)
  // Payment mode — an "X" is drawn inside the correct box
  cashMark: { x: 132, y: 107 }, // inside CASH box
  upiMark: { x: 190, y: 107 }, // inside UPI box
  chequeMark: { x: 220, y: 107 }, // same row; no dedicated box, placed left
  bankMark: { x: 220, y: 107 },
  chequeNo: { x: 342, y: 110.5 }, // after "CHEQUE No."
  chequeDt: { x: 440, y: 110.5 }, // after "DT"
  invoiceNo: { x: 130, y: 85 }, // after "AGAINST INVOICE NO:"
};

// ─── Number → Indian Words ────────────────────────────────────────────────────
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

export function toWords(amount) {
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
  if (rem > 0) {
    parts.push(_words(rem));
  }
  return parts.join(" ") + " Only";
}

// ─── PDF generation ───────────────────────────────────────────────────────────
/**
 * @param {Object} data
 * @param {string}  data.date           "15 Jun 2026" or "15/06/2026"
 * @param {string}  data.retailerName
 * @param {string}  data.billNumber
 * @param {number}  data.amount
 * @param {string}  data.paymentMode    "Cash"|"upi"|"cheque"|"bank_transfer"
 * @param {string}  data.collectedBy
 * @param {string}  [data.receiptNumber]
 * @param {string}  [data.upiId]
 * @param {string}  [data.transactionId]
 * @param {string}  [data.chequeNumber]
 * @param {string}  [data.chequeDate]
 * @param {string}  [data.bankName]
 * @param {string}  [data.remarks]
 */
export async function generateReceiptPdf(data) {
  const templateBytes = await fetch(receiptPdfUrl).then((r) => r.arrayBuffer());
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

  // Draws a ✓ tick using two green lines (Helvetica has no checkmark glyph)
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

  // Draws a red X at the given position
  const putX = (pos, size = 11) => {
    page.drawText("X", {
      x: pos.x,
      y: pos.y,
      size,
      font: boldFont,
      color: rgb(0.85, 0, 0),
    });
  };

  // Receipt No (serial / receipt number from cash payment)
  if (data.receiptNumber) put(data.receiptNumber, POS.receiptNo, 10, true);

  // Date — split into individual digits for the D D M M Y Y Y Y boxes
  const dateStr = data.rawDate ? data.rawDate : ""; // "dd/mm/yyyy" format
  if (dateStr && dateStr.length >= 10) {
    const [dd, mm, yyyy] = dateStr.split("/");
    put((dd || "  ")[0], POS.dateD1, 10, true);
    put((dd || "  ")[1], POS.dateD2, 10, true);
    put((mm || "  ")[0], POS.dateM1, 10, true);
    put((mm || "  ")[1], POS.dateM2, 10, true);
    put((yyyy || "    ")[0], POS.dateY1, 10, true);
    put((yyyy || "    ")[1], POS.dateY2, 10, true);
    put((yyyy || "    ")[2], POS.dateY3, 10, true);
    put((yyyy || "    ")[3], POS.dateY4, 10, true);
  }

  // Retailer
  put(data.retailerName, POS.retailerName, 10, true);

  // Amount
  put(toWords(data.amount), POS.amountWords, 9);
  put(parseFloat(data.amount).toFixed(2), POS.amountNum, 10, true);

  // Payment mode checkmark
  // Cheque = cross on both Cash and UPI boxes; Cash/UPI = cross only on their own box
  const mode = data.paymentMode;
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

  // Cheque details — show actual values for cheque, "NA" for all other modes
  if (mode === "cheque") {
    put(data.chequeNumber || "", POS.chequeNo, 9);
    put(data.chequeDate || "", POS.chequeDt, 9);
  } else {
    put("NA", POS.chequeNo, 9);
    put("NA", POS.chequeDt, 9);
  }

  // Invoice / Bill number
  put(String(data.billNumber), POS.invoiceNo, 10, true);

  return pdfDoc.save();
}

export function downloadPdf(pdfBytes, filename = "receipt.pdf") {
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Returns a blob: URL for embedding in an <iframe> preview. */
export function pdfBlobUrl(pdfBytes) {
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  return URL.createObjectURL(blob);
}
