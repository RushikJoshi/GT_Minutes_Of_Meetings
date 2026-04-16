const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true, index: true },
    title: { type: String, default: "" },
    message: { type: String, default: "" },
    entityType: { type: String, default: "" },
    entityId: { type: mongoose.Schema.Types.ObjectId },
    dueAt: { type: Date },
    readAt: { type: Date },
  },
  { timestamps: true }
);

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);

