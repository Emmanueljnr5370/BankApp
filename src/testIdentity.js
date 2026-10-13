require("dotenv").config();

const { validateIdentity } = require("./services/nibssService");

const testIdentity = async () => {
  try {
    const result = await validateIdentity("BVN", "52718846623");

    console.log("NIBSS response received.");
    console.log("Success:", result.success);
    console.log("Message:", result.message);

    if (result.success === true) {
      console.log("BVN validation succeeded.");
    } else {
      console.log("BVN validation was not confirmed.");
    }
  } catch (error) {
    console.error("Identity validation failed:", error.message);
  }
};

testIdentity();
