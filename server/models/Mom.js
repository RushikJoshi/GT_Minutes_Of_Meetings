const mongoose = require("mongoose");

const actionItemSchema = new mongoose.Schema(
  {
    task: { type: String, default: "" },
    assignedTo: { type: String, default: "" },
    deadline: { type: Date },
    reminderSentAt: { type: Date },
    status: {
      type: String,
      enum: ["pending", "done"],
      default: "pending",
      index: true,
    },
  },
  { _id: true }
);

const momSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    meetingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      required: true,
      unique: true,
      index: true,
    },
    summary: {
      type: String,
      default: "",
    },
    discussion: {
      type: String,
      default: "",
    },
    decisions: {
      type: String,
      default: "",
    },
    contentHtml: {
      type: String,
      default: "",
    },
    docStatus: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },
    publishedAt: { type: Date },
    version: { type: Number, default: 1 },
    attendees: {
      type: [String],
      default: [],
    },
    actionItems: {
      type: [actionItemSchema],
      default: [],
    },
    attachments: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "Attachment",
      default: [],
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

module.exports = mongoose.model("Mom", momSchema);