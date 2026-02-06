import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "../../api/client";
import { useCart } from "../../state/CartContext";
import { toAbsUrl } from "../../utils/url";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  description: string | null;
  imageUrl: string | null;
  category: string;
  basePrepMin: number;
  extraPrepMin: number;
};

type VendorData = {
  id: string;
  name: string;
  description: string | null;
  category: string;
};

type BoothMenuData = {
  eventId: string;
  vendor: VendorData;
  menuItems: MenuItem[];
};

export default function BoothMenuPage() {
  const { boothId } = useParams();
  const navigate = useNavigate();
  const { call } = useApi();
  const { addToCart, items: cartItems } = useCart();
  
  const [data, setData] = useState<BoothMenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [queueMin, setQueueMin] = useState<number>(0);

  useEffect(() => {
    if (!boothId) return;
    setLoading(true);
    call<BoothMenuData>(`/customer/booth/${boothId}/menu`)
      .then((data) => {
        setData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [boothId]);

  useEffect(() => {
    if (!boothId) return;
    let cancelled = false;
    const fetchWait = async () => {
      try {
        const resp = await call<{ boothId:string; activeOrdersCount:number; queueMin:number; updatedAt:string }>(`/customer/booth/${boothId}/wait-time`);
        if (!cancelled) setQueueMin(resp.queueMin || 0);
      } catch {}
    };
    fetchWait();
    const id = setInterval(fetchWait, 12000);
    return () => { cancelled = true; clearInterval(id); };
  }, [boothId, call]);

  const updateQuantity = (itemId: string, delta: number) => {
    setQuantities(prev => {
      const current = prev[itemId] || 1;
      const next = Math.max(1, current + delta);
      return { ...prev, [itemId]: next };
    });
  };

  const computeOrderPrepMin = () => {
    if (!data) return 0;
    return data.menuItems.reduce((sum, item) => {
      const qty = quantities[item.id] || 0;
      if (qty <= 0) return sum;
      const itemPrep = item.basePrepMin + Math.max(0, qty - 1) * item.extraPrepMin;
      return sum + itemPrep;
    }, 0);
  };

  const handleAdd = (item: MenuItem) => {
    const qty = quantities[item.id] || 1;
    if (!boothId || !data) return;

    addToCart({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      quantity: qty,
      vendorId: data.vendor.id,
      boothId: boothId,
      vendorName: data.vendor.name,
      eventId: data.eventId,
    });
    
    // Reset quantity to 1 after adding
    setQuantities(prev => ({ ...prev, [item.id]: 1 }));
    
    // Simple feedback (could be improved with toast)
    // alert(`Added ${qty} ${item.name}(s) to cart`);
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const orderPrepMin = computeOrderPrepMin();

  if (loading) return <div className="p-8 text-center">Loading menu...</div>;
  if (!data) return <div className="p-8 text-center">Menu not found</div>;

  return (
    <div className="pb-20 min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow z-10 px-4 py-3 flex justify-between items-center">
        <button onClick={() => navigate(-1)} className="text-gray-600 text-sm font-medium">← Back</button>
        <h1 className="font-bold text-lg truncate px-2">{data.vendor.name}</h1>
        <button onClick={() => navigate("/cart")} className="relative p-2">
          <span className="text-2xl">🛒</span>
          {cartCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </header>

      {/* Estimation Banner */}
      <div className="bg-orange-50 border-y border-orange-200 text-orange-800 px-4 py-2 text-sm">
        Estimated wait ~{Math.round(queueMin)} min
        {orderPrepMin > 0 && (
          <span className="ml-3 text-orange-700">Your items prep ~{Math.round(orderPrepMin)} min</span>
        )}
      </div>

      {/* Menu List */}
      <div className="p-4 space-y-6">
        {data.menuItems.map(item => (
          <div key={item.id} className="flex gap-4 border-b pb-4 last:border-0">
            {item.imageUrl ? (
              <img src={toAbsUrl(item.imageUrl || "")} alt={item.name} className="w-24 h-24 object-cover rounded bg-gray-200" />
            ) : (
               <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center text-gray-300 text-xs">No Image</div>
            )}
            <div className="flex-1 flex flex-col">
              <h3 className="font-bold text-gray-800">{item.name}</h3>
              <p className="text-sm text-gray-500 mb-1 flex-1">{item.description}</p>
              <div className="font-medium text-orange-600">${(item.price / 100).toFixed(2)}</div>
              
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center border rounded bg-gray-50">
                  <button 
                    onClick={() => updateQuantity(item.id, -1)}
                    className="px-3 py-1 text-gray-600 hover:bg-gray-200 rounded-l"
                  >
                    -
                  </button>
                  <span className="px-2 min-w-[1.5rem] text-center font-medium">{quantities[item.id] || 1}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, 1)}
                    className="px-3 py-1 text-gray-600 hover:bg-gray-200 rounded-r"
                  >
                    +
                  </button>
                </div>
                <button 
                  onClick={() => handleAdd(item)}
                  className="bg-orange-500 text-white px-4 py-1.5 rounded text-sm font-medium hover:bg-orange-600 shadow-sm"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
