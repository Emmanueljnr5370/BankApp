const Customer = require("../models/Customer");
const { z } = require("zod");
const { validateIdentity } = require("../services/nibssService");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { normalizeDateOfBirth } = require("../utils/dateUtils");

const customerSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phoneNumber: z.string().trim().min(7),
  identityType: z.enum(["BVN", "NIN"]),
  identityNumber: z.string().trim().min(1),
  dateOfBirth: z.string().trim().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
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
      password,
    } = result.data;

    const submittedDateOfBirth = normalizeDateOfBirth(dateOfBirth);

    if (!submittedDateOfBirth) {
      return res.status(400).json({
        message: "Date of birth must be a valid date in YYYY-MM-DD format",
      });
    }

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

    const verifiedDateValue = [
      verifiedData.dob,
      verifiedData.dateOfBirth,
      verifiedData.date_of_birth,
      verifiedData.DOB,
    ].find((value) => value !== undefined && value !== null && value !== "");
    const verifiedDateOfBirth = normalizeDateOfBirth(verifiedDateValue);

    if (!verifiedDateOfBirth) {
      console.error("NIBSS identity response did not contain a valid date of birth");

      return res.status(502).json({
        message: "Identity verification returned an invalid date of birth",
      });
    }

    if (verifiedDateOfBirth !== submittedDateOfBirth) {
      return res.status(400).json({
        message: "Date of birth does not match the verified identity",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    // Only save the customer after NIBSS confirms verification.
    const customer = await Customer.create({
      fullName,
      email,
      phoneNumber,
      identityType,
      password: hashedPassword,
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


const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1, "Password is required"),
});

const loginCustomer = async (req, res) => {
  try {
    const result = loginSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Please provide a valid email and password",
      });
    }

    const { email, password } = result.data;

    // Explicitly request the password hash because the model uses select: false
    const customer = await Customer.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    if (!customer) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const passwordMatches = await bcrypt.compare(password, customer.password);

    if (!passwordMatches) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!customer.identityVerified) {
      return res.status(403).json({
        message: "Customer identity has not been verified",
      });
    }

    const token = jwt.sign(
      {
        customerId: customer._id.toString(),
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "1h",
      },
    );

    return res.status(200).json({
      message: "Login successful",
      token,
      customer: {
        id: customer._id,
        fullName: customer.fullName,
        email: customer.email,
      },
    });
  } catch (error) {
    console.error("Customer login error:", error.message);

    return res.status(500).json({
      message: "An unexpected error occurred during login",
    });
  }
};


module.exports = {
  registerCustomer,
  loginCustomer,
};
