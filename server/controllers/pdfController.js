let puppeteer;
try {
  // Prefer full puppeteer in production (bundled Chromium)
  // eslint-disable-next-line global-require
  puppeteer = require("puppeteer");
} catch {
  // Fallback for low-disk/dev environments
  // eslint-disable-next-line global-require
  puppeteer = require("puppeteer-core");
}
const Meeting = require("../models/Meeting");
const Mom = require("../models/Mom");
const asyncHandler = require("../utils/asyncHandler");
const { buildMomHtml } = require("../utils/pdfTemplate");
const { resolveChromeExecutablePath } = require("../utils/chromePath");

const generatePdf = asyncHandler(async (req, res) => {
  const meetingId = req.params.meetingId;
  const [meeting, mom] = await Promise.all([
    Meeting.findOne({ _id: meetingId, createdBy: req.user._id, workspaceId: req.workspace._id }),
    Mom.findOne({ meetingId, createdBy: req.user._id, workspaceId: req.workspace._id }).populate("attachments"),
  ]);

  if (!meeting || !mom) {
    res.status(404);
    throw new Error("Data not found");
  }
  if (mom.docStatus !== "published") {
    res.status(400);
    throw new Error("Publish minutes before exporting PDF");
  }

  const apiBase =
    process.env.PUBLIC_API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`;
  const html = buildMomHtml({ meeting, mom, baseUrl: apiBase });

  const executablePath = resolveChromeExecutablePath();
  const launchOptions = {
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    ...(executablePath ? { executablePath } : {}),
  };

  const browser = await puppeteer.launch(launchOptions);

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="meeting-${meetingId}.pdf"`,
    });

    res.send(pdfBuffer);
  } finally {
    await browser.close();
  }
});

module.exports = { generatePdf };

