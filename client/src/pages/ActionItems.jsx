import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/api";

export default function ActionItems() {
  const [scope, setScope] = useState("my");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/action-items", { params: { scope, status, q } });
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load action items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, status]);

  const grouped = useMemo(() => {
    const overdue = [];
    const dueSoon = [];
    const later = [];
    const noDate = [];
    const now = new Date();
    const soon = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7);
    for (const it of items) {
      if (!it.deadline) {
        noDate.push(it);
        continue;
      }
      const d = new Date(it.deadline);
      if (d < now) overdue.push(it);
      else if (d <= soon) dueSoon.push(it);
      else later.push(it);
    }
    return { overdue, dueSoon, later, noDate };
  }, [items]);

  const Section = ({ title, list }) => (
    <div className="bg-white shadow rounded p-5">
      <div className="font-semibold mb-3">{title}</div>
      {list.length ? (
        <div className="space-y-2">
          {list.map((it) => (
            <div key={it._id} className="rounded border p-3 flex items-start justify-between gap-3">
              <div>
                <div className="font-medium">{it.task || "—"}</div>
                <div className="text-xs text-gray-500 mt-1">
                  {it.assignedTo || "—"}
                  {it.deadline ? ` • ${new Date(it.deadline).toDateString()}` : ""}
                </div>
                <div className="mt-2">
                  <Link className="text-sm text-blue-700 hover:underline" to={`/meeting/${it.meetingId}/minutes`}>
                    Open minutes
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-2 py-1 rounded border ${
                    it.status === "done"
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}
                >
                  {it.status}
                </span>
                <button
                  className="px-3 py-2 rounded border hover:bg-gray-50 text-sm"
                  onClick={async () => {
                    const next = it.status === "done" ? "pending" : "done";
                    await API.patch(`/action-items/${it._id}/status`, { status: next });
                    setItems((prev) => prev.map((x) => (x._id === it._id ? { ...x, status: next } : x)));
                  }}
                >
                  Toggle
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-600">No items.</div>
      )}
    </div>
  );

  return (
    <div className="px-4 max-w-5xl mx-auto">
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Action Items</h1>
          <p className="text-gray-600 mt-1">Track tasks created from minutes.</p>
        </div>
        <button className="px-3 py-2 rounded border hover:bg-gray-50" onClick={load}>
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-800">{error}</div>
      ) : null}

      <div className="bg-white shadow rounded p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <select className="border rounded p-2" value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="my">My tasks</option>
            <option value="team">Team tasks</option>
          </select>
          <select className="border rounded p-2" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All status</option>
            <option value="pending">Pending</option>
            <option value="done">Done</option>
          </select>
          <input className="border rounded p-2 md:col-span-2" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search task…" />
        </div>
        <div className="mt-2">
          <button
            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
            onClick={load}
          >
            Apply
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-600">Loading…</div>
      ) : (
        <div className="space-y-4">
          <Section title="Overdue" list={grouped.overdue} />
          <Section title="Due soon (7 days)" list={grouped.dueSoon} />
          <Section title="Later" list={grouped.later} />
          <Section title="No deadline" list={grouped.noDate} />
        </div>
      )}
    </div>
  );
}

