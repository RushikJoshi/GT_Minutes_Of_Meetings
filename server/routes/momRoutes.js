const express = require("express");
const { createMom, getMomByMeetingId, getMinutesDoc, upsertMinutesDoc } = require("../controllers/momController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { requireWorkspace } = require("../middlewares/workspaceMiddleware");

const router = express.Router();

router.post("/create-mom", requireAuth, requireWorkspace, createMom);
router.get("/mom/:meetingId", requireAuth, requireWorkspace, getMomByMeetingId);
router.get("/meeting/:meetingId/minutes", requireAuth, requireWorkspace, getMinutesDoc);
router.put("/meeting/:meetingId/minutes", requireAuth, requireWorkspace, upsertMinutesDoc);

module.exports = router;

