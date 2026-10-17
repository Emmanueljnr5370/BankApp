const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Access denied. Please log in.",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const customer = await Customer.findById(decoded.customerId);

    if (!customer) {
      return res.status(401).json({
        message: "Customer associated with this token was not found.",
      });
    }

    req.customer = customer;

    next();
  } catch (error) {
    console.error("Authentication error:", error.message);

    return res.status(401).json({
      message: "Invalid or expired token. Please log in again.",
    });
  }
};

module.exports = protect;
