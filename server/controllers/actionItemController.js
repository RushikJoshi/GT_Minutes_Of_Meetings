const ActionItem = require("../models/ActionItem");
const asyncHandler = require("../utils/asyncHandler");

const listActionItems = asyncHandler(async (req, res) => {
  const scope = String(req.query.scope || "my");
  const status = String(req.query.status || "all");
  const q = String(req.query.q || "").trim();

  const filter = { workspaceId: req.workspace._id };
  if (scope === "my") {
    filter.assignedTo = String(req.user.email || "").toLowerCase();
  }
  if (status !== "all") {
    filter.status = status === "done" ? "done" : "pending";
  }
  if (q) {
    filter.task = { $regex: q, $options: "i" };
  }

  const items = await ActionItem.find(filter).sort({ deadline: 1, createdAt: -1 }).limit(200);
  res.json(items);
});

const updateActionItemStatus = asyncHandler(async (req, res) => {
  const status = req.body?.status === "done" ? "done" : "pending";
  const item = await ActionItem.findOne({ _id: req.params.id, workspaceId: req.workspace._id });
  if (!item) {
    res.status(404);
    throw new Error("Action item not found");
  }
  item.status = status;
  await item.save();
  res.json(item);
});

module.exports = { listActionItems, updateActionItemStatus };

