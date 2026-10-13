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

module.exports = { getToken, validateIdentity };
