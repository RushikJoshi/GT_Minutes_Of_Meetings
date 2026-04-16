const express = require("express");
const { z } = require("zod");
const { register, login, me } = require("../controllers/authController");
const { validateBody } = require("../middlewares/validateMiddleware");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post(
  "/auth/register",
  validateBody(
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
      name: z.string().optional(),
    })
  ),
  register
);

router.post(
  "/auth/login",
  validateBody(
    z.object({
      email: z.string().email(),
      password: z.string().min(1),
    })
  ),
  login
);

router.get("/auth/me", requireAuth, me);

module.exports = router;

