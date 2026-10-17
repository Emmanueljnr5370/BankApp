const { z } = require("zod");
const Customer = require("../models/Customer");
const Account = require("../models/Account");
const {
  createNibssAccount,
  getNibssAccounts,
  nameEnquiry,
  getNibssAccountBalance,
} = require("../services/nibssService");


const accountCreationSchema = z.object({
  identityType: z.enum(["BVN", "NIN"]),
  identityNumber: z.string().trim().min(1, "Identity number is required"),
  dateOfBirth: z.string().trim().min(1, "Date of birth is required"),
});


const createAccount = async (req, res) => {
  try {
    const result = accountCreationSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid account creation details",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { identityType, identityNumber, dateOfBirth } = result.data;
    const customerId = req.customer._id.toString();

    // Find the customer in MongoDB.
    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found",
      });
    }

    // Only verified customers can create accounts.
    if (!customer.identityVerified) {
      return res.status(403).json({
        message: "Customer identity must be verified first",
      });
    }

    // Ensure the identity type matches the customer's registered type.
    if (customer.identityType !== identityType) {
      return res.status(400).json({
        message: "Identity type does not match the customer record",
      });
    }

    // Enforce one account per customer.
    const existingAccount = await Account.findOne({ customerId });

    if (existingAccount) {
      return res.status(409).json({
        message: "This customer already has an account",
      });
    }

    // Request account creation from NIBSS.

    // Find an existing account in NIBSS first.
    const nibssAccounts = await getNibssAccounts();

    const matchingAccount = nibssAccounts.find((item) => {
      return (
        item.kycType?.toLowerCase() === identityType.toLowerCase() &&
        item.kycID === identityNumber
      );
    });

    let accountData;

    if (matchingAccount) {
      // The account already exists in NIBSS.
      // Reuse its details instead of creating another account.
      accountData = matchingAccount;

      console.log("Existing NIBSS account found.");
    } else {
      // No existing account was found, so create one.
      const nibssResult = await createNibssAccount(
        identityType,
        identityNumber,
        dateOfBirth,
      );

      console.log(
        "NIBSS account creation response:",
        JSON.stringify(nibssResult, null, 2),
      );

      accountData =
        nibssResult.data?.account ||
        nibssResult.account ||
        nibssResult.data ||
        nibssResult;
    }

    if (!accountData.accountNumber) {
      return res.status(502).json({
        message: "NIBSS did not return an account number",
      });
    }

    // Extract the account number from the NIBSS response.
    const accountNumber = String(accountData.accountNumber || "");

    if (!/^\d{10}$/.test(accountNumber)) {
      console.error(
        "Unexpected NIBSS account response:",
        JSON.stringify(accountData, null, 2),
      );

      return res.status(502).json({
        message: "NIBSS did not return a valid account number",
      });
    }

    // Save the NIBSS account in MongoDB.
    console.log("Creating account for customer:", customer._id.toString());
    console.log("Customer email:", customer.email);
    console.log("New account number:", accountNumber);
    
    const account = await Account.create({
      customerId: customer._id,
      accountNumber,
      bankName: accountData.bankName || "NIBSS",
      balance: 15000,
    });

    return res.status(201).json({
      message: "Account created and saved successfully",
      account: {
        accountNumber: account.accountNumber,
        bankName: account.bankName,
        balance: account.balance,
        currency: "NGN",
      },
    });
  } catch (error) {
    console.error("Account creation error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "This customer or account already exists",
      });
    }

    if (error.status) {
      return res.status(502).json({
        message: "NIBSS account creation failed",
      });
    }

    return res.status(500).json({
      message: "An unexpected error occurred during account creation",
    });
  }
};

const checkAccountName = async (req, res) => {
  try {
    const { accountNumber } = req.params;

    if (!/^\d{10}$/.test(accountNumber)) {
      return res.status(400).json({
        message: "Account number must be exactly 10 digits",
      });
    }

    const result = await nameEnquiry(accountNumber);

    return res.status(200).json({
      message: "Name enquiry successful",
      data: result,
    });
  } catch (error) {
    console.error("Name enquiry error:", error.message);

    if (error.status) {
      return res.status(502).json({
        message: "Unable to complete name enquiry with NIBSS",
      });
    }

    return res.status(500).json({
      message: "An unexpected error occurred during name enquiry",
    });
  }
};


const checkAccountBalance = async (req, res) => {
  try {
    const { accountNumber } = req.params;
    const { customerId } = req.query;

    if (!/^\d{10}$/.test(accountNumber)) {
      return res.status(400).json({
        message: "Account number must be exactly 10 digits",
      });
    }

    if (!customerId || !/^[a-f\d]{24}$/i.test(customerId)) {
      return res.status(400).json({
        message: "A valid customerId is required",
      });
    }

    // Confirm that this account belongs to the customer
    const account = await Account.findOne({
      accountNumber,
      customerId,
    });

    if (!account) {
      return res.status(403).json({
        message: "This account does not belong to the specified customer",
      });
    }

    // Get the latest balance from NIBSS
    const result = await getNibssAccountBalance(accountNumber);
    const balanceData = result.data || result;
    const balance = Number(balanceData.balance);

    if (!Number.isFinite(balance)) {
      return res.status(502).json({
        message: "Unable to verify account balance",
      });
    }

    // Keep the local account record synchronized
    account.balance = balance;
    await account.save();

    return res.status(200).json({
      message: "Account balance retrieved successfully",
      account: {
        accountNumber,
        balance,
        currency: "NGN",
      },
    });
  } catch (error) {
    console.error("Account balance error:", error.message);

    if (error.status) {
      return res.status(502).json({
        message: "Unable to retrieve account balance from NIBSS",
      });
    }

    return res.status(500).json({
      message: "An unexpected error occurred while checking balance",
    });
  }
};

module.exports = {
  createAccount,
  checkAccountName,
  checkAccountBalance,
};