import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { apiClient } from "../api/client";

import CollapsibleSidebar from "../components/map/CollapsibleSidebar";
import MapCanvas from "../components/map/MapCanvas";
import VendorBottomSheet from "../components/map/VendorBottomSheet";

type VendorLite = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
};

type Booth = {
  id: string;
  label: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  vendor?: VendorLite | null;
};

type MapResponse = {
  event: {
    id: string;
    name: string;
    mapImageUrl?: string | null;
    layoutVersion: number;
  };
  booths: Booth[];
};

export default function EventMap() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();

  const [data, setData] = useState<MapResponse | null>(null);
  const [error, setError] = useState<string>("");

  // single source of truth for selection
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!eventId || !token) return;
      try {
        setError("");
        const res = await apiClient.get<MapResponse>(`/events/${eventId}/map`, token);
        setData(res);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load map");
      }
    };
    load();
  }, [eventId, token]);

  const booths = data?.booths ?? [];

  const vendors = useMemo(() => {
    const m = new Map<string, VendorLite>();
    for (const b of booths) {
      if (b.vendor) m.set(b.vendor.id, b.vendor);
    }
    return Array.from(m.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [booths]);

  const selectedBooth = useMemo(() => {
    if (!activeVendorId) return null;
    return booths.find((b) => b.vendor?.id === activeVendorId) ?? null;
  }, [booths, activeVendorId]);

  if (!eventId) return <div className="p-6">Missing eventId</div>;

  return (
    <div className="h-screen w-full flex flex-col">
      {/* top bar */}
      <div className="h-14 flex items-center justify-between px-4 border-b bg-white">
        <div className="font-semibold">{data?.event?.name ?? "Event Map"}</div>

        <button
          className="text-sm text-gray-700 hover:text-black"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>
      </div>

      {error && (
        <div className="px-4 py-2 text-red-600 text-sm border-b bg-red-50">
          {error}
        </div>
      )}

      {/* main layout */}
      <div className="flex flex-1 min-h-0 relative overflow-hidden">
        {/* LEFT */}
        <CollapsibleSidebar
          vendors={vendors}
          activeVendorId={activeVendorId}
          onVendorSelect={(vendorId: string) => setActiveVendorId(vendorId)}
        />

        {/* CENTER */}
        <div className="flex-1 min-w-0">
          {!data ? (
            <div className="p-6">Loading...</div>
          ) : (
            <MapCanvas
              mapImageUrl={data.event.mapImageUrl ?? null}
              booths={booths}
              activeVendorId={activeVendorId}
              onBoothClick={(vendorId) => {
                // IMPORTANT: allow null to clear selection
                setActiveVendorId(vendorId);
              }}
              layoutVersion={data.event.layoutVersion}
            />
          )}
        </div>

        {/* RIGHT (desktop) */}
        <div className="w-[320px] border-l bg-white hidden lg:block">
          <div className="h-full flex flex-col">
            <div className="h-12 px-4 border-b flex items-center justify-between">
              <div className="font-semibold text-sm">Details</div>
              {activeVendorId && (
                <button
                  className="text-xs text-gray-500 hover:text-black"
                  onClick={() => setActiveVendorId(null)}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="p-4 overflow-auto">
              {!activeVendorId ? (
                <div className="text-sm text-gray-600">
                  Select a booth or vendor to see details.
                </div>
              ) : (
                <>
                  <div className="text-sm text-gray-500 mb-2">
                    Booth:{" "}
                    <span className="text-gray-800 font-medium">
                      {selectedBooth?.label ?? "—"}
                    </span>
                  </div>

                  <div className="text-lg font-semibold">
                    {vendors.find((v) => v.id === activeVendorId)?.name ?? "Vendor"}
                  </div>

                  <div className="mt-4 text-sm text-gray-500">
                    Waiting time: <span className="text-gray-800">—</span>
                  </div>

                  <div className="mt-4">
                    <Link
                      to={`/vendor/${activeVendorId}`}
                      className="inline-flex items-center justify-center px-4 py-2 rounded bg-orange-500 text-white text-sm hover:bg-orange-600"
                    >
                      View Menu
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* MOBILE bottom sheet */}
        <div className="lg:hidden">
          <VendorBottomSheet
            vendorId={activeVendorId}
            boothLabel={selectedBooth?.label ?? null}
            token={token}
            onClose={() => setActiveVendorId(null)}
          />
        </div>
      </div>
    </div>
  );
}
