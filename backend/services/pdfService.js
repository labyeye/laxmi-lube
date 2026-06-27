const PDFDocument = require("pdfkit");

const PAYMENT_LABELS = {
  Cash: "Cash",
  cheque: "Cheque",
  bank_transfer: "Bank Transfer",
  upi: "UPI",
};

function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Generates a collection receipt PDF buffer.
 * @param {Object} collection - populated Collection document
 * @param {Object} bill - populated Bill document
 * @param {Object} retailer - Retailer document (with name, address1, phone)
 * @param {Object} collectedBy - User document (staff name)
 * @param {string} companyName - your company/distributor name
 * @returns {Promise<Buffer>}
 */
function generateReceiptPDF(
  collection,
  bill,
  retailer,
  collectedBy,
  companyName = "Distribution Co.",
) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A5", margin: 40 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageW = doc.page.width - 80; // usable width

    // ── Header ──────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 70).fill("#1a73e8");

    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(18)
      .text(companyName, 40, 20, { width: pageW });

    doc
      .font("Helvetica")
      .fontSize(9)
      .text("Payment Collection Receipt", 40, 44, { width: pageW });

    doc
      .fillColor("#1a73e8")
      .fontSize(9)
      .text(
        `Receipt #: ${collection._id.toString().slice(-8).toUpperCase()}`,
        doc.page.width - 140,
        44,
      );

    doc.moveDown(3);

    // ── Receipt box ─────────────────────────────────────────
    const boxTop = 80;
    doc
      .roundedRect(30, boxTop, doc.page.width - 60, 310, 6)
      .strokeColor("#e0e0e0")
      .lineWidth(1)
      .stroke();

    // section helper
    const row = (label, value, y, highlight = false) => {
      if (highlight) {
        doc.rect(30, y, doc.page.width - 60, 22).fill("#f0f7ff");
      }
      doc
        .fillColor("#666666")
        .font("Helvetica")
        .fontSize(9)
        .text(label, 45, y + 5, { width: 130 });
      doc
        .fillColor("#111111")
        .font("Helvetica-Bold")
        .fontSize(9)
        .text(String(value), 185, y + 5, { width: pageW - 145 });
    };

    let y = boxTop + 10;

    // Retailer section header
    doc
      .fillColor("#1a73e8")
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("RETAILER DETAILS", 45, y);
    y += 16;

    row("Retailer Name", retailer?.name || bill?.retailer || "N/A", y);
    y += 22;
    row("Address", retailer?.address1 || "N/A", y);
    y += 22;
    if (retailer?.address2) {
      row("", retailer.address2, y);
      y += 22;
    }

    // Divider
    doc
      .moveTo(30, y)
      .lineTo(doc.page.width - 30, y)
      .strokeColor("#e0e0e0")
      .stroke();
    y += 10;

    // Payment section header
    doc
      .fillColor("#1a73e8")
      .font("Helvetica-Bold")
      .fontSize(8)
      .text("PAYMENT DETAILS", 45, y);
    y += 16;

    row("Bill Number", bill?.billNumber || "N/A", y);
    y += 22;
    row("Bill Date", bill?.billDate ? formatDate(bill.billDate) : "N/A", y);
    y += 22;
    row("Collection Date", formatDate(collection.collectedOn), y);
    y += 22;
    row(
      "Payment Mode",
      PAYMENT_LABELS[collection.paymentMode] || collection.paymentMode,
      y,
    );
    y += 22;

    // Payment-mode specific details
    const pd = collection.paymentDetails || {};
    if (collection.paymentMode === "cheque") {
      if (pd.chequeNumber) {
        row("Cheque Number", pd.chequeNumber, y);
        y += 22;
      }
      if (pd.bankName) {
        row("Bank", pd.bankName, y);
        y += 22;
      }
    } else if (collection.paymentMode === "upi") {
      if (pd.upiId) {
        row("UPI ID", pd.upiId, y);
        y += 22;
      }
      if (pd.transactionId) {
        row("Transaction ID", pd.transactionId, y);
        y += 22;
      }
    } else if (collection.paymentMode === "bank_transfer") {
      if (pd.transactionId) {
        row("Transaction ID", pd.transactionId, y);
        y += 22;
      }
      if (pd.bankName) {
        row("Bank", pd.bankName, y);
        y += 22;
      }
    } else if (collection.paymentMode === "Cash" && pd.receiptNumber) {
      row("Receipt No", pd.receiptNumber, y);
      y += 22;
    }

    row("Collected By", collectedBy?.name || "Staff", y);
    y += 22;

    // Divider
    doc
      .moveTo(30, y)
      .lineTo(doc.page.width - 30, y)
      .strokeColor("#e0e0e0")
      .stroke();
    y += 10;

    // Amount highlight
    doc.rect(30, y, doc.page.width - 60, 36).fill("#1a73e8");
    doc
      .fillColor("white")
      .font("Helvetica")
      .fontSize(10)
      .text("Amount Collected", 45, y + 10);
    doc
      .fillColor("white")
      .font("Helvetica-Bold")
      .fontSize(14)
      .text(formatINR(collection.amountCollected), 185, y + 8, {
        width: pageW - 145,
      });
    y += 46;

    // Remaining due
    if (bill?.dueAmount !== undefined) {
      doc
        .fillColor("#555")
        .font("Helvetica")
        .fontSize(8)
        .text(
          `Remaining Due After This Collection: ${formatINR(bill.dueAmount)}`,
          45,
          y + 5,
        );
    }

    // ── Footer ───────────────────────────────────────────────
    const footerY = doc.page.height - 50;
    doc.rect(0, footerY, doc.page.width, 50).fill("#f5f5f5");
    doc
      .fillColor("#888")
      .font("Helvetica")
      .fontSize(7)
      .text(
        "This is a computer-generated receipt. No signature required.",
        40,
        footerY + 10,
        { width: pageW, align: "center" },
      );
    doc
      .fillColor("#aaa")
      .fontSize(7)
      .text(
        `Generated on ${new Date().toLocaleString("en-IN")}`,
        40,
        footerY + 22,
        { width: pageW, align: "center" },
      );

    doc.end();
  });
}

module.exports = { generateReceiptPDF };
