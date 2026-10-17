const Transaction = require("../models/Transaction");
const Account = require("../models/Account");
const { getTransactionStatus } = require("../services/nibssService");

// Check the status of a transaction owned by the logged-in customer.
const checkTransactionStatus = async (req, res) => {
  try {
    const reference = req.params.reference;
    const customerId = req.customer._id;

    const transaction = await Transaction.findOne({
      reference,
      customerId,
    });

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    const nibssResult = await getTransactionStatus(reference);
    const statusData = nibssResult.data || nibssResult;

    if (statusData.status) {
      const updatedStatus = String(statusData.status).toUpperCase();

      if (["SUCCESS", "PENDING", "FAILED"].includes(updatedStatus)) {
        transaction.status = updatedStatus;
        await transaction.save();
      }
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

// View only the logged-in customer's transaction history.
const getTransactionHistory = async (req, res) => {
  try {
    const customerId = req.customer._id;

    const accounts = await Account.find({ customerId }).select("accountNumber");

    if (accounts.length === 0) {
      return res.status(404).json({
        message: "No account found for this customer",
      });
    }

    const accountNumbers = accounts.map((account) => account.accountNumber);

    const transactions = await Transaction.find({
      customerId,
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
