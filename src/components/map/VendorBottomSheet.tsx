import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiClient } from "../../api/client";

export type VendorFull = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
};

interface VendorBottomSheetProps {
  vendorId: string | null;
  boothLabel: string | null;
  token: string | null;
  onClose: () => void;
}

interface BottomSheetProps {
  isOpen: boolean;
  snapPoints?: number[];
  initialSnap?: number;
  header?: React.ReactNode;
  children?: React.ReactNode;
  onClose?: () => void;
}

type CombinedProps = VendorBottomSheetProps | BottomSheetProps;

export default function VendorBottomSheet(props: CombinedProps) {
  if ("isOpen" in props) {
    if (!props.isOpen) return null;
    return (
      <div
        className="fixed bottom-0 left-0 right-0 bg-white z-30 rounded-t-2xl border-t shadow-[0_-8px_24px_rgba(0,0,0,0.12)]"
        style={{ maxHeight: "80vh" }}
      >
        <div className="w-full flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>
        {props.header && <div className="px-5">{props.header}</div>}
        <div className="px-5 pb-5 overflow-y-auto" style={{ maxHeight: "72vh" }}>
          {props.children}
        </div>
      </div>
    );
  }

  const { vendorId, boothLabel, token, onClose } = props;
  const [vendor, setVendor] = useState<VendorFull | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!vendorId) {
      setVendor(null);
      return;
    }
    if (!token) return;

    const load = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get<VendorFull>(`/vendors/${vendorId}`, token);
        setVendor(res);
      } catch (e) {
        setVendor(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [vendorId, token]);

  if (!vendorId) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white z-30 rounded-t-2xl border-t shadow-[0_-8px_24px_rgba(0,0,0,0.12)]"
      style={{ maxHeight: "80vh" }}
    >
      {/* top handle */}
      <div className="w-full flex justify-center pt-3 pb-2" onClick={onClose}>
        <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
      </div>

      <div className="px-5 pb-5 overflow-y-auto" style={{ maxHeight: "72vh" }}>
        {loading ? (
          <div className="py-6 text-center text-gray-500">Loading...</div>
        ) : !vendor ? (
          <div className="py-6 text-center text-gray-500">
            Vendor details not available.
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-gray-500">
                  Booth: <span className="text-gray-800">{boothLabel ?? "—"}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mt-1">{vendor.name}</h2>
                {vendor.description && (
                  <p className="text-sm text-gray-600 mt-2">{vendor.description}</p>
                )}
              </div>

              <button
                className="text-sm text-gray-500 hover:text-black"
                onClick={onClose}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="mt-4 text-sm text-gray-500">
              Waiting time: <span className="text-gray-900 font-medium">—</span>
            </div>

            <div className="mt-5">
              <Link
                to={`/vendor/${vendor.id}`}
                className="block w-full text-center bg-orange-600 text-white font-semibold py-3 rounded-xl hover:bg-orange-700"
              >
                View Menu & Order
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
