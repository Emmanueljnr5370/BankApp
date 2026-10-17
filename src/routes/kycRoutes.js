const express = require("express");
const { generateTestBvn } = require("../controllers/kycController");

const router = express.Router();

router.post("/generate-test-bvn", generateTestBvn);

module.exports = router;
