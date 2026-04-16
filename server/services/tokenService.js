const jwt = require("jsonwebtoken");

function signAccessToken(userId) {
  return jwt.sign({}, process.env.JWT_SECRET, {
    subject: String(userId),
    expiresIn: "7d",
  });
}

module.exports = { signAccessToken };

