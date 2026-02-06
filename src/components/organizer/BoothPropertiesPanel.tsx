import React, { useEffect, useRef, useState } from "react";

interface Vendor {
  id: string;
  name: string;
}

interface Booth {
  id: string;
  label: string;
  posX: number;
  posY: number;
  width: number;
  height: number;
  vendor?: { id: string; name: string } | null;
}

interface BoothPropertiesPanelProps {
  booth: Booth;
  vendors: Vendor[];
  onUpdate: (
    id: string,
    updates: Partial<Booth> & { vendorId?: string | null }
  ) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  onClose: () => void;
}

export default function BoothPropertiesPanel({
  booth,
  vendors,
  onUpdate,
  onDelete,
  onClose,
}: BoothPropertiesPanelProps) {
  const [label, setLabel] = useState(booth.label);
  const [vendorId, setVendorId] = useState<string>(booth.vendor?.id ?? "");
  const [saving, setSaving] = useState(false);

  // Timer ref for debounce autosave
  const saveTimerRef = useRef<number | null>(null);

  // Keep local inputs in sync when selected booth changes
  useEffect(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setLabel(booth.label);
    setVendorId(booth.vendor?.id ?? "");
  }, [booth.id, booth.label, booth.vendor?.id]);

  // Cleanup timer when component unmounts
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  const scheduleAutoSave = (nextLabel: string, nextVendorId: string) => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);

    saveTimerRef.current = window.setTimeout(async () => {
      setSaving(true);
      try {
        await onUpdate(booth.id, {
          label: nextLabel.trim(),
          vendorId: nextVendorId || null,
        });
      } finally {
        setSaving(false);
      }
    }, 350);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(booth.id, {
        label: label.trim(),
        vendorId: vendorId || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = window.confirm("Delete booth?");
    if (!ok) return;

    setSaving(true);
    try {
      await onDelete(booth.id);
      onClose(); // close panel after delete
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:top-4 md:bottom-auto md:w-80 bg-white rounded-lg shadow-xl border p-4 z-40">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-800">Edit Booth</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-black">
          ✕
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
            Label
          </label>
          <input
            className="w-full border rounded p-2 text-sm"
            value={label}
            onChange={(e) => {
              const next = e.target.value;
              setLabel(next);
              scheduleAutoSave(next, vendorId);
            }}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
            Assigned Vendor
          </label>
          <select
            className="w-full border rounded p-2 text-sm"
            value={vendorId}
            onChange={(e) => {
              const next = e.target.value;
              setVendorId(next);
              scheduleAutoSave(label, next);
            }}
          >
            <option value="">(Unassigned)</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1">
            A vendor can only be assigned to one booth.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
          <div>X: {Math.round(booth.posX)}</div>
          <div>Y: {Math.round(booth.posY)}</div>
          <div>W: {Math.round(booth.width)}</div>
          <div>H: {Math.round(booth.height)}</div>
        </div>

        <div className="pt-2 border-t flex justify-between items-center gap-2">
          <button
            onClick={handleDelete}
            disabled={saving}
            className="text-red-600 text-sm font-medium hover:text-red-800 disabled:opacity-50"
          >
            Delete Booth
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white text-sm px-3 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>

            <button
              onClick={onClose}
              className="text-blue-600 text-sm font-medium hover:text-blue-800 md:hidden"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
