const express = require("express");
const { createShareLink, openSharedMom, updateSharedMinutes } = require("../controllers/shareController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { requireWorkspace } = require("../middlewares/workspaceMiddleware");

const router = express.Router();

router.post("/share", requireAuth, requireWorkspace, createShareLink);
router.get("/share/:token", openSharedMom);
router.patch("/share/:token/minutes", updateSharedMinutes);

module.exports = router;

