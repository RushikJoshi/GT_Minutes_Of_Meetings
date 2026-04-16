const mongoose = require("mongoose");

async function connectDB(mongoUri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongoUri);
  return mongoose.connection;
}

module.exports = { connectDB };

