const { z } = require("zod");
const Transaction = require("../models/Transaction");
const Account = require("../models/Account");
const { getTransactionStatus } = require("../services/nibssService");

// Check the status of a transaction
const checkTransactionStatus = async (req, res) => {
  try {
    const reference = req.params.reference;

    const transaction = await Transaction.findOne({ reference });

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    // Confirm that the transaction belongs to the supplied customer
    const customerId = req.query.customerId;

    if (!customerId || transaction.customerId.toString() !== customerId) {
      return res.status(403).json({
        message: "You are not allowed to view this transaction",
      });
    }

    const nibssResult = await getTransactionStatus(reference);
    const statusData = nibssResult.data || nibssResult;

    if (statusData.status) {
      transaction.status = statusData.status.toUpperCase();
      await transaction.save();
    }

    return res.status(200).json({
      message: "Transaction status retrieved successfully",
      transaction: {
        reference: transaction.reference,
        amount: transaction.amount,
        status: transaction.status,
        senderAccount: transaction.senderAccount,
        receiverAccount: transaction.receiverAccount,
        createdAt: transaction.createdAt,
      },
    });
  } catch (error) {
    console.error("Transaction status error:", error.message);

    return res.status(502).json({
      message: "Unable to retrieve transaction status",
    });
  }
};

// View a customer's transaction history
const getTransactionHistory = async (req, res) => {
  try {
    const customerId = req.query.customerId;

    if (
      !customerId ||
      !z
        .string()
        .regex(/^[a-f\d]{24}$/i)
        .safeParse(customerId).success
    ) {
      return res.status(400).json({
        message: "A valid customerId is required",
      });
    }

    const accounts = await Account.find({ customerId }).select("accountNumber");

    if (accounts.length === 0) {
      return res.status(404).json({
        message: "No account found for this customer",
      });
    }

    const accountNumbers = accounts.map((account) => account.accountNumber);

    const transactions = await Transaction.find({
      $or: [
        { senderAccount: { $in: accountNumbers } },
        { receiverAccount: { $in: accountNumbers } },
      ],
    })
      .sort({ createdAt: -1 })
      .select(
        "reference senderAccount receiverAccount amount status createdAt",
      );

    return res.status(200).json({
      message: "Transaction history retrieved successfully",
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error("Transaction history error:", error.message);

    return res.status(500).json({
      message: "Unable to retrieve transaction history",
    });
  }
};

module.exports = {
  checkTransactionStatus,
  getTransactionHistory,
};
