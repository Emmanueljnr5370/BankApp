require("dotenv").config();

const express = require("express");
const connectDB = require("./config/db");
const customerRoutes = require("./routes/customerRoutes");
const accountRoutes = require("./routes/accountRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Parse incoming JSON requests
app.use(express.json());
app.use("/api/customers", customerRoutes);
app.use("/api/accounts", accountRoutes);

// Test endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    message: "Digital Banking API is running",
  });
});

// Connect to MongoDB, then start the server
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
