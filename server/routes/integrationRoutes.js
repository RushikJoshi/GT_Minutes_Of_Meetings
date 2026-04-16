const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const { requireWorkspace } = require("../middlewares/workspaceMiddleware");
const {
  microsoftStatus,
  microsoftConnect,
  microsoftCallback,
  microsoftDisconnect,
} = require("../controllers/integrationController");

const router = express.Router();

router.get("/integrations/microsoft/status", requireAuth, requireWorkspace, microsoftStatus);
router.get("/integrations/microsoft/connect", requireAuth, requireWorkspace, microsoftConnect);
router.get("/integrations/microsoft/callback", microsoftCallback);
router.post("/integrations/microsoft/disconnect", requireAuth, requireWorkspace, microsoftDisconnect);

module.exports = router;

