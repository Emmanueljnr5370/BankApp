const express = require("express");

const {
  checkTransactionStatus,
  getTransactionHistory,
} = require("../controllers/transactionController");

const router = express.Router();

router.get("/history", getTransactionHistory);
router.get("/:reference/status", checkTransactionStatus);

module.exports = router;
