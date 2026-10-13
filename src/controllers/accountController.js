const { z } = require("zod");
const Customer = require("../models/Customer");
const Account = require("../models/Account");
const { createNibssAccount } = require("../services/nibssService");

const accountCreationSchema = z.object({
  customerId: z.string().min(1, "Customer ID is required"),
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

    const { customerId, identityType, identityNumber, dateOfBirth } =
      result.data;

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
    const nibssResult = await createNibssAccount(
      identityType,
      identityNumber,
      dateOfBirth,
    );

    console.log(
      "NIBSS account creation response:",
      JSON.stringify(nibssResult, null, 2),
    );

    const accountData = nibssResult.data || nibssResult;

    if (!accountData.accountNumber) {
      return res.status(502).json({
        message: "NIBSS did not return an account number",
      });
    }

    // Save the account details returned by NIBSS.
    const account = await Account.create({
      customerId: customer._id,
      accountNumber: String(accountData.accountNumber),
      bankName: accountData.bankName || "NIBSS",
      balance: Number(accountData.balance ?? 15000),
    });

    return res.status(201).json({
      message: "Account created successfully",
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

module.exports = { createAccount };
