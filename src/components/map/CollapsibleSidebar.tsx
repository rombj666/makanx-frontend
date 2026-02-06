import React, { useState } from "react";

interface CollapsibleSidebarProps {
  vendors: any[];
  activeVendorId: string | null;
  onVendorSelect: (vendorId: string) => void;
}

const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({
  vendors,
  activeVendorId,
  onVendorSelect
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // Assuming categories are derived or static for now
  const categories = ["All", "Food", "Beverage", "Dessert", "Halal"];

  const filteredVendors = vendors.filter((v) => {
    const matchesSearch = v.name.toLowerCase().includes(search.toLowerCase());
    // No category in Vendor model yet, so skipping category filter logic for now or assuming 'All'
    return matchesSearch;
  });

return (
  <div className="h-full relative z-20">
    {/* Mobile toggle button (always visible) */}
    <button
      onClick={() => setIsOpen(!isOpen)}
      className="md:hidden fixed left-3 top-20 bg-white border rounded-full p-2 shadow hover:bg-gray-50 z-50"
      aria-label="Toggle sidebar"
    >
      {isOpen ? "◀" : "▶"}
    </button>

    {/* Desktop sidebar (same as before) */}
    <div
      className={`hidden md:flex h-full bg-white shadow-lg transition-all duration-300 flex-col relative
        ${isOpen ? "w-80" : "w-12"}
      `}
    >
      {/* Desktop Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="absolute -right-3 top-4 bg-white border rounded-full p-1 shadow hover:bg-gray-50 z-30"
      >
        {isOpen ? "◀" : "▶"}
      </button>

      <div className={`flex-1 overflow-hidden flex flex-col ${!isOpen && "invisible"}`}>
        {/* your existing content unchanged */}
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg mb-2">Vendors</h2>
          <input
            type="text"
            placeholder="Search..."
            className="w-full border rounded px-2 py-1 mb-2"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                  selectedCategory === c
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredVendors.map((vendor) => (
            <div
              key={vendor.id}
              onClick={() => onVendorSelect(vendor.id)}
              className={`p-3 rounded cursor-pointer border hover:shadow-md transition-colors
                ${
                  activeVendorId === vendor.id
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 bg-white"
                }
              `}
            >
              <h3 className="font-bold text-sm">{vendor.name}</h3>
              <p className="text-xs text-gray-500 truncate">
                {vendor.description || "No description"}
              </p>
            </div>
          ))}
          {filteredVendors.length === 0 && (
            <div className="text-center text-gray-400 text-sm mt-4">No vendors found</div>
          )}
        </div>
      </div>
    </div>

    {/* Mobile overlay drawer */}
    {isOpen && (
      <div className="md:hidden fixed inset-0 z-40">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/30"
          onClick={() => setIsOpen(false)}
        />

        {/* Drawer */}
        <div className="absolute left-0 top-0 bottom-0 w-[85vw] max-w-[340px] bg-white shadow-xl flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="font-bold text-lg">Vendors</div>
            <button
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 border rounded"
            >
              Close
            </button>
          </div>

          <div className="p-4 border-b">
            <input
              type="text"
              placeholder="Search..."
              className="w-full border rounded px-3 py-2 mb-3"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="flex gap-2 overflow-x-auto pb-2">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                    selectedCategory === c
                      ? "bg-orange-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredVendors.map((vendor) => (
              <div
                key={vendor.id}
                onClick={() => {
                  onVendorSelect(vendor.id);
                  setIsOpen(false); // close drawer after selecting
                }}
                className={`p-3 rounded cursor-pointer border
                  ${
                    activeVendorId === vendor.id
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 bg-white"
                  }
                `}
              >
                <div className="font-bold text-sm">{vendor.name}</div>
                <div className="text-xs text-gray-500 truncate">
                  {vendor.description || "No description"}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>
);
}
export default CollapsibleSidebar;
