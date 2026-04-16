const jwt = require("jsonwebtoken");
const { ConfidentialClientApplication } = require("@azure/msal-node");
const IntegrationToken = require("../models/IntegrationToken");

const SCOPES = ["offline_access", "User.Read", "Calendars.ReadWrite"];

function msalConfig() {
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  const tenantId = process.env.MS_TENANT_ID || "common";
  const redirectUri = process.env.MS_REDIRECT_URI;
  const missing = [];
  if (!clientId) missing.push("MS_CLIENT_ID");
  if (!clientSecret) missing.push("MS_CLIENT_SECRET");
  if (!redirectUri) missing.push("MS_REDIRECT_URI");
  if (missing.length) {
    throw new Error(`Missing Microsoft OAuth env vars: ${missing.join(", ")}`);
  }
  return {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientSecret,
    },
  };
}

function createCcaWithCache(serializedCache) {
  const cca = new ConfidentialClientApplication(msalConfig());
  if (serializedCache) {
    cca.getTokenCache().deserialize(serializedCache);
  }
  return cca;
}

function signState({ userId, workspaceId }) {
  return jwt.sign(
    { userId: String(userId), workspaceId: String(workspaceId || "") },
    process.env.JWT_SECRET,
    { expiresIn: "10m" }
  );
}

function verifyState(state) {
  const payload = jwt.verify(state, process.env.JWT_SECRET);
  if (!payload?.userId || !payload?.workspaceId) throw new Error("Invalid state");
  return { userId: payload.userId, workspaceId: payload.workspaceId };
}

async function getConnectUrl({ userId, workspaceId }) {
  const cca = createCcaWithCache();
  const state = signState({ userId, workspaceId });
  const url = await cca.getAuthCodeUrl({
    scopes: SCOPES,
    redirectUri: process.env.MS_REDIRECT_URI,
    state,
    prompt: "select_account",
  });
  return { url };
}

async function handleOAuthCallback({ code, state }) {
  const { userId, workspaceId } = verifyState(state);
  const cca = createCcaWithCache();
  const token = await cca.acquireTokenByCode({
    code,
    scopes: SCOPES,
    redirectUri: process.env.MS_REDIRECT_URI,
  });
  const cache = cca.getTokenCache().serialize();
  const account = token?.account;

  await IntegrationToken.findOneAndUpdate(
    { provider: "microsoft", workspaceId, userId },
    {
      provider: "microsoft",
      workspaceId,
      userId,
      msalCache: cache,
      homeAccountId: account?.homeAccountId || "",
      tenantId: account?.tenantId || "",
      connectedAt: new Date(),
    },
    { upsert: true, new: true }
  );

  return { userId, workspaceId };
}

async function getAccessTokenForUser({ userId, workspaceId }) {
  const doc = await IntegrationToken.findOne({ provider: "microsoft", workspaceId, userId });
  if (!doc) return null;

  const cca = createCcaWithCache(doc.msalCache);
  const accounts = await cca.getTokenCache().getAllAccounts();
  const account =
    (doc.homeAccountId && accounts.find((a) => a.homeAccountId === doc.homeAccountId)) ||
    accounts[0];
  if (!account) return null;

  const result = await cca.acquireTokenSilent({ account, scopes: SCOPES }).catch(() => null);
  if (!result?.accessToken) return null;

  const newCache = cca.getTokenCache().serialize();
  if (newCache && newCache !== doc.msalCache) {
    doc.msalCache = newCache;
    await doc.save();
  }

  return result.accessToken;
}

async function graphFetch({ accessToken, method, url, body }) {
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = json?.error?.message || `Graph error (${res.status})`;
    const err = new Error(msg);
    err.statusCode = res.status;
    err.details = json;
    throw err;
  }
  return json;
}

function meetingToGraphEvent(meeting) {
  const d = meeting?.date ? new Date(meeting.date) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  const startYmd = d.toISOString().slice(0, 10);
  const end = new Date(d);
  end.setDate(d.getDate() + 1);
  const endYmd = end.toISOString().slice(0, 10);

  const attendees = Array.isArray(meeting.participants)
    ? meeting.participants
        .map((p) => (typeof p === "string" ? { email: p } : { email: p.email, name: p.name }))
        .filter((p) => p?.email)
        .map((p) => ({
          emailAddress: { address: p.email, name: p.name || p.email },
          type: "required",
        }))
    : [];

  return {
    subject: meeting.title || "Meeting",
    body: { contentType: "text", content: meeting.agenda || "" },
    isAllDay: true,
    start: { dateTime: `${startYmd}T00:00:00`, timeZone: "UTC" },
    end: { dateTime: `${endYmd}T00:00:00`, timeZone: "UTC" },
    attendees,
  };
}

async function createOutlookEvent({ userId, meeting }) {
  const accessToken = await getAccessTokenForUser({ userId, workspaceId: meeting.workspaceId });
  if (!accessToken) return null;
  const event = meetingToGraphEvent(meeting);
  if (!event) return null;
  const created = await graphFetch({
    accessToken,
    method: "POST",
    url: "https://graph.microsoft.com/v1.0/me/events",
    body: event,
  });
  return created;
}

async function updateOutlookEvent({ userId, outlookEventId, meeting }) {
  const accessToken = await getAccessTokenForUser({ userId, workspaceId: meeting.workspaceId });
  if (!accessToken) return null;
  const event = meetingToGraphEvent(meeting);
  if (!event) return null;
  const updated = await graphFetch({
    accessToken,
    method: "PATCH",
    url: `https://graph.microsoft.com/v1.0/me/events/${outlookEventId}`,
    body: event,
  });
  return updated;
}

async function deleteOutlookEvent({ userId, workspaceId, outlookEventId }) {
  const accessToken = await getAccessTokenForUser({ userId, workspaceId });
  if (!accessToken) return null;
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/events/${outlookEventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // ignore
    }
    const msg = json?.error?.message || `Graph error (${res.status})`;
    const err = new Error(msg);
    err.statusCode = res.status;
    throw err;
  }
  return { ok: true };
}

module.exports = {
  getConnectUrl,
  handleOAuthCallback,
  getAccessTokenForUser,
  createOutlookEvent,
  updateOutlookEvent,
  deleteOutlookEvent,
};

