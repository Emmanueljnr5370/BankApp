require("dotenv").config();

const { getToken } = require("./services/nibssService");

const testConnection = async () => {
  try {
    const token = await getToken();

    console.log("NIBSS authentication successful!");
    console.log("JWT received:", Boolean(token));
  } catch (error) {
    console.error("NIBSS test failed:", error.message);
  }
};

testConnection();
