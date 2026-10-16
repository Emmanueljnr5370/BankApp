const { z } = require("zod");
const Account = require("../models/Account");
const Transaction = require("../models/Transaction");
const {
  nameEnquiry,
  transferFunds,
  getNibssAccountBalance,
} = require("../services/nibssService");


const transferSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
  from: z.string().regex(/^\d{10}$/, "Sender account must be 10 digits"),
  to: z.string().regex(/^\d{10}$/, "Recipient account must be 10 digits"),
  amount: z.number().positive("Amount must be greater than zero"),
});

const createTransfer = async (req, res) => {
  try {
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

    const { customerId, from, to, amount } = result.data;

    if (from === to) {
      return res.status(400).json({
        message: "You cannot transfer to the same account",
      });
    }

    // Confirm the sender's account belongs to this customer.
    const senderAccount = await Account.findOne({
      customerId,
      accountNumber: from,
    });

    if (!senderAccount) {
      return res.status(403).json({
        message: "Sender account does not belong to this customer",
      });
    }

    // Check the recipient's account name before transferring.
    const recipient = await nameEnquiry(to);
    const recipientData = recipient.data || recipient;

    if (!recipientData.accountName) {
      return res.status(400).json({
        message: "Recipient account could not be verified",
      });
    }

    // Check the current balance directly with NIBSS.
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

    // Initiate the transfer through NIBSS.
    const transferResult = await transferFunds(from, to, amount);

    
const transactionData = transferResult.data || transferResult;

const savedTransaction = await Transaction.create({
  reference: transactionData.reference || transactionData.transactionId,
  senderAccount: transactionData.senderAccount || from,
  receiverAccount: transactionData.receiverAccount || to,
  amount: Number(transactionData.amount ?? amount),
  status: transactionData.status || "SUCCESS",
  customerId: senderAccount.customerId,
});


    
    return res.status(200).json({
    message: "Transfer completed successfully",
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
