import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import API from "../api/api";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export default function ShareView() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const canEdit = data?.share?.accessType === "edit";

  const editor = useEditor({
    extensions: [StarterKit],
    content: data?.mom?.contentHtml || "<p></p>",
    editable: Boolean(canEdit),
    editorProps: { attributes: { class: "prose max-w-none focus:outline-none" } },
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(data?.mom?.contentHtml || "<p></p>", false);
  }, [editor, data?.mom?.contentHtml]);

  const save = useMemo(() => {
    return async () => {
      if (!canEdit || !token) return;
      setSaving(true);
      try {
        const res = await API.patch(`/share/${token}/minutes`, {
          contentHtml: editor?.getHTML() || "",
        });
        setData(res.data);
      } catch (e) {
        setError(e?.response?.data?.message || "Failed to save.");
      } finally {
        setSaving(false);
      }
    };
  }, [canEdit, token, editor]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await API.get(`/share/${token}`);
        if (cancelled) return;
        setData(res.data);
      } catch (err) {
        if (cancelled) return;
        const msg = err?.response?.data?.message || "Failed to open shared MOM.";
        setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (token) load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-4 flex items-center justify-between gap-4">
        <Link className="text-blue-700 hover:underline" to="/">
          ← Back to meetings
        </Link>
        <span className="text-sm text-gray-500">Public view</span>
      </div>

      {loading ? (
        <div className="bg-white shadow rounded p-4">
          <p className="text-gray-600">Loading…</p>
        </div>
      ) : error ? (
        <div className="bg-white shadow rounded p-4 border border-red-200">
          <p className="text-red-800">{error}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white shadow rounded p-5">
            <h1 className="text-2xl font-bold">
              {data?.meeting?.title || "Minutes of Meeting"}
            </h1>
            <p className="text-gray-600 mt-1">{data?.meeting?.agenda || "—"}</p>
            {data?.meeting?.date ? (
              <p className="text-sm text-gray-400 mt-2">
                {new Date(data.meeting.date).toDateString()}
              </p>
            ) : null}
          </div>

          <div className="bg-white shadow rounded p-5">
            <h2 className="text-xl font-bold mb-3">MOM</h2>
            {data?.mom ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm text-gray-500">
                    {canEdit ? "Editable link" : "View-only link"}
                  </div>
                  {canEdit ? (
                    <button
                      className="px-3 py-2 rounded border hover:bg-gray-50"
                      onClick={save}
                      disabled={saving}
                    >
                      {saving ? "Saving…" : "Save"}
                    </button>
                  ) : null}
                </div>

                <div>
                  <h3 className="font-semibold">Minutes</h3>
                  <div className="mt-2 rounded border p-3">
                    <EditorContent editor={editor} />
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold">Discussion</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {data.mom.discussion || "—"}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold">Decisions</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {data.mom.decisions || "—"}
                  </p>
                </div>

                {Array.isArray(data.mom.attachments) && data.mom.attachments.length ? (
                  <div>
                    <h3 className="font-semibold">Images</h3>
                    <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                      {data.mom.attachments
                        .filter(
                          (a) =>
                            String(a?.mimeType || "").startsWith("image/") && a?.urlPath
                        )
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
                  {Array.isArray(data.mom.actionItems) &&
                  data.mom.actionItems.length ? (
                    <ul className="list-disc pl-5 text-gray-700">
                      {data.mom.actionItems.map((item, idx) => (
                        <li key={idx}>
                          {item?.task || "Task"}{" "}
                          <span className="text-gray-500">
                            ({item?.assignedTo || "Unassigned"})
                          </span>
                          {item?.deadline ? (
                            <span className="text-gray-500">
                              {" "}
                              • {new Date(item.deadline).toDateString()}
                            </span>
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
              <p className="text-gray-700">No MOM found for this meeting.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

