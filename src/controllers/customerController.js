const Customer = require("../models/Customer");
const { z } = require("zod");
const { validateIdentity } = require("../services/nibssService");

const customerSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phoneNumber: z.string().trim().min(7),
  identityType: z.enum(["BVN", "NIN"]),
  identityNumber: z.string().trim().min(1),
  dateOfBirth: z.string().trim().min(1),
});


const registerCustomer = async (req, res) => {
  try {
    const result = customerSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid customer details",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const {
      fullName,
      email,
      phoneNumber,
      identityType,
      identityNumber,
      dateOfBirth,
    } = result.data;

    const existingCustomer = await Customer.findOne({ email });

    if (existingCustomer) {
      return res.status(409).json({
        message: "A customer with this email already exists",
      });
    }

    // Verify the customer's identity with NIBSS first.
    const verification = await validateIdentity(identityType, identityNumber);

    if (verification.success !== true || !verification.data) {
      return res.status(400).json({
        message: "Identity verification failed",
      });
    }

    const verifiedData = verification.data;

    const verifiedFullName =
      `${verifiedData.firstName} ${verifiedData.lastName}`.trim();

    const normalizeName = (name) =>
      name.trim().replace(/\s+/g, " ").toLowerCase();

    if (normalizeName(fullName) !== normalizeName(verifiedFullName)) {
      return res.status(400).json({
        message: "Full name does not match the verified identity",
      });
    }

    // Compare the submitted date of birth with the verified date of birth.
    if (verifiedData.dob !== dateOfBirth) {
      return res.status(400).json({
        message: "Date of birth does not match the verified identity",
      });
    }

    // Only save the customer after NIBSS confirms verification.
    const customer = await Customer.create({
      fullName,
      email,
      phoneNumber,
      identityType,
      identityVerified: true,
    });

    return res.status(201).json({
      message: "Customer registered and identity verified successfully",
      customer: {
        id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
        phoneNumber: customer.phoneNumber,
        identityType: customer.identityType,
        identityVerified: customer.identityVerified,
        createdAt: customer.createdAt,
      },
    });
  } catch (error) {
    console.error("Customer registration error:", error.message);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "A customer with this email already exists",
      });
    }

    if (error.status) {
      return res.status(400).json({
        message: "NIBSS identity verification failed",
      });
    }

    return res.status(500).json({
      message: "An unexpected error occurred during registration",
    });
  }
};

module.exports = { registerCustomer };
