const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const { listUsers } = require("../controllers/userController");

const router = express.Router();

router.get("/users", requireAuth, listUsers);

module.exports = router;

