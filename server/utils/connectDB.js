const { connectDB } = require("../config/db");

module.exports = async function connect(mongoUri) {
  if (!mongoUri) {
    throw new Error("MONGO_URI is missing. Set it in server/.env");
  }
  return connectDB(mongoUri);
};

