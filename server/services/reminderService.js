const Meeting = require("../models/Meeting");
const Mom = require("../models/Mom");
const User = require("../models/User");
const Notification = require("../models/Notification");

function isEmailLike(value) {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

async function createNotificationOnce({
  workspaceId,
  userId,
  type,
  title,
  message,
  entityType,
  entityId,
  dueAt,
}) {
  // best-effort de-dupe by (user,type,entityId,dueAt-day)
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24);
  const exists = await Notification.findOne({
    workspaceId,
    userId,
    type,
    entityType,
    entityId,
    createdAt: { $gte: since },
  }).select("_id");
  if (exists) return null;
  return Notification.create({
    workspaceId,
    userId,
    type,
    title,
    message,
    entityType,
    entityId,
    dueAt,
  });
}

async function processMeetingReminders() {
  const now = new Date();

  const meetings = await Meeting.find({
    status: "scheduled",
    reminderMinutes: { $gt: 0 },
    reminderSentAt: { $exists: false },
    date: { $exists: true },
  })
    .limit(50)
    .lean();

  for (const m of meetings) {
    const start = m.date ? new Date(m.date) : null;
    if (!start || Number.isNaN(start.getTime())) continue;

    const remindAt = new Date(start.getTime() - Number(m.reminderMinutes || 0) * 60 * 1000);
    if (now < remindAt) continue;

    const recipients = new Set();
    if (m.createdBy) recipients.add(String(m.createdBy));
    if (Array.isArray(m.participants)) {
      for (const p of m.participants) {
        if (p?.kind === "user" && p.userId) recipients.add(String(p.userId));
      }
    }

    for (const userId of recipients) {
      await createNotificationOnce({
        workspaceId: m.workspaceId,
        userId,
        type: "meetingReminder",
        title: "Meeting reminder",
        message: `${m.title || "Meeting"} is coming up.`,
        entityType: "meeting",
        entityId: m._id,
        dueAt: start,
      });
    }

    await Meeting.updateOne({ _id: m._id }, { $set: { reminderSentAt: now } });
  }
}

async function processActionItemReminders() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 1000 * 60 * 60 * 24); // 24h

  const moms = await Mom.find({
    "actionItems.status": "pending",
    "actionItems.deadline": { $gte: now, $lte: windowEnd },
    "actionItems.reminderSentAt": { $exists: false },
  })
    .limit(25)
    .lean();

  for (const mom of moms) {
    const items = Array.isArray(mom.actionItems) ? mom.actionItems : [];
    for (const it of items) {
      if (!it?.deadline || it?.status !== "pending" || it?.reminderSentAt) continue;
      const due = new Date(it.deadline);
      if (Number.isNaN(due.getTime())) continue;
      if (due < now || due > windowEnd) continue;

      const assignedTo = String(it.assignedTo || "").trim();
      if (!isEmailLike(assignedTo)) continue;
      const u = await User.findOne({ email: assignedTo.toLowerCase() }).select("_id");
      if (!u?._id) continue;

      await createNotificationOnce({
        workspaceId: mom.workspaceId,
        userId: u._id,
        type: "actionItemDue",
        title: "Action item due soon",
        message: `${it.task || "Action item"} is due on ${due.toDateString()}.`,
        entityType: "mom",
        entityId: mom.meetingId,
        dueAt: due,
      });

      await Mom.updateOne(
        { _id: mom._id, "actionItems._id": it._id },
        { $set: { "actionItems.$.reminderSentAt": now } }
      );
    }
  }
}

function startReminderLoop() {
  const intervalMs = Number(process.env.REMINDER_POLL_MS || 60000);
  const tick = async () => {
    try {
      await processMeetingReminders();
      await processActionItemReminders();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Reminder loop error:", e?.message || e);
    }
  };
  tick();
  const handle = setInterval(tick, intervalMs);
  handle.unref?.();
  return () => clearInterval(handle);
}

module.exports = { startReminderLoop };

