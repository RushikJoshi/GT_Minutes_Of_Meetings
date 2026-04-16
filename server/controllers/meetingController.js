const Meeting = require("../models/Meeting");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const {
  createOutlookEvent,
  updateOutlookEvent,
  deleteOutlookEvent,
} = require("../services/microsoftGraphService");

function isEmailLike(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function normalizeParticipants({ rawParticipants, organizerUser }) {
  const out = [];

  // Always include organizer as owner
  if (organizerUser?.email) {
    out.push({
      kind: "user",
      userId: organizerUser._id,
      email: String(organizerUser.email).toLowerCase(),
      name: organizerUser.name || "",
      role: "owner",
      rsvp: "yes",
    });
  }

  const list = Array.isArray(rawParticipants) ? rawParticipants : [];
  for (const raw of list) {
    if (!raw) continue;

    // Legacy: string participants => external email/name
    if (typeof raw === "string") {
      const value = raw.trim();
      if (!value) continue;
      if (isEmailLike(value)) {
        out.push({ kind: "external", email: value.toLowerCase(), name: "", role: "viewer" });
      } else {
        out.push({ kind: "external", email: value.toLowerCase(), name: value, role: "viewer" });
      }
      continue;
    }

    if (typeof raw !== "object") continue;
    const kind = raw.kind === "user" ? "user" : "external";
    const role = raw.role === "owner" || raw.role === "editor" ? raw.role : "viewer";

    if (kind === "user") {
      const userId = raw.userId || raw._id;
      if (userId) {
        const u = await User.findById(userId).select("_id email name");
        if (!u?.email) continue;
        out.push({
          kind: "user",
          userId: u._id,
          email: String(u.email).toLowerCase(),
          name: u.name || "",
          role,
          rsvp: "unknown",
        });
        continue;
      }

      const email = raw.email;
      if (isEmailLike(email)) {
        const u = await User.findOne({ email: String(email).toLowerCase() }).select("_id email name");
        if (u?.email) {
          out.push({
            kind: "user",
            userId: u._id,
            email: String(u.email).toLowerCase(),
            name: u.name || "",
            role,
            rsvp: "unknown",
          });
          continue;
        }
      }
      // fallback to external if user not found
    }

    const email = raw.email;
    if (!isEmailLike(email)) continue;
    out.push({
      kind: "external",
      email: String(email).toLowerCase(),
      name: raw.name ? String(raw.name).trim() : "",
      role,
      rsvp: "unknown",
    });
  }

  // de-dupe by (kind,userId,email)
  const seen = new Set();
  const deduped = [];
  for (const p of out) {
    const key = p.kind === "user" && p.userId ? `u:${p.userId}` : `e:${p.email}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(p);
  }

  // Ensure one owner
  if (!deduped.some((p) => p.role === "owner")) {
    if (deduped[0]) deduped[0].role = "owner";
  }

  return deduped;
}

const createMeeting = asyncHandler(async (req, res) => {
  const { title, agenda, date, startTime, endTime, participants, syncToOutlook, reminderMinutes } =
    req.body || {};

  if (!title || !String(title).trim()) {
    res.status(400);
    throw new Error("title is required");
  }

  const normalizedParticipants = await normalizeParticipants({
    rawParticipants: participants,
    organizerUser: req.user,
  });

  const meeting = await Meeting.create({
    workspaceId: req.workspace._id,
    title: String(title).trim(),
    agenda: agenda ? String(agenda) : "",
    date: date ? new Date(date) : undefined,
    startTime: startTime ? String(startTime) : "",
    endTime: endTime ? String(endTime) : "",
    participants: normalizedParticipants,
    reminderMinutes: Number(reminderMinutes || 0) > 0 ? Number(reminderMinutes) : 0,
    createdBy: req.user._id,
    graph: { organizerUserId: req.user._id },
  });

  if (syncToOutlook) {
    const created = await createOutlookEvent({ userId: req.user._id, meeting }).catch(() => null);
    if (created?.id) {
      meeting.graph = {
        ...(meeting.graph || {}),
        outlookEventId: created.id,
        organizerUserId: req.user._id,
        lastSyncedAt: new Date(),
      };
      await meeting.save();
    }
  }

  res.status(201).json(meeting);
});

const getMeetings = asyncHandler(async (req, res) => {
  const meetings = await Meeting.find({
    createdBy: req.user._id,
    workspaceId: req.workspace._id,
  }).sort({ createdAt: -1 });
  res.json(meetings);
});

const getMeetingById = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    workspaceId: req.workspace._id,
  });
  if (!meeting) {
    res.status(404);
    throw new Error("Meeting not found");
  }
  res.json(meeting);
});

const updateMeetingStatus = asyncHandler(async (req, res) => {
  const { status } = req.body || {};
  if (!status || !["scheduled", "completed"].includes(status)) {
    res.status(400);
    throw new Error('status must be "scheduled" or "completed"');
  }

  const meeting = await Meeting.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    workspaceId: req.workspace._id,
  });
  if (!meeting) {
    res.status(404);
    throw new Error("Meeting not found");
  }

  if (meeting.status === "completed" && status === "scheduled") {
    res.status(400);
    throw new Error("Cannot revert a completed meeting");
  }

  meeting.status = status;
  await meeting.save();
  res.json(meeting);
});

const updateMeeting = asyncHandler(async (req, res) => {
  const {
    title,
    agenda,
    date,
    startTime,
    endTime,
    participants,
    syncToOutlook,
    reminderMinutes,
    preparationNotes,
  } =
    req.body || {};
  const meeting = await Meeting.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    workspaceId: req.workspace._id,
  });
  if (!meeting) {
    res.status(404);
    throw new Error("Meeting not found");
  }

  if (title !== undefined) meeting.title = String(title).trim();
  if (agenda !== undefined) meeting.agenda = agenda ? String(agenda) : "";
  if (date !== undefined) meeting.date = date ? new Date(date) : undefined;
  if (startTime !== undefined) meeting.startTime = startTime ? String(startTime) : "";
  if (endTime !== undefined) meeting.endTime = endTime ? String(endTime) : "";

  if (participants !== undefined) {
    meeting.participants = await normalizeParticipants({
      rawParticipants: participants,
      organizerUser: req.user,
    });
  }
  if (preparationNotes !== undefined) {
    meeting.preparationNotes = preparationNotes ? String(preparationNotes) : "";
  }
  if (reminderMinutes !== undefined) {
    meeting.reminderMinutes = Number(reminderMinutes || 0) > 0 ? Number(reminderMinutes) : 0;
    meeting.reminderSentAt = undefined;
  }

  await meeting.save();

  if (syncToOutlook) {
    if (meeting.graph?.outlookEventId) {
      await updateOutlookEvent({
        userId: req.user._id,
        outlookEventId: meeting.graph.outlookEventId,
        meeting,
      }).catch(() => null);
      meeting.graph.lastSyncedAt = new Date();
      await meeting.save();
    } else {
      const created = await createOutlookEvent({ userId: req.user._id, meeting }).catch(() => null);
      if (created?.id) {
        meeting.graph = {
          ...(meeting.graph || {}),
          outlookEventId: created.id,
          organizerUserId: req.user._id,
          lastSyncedAt: new Date(),
        };
        await meeting.save();
      }
    }
  }

  res.json(meeting);
});

const updateAgenda = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    workspaceId: req.workspace._id,
  });
  if (!meeting) {
    res.status(404);
    throw new Error("Meeting not found");
  }
  const items = Array.isArray(req.body?.agendaItems) ? req.body.agendaItems : [];
  meeting.agendaItems = items
    .map((it) => ({
      title: it?.title ? String(it.title) : "",
      owner: it?.owner ? String(it.owner) : "",
      notes: it?.notes ? String(it.notes) : "",
    }))
    .filter((it) => it.title || it.owner || it.notes);
  await meeting.save();
  res.json(meeting);
});

const cancelMeeting = asyncHandler(async (req, res) => {
  const meeting = await Meeting.findOne({
    _id: req.params.id,
    createdBy: req.user._id,
    workspaceId: req.workspace._id,
  });
  if (!meeting) {
    res.status(404);
    throw new Error("Meeting not found");
  }

  meeting.status = "cancelled";
  await meeting.save();

  if (meeting.graph?.outlookEventId) {
    await deleteOutlookEvent({
      userId: req.user._id,
      workspaceId: meeting.workspaceId,
      outlookEventId: meeting.graph.outlookEventId,
    }).catch(() => null);
    meeting.graph.outlookEventId = "";
    meeting.graph.lastSyncedAt = new Date();
    await meeting.save();
  }

  res.json(meeting);
});

module.exports = {
  createMeeting,
  getMeetings,
  getMeetingById,
  updateMeetingStatus,
  updateMeeting,
  updateAgenda,
  cancelMeeting,
};

