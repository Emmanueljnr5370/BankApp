const express = require("express");
const {
  createAccount,
  checkAccountName,
  checkAccountBalance,
} = require("../controllers/accountController");

const router = express.Router();

router.post("/create", createAccount);
router.get("/name-enquiry/:accountNumber", checkAccountName);
router.get("/balance/:accountNumber", checkAccountBalance);

module.exports = router;
