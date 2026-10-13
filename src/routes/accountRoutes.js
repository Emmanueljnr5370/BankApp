const express = require("express");
const { createAccount } = require("../controllers/accountController");

const router = express.Router();

router.post("/create", createAccount);

module.exports = router;
