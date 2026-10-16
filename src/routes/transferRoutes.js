const express = require("express");
const { createTransfer } = require("../controllers/transferController");

const router = express.Router();

router.post("/", createTransfer);

module.exports = router;
