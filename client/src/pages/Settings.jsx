import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import API from "../api/api";

export default function Settings() {
  const [ms, setMs] = useState({ connected: false, connectedAt: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const location = useLocation();

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/integrations/microsoft/status");
      setMs(res.data || { connected: false });
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load integration status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // if coming back from OAuth callback, refresh status
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-4">
        <Link className="text-blue-700 hover:underline" to="/dashboard">
          ← Back
        </Link>
      </div>

      <div className="bg-white shadow rounded p-5">
        <h1 className="text-2xl font-bold mb-1">Settings</h1>
        <div className="text-sm text-gray-500 mb-4">Integrations & preferences</div>

        {error ? (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-800">
            {error}
          </div>
        ) : null}

        <div className="border rounded p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Microsoft 365 (Outlook Calendar)</div>
              <div className="text-sm text-gray-600">
                {loading ? (
                  "Loading…"
                ) : ms?.connected ? (
                  <>
                    Connected
                    {ms.connectedAt ? (
                      <span className="text-gray-400">
                        {" "}
                        • {new Date(ms.connectedAt).toLocaleString()}
                      </span>
                    ) : null}
                  </>
                ) : (
                  "Not connected"
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {ms?.connected ? (
                <button
                  className="px-4 py-2 rounded border hover:bg-gray-50"
                  onClick={async () => {
                    try {
                      await API.post("/integrations/microsoft/disconnect");
                      await refresh();
                    } catch (e) {
                      setError(e?.response?.data?.message || "Failed to disconnect.");
                    }
                  }}
                  disabled={loading}
                >
                  Disconnect
                </button>
              ) : (
                <button
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
                  onClick={async () => {
                    try {
                      const res = await API.get("/integrations/microsoft/connect");
                      const url = res?.data?.url;
                      if (url) window.location.href = url;
                    } catch (e) {
                      setError(e?.response?.data?.message || "Failed to start connect flow.");
                    }
                  }}
                  disabled={loading}
                >
                  Connect
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500">
            Required env vars on server: <code>MS_CLIENT_ID</code>, <code>MS_CLIENT_SECRET</code>,{" "}
            <code>MS_TENANT_ID</code> (optional), <code>MS_REDIRECT_URI</code>,{" "}
            <code>PUBLIC_CLIENT_BASE_URL</code>.
          </div>
        </div>
      </div>
    </div>
  );
}

