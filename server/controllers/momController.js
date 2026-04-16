const Meeting = require("../models/Meeting");
const Mom = require("../models/Mom");
const Attachment = require("../models/Attachment");
const asyncHandler = require("../utils/asyncHandler");
const { syncActionItemsFromMom } = require("../services/actionItemService");

function participantToLabel(p) {
  if (!p) return "";
  if (typeof p === "string") return p;
  const name = String(p.name || "").trim();
  const email = String(p.email || "").trim();
  if (name && email) return `${name} <${email}>`;
  return name || email;
}

const createMom = asyncHandler(async (req, res) => {
  const { meetingId, summary, discussion, decisions, attendees, actionItems, attachmentIds } =
    req.body || {};

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

  if (meeting.status !== "completed") {
    res.status(400);
    throw new Error('MOM can only be created after meeting is "completed"');
  }

  const normalizedItems = Array.isArray(actionItems)
    ? actionItems.map((i) => ({
        task: i?.task ? String(i.task) : "",
        assignedTo: i?.assignedTo ? String(i.assignedTo) : "",
        deadline: i?.deadline ? new Date(i.deadline) : undefined,
        status: i?.status === "done" ? "done" : "pending",
      }))
    : [];

  const normalizedAttendeesInput = Array.isArray(attendees)
    ? attendees.map((a) => String(a)).filter(Boolean)
    : [];

  const attendeesFromMeeting =
    Array.isArray(meeting.participants) && meeting.participants.length
      ? meeting.participants.map(participantToLabel).filter(Boolean)
      : [];

  const finalAttendees = normalizedAttendeesInput.length ? normalizedAttendeesInput : attendeesFromMeeting;

  const normalizedAttachmentIds = Array.isArray(attachmentIds)
    ? attachmentIds.map((id) => String(id)).filter(Boolean)
    : [];

  if (normalizedAttachmentIds.length) {
    const count = await Attachment.countDocuments({
      _id: { $in: normalizedAttachmentIds },
      createdBy: req.user._id,
      workspaceId: req.workspace._id,
      entityType: "mom",
      entityId: meetingId,
    });
    if (count !== normalizedAttachmentIds.length) {
      res.status(400);
      throw new Error("Invalid attachmentIds");
    }
  }

  try {
    const mom = await Mom.create({
      workspaceId: req.workspace._id,
      meetingId,
      summary: summary ? String(summary) : "",
      discussion: discussion ? String(discussion) : "",
      decisions: decisions ? String(decisions) : "",
      attendees: finalAttendees,
      actionItems: normalizedItems,
      attachments: normalizedAttachmentIds,
      createdBy: req.user._id,
    });

    await syncActionItemsFromMom({
      workspaceId: req.workspace._id,
      meetingId,
      mom,
    });

    res.status(201).json(mom);
  } catch (err) {
    if (err?.code === 11000) {
      res.status(409);
      throw new Error("MOM already exists for this meeting");
    }
    throw err;
  }
});

const getMomByMeetingId = asyncHandler(async (req, res) => {
  const meetingId = req.params.meetingId;
  const mom = await Mom.findOne({
    meetingId,
    createdBy: req.user._id,
    workspaceId: req.workspace._id,
  }).populate("attachments");
  res.json(mom);
});

const getMinutesDoc = asyncHandler(async (req, res) => {
  const meetingId = req.params.meetingId;
  const meeting = await Meeting.findOne({
    _id: meetingId,
    createdBy: req.user._id,
    workspaceId: req.workspace._id,
  });
  if (!meeting) {
    res.status(404);
    throw new Error("Meeting not found");
  }
  const mom = await Mom.findOne({
    meetingId,
    createdBy: req.user._id,
    workspaceId: req.workspace._id,
  }).populate("attachments");
  res.json({ meeting, mom });
});

const upsertMinutesDoc = asyncHandler(async (req, res) => {
  const meetingId = req.params.meetingId;
  const meeting = await Meeting.findOne({
    _id: meetingId,
    createdBy: req.user._id,
    workspaceId: req.workspace._id,
  });
  if (!meeting) {
    res.status(404);
    throw new Error("Meeting not found");
  }

  const {
    contentHtml,
    summary,
    discussion,
    decisions,
    attendees,
    actionItems,
    attachmentIds,
    docStatus,
  } = req.body || {};

  const normalizedItems = Array.isArray(actionItems)
    ? actionItems.map((i) => ({
        task: i?.task ? String(i.task) : "",
        assignedTo: i?.assignedTo ? String(i.assignedTo) : "",
        deadline: i?.deadline ? new Date(i.deadline) : undefined,
        status: i?.status === "done" ? "done" : "pending",
      }))
    : [];

  const attendeesFromMeeting =
    Array.isArray(meeting.participants) && meeting.participants.length
      ? meeting.participants.map(participantToLabel).filter(Boolean)
      : [];
  const normalizedAttendeesInput = Array.isArray(attendees)
    ? attendees.map((a) => String(a)).filter(Boolean)
    : [];
  const finalAttendees = normalizedAttendeesInput.length ? normalizedAttendeesInput : attendeesFromMeeting;

  const normalizedAttachmentIds = Array.isArray(attachmentIds)
    ? attachmentIds.map((id) => String(id)).filter(Boolean)
    : [];

  if (normalizedAttachmentIds.length) {
    const count = await Attachment.countDocuments({
      _id: { $in: normalizedAttachmentIds },
      createdBy: req.user._id,
      workspaceId: req.workspace._id,
      entityType: "mom",
      entityId: meetingId,
    });
    if (count !== normalizedAttachmentIds.length) {
      res.status(400);
      throw new Error("Invalid attachmentIds");
    }
  }

  const nextStatus = docStatus === "published" ? "published" : "draft";

  const $set = {
    attendees: finalAttendees,
    actionItems: normalizedItems,
    attachments: normalizedAttachmentIds,
    docStatus: nextStatus,
  };
  if (contentHtml !== undefined) $set.contentHtml = String(contentHtml || "");
  if (summary !== undefined) $set.summary = String(summary || "");
  if (discussion !== undefined) $set.discussion = String(discussion || "");
  if (decisions !== undefined) $set.decisions = String(decisions || "");
  if (nextStatus === "published") $set.publishedAt = new Date();

  const mom = await Mom.findOneAndUpdate(
    { meetingId, createdBy: req.user._id, workspaceId: req.workspace._id },
    {
      $set,
      $inc: { version: 1 },
      $setOnInsert: {
        workspaceId: req.workspace._id,
        meetingId,
        createdBy: req.user._id,
      },
    },
    { upsert: true, new: true }
  ).populate("attachments");

  await syncActionItemsFromMom({
    workspaceId: req.workspace._id,
    meetingId,
    mom,
  });

  res.json({ meeting, mom });
});

module.exports = { createMom, getMomByMeetingId, getMinutesDoc, upsertMinutesDoc };

