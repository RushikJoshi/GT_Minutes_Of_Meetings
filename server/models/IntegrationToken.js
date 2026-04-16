const mongoose = require("mongoose");

const integrationTokenSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ["microsoft"], required: true, index: true },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    msalCache: { type: String, required: true },
    homeAccountId: { type: String, default: "" },
    tenantId: { type: String, default: "" },
    connectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

integrationTokenSchema.index({ provider: 1, workspaceId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model("IntegrationToken", integrationTokenSchema);

