import { useEffect, useMemo, useState } from "react";
import API from "../api/api";
import ParticipantPicker from "./ParticipantPicker";

export default function MeetingModal({ open, onClose, onCreated, initialDate }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [msConnected, setMsConnected] = useState(false);
  const [syncToOutlook, setSyncToOutlook] = useState(false);
  const [reminderMinutes, setReminderMinutes] = useState(0);

  const [form, setForm] = useState({
    title: "",
    agenda: "",
    date: initialDate || "",
    startTime: "",
    endTime: "",
  });

  const canSubmit = useMemo(() => {
    return Boolean(form.title.trim()) && !saving;
  }, [form.title, saving]);

  // lazy-load integration status
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await API.get("/integrations/microsoft/status");
        if (!cancelled) setMsConnected(Boolean(res.data?.connected));
      } catch {
        if (!cancelled) setMsConnected(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setForm((p) => ({ ...p, date: initialDate || "" }));
    setSyncToOutlook(false);
    setReminderMinutes(0);
    setError("");
  }, [open, initialDate]);

  if (!open) return null;

  const close = () => {
    if (saving) return;
    setError("");
    onClose?.();
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError("");
    try {
      await API.post("/create-meeting", {
        title: form.title,
        agenda: form.agenda,
        date: form.date || undefined,
        startTime: form.startTime,
        endTime: form.endTime,
        participants,
        syncToOutlook: msConnected && syncToOutlook,
        reminderMinutes,
      });
      onCreated?.();
      close();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create meeting.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded bg-white shadow">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div className="text-lg font-bold">Create meeting</div>
          <button className="px-3 py-2 rounded border hover:bg-gray-50" onClick={close}>
            Close
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-4">
          {error ? (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-red-800">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">Title</label>
              <input
                className="w-full border rounded p-2"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold mb-1">Agenda</label>
              <input
                className="w-full border rounded p-2"
                value={form.agenda}
                onChange={(e) => setForm((p) => ({ ...p, agenda: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Date</label>
              <input
                type="date"
                className="w-full border rounded p-2"
                value={form.date}
                onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Time</label>
              <div className="flex gap-2">
                <input
                  className="w-full border rounded p-2"
                  placeholder="Start"
                  value={form.startTime}
                  onChange={(e) => setForm((p) => ({ ...p, startTime: e.target.value }))}
                />
                <input
                  className="w-full border rounded p-2"
                  placeholder="End"
                  value={form.endTime}
                  onChange={(e) => setForm((p) => ({ ...p, endTime: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <ParticipantPicker value={participants} onChange={setParticipants} />

          <div className="flex items-center justify-between gap-3 rounded border p-3">
            <div>
              <div className="text-sm font-semibold">Reminder</div>
              <div className="text-xs text-gray-500">Creates an in-app notification before the meeting date.</div>
            </div>
            <select
              className="border rounded p-2 text-sm"
              value={reminderMinutes}
              onChange={(e) => setReminderMinutes(Number(e.target.value))}
            >
              <option value={0}>None</option>
              <option value={10}>10 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={1440}>1 day</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-3 rounded border p-3">
            <div>
              <div className="text-sm font-semibold">Sync to Outlook</div>
              <div className="text-xs text-gray-500">
                {msConnected ? "Creates an Outlook calendar event." : "Connect Microsoft 365 in Settings to enable."}
              </div>
            </div>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={syncToOutlook}
                onChange={(e) => setSyncToOutlook(e.target.checked)}
                disabled={!msConnected}
              />
              Enable
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              className="px-4 py-2 rounded border hover:bg-gray-50"
              onClick={close}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              disabled={!canSubmit}
            >
              {saving ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

