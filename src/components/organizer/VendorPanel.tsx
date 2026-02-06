import React, { useMemo, useState } from "react";

interface Vendor {
  id: string;
  name: string;
  category?: string;
  priceMin: number;
  priceMax: number;
  description?: string | null;
  avgPrepTime: number;
}

interface VendorPanelProps {
  vendors: Vendor[];

  onAddVendor: (data: {
    name: string;
    category: string;
    priceMin: number;
    priceMax: number;
    description?: string | null;
    avgPrepTime: number;
  }) => void;

  onEditVendor: (id: string, data: {
    name: string;
    category: string;
    priceMin: number;
    priceMax: number;
    description?: string | null;
    avgPrepTime: number;
  }) => void;

  onDeleteVendor: (id: string) => void;
}

const CATEGORY_OPTIONS = [
  "Food",
  "Beverage",
  "Entertainment",
  "Souvenirs",
  "Accessories",
  "Others",
] as const;

const DEFAULT_CATEGORY = "Food";

export default function VendorPanel({
  vendors,
  onAddVendor,
  onEditVendor,
  onDeleteVendor,
}: VendorPanelProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    category: DEFAULT_CATEGORY,
    priceMin: 0,
    priceMax: 0,
    description: "",
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    vendors.forEach(v => set.add((v.category || "Uncategorized").trim() || "Uncategorized"));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [vendors]);

  const filteredVendors = useMemo(() => {
    const s = search.trim().toLowerCase();
    return vendors.filter(v => {
      const matchesSearch = !s || v.name.toLowerCase().includes(s);
      const cat = (v.category || "Uncategorized").trim() || "Uncategorized";
      const matchesCategory = categoryFilter === "ALL" || cat === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [vendors, search, categoryFilter]);

  const resetForm = () => {
    setFormData({
      name: "",
      category: DEFAULT_CATEGORY,
      priceMin: 0,
      priceMax: 0,
      description: "",
    });
  };

  const startAdd = () => {
    resetForm();
    setEditingId(null);
    setIsAdding(true);
  };

  const startEdit = (v: Vendor) => {
    setFormData({
      name: v.name,
      category: v.category ?? DEFAULT_CATEGORY,
      priceMin: v.priceMin ?? 0,
      priceMax: v.priceMax ?? 0,
      description: v.description ?? "",
    });
    setEditingId(v.id);
    setIsAdding(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const name = formData.name.trim();
    const category = formData.category;
    const priceMin = Number.isFinite(formData.priceMin) ? Number(formData.priceMin) : 0;
    const priceMax = Number.isFinite(formData.priceMax) ? Number(formData.priceMax) : 0;
    // Default avgPrepTime since we removed it from the form
    const avgPrepTime = 5;

    if (!name) return;

    if (priceMin > priceMax) {
      alert("Price Min cannot be greater than Price Max.");
      return;
    }

    const payload = {
      name,
      category,
      priceMin,
      priceMax,
      description: formData.description.trim() ? formData.description.trim() : null,
      avgPrepTime,
    };

    if (editingId) {
      onEditVendor(editingId, payload);
      setEditingId(null);
    } else {
      onAddVendor(payload);
      setIsAdding(false);
    }

    resetForm();
  };

  return (
    <div className="flex flex-col h-full bg-white border-r relative">
      <div className="p-4 border-b">
        <h2 className="font-bold text-lg mb-2">Vendors</h2>

        <input
          type="text"
          placeholder="Search vendors..."
          className="w-full border rounded p-2 text-sm"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {/* Category Filter */}
        <div className="mt-2 flex gap-2 items-center">
          <select
            className="flex-1 border rounded p-2 text-sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">All categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <button
            onClick={() => setCategoryFilter("ALL")}
            className="px-3 py-2 border rounded text-sm text-gray-600 hover:bg-gray-100"
            title="Reset filter"
          >
            Reset
          </button>
        </div>

        <button
          onClick={startAdd}
          className="mt-2 w-full bg-green-600 text-white py-1 px-3 rounded text-sm hover:bg-green-700"
        >
          + Add Vendor
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredVendors.map(v => (
          <div key={v.id} className="border rounded p-3 bg-gray-50 flex justify-between items-center group">
            <div className="min-w-0">
              <div className="font-semibold truncate">{v.name}</div>

              <div className="text-xs text-gray-500 mt-0.5">
                {(v.category || "Uncategorized").trim() || "Uncategorized"}
                {" • "}
                RM {v.priceMin ?? 0}–{v.priceMax ?? 0}
              </div>

              <div className="text-xs text-gray-500">{v.avgPrepTime} min / order</div>
            </div>

            <div className="opacity-0 group-hover:opacity-100 flex gap-2 transition-opacity">
              <button onClick={() => startEdit(v)} className="text-blue-600 text-sm">Edit</button>
              <button
                onClick={() => setConfirmDeleteId(v.id)}
                className="text-red-600 text-sm"
              >
                Del
              </button>
            </div>
          </div>
        ))}

        {filteredVendors.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-4">No vendors found</div>
        )}
      </div>

      {/* Modal / Overlay for Add/Edit */}
      {(isAdding || editingId) && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded p-4 w-full max-w-sm shadow-xl max-h-[85vh] flex flex-col">
            <h3 className="font-bold mb-4">{editingId ? "Edit Vendor" : "Add Vendor"}</h3>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1">
              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  className="w-full border rounded p-2"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  className="w-full border rounded p-2"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Price Min (RM)</label>
                  <input
                    type="number"
                    className="w-full border rounded p-2"
                    value={formData.priceMin}
                    onChange={e => setFormData({ ...formData, priceMin: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Price Max (RM)</label>
                  <input
                    type="number"
                    className="w-full border rounded p-2"
                    value={formData.priceMax}
                    onChange={e => setFormData({ ...formData, priceMax: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <textarea
                  className="w-full border rounded p-2"
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* avgPrepTime input removed */}

              <div className="flex justify-end gap-2 pt-4 border-t mt-4 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingId(null); }}
                  className="px-3 py-1 border rounded text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteId && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded p-4 w-full max-w-sm shadow-xl">
            <h3 className="font-bold mb-2">Delete vendor?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will remove the vendor. If it is assigned to a booth, backend may unassign it first.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-1 border rounded text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteVendor(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}