const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const { requireWorkspace } = require("../middlewares/workspaceMiddleware");
const { listActionItems, updateActionItemStatus } = require("../controllers/actionItemController");

const router = express.Router();

router.get("/action-items", requireAuth, requireWorkspace, listActionItems);
router.patch("/action-items/:id/status", requireAuth, requireWorkspace, updateActionItemStatus);

module.exports = router;

