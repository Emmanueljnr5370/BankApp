const jwt = require("jsonwebtoken");
const Customer = require("../models/Customer");

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // Check whether the token was provided.
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Access denied. Please log in.",
      });
    }

    // Extract the token from the Authorization header.
    const token = authHeader.split(" ")[1];

    // Verify that the token is valid.
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find the customer associated with the token.
    const customer = await Customer.findById(decoded.customerId);

    if (!customer) {
      return res.status(401).json({
        message: "Customer associated with this token was not found.",
      });
    }

    // Make the authenticated customer available to the controller.
    req.customer = customer;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired token. Please log in again.",
    });
  }
};

module.exports = protect;
