const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["user", "external"], required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    email: { type: String, required: true, lowercase: true, trim: true },
    name: { type: String, default: "", trim: true },
    role: { type: String, enum: ["owner", "editor", "viewer"], default: "viewer" },
    rsvp: { type: String, enum: ["yes", "no", "maybe", "unknown"], default: "unknown" },
  },
  { _id: true }
);

const agendaItemSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    owner: { type: String, default: "" },
    notes: { type: String, default: "" },
  },
  { _id: true }
);

const meetingSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    agenda: { type: String, default: "" },
    date: { type: Date },
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    participants: { type: [participantSchema], default: [] },
    agendaItems: { type: [agendaItemSchema], default: [] },
    preparationNotes: { type: String, default: "" },
    reminderMinutes: { type: Number, default: 0 }, // 0 = none
    reminderSentAt: { type: Date },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
      index: true,
    },
    graph: {
      outlookEventId: { type: String, default: "" },
      organizerUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      lastSyncedAt: { type: Date },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Meeting", meetingSchema);

