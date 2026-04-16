const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const { uploadAttachment, listAttachments } = require("../controllers/attachmentController");
const { requireWorkspace } = require("../middlewares/workspaceMiddleware");

const router = express.Router();

router.post("/attachments", requireAuth, requireWorkspace, ...uploadAttachment);
router.get("/attachments", requireAuth, requireWorkspace, listAttachments);

module.exports = router;

