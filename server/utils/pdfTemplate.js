function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatDate(date) {
  if (!date) return "—";
  try {
    return new Date(date).toDateString();
  } catch {
    return "—";
  }
}

function participantToLabel(p) {
  if (!p) return "";
  if (typeof p === "string") return p;
  const name = String(p.name || "").trim();
  const email = String(p.email || "").trim();
  if (name && email) return `${name} <${email}>`;
  return name || email;
}

function buildMomHtml({ meeting, mom, baseUrl }) {
  const title = escapeHtml(meeting?.title || "Minutes of Meeting");
  const agenda = escapeHtml(meeting?.agenda || "—");
  const date = formatDate(meeting?.date);
  const timeRange = [meeting?.startTime, meeting?.endTime].filter(Boolean).join(" – ") || "—";
  const participants = Array.isArray(meeting?.participants)
    ? meeting.participants.map(participantToLabel).filter(Boolean)
    : [];

  const summary = escapeHtml(mom?.summary || "—");
  const discussion = escapeHtml(mom?.discussion || "—");
  const decisions = escapeHtml(mom?.decisions || "—");
  const attendees = Array.isArray(mom?.attendees) ? mom.attendees.filter(Boolean) : [];
  const actionItems = Array.isArray(mom?.actionItems) ? mom.actionItems : [];
  const attachments = Array.isArray(mom?.attachments) ? mom.attachments : [];

  const base = String(baseUrl || "").replace(/\/+$/, "");
  const images = attachments.filter(
    (a) => String(a?.mimeType || "").startsWith("image/") && a?.urlPath
  );
  const imagesHtml = images.length
    ? `<div class="images">${images
        .map(
          (img) => `<div class="img">
              <img src="${escapeHtml(`${base}${img.urlPath}`)}" alt="${escapeHtml(img.originalName || "image")}" />
              <div class="imgcap">${escapeHtml(img.originalName || "")}</div>
            </div>`
        )
        .join("")}</div>`
    : `<div class="value muted">—</div>`;

  const actionItemsHtml = actionItems.length
    ? actionItems
        .map((item) => {
          const task = escapeHtml(item?.task || "—");
          const assignedTo = escapeHtml(item?.assignedTo || "—");
          const deadline = formatDate(item?.deadline);
          const status = escapeHtml(item?.status || "pending");
          return `
            <tr>
              <td>${task}</td>
              <td>${assignedTo}</td>
              <td>${deadline}</td>
              <td><span class="badge ${status === "done" ? "done" : "pending"}">${status}</span></td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="4" class="muted">No action items</td></tr>`;

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>${title}</title>
      ${base ? `<base href="${escapeHtml(base)}/" />` : ""}
      <style>
        :root { --fg:#0f172a; --muted:#64748b; --border:#e2e8f0; --bg:#ffffff; }
        * { box-sizing: border-box; }
        body { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif; color: var(--fg); background: var(--bg); padding: 32px; }
        h1 { margin: 0 0 8px; font-size: 24px; }
        .sub { color: var(--muted); margin-bottom: 20px; }
        .card { border: 1px solid var(--border); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
        .label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
        .value { font-size: 14px; line-height: 1.5; white-space: pre-wrap; }
        .chips { display:flex; flex-wrap:wrap; gap:6px; }
        .chip { border:1px solid var(--border); border-radius:999px; padding:4px 10px; font-size:12px; color: var(--fg); background:#f8fafc; }
        .images { display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .img { border:1px solid var(--border); border-radius: 10px; overflow:hidden; background:#fff; }
        .img img { width:100%; height:auto; display:block; }
        .imgcap { padding:8px 10px; font-size: 11px; color: var(--muted); border-top:1px solid var(--border); }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border-top: 1px solid var(--border); padding: 10px 8px; text-align: left; vertical-align: top; }
        th { color: var(--muted); font-weight: 600; }
        .muted { color: var(--muted); }
        .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px; border:1px solid var(--border); }
        .badge.pending { background:#fff7ed; border-color:#fed7aa; color:#9a3412; }
        .badge.done { background:#ecfdf5; border-color:#a7f3d0; color:#065f46; }
      </style>
    </head>
    <body>
      <h1>Minutes of Meeting</h1>
      <div class="sub">${title} • ${escapeHtml(date)} • ${escapeHtml(timeRange)}</div>

      <div class="card">
        <div class="label">Agenda</div>
        <div class="value">${agenda}</div>
      </div>

      <div class="card">
        <div class="label">Participants</div>
        ${
          participants.length
            ? `<div class="chips">${participants.map((p) => `<span class="chip">${escapeHtml(p)}</span>`).join("")}</div>`
            : `<div class="value muted">—</div>`
        }
      </div>

      <div class="card">
        <div class="label">Summary</div>
        <div class="value">${summary}</div>
      </div>

      <div class="card">
        <div class="label">Discussion</div>
        <div class="value">${discussion}</div>
      </div>

      <div class="card">
        <div class="label">Decisions</div>
        <div class="value">${decisions}</div>
      </div>

      <div class="card">
        <div class="label">Attendees</div>
        ${
          attendees.length
            ? `<div class="chips">${attendees.map((a) => `<span class="chip">${escapeHtml(a)}</span>`).join("")}</div>`
            : `<div class="value muted">—</div>`
        }
      </div>

      <div class="card">
        <div class="label">Images</div>
        ${imagesHtml}
      </div>

      <div class="card">
        <div class="label">Action Items</div>
        <table>
          <thead>
            <tr>
              <th style="width:40%;">Task</th>
              <th style="width:22%;">Assigned To</th>
              <th style="width:22%;">Deadline</th>
              <th style="width:16%;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${actionItemsHtml}
          </tbody>
        </table>
      </div>
    </body>
  </html>`;
}

module.exports = { buildMomHtml };

