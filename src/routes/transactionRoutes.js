const express = require("express");
const protect = require("../middleware/authMiddleware");

const {
  checkTransactionStatus,
  getTransactionHistory,
} = require("../controllers/transactionController");

const router = express.Router();

router.get("/history", protect, getTransactionHistory);
router.get("/:reference/status", protect, checkTransactionStatus);

module.exports = router;
