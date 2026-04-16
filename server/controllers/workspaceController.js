const Workspace = require("../models/Workspace");
const Membership = require("../models/Membership");
const asyncHandler = require("../utils/asyncHandler");

const listMyWorkspaces = asyncHandler(async (req, res) => {
  const memberships = await Membership.find({ userId: req.user._id }).populate("workspaceId");
  const items = memberships
    .map((m) => ({
      workspace: m.workspaceId,
      role: m.role,
    }))
    .filter((x) => x.workspace && x.workspace._id);
  res.json(items);
});

const createWorkspace = asyncHandler(async (req, res) => {
  const name = String(req.body?.name || "").trim();
  if (!name) {
    res.status(400);
    throw new Error("name is required");
  }
  const ws = await Workspace.create({ name, createdBy: req.user._id });
  await Membership.create({ workspaceId: ws._id, userId: req.user._id, role: "owner" });
  res.status(201).json({ workspace: ws, role: "owner" });
});

module.exports = { listMyWorkspaces, createWorkspace };

