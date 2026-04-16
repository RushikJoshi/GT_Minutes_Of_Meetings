const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["owner", "editor", "viewer"], default: "viewer", index: true },
  },
  { timestamps: true }
);

membershipSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("Membership", membershipSchema);

