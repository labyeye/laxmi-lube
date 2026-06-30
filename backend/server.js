// Node 20+ removed `SlowBuffer`, but some deep deps (e.g. buffer-equal-constant-time
// via jsonwebtoken/jwa) still expect `require('buffer').SlowBuffer` to exist.
// Patch the built-in buffer module before anything else is required.
const nodeBuffer = require("buffer");
if (!nodeBuffer.SlowBuffer) {
  nodeBuffer.SlowBuffer = nodeBuffer.Buffer;
}

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv").config();
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const billRoutes = require("./routes/billRoutes");
const collectionRoutes = require("./routes/collectionRoutes");
const adminDashboardRoutes = require("./routes/adminDashboardRoutes");
const staffRoutes = require("./routes/staffRoutes");
const reportRoutes = require("./routes/reportRoutes");
const retailerRoutes = require("./routes/retailerRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const salaryRoutes = require("./routes/salaryRoutes");
const advanceRoutes = require("./routes/advanceRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const deliveryRoutes = require("./routes/deliveryRoutes");
const retailerDashboardRoutes = require("./routes/retailerDashboardRoutes");
const moduleRoutes = require("./routes/moduleRoutes");
const recordRoutes = require("./routes/recordRoutes");
const whatsappWebhookRoutes = require("./routes/whatsappWebhookRoutes");
const reconciliationRoutes = require("./routes/reconciliationRoutes");

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/collections", collectionRoutes);
app.use("/api/admin", adminDashboardRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/admin/reports", reportRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/retailers", retailerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/salaries", salaryRoutes);
app.use("/api/advances", advanceRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/retailer", retailerDashboardRoutes);
app.use("/api/modules", moduleRoutes);
app.use("/api/records", recordRoutes);
app.use("/api/whatsapp/webhook", whatsappWebhookRoutes);
app.use("/api/reconciliation", reconciliationRoutes);
const PORT = 1200;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
// Set the timezone for the entire application
process.env.TZ = "Asia/Kolkata";
console.log("Application timezone set to:", process.env.TZ);
