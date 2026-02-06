import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiClient } from "../../api/client";
import { useAuth } from "../../state/AuthContext";
import { toAbsUrl } from "../../utils/url";
import OrganizerMapCanvas from "../../components/organizer/OrganizerMapCanvas";
import VendorPanel from "../../components/organizer/VendorPanel";
import BoothPropertiesPanel from "../../components/organizer/BoothPropertiesPanel";

// Types
type Vendor = {
  id: string;
  name: string;

  // NEW
  category: string;
  priceMin: number;
  priceMax: number;
  description?: string | null;

  avgPrepTime: number;
};

type Booth = {
  id: string;
  label: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  vendor?: { id: string; name: string } | null;
};

type EventData = {
  id: string;
  name: string;
  mapImageUrl?: string | null;
  layoutVersion: number;
  mapWidth?: number | null;
  mapHeight?: number | null;
  mapFileUrl?: string | null;
  mapFileType?: string | null;
};

type EditorResponse = {
  event: EventData;
  booths: Booth[];
  vendors: Vendor[];
};

type SalesResponse = {
  event: {
    id: string;
    name: string;
    totalRevenue: number; // cents
    completedOrders: number;
  };
  vendors: Array<{
    id: string;
    name: string;
    totalRevenue: number; // cents
    completedOrders: number;
  }>;
};

const OrganizerMapScheduler: React.FC = () => {
  const { eventSlug } = useParams<{ eventSlug: string }>();
  console.log("eventSlug param =", eventSlug);
  const navigate = useNavigate();
  const { token } = useAuth();

  const [data, setData] = useState<EditorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);


  const [notification, setNotification] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const [selectedBoothId, setSelectedBoothId] = useState<string | null>(null);
  const [viewCenter, setViewCenter] = useState({ x: 0, y: 0 });

  // Mobile state
  const [showVendorList, setShowVendorList] = useState(false);

  // Sales modal state ✅ (THIS WAS MISSING)
  const [showSales, setShowSales] = useState(false);
  const [salesData, setSalesData] = useState<SalesResponse | null>(null);

  const showNotify = (msg: string, type: "success" | "error" = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const loadData = async () => {
    if (!eventSlug || !token) return;
    try {
      const res = await apiClient.get<EditorResponse>(
        `/organizer/events/${String(eventSlug)}/editor`,
        token
      );
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load event data");
    } finally {
      setLoading(false);
    }
  };

  const fetchSales = async () => {
    if (!eventSlug || !token) return;
    try {
      const res = await apiClient.get<SalesResponse>(
        `/organizer/events/${String(eventSlug)}/sales`,
        token
      );
      setSalesData(res);
      setShowSales(true);
    } catch (err: any) {
      showNotify(err.message || "Failed to load sales", "error");
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventSlug, token]);

  // ---- Local optimistic booth update (prevents UI glitch) ----
  const patchBoothLocal = (
    boothId: string,
    updates: Partial<Booth> & { vendorId?: string | null }
  ) => {
    setData((prev) => {
      if (!prev) return prev;

      const nextBooths = prev.booths.map((b) => {
        if (b.id !== boothId) return b;

        let nextVendor = b.vendor ?? null;

        if ("vendorId" in updates) {
          const vid = updates.vendorId ?? null;
          nextVendor = vid
            ? {
                id: vid,
                name: prev.vendors.find((v) => v.id === vid)?.name ?? "Vendor",
              }
            : null;
        }

        return {
          ...b,
          ...updates,
          vendor: nextVendor,
        };
      });

      return { ...prev, booths: nextBooths };
    });
  };

  // --- Handlers ---

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];

    if (!eventSlug || !token) return;

    const formData = new FormData();
    formData.append("map", file);

    try {
      showNotify("Uploading map...", "success");
      
      // Use apiClient.postForm for multipart upload
      await apiClient.postForm(
        `/organizer/events/${String(eventSlug)}/map-upload`,
        formData,
        token
      );
      
      showNotify("Map uploaded successfully");
      await loadData();
    } catch (err: any) {
      showNotify(err.message || "Failed to upload map", "error");
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddBooth = async () => {
    if (!eventSlug || !token) return;
    try {
      const x = viewCenter.x - 50;
      const y = viewCenter.y - 50;

      await apiClient.post(
        `/organizer/events/${String(eventSlug)}/booths`,
        { label: "New Booth", posX: x, posY: y, width: 100, height: 100 },
        token
      );

      showNotify("Booth created");
      await loadData();
    } catch (err: any) {
      showNotify(err.message || "Failed to create booth", "error");
    }
  };

  const handleUpdateBooth = async (
    boothId: string,
    updates: Partial<Booth> & { vendorId?: string | null }
  ) => {
    if (!token) return;

    // optimistic UI update first (removes glitch)
    patchBoothLocal(boothId, updates);

    try {
      await apiClient.patch(`/organizer/booths/${boothId}`, updates, token);

      // Optional refresh after short delay
      setTimeout(() => {
        loadData();
      }, 300);
    } catch (err: any) {
      showNotify(err.message || "Failed to update booth", "error");
      // rollback by reloading truth
      loadData();
    }
  };

  const handleDeleteBooth = async (boothId: string) => {
    if (!token) return;
    try {
      await apiClient.del(`/organizer/booths/${boothId}`, token);
      showNotify("Booth deleted");
      setSelectedBoothId(null);
      await loadData();
    } catch (err: any) {
      showNotify(err.message || "Failed to delete booth", "error");
    }
  };

  // Vendor handlers
  const handleEditVendor = async (
    id: string,
    vData: {
      name: string;
      category: string;
      priceMin: number;
      priceMax: number;
      description?: string | null;
      avgPrepTime: number;
    }
  ) => {
    if (!token) return;
    try {
      await apiClient.patch(`/organizer/vendors/${id}`, vData, token);
      showNotify("Vendor updated");
      await loadData();
    } catch (err: any) {
      showNotify(err.message || "Failed to update vendor", "error");
    }
  };

  const handleDeleteVendor = async (id: string) => {
    if (!token) return;
    try {
      await apiClient.del(`/organizer/vendors/${id}`, token);
      showNotify("Vendor deleted");
      await loadData();
    } catch (err: any) {
      showNotify(err.message || "Failed to delete vendor", "error");
    }
  };

  // --- Render ---

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center">
        Loading Scheduler...
      </div>
    );
  if (error) return <div className="p-6 text-red-600">Error: {error}</div>;
  if (!data) return null;

  const rawMapUrl = data.event.mapFileUrl ?? data.event.mapImageUrl ?? "";
  const mapUrl = toAbsUrl(rawMapUrl || "") ?? "";
  const hasMap = mapUrl.length > 0;



  const selectedBooth = data.booths.find((b) => b.id === selectedBoothId);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b h-14 flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/organizer")}
            className="text-gray-500 hover:text-black"
          >
            ← Back
          </button>
          <h1 className="font-bold truncate hidden sm:block">
            {data.event.name} Scheduler
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="hidden sm:block px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50"
          >
            {hasMap ? "Replace Map" : "Upload Map"}
          </button>

          <button
            onClick={fetchSales}
            className="px-3 py-1 bg-black text-white rounded text-sm hover:bg-gray-800"
          >
            View Sales
          </button>

          <button
            className="md:hidden px-3 py-1 bg-gray-200 rounded text-sm"
            onClick={() => setShowVendorList(!showVendorList)}
          >
            {showVendorList ? "Hide Vendors" : "Vendors"}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Vendors Panel */}
        <div
          className={`
            absolute inset-y-0 left-0 w-80 bg-white shadow-xl transform transition-transform z-30
            md:relative md:translate-x-0 md:shadow-none
            ${showVendorList ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          <VendorPanel
            vendors={data.vendors}
            onEditVendor={handleEditVendor}
            onDeleteVendor={handleDeleteVendor}
          />
          <button
            className="md:hidden absolute top-2 right-2 text-gray-500"
            onClick={() => setShowVendorList(false)}
          >
            ✕
          </button>
        </div>

        {/* Map */}
        <div className="flex-1 relative bg-gray-200 overflow-hidden">
          {hasMap ? (
            <>
              <OrganizerMapCanvas
                mapImageUrl={mapUrl}
                mapWidth={data.event.mapWidth ?? undefined}
                mapHeight={data.event.mapHeight ?? undefined}
                booths={data.booths}
                selectedBoothId={selectedBoothId}
                onBoothSelect={setSelectedBoothId}
                onBoothUpdate={handleUpdateBooth}
                layoutVersion={data.event.layoutVersion}
                onViewChange={setViewCenter}
              />

              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
                <button
                  onClick={handleAddBooth}
                  className="bg-orange-600 text-white px-4 py-2 rounded-full shadow-lg hover:bg-orange-700 font-bold flex items-center gap-2"
                >
                  <span>+ Add Booth</span>
                </button>
              </div>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <h2 className="text-xl font-bold mb-2">No Map Uploaded</h2>
              <p className="text-gray-600 mb-4">
                Upload a map (PNG, JPG, PDF) to start scheduling.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
              >
                Upload Map File
              </button>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".jpg, .jpeg, .png, .webp, .pdf, image/png, image/jpeg, image/webp, application/pdf"
            onChange={handleFileSelect}
          />


          {selectedBooth && (
            <BoothPropertiesPanel
              booth={selectedBooth}
              vendors={data.vendors}
              onUpdate={handleUpdateBooth}
              onDelete={handleDeleteBooth}
              onClose={() => setSelectedBoothId(null)}
            />
          )}
        </div>
      </div>

      {/* Sales Modal */}
      {showSales && salesData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h2 className="text-xl font-bold">
                Event Sales: {salesData.event.name}
              </h2>
              <button
                onClick={() => setShowSales(false)}
                className="text-gray-500 hover:text-black text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-green-50 p-4 rounded border border-green-200 text-center">
                  <div className="text-gray-600 text-sm uppercase font-bold tracking-wider">
                    Total Revenue
                  </div>
                  <div className="text-3xl font-bold text-green-700">
                    ${(salesData.event.totalRevenue / 100).toFixed(2)}
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded border border-blue-200 text-center">
                  <div className="text-gray-600 text-sm uppercase font-bold tracking-wider">
                    Completed Orders
                  </div>
                  <div className="text-3xl font-bold text-blue-700">
                    {salesData.event.completedOrders}
                  </div>
                </div>
              </div>

              <h3 className="font-bold text-lg mb-4">Vendor Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-100 border-b">
                      <th className="p-3 font-semibold text-gray-700">
                        Vendor
                      </th>
                      <th className="p-3 font-semibold text-gray-700 text-right">
                        Revenue
                      </th>
                      <th className="p-3 font-semibold text-gray-700 text-right">
                        Orders
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesData.vendors.map((v) => (
                      <tr key={v.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{v.name}</td>
                        <td className="p-3 text-right font-mono">
                          ${(v.totalRevenue / 100).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {v.completedOrders}
                        </td>
                      </tr>
                    ))}
                    {salesData.vendors.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="p-8 text-center text-gray-500"
                        >
                          No sales recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {notification && (
        <div
          className={`fixed bottom-4 right-4 px-4 py-2 rounded shadow text-white z-50 ${
            notification.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {notification.msg}
        </div>
      )}
    </div>
  );
};

export default OrganizerMapScheduler;
