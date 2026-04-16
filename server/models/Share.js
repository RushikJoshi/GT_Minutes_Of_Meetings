const mongoose = require("mongoose");

const shareSchema = new mongoose.Schema(
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
    },

    token: {
      type: String,
      required: true,
      unique: true, // ensures no duplicate links
    },

    accessType: {
      type: String,
      enum: ["view", "edit"], // only these values allowed
      default: "view",
    },

    expiry: {
      type: Date,
      default: () => {
        // default expiry = 7 days from now
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      },
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// 🔥 Optional: Check if link is expired
shareSchema.methods.isExpired = function () {
  return this.expiry && this.expiry < new Date();
};

module.exports = mongoose.model("Share", shareSchema);