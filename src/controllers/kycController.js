const { z } = require("zod");
const { createTestBvn } = require("../services/nibssService");

const createTestBvnSchema = z.object({
  bvn: z.string().regex(/^\d{11}$/, "BVN must contain 11 digits"),
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  dob: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must use YYYY-MM-DD format"),
  phone: z.string().min(10).max(15),
});

const generateTestBvn = async (req, res) => {
  try {
    const result = createTestBvnSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid test BVN details",
        errors: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const response = await createTestBvn(result.data);

    return res.status(201).json({
      message: "Test BVN record created successfully",
      data: response,
    });
  } catch (error) {
    console.error("Test BVN creation error:", error.message);

    return res.status(error.status === 409 ? 409 : 502).json({
      message: error.message || "Unable to create test BVN record",
    });
  }
};

module.exports = { generateTestBvn };
