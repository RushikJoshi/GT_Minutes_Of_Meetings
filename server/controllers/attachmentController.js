const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const Attachment = require("../models/Attachment");
const asyncHandler = require("../utils/asyncHandler");

function safeExt(name) {
  const ext = path.extname(String(name || "")).toLowerCase();
  if (!ext) return "";
  // allow a small set for safety; default to no extension otherwise
  if (!/^\.[a-z0-9]{1,8}$/.test(ext)) return "";
  return ext;
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const userId = String(req.user?._id || "anon");
      const dir = path.join(__dirname, "..", "uploads", userId);
      ensureDir(dir);
      cb(null, dir);
    },
    filename(req, file, cb) {
      const id = crypto.randomUUID();
      cb(null, `${id}${safeExt(file.originalname)}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const uploadAttachment = [
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const { entityType, entityId } = req.body || {};
    if (!req.file) {
      res.status(400);
      throw new Error("file is required");
    }
    if (!entityType || !["meeting", "mom", "actionItem"].includes(entityType)) {
      res.status(400);
      throw new Error('entityType must be "meeting", "mom", or "actionItem"');
    }
    if (!entityId) {
      res.status(400);
      throw new Error("entityId is required");
    }

    const userId = String(req.user._id);
    const relativePath = path.posix.join(userId, req.file.filename);
    const urlPath = `/uploads/${relativePath}`;

    const attachment = await Attachment.create({
      workspaceId: req.workspace._id,
      entityType,
      entityId,
      originalName: req.file.originalname || "",
      mimeType: req.file.mimetype || "",
      size: req.file.size || 0,
      storagePath: relativePath,
      urlPath,
      createdBy: req.user._id,
    });

    res.status(201).json(attachment);
  }),
];

const listAttachments = asyncHandler(async (req, res) => {
  const { entityType, entityId } = req.query || {};
  if (!entityType || !entityId) {
    res.status(400);
    throw new Error("entityType and entityId are required");
  }
  const items = await Attachment.find({
    entityType,
    entityId,
    createdBy: req.user._id,
    workspaceId: req.workspace._id,
  }).sort({
    createdAt: -1,
  });
  res.json(items);
});

module.exports = { uploadAttachment, listAttachments };

