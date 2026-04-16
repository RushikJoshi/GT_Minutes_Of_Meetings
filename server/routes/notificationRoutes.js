const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const { listNotifications, markRead } = require("../controllers/notificationController");
const { requireWorkspace } = require("../middlewares/workspaceMiddleware");

const router = express.Router();

router.get("/notifications", requireAuth, requireWorkspace, listNotifications);
router.post("/notifications/:id/read", requireAuth, requireWorkspace, markRead);

module.exports = router;

