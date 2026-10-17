const { z } = require("zod");
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");

const {
  nameEnquiry,
  transferFunds,
  getNibssAccountBalance,
} = require("../services/nibssService");

const transferSchema = z.object({
  from: z.string().regex(/^\d{10}$/, "Sender account must be 10 digits"),
  to: z.string().regex(/^\d{10}$/, "Recipient account must be 10 digits"),
  amount: z.number().positive("Amount must be greater than zero"),
});

const createTransfer = async (req, res) => {
  try {
    // Validate request body
    const result = transferSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid transfer details",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { from, to, amount } = result.data;

    // Get the authenticated customer
    const customerId = req.customer._id;

    // Prevent transfers to the same account
    if (from === to) {
      return res.status(400).json({
        message: "You cannot transfer to the same account",
      });
    }

    // Debugging: check account ownership
    console.log("Logged-in customer ID:", customerId.toString());

    console.log("Sender account number:", from);

    const accountByNumber = await Account.findOne({
      accountNumber: from,
    });

    console.log("Account owner ID:", accountByNumber?.customerId?.toString());

    // Only allow the authenticated customer to send
    // money from an account they own.
    const senderAccount = await Account.findOne({
      customerId,
      accountNumber: from,
    });

    if (!senderAccount) {
      return res.status(403).json({
        message: "You cannot transfer from this account",
      });
    }

    // Verify the recipient account
    const recipient = await nameEnquiry(to);
    const recipientData = recipient.data || recipient;

    if (!recipientData.accountName) {
      return res.status(400).json({
        message: "Recipient account could not be verified",
      });
    }

    // Check the sender's current balance with NIBSS
    const balanceResult = await getNibssAccountBalance(from);
    const balanceData = balanceResult.data || balanceResult;
    const currentBalance = Number(balanceData.balance);

    if (!Number.isFinite(currentBalance)) {
      return res.status(502).json({
        message: "Could not verify sender's account balance",
      });
    }

    if (amount > currentBalance) {
      return res.status(400).json({
        message: "Insufficient funds",
      });
    }

    // Initiate transfer through NIBSS
    const transferResult = await transferFunds(from, to, amount);

    const transactionData = transferResult.data || transferResult;

    const reference =
      transactionData.reference || transactionData.transactionId;

    if (!reference) {
      return res.status(502).json({
        message: "NIBSS did not return a transaction reference",
      });
    }

    // Normalize the transaction status
    const returnedStatus = String(transactionData.status || "").toUpperCase();

    const allowedStatuses = ["SUCCESS", "PENDING", "FAILED"];

    const status = allowedStatuses.includes(returnedStatus)
      ? returnedStatus
      : "PENDING";

    // Save the transaction
    const savedTransaction = await Transaction.create({
      reference,
      senderAccount: from,
      receiverAccount: to,
      amount: Number(transactionData.amount ?? amount),
      status,
      customerId: senderAccount.customerId,
    });

    // Return the transfer result
    return res.status(200).json({
      message:
        status === "SUCCESS"
          ? "Transfer completed successfully"
          : "Transfer submitted; check its status for confirmation",

      recipient: {
        accountName: recipientData.accountName,
        accountNumber: to,
        bankCode: recipientData.bankCode,
      },

      transaction: savedTransaction,
    });
  } catch (error) {
    console.error("Transfer error:", error.message);

    if (error.status) {
      return res.status(502).json({
        message: "The transfer could not be completed by NIBSS",
      });
    }

    return res.status(500).json({
      message: "An unexpected error occurred during transfer",
    });
  }
};

module.exports = { createTransfer };
