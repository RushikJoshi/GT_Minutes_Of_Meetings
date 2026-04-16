const Membership = require("../models/Membership");

async function requireWorkspace(req, res, next) {
  try {
    const workspaceId = req.headers["x-workspace-id"];
    const userId = req.user?._id;
    if (!userId) {
      res.status(401);
      throw new Error("Unauthorized");
    }

    let membership = null;
    if (workspaceId) {
      membership = await Membership.findOne({ workspaceId, userId });
    } else {
      membership = await Membership.findOne({ userId }).sort({ createdAt: 1 });
    }

    if (!membership) {
      res.status(403);
      throw new Error("No workspace access");
    }

    req.workspace = { _id: membership.workspaceId, role: membership.role };
    next();
  } catch (e) {
    next(e);
  }
}

function requireWorkspaceRole(roles) {
  const allowed = new Set(Array.isArray(roles) ? roles : [roles]);
  return (req, res, next) => {
    const role = req.workspace?.role;
    if (!role || !allowed.has(role)) {
      res.status(403);
      return next(new Error("Forbidden"));
    }
    return next();
  };
}

module.exports = { requireWorkspace, requireWorkspaceRole };

