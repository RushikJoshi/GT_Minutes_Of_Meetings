const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middlewares/authMiddleware");
const { validateBody } = require("../middlewares/validateMiddleware");
const { listMyWorkspaces, createWorkspace } = require("../controllers/workspaceController");

const router = express.Router();

router.get("/workspaces", requireAuth, listMyWorkspaces);
router.post(
  "/workspaces",
  requireAuth,
  validateBody(z.object({ name: z.string().min(1) })),
  createWorkspace
);

module.exports = router;

