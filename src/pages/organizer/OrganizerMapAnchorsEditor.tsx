import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../api/client";
import { useAuth } from "../../state/AuthContext";
import MapAnchorsCanvas, { MapAnchors } from "../../components/map/MapAnchorsCanvas";
import VendorBottomSheet from "../../components/map/VendorBottomSheet";

export default function OrganizerMapAnchorsEditor() {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  console.log("eventSlug param =", eventSlug);
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [event, setEvent] = useState<any>(null);
  const [anchors, setAnchors] = useState<MapAnchors>({
    entrances: [],
    walkway: [],
    blockedZones: [],
  });
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"ENTRANCE" | "WALKWAY" | "BLOCKED" | "ALLOWED" | null>(null);
  const [notification, setNotification] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (notification) {
        const timer = setTimeout(() => setNotification(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    if (!eventSlug || !token) return;
    
    Promise.all([
        apiClient.get(`/organizer/events/${eventSlug}/editor`, token),
        apiClient.get(`/organizer/events/${eventSlug}/map-anchors`, token)
    ]).then(([editorData, anchorData]: [any, any]) => {
        setEvent(editorData.event);
        if (anchorData.mapAnchorsJson) {
            try {
                const parsed = JSON.parse(anchorData.mapAnchorsJson);
                setAnchors(parsed);
            } catch (e) {
                console.error("Failed to parse anchors", e);
            }
        }
        setLoading(false);
    }).catch(err => {
        console.error(err);
        setLoading(false);
    });
  }, [eventSlug, token]);

  const handleSave = async () => {
      if (!eventSlug || !token) return;
      try {
          await apiClient.put(`/organizer/events/${eventSlug}/map-anchors`, {
              mapAnchorsJson: JSON.stringify(anchors)
          }, token);
          setNotification({ msg: "Saved!", type: "success" });
      } catch (err) {
          setNotification({ msg: "Failed to save", type: "error" });
      }
  };

  if (loading) return <div>Loading...</div>;
  if (!event) return <div>Event not found</div>;

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-gray-900 overflow-hidden">
      {/* Top Bar */}
      <div className="h-14 bg-white shadow z-10 flex items-center justify-between px-4 shrink-0">
          <button onClick={() => navigate(-1)} className="text-sm font-bold">← Back</button>
          <h1 className="font-bold">Map Editor</h1>
          <button onClick={handleSave} className="text-blue-600 font-bold">Save</button>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden">
        {event.mapImageUrl ? (
             <MapAnchorsCanvas 
                mapImageUrl={event.mapImageUrl.startsWith("/") ? `http://localhost:3000${event.mapImageUrl}` : event.mapImageUrl}
                anchors={anchors}
                mode={mode}
                onChange={setAnchors}
             />
        ) : (
            <div className="p-8 text-white text-center">No map uploaded</div>
        )}
      </div>

      {/* Bottom Sheet Controls */}
      <VendorBottomSheet isOpen={true} snapPoints={[25, 50]} initialSnap={0} header={
          <div className="text-center font-bold text-gray-500 text-xs uppercase pt-2">Tools</div>
      }>
          <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setMode("ENTRANCE")}
                className={`p-4 rounded border-2 flex flex-col items-center gap-2 ${mode === "ENTRANCE" ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
              >
                  <span className="text-2xl">🚪</span>
                  <span className="font-bold text-sm">Entrances</span>
              </button>

              <button 
                onClick={() => setMode("WALKWAY")}
                className={`p-4 rounded border-2 flex flex-col items-center gap-2 ${mode === "WALKWAY" ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
              >
                  <span className="text-2xl">🛣️</span>
                  <span className="font-bold text-sm">Walkway</span>
              </button>

              <button 
                onClick={() => setMode("BLOCKED")}
                className={`p-4 rounded border-2 flex flex-col items-center gap-2 ${mode === "BLOCKED" ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
              >
                  <span className="text-2xl">🚫</span>
                  <span className="font-bold text-sm">Blocked Zone</span>
              </button>

              <button 
                onClick={() => setMode("ALLOWED")}
                className={`p-4 rounded border-2 flex flex-col items-center gap-2 ${mode === "ALLOWED" ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
              >
                  <span className="text-2xl">✅</span>
                  <span className="font-bold text-sm">Allowed Area</span>
              </button>
              
              <button 
                onClick={() => setAnchors({ ...anchors, walkway: anchors.walkway.slice(0, -1) })}
                className="p-2 text-blue-500 text-sm font-medium col-span-2 border rounded hover:bg-blue-50"
                disabled={anchors.walkway.length === 0}
              >
                  Undo Last Walkway Point
              </button>

              <button 
                onClick={() => setAnchors({ ...anchors, walkway: [] })}
                className="p-2 text-red-500 text-sm font-medium col-span-2 border rounded hover:bg-red-50"
              >
                  Clear Walkway
              </button>
               <button 
                onClick={() => setAnchors({ ...anchors, blockedZones: [] })}
                className="p-2 text-red-500 text-sm font-medium col-span-2 border rounded hover:bg-red-50"
              >
                  Clear Blocked Zones
              </button>

              <button 
                onClick={() => setAnchors({ ...anchors, allowedArea: undefined })}
                className="p-2 text-red-500 text-sm font-medium col-span-2 border rounded hover:bg-red-50"
              >
                  Clear Allowed Area
              </button>
          </div>

          <div className="mt-4 text-xs text-gray-400 text-center">
              Selected Mode: {mode || "None (View/Move)"}
          </div>
      </VendorBottomSheet>

      {/* Toast */}
      {notification && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded shadow text-white z-50 transition-opacity duration-300 ${
            notification.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {notification.msg}
        </div>
      )}
    </div>
  );
}
