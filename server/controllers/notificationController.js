const Notification = require("../models/Notification");
const asyncHandler = require("../utils/asyncHandler");

const listNotifications = asyncHandler(async (req, res) => {
  const unread = String(req.query.unread || "") === "true";
  const limit = Math.min(100, Math.max(1, Number(req.query.limit || 50)));

  const filter = {
    userId: req.user._id,
    workspaceId: req.workspace._id,
    ...(unread ? { readAt: { $exists: false } } : {}),
  };
  const items = await Notification.find(filter).sort({ createdAt: -1 }).limit(limit);
  res.json(items);
});

const markRead = asyncHandler(async (req, res) => {
  const n = await Notification.findOne({
    _id: req.params.id,
    userId: req.user._id,
    workspaceId: req.workspace._id,
  });
  if (!n) {
    res.status(404);
    throw new Error("Notification not found");
  }
  n.readAt = new Date();
  await n.save();
  res.json(n);
});

module.exports = { listNotifications, markRead };

