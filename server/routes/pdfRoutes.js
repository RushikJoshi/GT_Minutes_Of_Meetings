const express = require("express");
const { generatePdf } = require("../controllers/pdfController");
const { requireAuth } = require("../middlewares/authMiddleware");
const { requireWorkspace } = require("../middlewares/workspaceMiddleware");

const router = express.Router();

router.get("/generate-pdf/:meetingId", requireAuth, requireWorkspace, generatePdf);

module.exports = router;

