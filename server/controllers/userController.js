const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

const listUsers = asyncHandler(async (req, res) => {
  const q = String(req.query.q || "").trim();
  const limit = Math.min(25, Math.max(1, Number(req.query.limit || 10)));

  const filter = q
    ? {
        $or: [
          { email: { $regex: q, $options: "i" } },
          { name: { $regex: q, $options: "i" } },
        ],
      }
    : {};

  const users = await User.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("_id email name");

  res.json(users);
});

module.exports = { listUsers };

