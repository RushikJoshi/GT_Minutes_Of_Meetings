import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../api/api";
import { useAuth } from "../hooks/useAuth";
import { participantsToLabels } from "../utils/participants";

export default function MeetingDetails() {
  const { id } = useParams();
  const { token } = useAuth();
  const [meeting, setMeeting] = useState(null);
  const [mom, setMom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shareLink, setShareLink] = useState("");
  const [sharing, setSharing] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [tab, setTab] = useState("agenda");
  const [agendaDraft, setAgendaDraft] = useState([]);
  const [savingAgenda, setSavingAgenda] = useState(false);

  const pdfUrl = useMemo(() => {
    if (!id) return "";
    return `http://localhost:5000/generate-pdf/${id}`;
  }, [id]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!id) return;
      setLoading(true);
      setError("");

      try {
        const [meetingRes, momRes] = await Promise.all([
          API.get(`/meeting/${id}`),
          API.get(`/mom/${id}`),
        ]);

        if (cancelled) return;

        setMeeting(meetingRes.data ?? null);
        setMom(momRes.data ?? null);
        setAgendaDraft(Array.isArray(meetingRes.data?.agendaItems) ? meetingRes.data.agendaItems : []);
      } catch (e) {
        if (cancelled) return;
        setError("Failed to load meeting details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // 🔥 PDF DOWNLOAD FUNCTION (FIX)
  const downloadPDF = async () => {
    try {
      const res = await fetch(pdfUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `${meeting?.title || "meeting"}.pdf`; // dynamic name
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.log(err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <p className="text-gray-600">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-4">
          <Link className="text-blue-700 hover:underline" to="/">
            ← Back to meetings
          </Link>
        </div>
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-4">
          <Link className="text-blue-700 hover:underline" to="/">
            ← Back to meetings
          </Link>
        </div>
        <p className="text-gray-700">Meeting not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-4 flex items-center justify-between gap-4">
        <Link className="text-blue-700 hover:underline" to="/meetings">
          ← Back to meetings
        </Link>

        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded border hover:bg-gray-50 transition disabled:opacity-60"
            disabled={updatingStatus || meeting.status === "completed"}
            onClick={async () => {
              if (!id) return;
              setUpdatingStatus(true);
              try {
                const res = await API.patch(`/meeting/${id}/status`, {
                  status: "completed",
                });
                setMeeting(res.data);
              } catch (e) {
                setError(e?.response?.data?.message || "Failed to update status.");
              } finally {
                setUpdatingStatus(false);
              }
            }}
          >
            {meeting.status === "completed"
              ? "Completed"
              : updatingStatus
              ? "Marking…"
              : "Mark completed"}
          </button>
          <Link
            className="px-3 py-2 rounded border hover:bg-gray-50 transition disabled:opacity-60"
            to={`/meeting/${id}/create-mom`}
            onClick={(e) => {
              if (meeting.status !== "completed") e.preventDefault();
            }}
          >
            Create MOM
          </Link>
          <Link
            className="px-3 py-2 rounded border hover:bg-gray-50 transition"
            to={`/meeting/${id}/minutes`}
          >
            Open Minutes Doc
          </Link>
          <button
            onClick={downloadPDF}
            className="bg-gray-900 text-white px-3 py-2 rounded hover:bg-gray-800 transition"
          >
            Download PDF
          </button>
        </div>
      </div>

      {/* 🔥 MEETING INFO */}
      <div className="bg-white p-4 shadow rounded">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{meeting.title}</h1>
            <p className="text-gray-600 mt-1">{meeting.agenda}</p>
          </div>
          <span
            className={`text-xs px-2 py-1 rounded border ${
              meeting.status === "completed"
                ? "bg-green-50 border-green-200 text-green-800"
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}
          >
            {meeting.status || "scheduled"}
          </span>
        </div>
        {meeting.date && (
          <p className="text-sm text-gray-400 mt-2">
            {new Date(meeting.date).toDateString()}
            {meeting.startTime || meeting.endTime
              ? ` • ${[meeting.startTime, meeting.endTime].filter(Boolean).join(" – ")}`
              : ""}
          </p>
        )}
        {Array.isArray(meeting.participants) && meeting.participants.length ? (
          <p className="text-sm text-gray-500 mt-2">
            Participants: {participantsToLabels(meeting.participants).join(", ")}
          </p>
        ) : null}
      </div>

      {/* Hub tabs */}
      <div className="bg-white p-4 shadow rounded mt-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { id: "agenda", label: "Agenda" },
            { id: "participants", label: "Participants" },
            { id: "attachments", label: "Attachments" },
            { id: "history", label: "History" },
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

        {tab === "agenda" ? (
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="font-semibold">Agenda builder</div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="px-3 py-2 rounded border hover:bg-gray-50 text-sm"
                  onClick={() =>
                    setAgendaDraft((prev) => [...prev, { title: "", owner: "", notes: "" }])
                  }
                >
                  + Item
                </button>
                <button
                  type="button"
                  className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-60"
                  disabled={savingAgenda}
                  onClick={async () => {
                    if (!id) return;
                    setSavingAgenda(true);
                    setError("");
                    try {
                      const res = await API.put(`/meeting/${id}/agenda`, {
                        agendaItems: agendaDraft,
                      });
                      setMeeting(res.data);
                      setAgendaDraft(Array.isArray(res.data?.agendaItems) ? res.data.agendaItems : []);
                    } catch (e) {
                      setError(e?.response?.data?.message || "Failed to save agenda.");
                    } finally {
                      setSavingAgenda(false);
                    }
                  }}
                >
                  {savingAgenda ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            {agendaDraft.length ? (
              <div className="space-y-3">
                {agendaDraft.map((it, idx) => (
                  <div key={idx} className="border rounded p-3">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                      <div className="md:col-span-6">
                        <div className="text-xs text-gray-500 mb-1">Title</div>
                        <input
                          className="w-full border rounded p-2"
                          value={it.title || ""}
                          onChange={(e) =>
                            setAgendaDraft((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x))
                            )
                          }
                        />
                      </div>
                      <div className="md:col-span-4">
                        <div className="text-xs text-gray-500 mb-1">Owner</div>
                        <input
                          className="w-full border rounded p-2"
                          value={it.owner || ""}
                          onChange={(e) =>
                            setAgendaDraft((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, owner: e.target.value } : x))
                            )
                          }
                        />
                      </div>
                      <div className="md:col-span-2 flex items-end gap-2">
                        <button
                          type="button"
                          className="px-3 py-2 rounded border hover:bg-gray-50 text-sm disabled:opacity-40"
                          disabled={idx === 0}
                          onClick={() =>
                            setAgendaDraft((prev) => {
                              const copy = [...prev];
                              const tmp = copy[idx - 1];
                              copy[idx - 1] = copy[idx];
                              copy[idx] = tmp;
                              return copy;
                            })
                          }
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="px-3 py-2 rounded border hover:bg-gray-50 text-sm disabled:opacity-40"
                          disabled={idx === agendaDraft.length - 1}
                          onClick={() =>
                            setAgendaDraft((prev) => {
                              const copy = [...prev];
                              const tmp = copy[idx + 1];
                              copy[idx + 1] = copy[idx];
                              copy[idx] = tmp;
                              return copy;
                            })
                          }
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="px-3 py-2 rounded border hover:bg-gray-50 text-sm"
                          onClick={() => setAgendaDraft((prev) => prev.filter((_, i) => i !== idx))}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="text-xs text-gray-500 mb-1">Notes</div>
                      <textarea
                        className="w-full border rounded p-2 min-h-20"
                        value={it.notes || ""}
                        onChange={(e) =>
                          setAgendaDraft((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, notes: e.target.value } : x))
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-600">No agenda items yet.</div>
            )}
          </div>
        ) : tab === "participants" ? (
          <div className="text-sm text-gray-700">
            {participantsToLabels(meeting.participants).length
              ? participantsToLabels(meeting.participants).join(", ")
              : "No participants."}
          </div>
        ) : tab === "attachments" ? (
          <div className="text-sm text-gray-600">Attachments panel will show meeting docs.</div>
        ) : (
          <div className="text-sm text-gray-600">History panel will show edits/activity.</div>
        )}
      </div>

      {/* 🔥 MOM DISPLAY */}
      <div className="bg-white p-4 shadow rounded mt-6">
        <div className="flex items-center justify-between gap-4 mb-3">
          <h2 className="text-xl font-bold">Minutes of Meeting</h2>
          <button
            className="px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-60"
            disabled={sharing}
            onClick={async () => {
              if (!id) return;
              setSharing(true);
              setShareLink("");
              try {
                const res = await API.post("/share", {
                  meetingId: id,
                  accessType: "view",
                });
                const token = res?.data?.token || "";
                const clientBase = window.location.origin;
                setShareLink(
                  token ? `${clientBase}/share/${token}` : res?.data?.link || ""
                );
              } catch (e) {
                setShareLink("Failed to generate share link.");
              } finally {
                setSharing(false);
              }
            }}
          >
            {sharing ? "Generating…" : "Generate Share Link"}
          </button>
        </div>

        {shareLink ? (
          <div className="mb-4 rounded border bg-gray-50 p-3">
            <div className="text-sm text-gray-600 mb-1">Share link</div>
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <input
                readOnly
                className="w-full border rounded p-2 bg-white"
                value={shareLink}
                onFocus={(e) => e.target.select()}
              />
              <button
                className="px-3 py-2 rounded border hover:bg-white transition"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareLink);
                  } catch {
                    // ignore
                  }
                }}
              >
                Copy
              </button>
            </div>
          </div>
        ) : null}

        {meeting.status !== "completed" ? (
          <div className="rounded border border-amber-200 bg-amber-50 p-3 text-amber-900 mb-4">
            MOM can be created only after the meeting is marked <b>completed</b>.
          </div>
        ) : null}

        {mom ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold">Summary</h3>
              <p className="text-gray-700 whitespace-pre-wrap">
                {mom.summary || "—"}
              </p>
            </div>

            <div>
              <h3 className="font-semibold">Discussion</h3>
              <p className="text-gray-700 whitespace-pre-wrap">
                {mom.discussion || "—"}
              </p>
            </div>

            <div>
              <h3 className="font-semibold">Decisions</h3>
              <p className="text-gray-700 whitespace-pre-wrap">
                {mom.decisions || "—"}
              </p>
            </div>

            {Array.isArray(mom.attachments) && mom.attachments.length ? (
              <div>
                <h3 className="font-semibold">Images</h3>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {mom.attachments
                    .filter((a) => String(a?.mimeType || "").startsWith("image/") && a?.urlPath)
                    .map((a) => (
                      <a
                        key={a._id}
                        href={`${API.defaults.baseURL}${a.urlPath}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block border rounded overflow-hidden bg-white hover:shadow transition"
                        title={a.originalName || "image"}
                      >
                        <img
                          src={`${API.defaults.baseURL}${a.urlPath}`}
                          alt={a.originalName || "image"}
                          className="w-full h-32 object-cover"
                        />
                        <div className="p-2 border-t text-xs text-gray-600 truncate">
                          {a.originalName || "image"}
                        </div>
                      </a>
                    ))}
                </div>
              </div>
            ) : null}

            <div>
              <h3 className="font-semibold">Action Items</h3>
              {Array.isArray(mom.actionItems) && mom.actionItems.length ? (
                <ul className="list-disc pl-5 text-gray-700">
                  {mom.actionItems.map((item, idx) => (
                    <li key={idx}>
                      {item?.task || "Task"}{" "}
                      <span className="text-gray-500">
                        ({item?.assignedTo || "Unassigned"})
                      </span>
                      {item?.status ? (
                        <span className="text-gray-500"> • {item.status}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-700">—</p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-gray-700">
            <p>No MOM found for this meeting yet.</p>
            <div className="mt-3">
              <Link
                className="inline-block px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 transition"
                to={`/meeting/${id}/create-mom`}
                onClick={(e) => {
                  if (meeting.status !== "completed") e.preventDefault();
                }}
              >
                Create MOM
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}