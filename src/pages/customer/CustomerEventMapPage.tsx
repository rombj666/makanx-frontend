import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "../../api/client";
import { toAbsUrl } from "../../utils/url";
import MapCanvas from "../../components/map/MapCanvas";

type Booth = {
  id: string;
  label: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  posXNorm?: number;
  posYNorm?: number;
  widthNorm?: number;
  heightNorm?: number;
  vendor?: { id: string; name: string } | null;
  vendorId?: string | null;
  queueMin?: number;
};

type EventData = {
  id: string;
  name: string;
  mapImageUrl: string | null;
  mapWidth?: number | null;
  mapHeight?: number | null;
  layoutVersion: number;
  booths: Booth[];
};

export default function CustomerEventMapPage() {
  const { eventSlug } = useParams();
  const navigate = useNavigate();
  const { call } = useApi();
  const [event, setEvent] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [waitTimes, setWaitTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!eventSlug) return;

    setLoading(true);
    call<EventData>(`/customer/event/${eventSlug}/map`)
      .then((data) => {
        setEvent(data);
        // Initialize wait times from map data
        const initialWaitTimes: Record<string, number> = {};
        data.booths.forEach((b) => {
          if (b.queueMin !== undefined) initialWaitTimes[b.id] = b.queueMin;
        });
        setWaitTimes(initialWaitTimes);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load event map");
        setLoading(false);
      });
  }, [eventSlug]);

  // Poll booth wait times every 12s
  useEffect(() => {
    if (!event) return;
    let cancelled = false;
    const fetchAll = async () => {
      const boothsWithVendors = event.booths.filter(b => b.vendorId || b.vendor?.id);
      const results: Record<string, number> = {};
      for (const b of boothsWithVendors) {
        try {
          const data = await call<{ boothId: string; activeOrdersCount: number; queueMin: number; updatedAt: string }>(`/customer/booth/${b.id}/wait-time`);
          results[b.id] = data.queueMin || 0;
        } catch {
          // ignore errors per booth
        }
      }
      if (!cancelled) setWaitTimes(results);
    };
    fetchAll();
    const id = setInterval(fetchAll, 12000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [event, call]);

  const handleBoothClick = (vendorId: string | null) => {
    if (!vendorId || !event) return;
    
    // Find booth by vendorId
    const booth = event.booths.find(b => b.vendor?.id === vendorId);
    if (booth) {
      navigate(`/booth/${booth.id}`);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading map...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}</div>;
  if (!event) return <div className="p-8 text-center">Event not found</div>;

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="bg-white shadow px-4 py-3 z-10 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-800">{event.name}</h1>
        <button 
          onClick={() => navigate("/cart")}
          className="bg-orange-500 text-white px-3 py-1 rounded text-sm font-medium"
        >
          Cart
        </button>
      </header>
      
      <div className="flex-1 overflow-hidden relative bg-gray-100">
        <MapCanvas
          mapImageUrl={toAbsUrl(event.mapImageUrl || "")}
          mapWidth={event.mapWidth}
          mapHeight={event.mapHeight}
          booths={event.booths}
          activeVendorId={null}
          layoutVersion={event.layoutVersion}
          viewOnly={true}
          boothWaitMin={waitTimes}
          onBoothClick={handleBoothClick}
        />
      </div>
      
      <div className="bg-white p-2 text-center text-sm text-gray-500 border-t">
        Tap a booth to view menu
      </div>
    </div>
  );
}
