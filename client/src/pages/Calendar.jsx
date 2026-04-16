import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api/api";
import MeetingModal from "../components/MeetingModal";
import { participantsToLabels } from "../utils/participants";

function ymd(d) {
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, delta) {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export default function Calendar() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => ymd(new Date()));
  const [status, setStatus] = useState("all");
  const [participantQuery, setParticipantQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const fetchMeetings = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/meetings");
      setMeetings(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to load meetings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const filteredMeetings = useMemo(() => {
    const pq = participantQuery.trim().toLowerCase();
    return meetings.filter((m) => {
      if (status !== "all" && (m.status || "scheduled") !== status) return false;
      if (!pq) return true;
      const labels = participantsToLabels(m.participants).join(" ").toLowerCase();
      return labels.includes(pq);
    });
  }, [meetings, participantQuery, status]);

  const meetingsByDay = useMemo(() => {
    const map = new Map();
    for (const m of filteredMeetings) {
      const key = m?.date ? ymd(m.date) : "no-date";
      map.set(key, (map.get(key) || []).concat(m));
    }
    return map;
  }, [filteredMeetings]);

  const daysGrid = useMemo(() => {
    const first = startOfMonth(month);
    const firstWeekday = first.getDay(); // 0 Sun
    const start = new Date(first);
    start.setDate(first.getDate() - firstWeekday);

    const out = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push(d);
    }
    return out;
  }, [month]);

  const selectedMeetings = useMemo(() => {
    return meetingsByDay.get(selectedDay) || [];
  }, [meetingsByDay, selectedDay]);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-2xl font-bold">Calendar</h1>
          <div className="text-sm text-gray-500">Month view + agenda</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded border hover:bg-gray-50"
            onClick={() => setMonth((m) => addMonths(m, -1))}
          >
            ←
          </button>
          <div className="px-3 py-2 rounded border bg-white min-w-[180px] text-center">
            {month.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </div>
          <button
            className="px-3 py-2 rounded border hover:bg-gray-50"
            onClick={() => setMonth((m) => addMonths(m, 1))}
          >
            →
          </button>
          <button
            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => setCreateOpen(true)}
          >
            New meeting
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="md:col-span-8">
          <div className="bg-white border rounded shadow-sm">
            <div className="grid grid-cols-7 border-b text-xs text-gray-500">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
                <div key={w} className="p-2">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {daysGrid.map((d) => {
                const key = ymd(d);
                const inMonth = d.getMonth() === month.getMonth();
                const count = (meetingsByDay.get(key) || []).length;
                const isSelected = key === selectedDay;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedDay(key)}
                    className={`min-h-[92px] border-t border-r p-2 text-left hover:bg-gray-50 transition ${
                      isSelected ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className={`text-sm font-medium ${inMonth ? "text-gray-900" : "text-gray-400"}`}>
                        {d.getDate()}
                      </div>
                      {count ? (
                        <span className="text-xs rounded-full bg-gray-900 text-white px-2 py-0.5">
                          {count}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 space-y-1">
                      {(meetingsByDay.get(key) || []).slice(0, 2).map((m) => (
                        <div key={m._id} className="text-xs truncate text-gray-700">
                          {m.title}
                        </div>
                      ))}
                      {count > 2 ? (
                        <div className="text-xs text-gray-500">+{count - 2} more</div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error ? (
            <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-red-800">{error}</div>
          ) : null}
        </div>

        <div className="md:col-span-4">
          <div className="bg-white border rounded shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold">Agenda</div>
              <div className="text-xs text-gray-500">{selectedDay}</div>
            </div>

            <div className="grid grid-cols-1 gap-2 mb-3">
              <select
                className="border rounded p-2"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All status</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              <input
                className="border rounded p-2"
                value={participantQuery}
                onChange={(e) => setParticipantQuery(e.target.value)}
                placeholder="Filter by participant…"
              />
            </div>

            {loading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : selectedMeetings.length ? (
              <div className="space-y-2">
                {selectedMeetings.map((m) => (
                  <Link
                    key={m._id}
                    to={`/meeting/${m._id}`}
                    className="block rounded border p-3 hover:bg-gray-50 transition"
                  >
                    <div className="font-semibold text-sm">{m.title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {(m.status || "scheduled").toUpperCase()}
                      {m.startTime || m.endTime
                        ? ` • ${[m.startTime, m.endTime].filter(Boolean).join(" – ")}`
                        : ""}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">No meetings for this day.</div>
            )}
          </div>
        </div>
      </div>

      <MeetingModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {
          fetchMeetings();
        }}
        initialDate={selectedDay}
      />
    </div>
  );
}

