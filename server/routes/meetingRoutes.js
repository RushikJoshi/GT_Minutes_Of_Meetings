const express = require("express");
const {
  createMeeting,
  getMeetings,
  getMeetingById,
  updateMeetingStatus,
  updateMeeting,
  updateAgenda,
  cancelMeeting,
} = require("../controllers/meetingController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { requireWorkspace } = require("../middlewares/workspaceMiddleware");

const router = express.Router();

router.post("/create-meeting", requireAuth, requireWorkspace, createMeeting);
router.get("/meetings", requireAuth, requireWorkspace, getMeetings);
router.get("/meeting/:id", requireAuth, requireWorkspace, getMeetingById);
router.patch("/meeting/:id/status", requireAuth, requireWorkspace, updateMeetingStatus);
router.patch("/meeting/:id", requireAuth, requireWorkspace, updateMeeting);
router.put("/meeting/:id/agenda", requireAuth, requireWorkspace, updateAgenda);
router.post("/meeting/:id/cancel", requireAuth, requireWorkspace, cancelMeeting);

module.exports = router;

