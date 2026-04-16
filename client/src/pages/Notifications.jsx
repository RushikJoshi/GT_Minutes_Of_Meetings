import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/api";

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/notifications", { params: { limit: 50 } });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-4 flex items-center justify-between gap-4">
        <Link className="text-blue-700 hover:underline" to="/dashboard">
          ← Back
        </Link>
        <button className="px-3 py-2 rounded border hover:bg-gray-50" onClick={load}>
          Refresh
        </button>
      </div>

      <div className="bg-white shadow rounded p-5">
        <h1 className="text-2xl font-bold mb-4">Notifications</h1>

        {error ? (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-800">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="text-gray-600">Loading…</div>
        ) : items.length ? (
          <div className="space-y-2">
            {items.map((n) => (
              <div
                key={n._id}
                className={`rounded border p-3 ${n.readAt ? "bg-white" : "bg-blue-50 border-blue-200"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{n.title || n.type}</div>
                    <div className="text-sm text-gray-700 mt-1">{n.message || "—"}</div>
                    <div className="text-xs text-gray-500 mt-2">
                      {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""}
                      {n.dueAt ? ` • due ${new Date(n.dueAt).toDateString()}` : ""}
                    </div>
                  </div>
                  {!n.readAt ? (
                    <button
                      className="px-3 py-2 rounded border hover:bg-white"
                      onClick={async () => {
                        try {
                          await API.post(`/notifications/${n._id}/read`);
                          setItems((prev) =>
                            prev.map((x) => (x._id === n._id ? { ...x, readAt: new Date().toISOString() } : x))
                          );
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-600">No notifications.</div>
        )}
      </div>
    </div>
  );
}

