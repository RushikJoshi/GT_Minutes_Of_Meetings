import { useEffect, useMemo, useRef, useState } from "react";
import API from "../api/api";

function isEmailLike(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function uniqByKey(list, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export default function ParticipantPicker({
  value,
  onChange,
  label = "Participants",
  placeholder = "Type email or search users…",
}) {
  const participants = Array.isArray(value) ? value : [];
  const setParticipants = (next) => onChange?.(next);

  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const abortRef = useRef(null);

  const normalizedParticipants = useMemo(() => {
    return uniqByKey(participants, (p) =>
      p?.kind === "user" && p?.userId ? `u:${p.userId}` : p?.email ? `e:${p.email}` : ""
    );
  }, [participants]);

  useEffect(() => {
    setParticipants(normalizedParticipants);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedParticipants.length]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setOpen(true);
    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const t = setTimeout(async () => {
      try {
        const res = await API.get("/users", {
          params: { q, limit: 8 },
          signal: controller.signal,
        });
        setSuggestions(Array.isArray(res.data) ? res.data : []);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  const addExternalFromText = () => {
    const q = query.trim();
    if (!q) return;
    if (!isEmailLike(q)) return;
    setParticipants([
      ...participants,
      { kind: "external", email: q.toLowerCase(), name: "", role: "viewer" },
    ]);
    setQuery("");
    setOpen(false);
  };

  const addUser = (u) => {
    if (!u?._id || !u?.email) return;
    setParticipants([
      ...participants,
      { kind: "user", userId: u._id, email: u.email, name: u.name || "", role: "viewer" },
    ]);
    setQuery("");
    setSuggestions([]);
    setOpen(false);
  };

  const removeAt = (idx) => {
    setParticipants(participants.filter((_, i) => i !== idx));
  };

  return (
    <div className="relative">
      <label className="block text-sm font-semibold mb-1">{label}</label>

      <div className="border rounded p-2 bg-white">
        <div className="flex flex-wrap gap-2 mb-2">
          {participants.length ? (
            participants.map((p, idx) => {
              const text = p?.name
                ? `${p.name}${p.email ? ` <${p.email}>` : ""}`
                : p?.email || "participant";
              return (
                <span
                  key={`${p?.kind || "p"}-${p?.userId || p?.email || idx}`}
                  className="inline-flex items-center gap-2 rounded-full border bg-gray-50 px-3 py-1 text-sm"
                >
                  <span className="truncate max-w-[220px]">{text}</span>
                  <button
                    type="button"
                    className="text-gray-500 hover:text-gray-900"
                    onClick={() => removeAt(idx)}
                    aria-label="Remove participant"
                  >
                    ×
                  </button>
                </span>
              );
            })
          ) : (
            <span className="text-sm text-gray-500">No participants added</span>
          )}
        </div>

        <div className="flex gap-2">
          <input
            className="flex-1 outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
          />
          <button
            type="button"
            onClick={addExternalFromText}
            disabled={!isEmailLike(query.trim())}
            className="px-3 py-2 rounded bg-gray-900 text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>

      {open && (loading || suggestions.length) ? (
        <div className="absolute z-10 mt-2 w-full rounded border bg-white shadow">
          <div className="p-2 text-xs text-gray-500">
            {loading ? "Searching…" : "Select a user"}
          </div>
          {suggestions.map((u) => (
            <button
              key={u._id}
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-gray-50"
              onClick={() => addUser(u)}
            >
              <div className="text-sm font-medium">{u.name || u.email}</div>
              <div className="text-xs text-gray-500">{u.email}</div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

