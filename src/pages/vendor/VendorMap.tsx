import React, { useEffect, useState } from "react";
import { useAuth } from "../../state/AuthContext";
import { apiClient } from "../../api/client";
import { toAbsUrl } from "../../utils/url";
import MapCanvas from "../../components/map/MapCanvas";

interface VendorMapResponse {
  event: {
    id: string;
    name: string;
    mapImageUrl: string | null;
    layoutVersion: number;
  };
  booths: any[];
  myBoothId: string | null;
}

const VendorMap: React.FC = () => {
  const { token, user } = useAuth();
  const [data, setData] = useState<VendorMapResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMap = async () => {
      try {
        const res = await apiClient.get<VendorMapResponse>("/vendor/event-map", token);
        setData(res);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMap();
  }, [token]);

  if (loading) return <div className="p-8 text-center">Loading map...</div>;
  if (error) return <div className="p-8 text-center text-red-600">Error: {error}</div>;
  if (!data) return <div className="p-8 text-center">No map data found</div>;

  const { event, booths, myBoothId } = data;

  if (!event.mapImageUrl) {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-300">
        <h3 className="text-xl font-medium text-gray-700 mb-2">Event map not uploaded</h3>
        <p className="text-gray-500">The organizer hasn't uploaded a map for this event yet.</p>
      </div>
    );
  }

  const myVendorId = user?.vendorId || null;
  const isAssigned = !!myBoothId;

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white p-4 border-b flex justify-between items-center shadow-sm z-10">
        <div>
          <h2 className="text-xl font-bold">{event.name}</h2>
          <p className="text-sm text-gray-500">
            {isAssigned ? "Your booth is highlighted below" : "No booth assigned yet — contact organizer"}
          </p>
        </div>
      </div>
      
      <div className="flex-1 relative overflow-hidden bg-gray-100">
        <MapCanvas
          mapImageUrl={toAbsUrl(event.mapImageUrl || "")}
          booths={booths}
          activeVendorId={myVendorId}
          onBoothClick={() => {}}
          layoutVersion={event.layoutVersion}
          viewOnly={true}
        />
      </div>
    </div>
  );
};

export default VendorMap;
