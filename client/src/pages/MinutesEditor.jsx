import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import API from "../api/api";
import { participantsToLabels } from "../utils/participants";

const emptyItem = () => ({ task: "", assignedTo: "", deadline: "", status: "pending" });

export default function MinutesEditor() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState(null);
  const [mom, setMom] = useState(null);
  const [tab, setTab] = useState("actionItems");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionItems, setActionItems] = useState([emptyItem()]);
  const [decisions, setDecisions] = useState("");
  const [attendees, setAttendees] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: "<p>Loading…</p>",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose max-w-none focus:outline-none min-h-[60vh] px-4 py-3",
      },
    },
  });

  const title = meeting?.title || "Minutes";
  const savePayload = useMemo(() => {
    return () => ({
      contentHtml: editor?.getHTML() || "",
      decisions,
      attendees,
      actionItems: actionItems
        .map((i) => ({
          task: i.task?.trim() || "",
          assignedTo: i.assignedTo?.trim() || "",
          deadline: i.deadline || undefined,
          status: i.status === "done" ? "done" : "pending",
        }))
        .filter((i) => i.task || i.assignedTo || i.deadline),
      attachmentIds: attachments.map((a) => a._id).filter(Boolean),
    });
  }, [editor, decisions, attendees, actionItems, attachments]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!id) return;
      setError("");
      try {
        const res = await API.get(`/meeting/${id}/minutes`);
        if (cancelled) return;
        setMeeting(res.data?.meeting || null);
        setMom(res.data?.mom || null);

        const existing = res.data?.mom;
        if (editor) {
          editor.commands.setContent(existing?.contentHtml || "<p></p>", false);
        }
        setDecisions(existing?.decisions || "");
        setAttachments(Array.isArray(existing?.attachments) ? existing.attachments : []);

        const derivedAttendees = Array.isArray(existing?.attendees) && existing.attendees.length
          ? existing.attendees
          : participantsToLabels(res.data?.meeting?.participants);
        setAttendees(derivedAttendees);

        setActionItems(
          Array.isArray(existing?.actionItems) && existing.actionItems.length
            ? existing.actionItems.map((x) => ({
                task: x.task || "",
                assignedTo: x.assignedTo || "",
                deadline: x.deadline ? String(x.deadline).slice(0, 10) : "",
                status: x.status || "pending",
              }))
            : [emptyItem()]
        );
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || "Failed to load minutes.");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, editor]);

  useEffect(() => {
    if (!id || !editor) return;
    let t = null;
    const onUpdate = () => {
      clearTimeout(t);
      t = setTimeout(async () => {
        try {
          setSaving(true);
          await API.put(`/meeting/${id}/minutes`, savePayload());
        } catch {
          // ignore autosave errors (shown on manual actions)
        } finally {
          setSaving(false);
        }
      }, 800);
    };
    editor.on("update", onUpdate);
    return () => {
      editor.off("update", onUpdate);
      clearTimeout(t);
    };
  }, [id, editor, savePayload]);

  const manualSave = async () => {
    if (!id) return;
    setSaving(true);
    setError("");
    try {
      const res = await API.put(`/meeting/${id}/minutes`, savePayload());
      setMom(res.data?.mom || null);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!id) return;
    setSaving(true);
    setError("");
    try {
      const res = await API.put(`/meeting/${id}/minutes`, { ...savePayload(), docStatus: "published" });
      setMom(res.data?.mom || null);
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to publish.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-4 flex items-center justify-between gap-4">
        <Link className="text-blue-700 hover:underline" to={`/meeting/${id}`}>
          ← Back to meeting
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {mom?.docStatus === "published" ? "Published" : "Draft"}
          </span>
          <button className="px-3 py-2 rounded border hover:bg-gray-50" onClick={manualSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button className="px-3 py-2 rounded bg-gray-900 text-white hover:bg-gray-800" onClick={publish} disabled={saving}>
            Publish
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-red-800">{error}</div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 bg-white shadow rounded border">
          <div className="border-b px-4 py-3 flex items-center justify-between">
            <div>
              <div className="font-bold">{title}</div>
              <div className="text-xs text-gray-500">
                Autosave {saving ? "…" : "ready"}
              </div>
            </div>
            <div className="text-xs text-gray-500">
              {meeting?.date ? new Date(meeting.date).toDateString() : ""}
            </div>
          </div>
          <EditorContent editor={editor} />
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white shadow rounded border p-3">
            <div className="flex flex-wrap gap-2">
              {[
                { id: "actionItems", label: "Action items" },
                { id: "decisions", label: "Decisions" },
                { id: "attendees", label: "Attendees" },
                { id: "attachments", label: "Attachments" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`px-3 py-2 rounded border text-sm ${
                    tab === t.id ? "bg-gray-900 text-white border-gray-900" : "hover:bg-gray-50"
                  }`}
                  onClick={() => setTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {tab === "actionItems" ? (
            <div className="bg-white shadow rounded border p-4">
              <div className="font-semibold mb-3">Action Items</div>
              <div className="space-y-3">
                {actionItems.map((item, idx) => (
                  <div key={idx} className="border rounded p-3">
                    <input
                      className="w-full border rounded p-2 mb-2"
                      placeholder="Task"
                      value={item.task}
                      onChange={(e) =>
                        setActionItems((p) => p.map((x, i) => (i === idx ? { ...x, task: e.target.value } : x)))
                      }
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        className="w-full border rounded p-2"
                        placeholder="Assigned to (email/name)"
                        value={item.assignedTo}
                        onChange={(e) =>
                          setActionItems((p) => p.map((x, i) => (i === idx ? { ...x, assignedTo: e.target.value } : x)))
                        }
                      />
                      <input
                        type="date"
                        className="w-full border rounded p-2"
                        value={item.deadline}
                        onChange={(e) =>
                          setActionItems((p) => p.map((x, i) => (i === idx ? { ...x, deadline: e.target.value } : x)))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-2">
                      <select
                        className="border rounded p-2 text-sm"
                        value={item.status}
                        onChange={(e) =>
                          setActionItems((p) => p.map((x, i) => (i === idx ? { ...x, status: e.target.value } : x)))
                        }
                      >
                        <option value="pending">pending</option>
                        <option value="done">done</option>
                      </select>
                      <button
                        type="button"
                        className="px-3 py-2 rounded border hover:bg-gray-50 text-sm"
                        onClick={() => setActionItems((p) => p.filter((_, i) => i !== idx))}
                        disabled={actionItems.length === 1}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
                  onClick={() => setActionItems((p) => [...p, emptyItem()])}
                >
                  + Add item
                </button>
              </div>
            </div>
          ) : tab === "decisions" ? (
            <div className="bg-white shadow rounded border p-4">
              <div className="font-semibold mb-2">Decisions</div>
              <textarea
                className="w-full border rounded p-2 min-h-40"
                value={decisions}
                onChange={(e) => setDecisions(e.target.value)}
                placeholder="Decisions made…"
              />
            </div>
          ) : tab === "attendees" ? (
            <div className="bg-white shadow rounded border p-4">
              <div className="font-semibold mb-2">Attendees</div>
              <div className="text-xs text-gray-500 mb-2">Auto-filled from meeting participants. Edit if needed.</div>
              <textarea
                className="w-full border rounded p-2 min-h-32"
                value={attendees.join(", ")}
                onChange={(e) =>
                  setAttendees(
                    e.target.value
                      .split(",")
                      .map((x) => x.trim())
                      .filter(Boolean)
                  )
                }
              />
            </div>
          ) : (
            <div className="bg-white shadow rounded border p-4">
              <div className="font-semibold mb-2">Attachments</div>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
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
                      const res = await API.post("/attachments", fd);
                      if (res.data?._id) uploaded.push(res.data);
                    }
                    setAttachments((prev) => [...uploaded, ...prev]);
                    e.target.value = "";
                    await manualSave();
                  } catch (err) {
                    setError(err?.response?.data?.message || "Failed to upload.");
                  } finally {
                    setUploading(false);
                  }
                }}
              />
              <div className="mt-3 grid grid-cols-2 gap-2">
                {attachments
                  .filter((a) => String(a?.mimeType || "").startsWith("image/") && a?.urlPath)
                  .map((a) => (
                    <a
                      key={a._id}
                      href={`${API.defaults.baseURL}${a.urlPath}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block border rounded overflow-hidden hover:shadow transition"
                    >
                      <img
                        src={`${API.defaults.baseURL}${a.urlPath}`}
                        alt={a.originalName || "image"}
                        className="w-full h-24 object-cover"
                      />
                    </a>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

