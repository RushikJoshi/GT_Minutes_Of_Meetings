const ActionItem = require("../models/ActionItem");

async function syncActionItemsFromMom({ workspaceId, meetingId, mom }) {
  const momId = mom._id;
  const list = Array.isArray(mom.actionItems) ? mom.actionItems : [];

  // Replace-all strategy (simple + safe). For large scale, switch to diff sync.
  await ActionItem.deleteMany({ workspaceId, meetingId, momId });

  const docs = list
    .map((it) => ({
      workspaceId,
      meetingId,
      momId,
      sourceItemId: it?._id ? String(it._id) : "",
      task: it?.task || "",
      assignedTo: it?.assignedTo || "",
      deadline: it?.deadline ? new Date(it.deadline) : undefined,
      status: it?.status === "done" ? "done" : "pending",
    }))
    .filter((d) => d.task || d.assignedTo || d.deadline);

  if (docs.length) await ActionItem.insertMany(docs);
}

module.exports = { syncActionItemsFromMom };

