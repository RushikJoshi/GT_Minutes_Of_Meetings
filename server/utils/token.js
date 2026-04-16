const crypto = require("crypto");

function generateToken(bytes = 16) {
  return crypto.randomBytes(bytes).toString("hex");
}

module.exports = { generateToken };

