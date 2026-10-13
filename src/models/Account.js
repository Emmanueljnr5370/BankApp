const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      unique: true,
    },

    accountNumber: {
      type: String,
      required: true,
      unique: true,
    },

    bankName: {
      type: String,
      default: "NIBSS",
    },

    balance: {
      type: Number,
      required: true,
      default: 15000,
      min: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Account", accountSchema);
