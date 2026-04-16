const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const connectDB = require("./utils/connectDB");
const { notFound, errorHandler } = require("./utils/errorMiddleware");
const { loadConfig } = require("./config/env");

const app = express();

// ✅ Middlewares
app.use(express.json());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// ✅ Routes
const meetingRoutes = require("./routes/meetingRoutes");
const momRoutes = require("./routes/momRoutes");
const shareRoutes = require("./routes/shareRoutes");
const pdfRoutes = require("./routes/pdfRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const attachmentRoutes = require("./routes/attachmentRoutes");
const integrationRoutes = require("./routes/integrationRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");
const actionItemRoutes = require("./routes/actionItemRoutes");

/* ===========================
   TEST ROUTE
=========================== */
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "MOM Backend Running" });
});

app.use(meetingRoutes);
app.use(momRoutes);
app.use(shareRoutes);
app.use(pdfRoutes);
app.use(authRoutes);
app.use(userRoutes);
app.use(attachmentRoutes);
app.use(integrationRoutes);
app.use(notificationRoutes);
app.use(workspaceRoutes);
app.use(actionItemRoutes);

// Static uploads (used by PDF rendering & template images)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(notFound);
app.use(errorHandler);

/* ===========================
   SERVER START
=========================== */

const cfg = loadConfig();
const PORT = cfg.port;
const { startReminderLoop } = require("./services/reminderService");

connectDB(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected ✅");
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} 🚀`);
      startReminderLoop();
    });
  })
  .catch((err) => {
    console.error("Mongo Error:", err?.message || err);
    process.exit(1);
  });