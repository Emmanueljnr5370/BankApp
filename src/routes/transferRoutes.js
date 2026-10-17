const express = require("express");
const protect = require("../middleware/authMiddleware");
const { createTransfer } = require("../controllers/transferController");

const router = express.Router();

router.post("/", protect, createTransfer);

module.exports = router;
