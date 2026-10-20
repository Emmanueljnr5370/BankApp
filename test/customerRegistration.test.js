const { afterEach, describe, it } = require("node:test");
const assert = require("node:assert/strict");
const Customer = require("../src/models/Customer");
const { registerCustomer } = require("../src/controllers/customerController");

const originalFetch = global.fetch;
const originalFindOne = Customer.findOne;
const originalCreate = Customer.create;
const originalNibssBaseUrl = process.env.NIBSS_BASE_URL;
const originalNibssApiKey = process.env.NIBSS_API_KEY;
const originalNibssApiSecret = process.env.NIBSS_API_SECRET;

const makeResponse = () => ({
  statusCode: null,
  body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const register = async (overrides = {}) => {
  const response = makeResponse();

  await registerCustomer(
    {
      body: {
        fullName: "Ada Okafor",
        email: "ada@example.test",
        phoneNumber: "08012345678",
        identityType: "BVN",
        identityNumber: "12345678901",
        dateOfBirth: "1990-05-20",
        password: "password123",
        ...overrides,
      },
    },
    response,
  );

  return response;
};

afterEach(() => {
  global.fetch = originalFetch;
  Customer.findOne = originalFindOne;
  Customer.create = originalCreate;

  if (originalNibssBaseUrl === undefined) {
    delete process.env.NIBSS_BASE_URL;
  } else {
    process.env.NIBSS_BASE_URL = originalNibssBaseUrl;
  }

  if (originalNibssApiKey === undefined) {
    delete process.env.NIBSS_API_KEY;
  } else {
    process.env.NIBSS_API_KEY = originalNibssApiKey;
  }

  if (originalNibssApiSecret === undefined) {
    delete process.env.NIBSS_API_SECRET;
  } else {
    process.env.NIBSS_API_SECRET = originalNibssApiSecret;
  }
});

describe("customer registration date-of-birth verification", () => {
  it("accepts the same date when NIBSS returns a day-first date", async () => {
    process.env.NIBSS_BASE_URL = "https://nibss.example.test";
    process.env.NIBSS_API_KEY = "test-key";
    process.env.NIBSS_API_SECRET = "test-secret";
    global.fetch = async (url) => {
      if (url.endsWith("/api/auth/token")) {
        return Response.json({ token: "test-token" });
      }

      return Response.json({
        success: true,
        data: {
          firstName: "Ada",
          lastName: "Okafor",
          dob: "20/05/1990",
        },
      });
    };
    Customer.findOne = async () => null;
    Customer.create = async (data) => ({
      ...data,
      _id: { toString: () => "customer-id" },
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const response = await register();

    assert.equal(response.statusCode, 201);
    assert.equal(
      response.body.message,
      "Customer registered and identity verified successfully",
    );
  });

  it("rejects a different verified date", async () => {
    process.env.NIBSS_BASE_URL = "https://nibss.example.test";
    process.env.NIBSS_API_KEY = "test-key";
    process.env.NIBSS_API_SECRET = "test-secret";
    global.fetch = async (url) => {
      if (url.endsWith("/api/auth/token")) {
        return Response.json({ token: "test-token" });
      }

      return Response.json({
        success: true,
        data: {
          firstName: "Ada",
          lastName: "Okafor",
          dob: "21/05/1990",
        },
      });
    };
    Customer.findOne = async () => null;
    Customer.create = async () => {
      assert.fail("Customer should not be created for a mismatched date");
    };

    const response = await register();

    assert.equal(response.statusCode, 400);
    assert.equal(
      response.body.message,
      "Date of birth does not match the verified identity",
    );
  });
});
