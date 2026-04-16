import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import API from "../api/api";
import { participantsToLabels } from "../utils/participants";

const emptyItem = () => ({
  task: "",
  assignedTo: "",
  deadline: "",
  status: "pending",
});

export default function CreateMom() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState(null);
  const [meetingLoading, setMeetingLoading] = useState(true);
  const [discussion, setDiscussion] = useState("");
  const [decisions, setDecisions] = useState("");
  const [summary, setSummary] = useState("");
  const [attendees, setAttendees] = useState("");
  const [actionItems, setActionItems] = useState([emptyItem()]);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadMeeting() {
      if (!id) return;
      setMeetingLoading(true);
      try {
        const res = await API.get(`/meeting/${id}`);
        if (!cancelled) {
          const m = res.data || null;
          setMeeting(m);
          if (!attendees.trim() && m?.participants?.length) {
            setAttendees(participantsToLabels(m.participants).join(", "));
          }
        }
      } catch (e) {
        if (!cancelled) setError("Failed to load meeting.");
      } finally {
        if (!cancelled) setMeetingLoading(false);
      }
    }
    loadMeeting();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const canSubmit = useMemo(() => {
    return Boolean(id) && !saving && meeting?.status === "completed";
  }, [id, saving, meeting?.status]);

  const updateItem = (idx, patch) => {
    setActionItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    );
  };

  const addItem = () => setActionItems((prev) => [...prev, emptyItem()]);
  const removeItem = (idx) =>
    setActionItems((prev) => prev.filter((_, i) => i !== idx));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSaving(true);
    setError("");

    const normalizedItems = actionItems
      .map((i) => ({
        task: i.task?.trim() || "",
        assignedTo: i.assignedTo?.trim() || "",
        deadline: i.deadline || undefined,
        status: i.status === "done" ? "done" : "pending",
      }))
      .filter((i) => i.task || i.assignedTo || i.deadline);

    try {
      const attendeesList = attendees.trim()
        ? attendees
            .split(",")
            .map((a) => a.trim())
            .filter(Boolean)
        : undefined;

      await API.post("/create-mom", {
        meetingId: id,
        summary,
        discussion,
        decisions,
        ...(attendeesList ? { attendees: attendeesList } : {}),
        actionItems: normalizedItems,
        attachmentIds: attachments.map((a) => a._id).filter(Boolean),
      });
      navigate(`/meeting/${id}`);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to create MOM.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-4">
        <Link className="text-blue-700 hover:underline" to={`/meeting/${id}`}>
          ← Back to meeting
        </Link>
      </div>

      <div className="bg-white shadow rounded p-5">
        <h1 className="text-2xl font-bold mb-4">Create MOM</h1>

        {error ? (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-800">
            {error}
          </div>
        ) : null}

        {meetingLoading ? (
          <div className="mb-4 rounded border bg-gray-50 p-3 text-gray-700">
            Loading meeting…
          </div>
        ) : meeting && meeting.status !== "completed" ? (
          <div className="mb-4 rounded border border-amber-200 bg-amber-50 p-3 text-amber-900">
            You can create a MOM only after the meeting is marked <b>completed</b>.
          </div>
        ) : null}

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-1">Summary</label>
            <textarea
              className="w-full border rounded p-2 min-h-20"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="1–3 sentence summary…"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Attendees (comma separated)
            </label>
            <input
              className="w-full border rounded p-2"
              value={attendees}
              onChange={(e) => setAttendees(e.target.value)}
              placeholder="e.g., Alice, Bob, Charlie"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Images (optional)</label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={!id || uploading}
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (!files.length || !id) return;
                  setUploading(true);
                  setError("");
                  try {
                    const uploaded = [];
                    for (const f of files) {
                      const fd = new FormData();
                      fd.append("file", f);
                      fd.append("entityType", "mom");
                      fd.append("entityId", id);
                      // axios will set correct multipart boundary
                      const res = await API.post("/attachments", fd);
                      if (res.data?._id) uploaded.push(res.data);
                    }
                    setAttachments((prev) => [...uploaded, ...prev]);
                    e.target.value = "";
                  } catch (err) {
                    setError(err?.response?.data?.message || "Failed to upload image.");
                  } finally {
                    setUploading(false);
                  }
                }}
              />
              {uploading ? <span className="text-sm text-gray-500">Uploading…</span> : null}
            </div>

            {attachments.length ? (
              <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                {attachments.map((a) => (
                  <div key={a._id} className="border rounded overflow-hidden bg-white">
                    {String(a.mimeType || "").startsWith("image/") ? (
                      <img
                        src={`${API.defaults.baseURL}${a.urlPath}`}
                        alt={a.originalName || "image"}
                        className="w-full h-32 object-cover"
                      />
                    ) : (
                      <div className="p-3 text-sm text-gray-700">File</div>
                    )}
                    <div className="p-2 border-t flex items-center justify-between gap-2">
                      <div className="text-xs text-gray-600 truncate">
                        {a.originalName || "image"}
                      </div>
                      <button
                        type="button"
                        className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                        onClick={() =>
                          setAttachments((prev) => prev.filter((x) => x._id !== a._id))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500 mt-2">No images uploaded.</div>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Discussion
            </label>
            <textarea
              className="w-full border rounded p-2 min-h-28"
              value={discussion}
              onChange={(e) => setDiscussion(e.target.value)}
              placeholder="Key discussion points…"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Decisions</label>
            <textarea
              className="w-full border rounded p-2 min-h-28"
              value={decisions}
              onChange={(e) => setDecisions(e.target.value)}
              placeholder="Decisions made…"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-4 mb-2">
              <label className="block text-sm font-semibold">Action Items</label>
              <button
                type="button"
                onClick={addItem}
                className="px-3 py-2 rounded bg-gray-900 text-white hover:bg-gray-800 transition"
              >
                Add item
              </button>
            </div>

            <div className="space-y-3">
              {actionItems.map((item, idx) => (
                <div
                  key={idx}
                  className="border rounded p-3 grid grid-cols-1 md:grid-cols-12 gap-3"
                >
                  <div className="md:col-span-5">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Task
                    </label>
                    <input
                      className="w-full border rounded p-2"
                      value={item.task}
                      onChange={(e) => updateItem(idx, { task: e.target.value })}
                      placeholder="e.g., Send minutes to stakeholders"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Assigned To
                    </label>
                    <input
                      className="w-full border rounded p-2"
                      value={item.assignedTo}
                      onChange={(e) =>
                        updateItem(idx, { assignedTo: e.target.value })
                      }
                      placeholder="Name"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Deadline
                    </label>
                    <input
                      type="date"
                      className="w-full border rounded p-2"
                      value={item.deadline}
                      onChange={(e) =>
                        updateItem(idx, { deadline: e.target.value })
                      }
                    />
                  </div>

                  <div className="md:col-span-2 flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Status
                      </label>
                      <select
                        className="w-full border rounded p-2"
                        value={item.status}
                        onChange={(e) =>
                          updateItem(idx, { status: e.target.value })
                        }
                      >
                        <option value="pending">pending</option>
                        <option value="done">done</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      className="px-3 py-2 rounded border hover:bg-gray-50 transition"
                      onClick={() => removeItem(idx)}
                      disabled={actionItems.length === 1}
                      title={
                        actionItems.length === 1
                          ? "At least one item row is required"
                          : "Remove item"
                      }
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3">
            <Link
              className="px-4 py-2 rounded border hover:bg-gray-50 transition"
              to={`/meeting/${id}`}
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-60"
            >
              {saving ? "Saving…" : "Create MOM"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

