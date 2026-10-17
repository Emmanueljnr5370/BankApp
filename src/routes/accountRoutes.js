const express = require("express");
const protect = require("../middleware/authMiddleware");

const {
  createAccount,
  checkAccountName,
  checkAccountBalance,
} = require("../controllers/accountController");

const router = express.Router();

router.post("/create", protect, createAccount);
router.get("/name-enquiry/:accountNumber", checkAccountName);
router.get("/balance/:accountNumber", checkAccountBalance);

module.exports = router;
