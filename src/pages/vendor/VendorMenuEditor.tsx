import React, { useEffect, useState } from "react";
import { useAuth } from "../../state/AuthContext";
import { toAbsUrl } from "../../utils/url";
import { apiClient, API_BASE } from "../../api/client";

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  isAvailable: boolean;
  imageUrl?: string;
  category?: string;
  basePrepMin: number;
  extraPrepMin: number;
}

const CATEGORY_OPTIONS = [
  "Food",
  "Beverage",
  "Entertainment",
  "Souvenirs",
  "Accessories",
  "Others",
] as const;

const VendorMenuEditor: React.FC = () => {
  const { token } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    isAvailable: true,
    imageUrl: "",
    category: "Food",
    basePrepMin: 5,
    extraPrepMin: 1,
  });

  // Upload state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("File too large (max 3MB)");
      return;
    }

    const uploadData = new FormData();
    uploadData.append("image", file);

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Use postForm for multipart upload
      const res = await apiClient.postForm<{ imageUrl: string }>(
        "/vendor/menu/upload-image",
        uploadData,
        token
      );
      setFormData((prev) => ({ ...prev, imageUrl: res.imageUrl }));
    } catch (err: any) {
      console.error(err);
      alert("Upload failed: " + (err.message || "Unknown error"));
    } finally {
      setIsUploading(false);
    }
  };

  const fetchMenu = async () => {
    try {
      const data = await apiClient.get<MenuItem[]>("/vendor/menu", token);
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, [token]);

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ 
      name: "", 
      description: "", 
      price: 0, 
      isAvailable: true,
      imageUrl: "",
      category: "Food",
      basePrepMin: 5,
      extraPrepMin: 1,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || "",
      price: item.price / 100, // Display as dollars/units
      isAvailable: item.isAvailable,
      imageUrl: item.imageUrl || "",
      category: item.category || "Food",
      basePrepMin: item.basePrepMin ?? 5,
      extraPrepMin: item.extraPrepMin ?? 1,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      price: Math.round(formData.price * 100), // Convert to cents
    };

    try {
      if (editingItem) {
        await apiClient.patch(`/vendor/menu/${editingItem.id}`, payload, token);
      } else {
        await apiClient.post("/vendor/menu", payload, token);
      }
      setIsModalOpen(false);
      fetchMenu();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      await apiClient.del(`/vendor/menu/${id}`, token);
      fetchMenu();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      await apiClient.patch(
        `/vendor/menu/${item.id}`,
        { isAvailable: !item.isAvailable },
        token
      );
      fetchMenu();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Edit Menu</h2>
        <button
          onClick={openAddModal}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          + Add Item
        </button>
      </div>

      {loading ? (
        <div>Loading menu...</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className={`border rounded-lg overflow-hidden bg-white shadow-sm ${!item.isAvailable ? "opacity-75" : ""}`}>
              {item.imageUrl && (
                <img 
                  src={toAbsUrl(item.imageUrl || "")} 
                  alt={item.name} 
                  className="w-full h-32 object-cover"
                />  
              )}
              <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-bold text-lg">{item.name}</h3>
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  ${(item.price / 100).toFixed(2)}
                </span>
              </div>
              
              <p className="text-gray-600 text-sm mb-4 h-10 overflow-hidden text-ellipsis">
                {item.description || "No description"}
              </p>

              <div className="flex items-center justify-between pt-3 border-t">
                <button
                  onClick={() => toggleAvailability(item)}
                  className={`text-sm px-2 py-1 rounded ${
                    item.isAvailable
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {item.isAvailable ? "Available" : "Unavailable"}
                </button>
                
                <div className="space-x-2">
                  <button
                    onClick={() => openEditModal(item)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-bold">
                {editingItem ? "Edit Item" : "Add New Item"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  required
                  className="w-full border rounded p-2"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Price ($)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  className="w-full border rounded p-2"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                />
              </div>

              <div>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Base Prep (min)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border rounded p-2"
                    value={formData.basePrepMin}
                    onChange={(e) => setFormData({ ...formData, basePrepMin: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">First item prep time</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Extra/Item (min)</label>
                  <input
                    type="number"
                    min="0"
                    className="w-full border rounded p-2"
                    value={formData.extraPrepMin}
                    onChange={(e) => setFormData({ ...formData, extraPrepMin: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-gray-500 mt-1">Additional time per qty</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Image</label>
                
                {formData.imageUrl && (
                  <div className="mb-2">
                    <img 
                      src={toAbsUrl(formData.imageUrl || "")} 
                      alt="Preview" 
                      className="h-32 w-full object-cover rounded border" 
                    />
                  </div>
                )}

                <div className="flex gap-2 mb-2">
                  <label className={`flex-1 flex items-center justify-center px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      <span>{isUploading ? "Uploading..." : "Upload from Device"}</span>
                      <input type="file" accept="image/*" hidden onChange={handleFileUpload} disabled={isUploading} />
                  </label>

                  <button type="button" disabled title="Coming Soon" className="flex-1 px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-400 bg-gray-100 cursor-not-allowed">
                      Choose from Google Drive
                  </button>
                </div>

                {isUploading && (
                   <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                     <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
                   </div>
                )}

                <input
                  type="text"
                  placeholder="Or paste image URL"
                  className="w-full border rounded p-2 text-sm"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  disabled={isUploading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  className="w-full border rounded p-2"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isAvailable"
                  className="mr-2"
                  checked={formData.isAvailable}
                  onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                />
                <label htmlFor="isAvailable" className="text-sm font-medium">
                  Available for ordering
                </label>
              </div>

              <div className="pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isUploading ? "Uploading..." : "Save Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorMenuEditor;
