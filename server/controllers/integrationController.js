const asyncHandler = require("../utils/asyncHandler");
const IntegrationToken = require("../models/IntegrationToken");
const {
  getConnectUrl,
  handleOAuthCallback,
} = require("../services/microsoftGraphService");

const microsoftStatus = asyncHandler(async (req, res) => {
  const doc = await IntegrationToken.findOne({
    provider: "microsoft",
    workspaceId: req.workspace._id,
    userId: req.user._id,
  });
  res.json({ connected: Boolean(doc), connectedAt: doc?.connectedAt || null });
});

const microsoftConnect = asyncHandler(async (req, res) => {
  const { url } = await getConnectUrl({ userId: req.user._id, workspaceId: req.workspace._id });
  res.json({ url });
});

const microsoftCallback = asyncHandler(async (req, res) => {
  const code = String(req.query.code || "");
  const state = String(req.query.state || "");
  if (!code || !state) {
    res.status(400);
    throw new Error("Missing code/state");
  }

  await handleOAuthCallback({ code, state });

  const clientBase = process.env.PUBLIC_CLIENT_BASE_URL || "http://localhost:5173";
  res.redirect(`${clientBase.replace(/[\\/]+$/, "")}/settings?microsoft=connected`);
});

const microsoftDisconnect = asyncHandler(async (req, res) => {
  await IntegrationToken.deleteOne({
    provider: "microsoft",
    workspaceId: req.workspace._id,
    userId: req.user._id,
  });
  res.json({ ok: true });
});

module.exports = {
  microsoftStatus,
  microsoftConnect,
  microsoftCallback,
  microsoftDisconnect,
};

