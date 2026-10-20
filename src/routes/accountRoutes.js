const express = require("express");
const protect = require("../middleware/authMiddleware");

const {
  getCustomerAccount,
  createAccount,
  checkAccountName,
  checkAccountBalance,
} = require("../controllers/accountController");

const router = express.Router();

router.get("/me", protect, getCustomerAccount);
router.post("/create", protect, createAccount);
router.get("/name-enquiry/:accountNumber", checkAccountName);
router.get("/balance/:accountNumber", checkAccountBalance);

module.exports = router;
