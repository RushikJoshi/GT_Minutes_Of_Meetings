const Meeting = require("../models/Meeting");
const Mom = require("../models/Mom");
const Share = require("../models/Share");
const asyncHandler = require("../utils/asyncHandler");
const { generateToken } = require("../utils/token");
const { syncActionItemsFromMom } = require("../services/actionItemService");

const createShareLink = asyncHandler(async (req, res) => {
  const { meetingId, accessType, expiry } = req.body || {};

  if (!meetingId) {
    res.status(400);
    throw new Error("meetingId is required");
  }

  const meeting = await Meeting.findOne({
    _id: meetingId,
    createdBy: req.user._id,
    workspaceId: req.workspace._id,
  });
  if (!meeting) {
    res.status(404);
    throw new Error("Meeting not found");
  }

  const token = generateToken(12);
  const share = await Share.create({
    workspaceId: req.workspace._id,
    meetingId,
    token,
    accessType: accessType === "edit" ? "edit" : "view",
    ...(expiry ? { expiry: new Date(expiry) } : {}),
    createdBy: req.user._id,
  });

  const apiBase = process.env.PUBLIC_API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  const link = `${apiBase}/share/${share.token}`;

  res.json({ link, token: share.token, accessType: share.accessType, expiry: share.expiry });
});

const openSharedMom = asyncHandler(async (req, res) => {
  const share = await Share.findOne({ token: req.params.token });
  if (!share) {
    res.status(404);
    throw new Error("Invalid link");
  }

  if (share.isExpired()) {
    res.status(403);
    throw new Error("Link expired");
  }

  const [meeting, mom] = await Promise.all([
    Meeting.findById(share.meetingId),
    Mom.findOne({ meetingId: share.meetingId, workspaceId: share.workspaceId }).populate("attachments"),
  ]);

  res.json({ share, meeting, mom });
});

const updateSharedMinutes = asyncHandler(async (req, res) => {
  const share = await Share.findOne({ token: req.params.token });
  if (!share) {
    res.status(404);
    throw new Error("Invalid link");
  }
  if (share.isExpired()) {
    res.status(403);
    throw new Error("Link expired");
  }
  if (share.accessType !== "edit") {
    res.status(403);
    throw new Error("Link is view-only");
  }

  const meeting = await Meeting.findById(share.meetingId);
  if (!meeting) {
    res.status(404);
    throw new Error("Meeting not found");
  }

  const { contentHtml, decisions, attendees, actionItems } = req.body || {};
  const normalizedItems = Array.isArray(actionItems)
    ? actionItems.map((i) => ({
        task: i?.task ? String(i.task) : "",
        assignedTo: i?.assignedTo ? String(i.assignedTo) : "",
        deadline: i?.deadline ? new Date(i.deadline) : undefined,
        status: i?.status === "done" ? "done" : "pending",
      }))
    : [];

  const update = {};
  if (contentHtml !== undefined) update.contentHtml = String(contentHtml || "");
  if (decisions !== undefined) update.decisions = String(decisions || "");
  if (Array.isArray(attendees)) update.attendees = attendees.map((a) => String(a)).filter(Boolean);
  if (Array.isArray(actionItems)) update.actionItems = normalizedItems;

  const mom = await Mom.findOneAndUpdate(
    { meetingId: share.meetingId, workspaceId: share.workspaceId },
    { $set: update, $inc: { version: 1 } },
    { new: true }
  ).populate("attachments");

  if (mom) {
    await syncActionItemsFromMom({
      workspaceId: share.workspaceId,
      meetingId: share.meetingId,
      mom,
    });
  }

  res.json({ share, meeting, mom });
});

module.exports = { createShareLink, openSharedMom, updateSharedMinutes };

