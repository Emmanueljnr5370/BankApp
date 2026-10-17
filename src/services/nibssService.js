const BASE_URL = process.env.NIBSS_BASE_URL;

const getToken = async () => {
  const response = await fetch(`${BASE_URL}/api/auth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apiKey: process.env.NIBSS_API_KEY,
      apiSecret: process.env.NIBSS_API_SECRET,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "NIBSS authentication failed");
  }

  const token =
    data.token ||
    data.accessToken ||
    data.data?.token ||
    data.data?.accessToken;

  if (!token) {
    throw new Error("NIBSS login succeeded but no JWT token was found");
  }

  return token;
};

const validateIdentity = async (identityType, identityNumber) => {
  const endpoints = {
    BVN: "/api/validateBvn",
    NIN: "/api/validateNin",
  };

  const bodyFields = {
    BVN: { bvn: identityNumber },
    NIN: { nin: identityNumber },
  };

  if (!endpoints[identityType]) {
    throw new Error("Identity type must be BVN or NIN");
  }

  const token = await getToken();

  const response = await fetch(`${BASE_URL}${endpoints[identityType]}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(bodyFields[identityType]),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "NIBSS identity validation failed");
    error.status = response.status;
    throw error;
  }

  return data;
};


const createNibssAccount = async (
  identityType,
  identityNumber,
  dateOfBirth,
) => {
  const token = await getToken();

  const kycType = identityType.toLowerCase();

  if (!["bvn", "nin"].includes(kycType)) {
    throw new Error("Identity type must be BVN or NIN");
  }

  const response = await fetch(`${BASE_URL}/api/account/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      kycType,
      kycID: identityNumber,
      dob: dateOfBirth,
    }),
  });

  const data = await response.json();
  console.log("NIBSS account response:", JSON.stringify(data, null, 2));

  if (!response.ok) {
    const error = new Error(data.message || "NIBSS account creation failed");
    error.status = response.status;
    throw error;
  }

  return data;
};


const getNibssAccounts = async () => {
  const token = await getToken();

  const response = await fetch(`${BASE_URL}/api/accounts`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error("Failed to retrieve NIBSS accounts");
    error.status = response.status;
    throw error;
  }

  return data.accounts || [];
};


const nameEnquiry = async (accountNumber) => {
  const token = await getToken();

  const response = await fetch(
    `${BASE_URL}/api/account/name-enquiry/${encodeURIComponent(accountNumber)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Name enquiry failed");
    error.status = response.status;
    throw error;
  }

  return data;
};


const transferFunds = async (from, to, amount) => {
  const token = await getToken();

  const response = await fetch(`${BASE_URL}/api/transfer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      from,
      to,
      amount: String(amount),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "NIBSS transfer failed");

    error.status = response.status;
    throw error;
  }

  return data;
};


const getNibssAccountBalance = async (accountNumber) => {
  const token = await getToken();

  const response = await fetch(
    `${BASE_URL}/api/account/balance/${encodeURIComponent(accountNumber)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data.message || "Failed to retrieve account balance",
    );
    error.status = response.status;
    throw error;
  }

  return data;
};


const getTransactionStatus = async (transactionId) => {
  const token = await getToken();

  const response = await fetch(
    `${BASE_URL}/api/transaction/${encodeURIComponent(transactionId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data.message || "Failed to retrieve transaction status",
    );
    error.status = response.status;
    throw error;
  }

  return data;
};


const createTestBvn = async ({ bvn, firstName, lastName, dob, phone }) => {
  const token = await getToken();

  const response = await fetch(`${BASE_URL}/api/insertBvn`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      bvn,
      firstName,
      lastName,
      dob,
      phone,
    }),
  });

  const data = await response.json();

  if (!response.ok || data.success === false) {
    const error = new Error(data.message || "BVN creation failed");
    error.status = response.status;
    throw error;
  }

  return data;
};


module.exports = {
  getToken,
  validateIdentity,
  createNibssAccount,
  getNibssAccounts,
  nameEnquiry,
  transferFunds,
  getNibssAccountBalance,
  getTransactionStatus,
  createTestBvn,
};