require("dotenv").config();

const express = require("express");
const path = require("path");
const cors = require("cors");

const connectDB = require("./config/db");
const customerRoutes = require("./routes/customerRoutes");
const accountRoutes = require("./routes/accountRoutes");
const transferRoutes = require("./routes/transferRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const kycRoutes = require("./routes/kycRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
  })
);

// Parse incoming JSON requests
app.use(express.json());

// Register API routes
app.use("/api/customers", customerRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/kyc", kycRoutes);

// Serve frontend static files
app.use(
  "/app",
  express.static(path.join(__dirname, "../public"))
);

// Test endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Digital Banking API is running",
  });
});

// Connect to MongoDB, then start the server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();