import { useEffect, useState } from "react";
import API from "../api/api";
import { useNavigate } from "react-router-dom";
import ParticipantPicker from "../components/ParticipantPicker";

function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [participants, setParticipants] = useState([]);

  const [form, setForm] = useState({
    title: "",
    agenda: "",
    date: "",
    startTime: "",
    endTime: "",
  });

  const navigate = useNavigate(); // ✅ navigation

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await API.get("/meetings");
      setMeetings(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load meetings.");
    } finally {
      setLoading(false);
    }
  };

  // 🔥 handle input
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 🔥 submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");
      await API.post("/create-meeting", {
        title: form.title,
        agenda: form.agenda,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        participants,
      });

      setForm({
        title: "",
        agenda: "",
        date: "",
        startTime: "",
        endTime: "",
      });
      setParticipants([]);

      fetchMeetings(); // refresh list
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to create meeting.");
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">

      {/* 🔥 FORM */}
      <form onSubmit={handleSubmit} className="bg-white p-4 shadow rounded mb-6">
        <h2 className="text-xl font-bold mb-3">Create Meeting</h2>

        {error ? (
          <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-red-800">
            {error}
          </div>
        ) : null}

        <input
          type="text"
          name="title"
          placeholder="Title"
          value={form.title}
          onChange={handleChange}
          className="w-full mb-2 p-2 border rounded"
          required
        />

        <input
          type="text"
          name="agenda"
          placeholder="Agenda"
          value={form.agenda}
          onChange={handleChange}
          className="w-full mb-2 p-2 border rounded"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="w-full mb-2 p-2 border rounded"
          />
        </div>

        <div className="mb-2">
          <ParticipantPicker value={participants} onChange={setParticipants} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <input
            type="text"
            name="startTime"
            placeholder="Start time (e.g. 10:00 AM)"
            value={form.startTime}
            onChange={handleChange}
            className="w-full mb-2 p-2 border rounded"
          />
          <input
            type="text"
            name="endTime"
            placeholder="End time (e.g. 10:30 AM)"
            value={form.endTime}
            onChange={handleChange}
            className="w-full mb-2 p-2 border rounded"
          />
        </div>

        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Create
        </button>
      </form>

      {/* 🔥 LIST */}
      <h1 className="text-2xl font-bold mb-4">Meetings</h1>

      {loading ? (
        <p className="text-gray-500">Loading…</p>
      ) : meetings.length === 0 ? (
        <p className="text-gray-500">No meetings found</p>
      ) : (
        meetings.map((m) => (
          <div
            key={m._id}
            onClick={() => navigate(`/meeting/${m._id}`)} // ✅ CLICK
            className="bg-white p-4 mb-3 shadow rounded cursor-pointer hover:bg-gray-100 transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{m.title}</h2>
                <p className="text-gray-600">{m.agenda}</p>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded border ${
                  m.status === "completed"
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-amber-50 border-amber-200 text-amber-800"
                }`}
              >
                {m.status || "scheduled"}
              </span>
            </div>
            <p className="text-sm text-gray-400">
              {m.date ? new Date(m.date).toDateString() : "—"}{" "}
              {m.startTime || m.endTime
                ? `• ${[m.startTime, m.endTime].filter(Boolean).join(" – ")}`
                : ""}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

export default Meetings;