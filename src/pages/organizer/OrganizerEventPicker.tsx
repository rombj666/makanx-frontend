import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../api/client";
import { useAuth } from "../../state/AuthContext";

interface EventLite {
  id: string;
  name: string;
  location: string;
  startTime: string;
  endTime: string;
  mapImageUrl?: string | null;
}

const OrganizerEventPicker: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [events, setEvents] = useState<EventLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Create Modal State
  const [showCreate, setShowCreate] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    description: "",
    startTime: "",
    endTime: "",
  });
  const [createError, setCreateError] = useState("");

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<EventLite[]>("/organizer/events", token);
      setEvents(res);
    } catch (err: any) {
      setError(err.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadEvents();
  }, [token]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    try {
      const res = await apiClient.post<EventLite>(
        "/organizer/events",
        formData,
        token
      );
      // Success -> Navigate to scheduler
      navigate(`/organizer/events/${res.id}`);
    } catch (err: any) {
      setCreateError(err.message || "Failed to create event");
    }
  };

  if (loading) return <div className="p-6">Loading events...</div>;
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Choose an event</h1>
          <button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            + Create Event
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((evt) => (
            <div
              key={evt.id}
              className="bg-white rounded-lg shadow p-6 flex flex-col hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-semibold text-gray-800">
                  {evt.name}
                </h2>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    evt.mapImageUrl
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {evt.mapImageUrl ? "Map Ready" : "No Map"}
                </span>
              </div>

              <div className="text-sm text-gray-600 mb-4 space-y-1">
                <p>📍 {evt.location}</p>
                <p>🕒 {new Date(evt.startTime).toLocaleDateString()}</p>
              </div>

              <div className="mt-auto">
                <button
                  onClick={() => navigate(`/organizer/events/${evt.id}`)}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                >
                  Open Scheduler
                </button>
              </div>
            </div>
          ))}
        </div>

        {events.length === 0 && (
          <div className="text-center text-gray-500 mt-12 p-8 bg-white rounded-lg shadow-sm border border-dashed border-gray-300">
            <p className="mb-4">No events found. Get started by creating one!</p>
            <button
              onClick={() => setShowCreate(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Create Your First Event
            </button>
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Create New Event</h2>
            {createError && (
              <div className="bg-red-50 text-red-600 p-2 rounded mb-4 text-sm">
                {createError}
              </div>
            )}
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Event Name
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 w-full border rounded p-2"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  type="text"
                  required
                  className="mt-1 w-full border rounded p-2"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description (Optional)
                </label>
                <textarea
                  className="mt-1 w-full border rounded p-2"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    className="mt-1 w-full border rounded p-2"
                    value={formData.startTime}
                    onChange={(e) =>
                      setFormData({ ...formData, startTime: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    required
                    className="mt-1 w-full border rounded p-2"
                    value={formData.endTime}
                    onChange={(e) =>
                      setFormData({ ...formData, endTime: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerEventPicker;
