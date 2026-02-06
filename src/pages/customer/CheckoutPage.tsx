import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../state/CartContext";
import { useApi } from "../../api/client";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { call } = useApi();
  const { items, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [queueMin, setQueueMin] = useState<number>(0);
  const [orderPrepMin, setOrderPrepMin] = useState<number>(0);

  const totalAmount = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  if (items.length === 0) {
    return (
        <div className="h-screen flex flex-col items-center justify-center p-4">
            <p className="text-gray-500 mb-4">Your cart is empty.</p>
            <button 
                onClick={() => navigate("/cart")} 
                className="bg-orange-500 text-white px-6 py-2 rounded font-medium"
            >
                Go to Cart
            </button>
        </div>
    );
  }

  const vendorName = items[0].vendorName;
  const boothId = items[0].boothId;
  const eventId = items[0].eventId;

  // Fetch queue and compute item prep on load
  React.useEffect(() => {
    const fetchQueue = async () => {
      try {
        const resp = await call<{ boothId:string; activeOrdersCount:number; queueMin:number; updatedAt:string }>(`/customer/booth/${boothId}/wait-time`);
        setQueueMin(resp.queueMin || 0);
      } catch {}
    };
    const fetchMenuAndCompute = async () => {
      try {
        const data = await call<{ vendor: any; menuItems: Array<{id:string; basePrepMin:number; extraPrepMin:number}> }>(`/customer/booth/${boothId}/menu`);
        const map = new Map<string, { base:number; extra:number }>();
        data.menuItems.forEach(mi => map.set(mi.id, { base: mi.basePrepMin, extra: mi.extraPrepMin }));
        const total = items.reduce((sum, item) => {
          const cfg = map.get(item.menuItemId);
          if (!cfg) return sum;
          const qty = item.quantity;
          const itemPrep = cfg.base + Math.max(0, qty - 1) * cfg.extra;
          return sum + itemPrep;
        }, 0);
        setOrderPrepMin(total);
      } catch {}
    };
    fetchQueue();
    fetchMenuAndCompute();
  }, []);

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError("");

    try {
      const orderData = {
        eventId,
        boothId,
        items: items.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity
        }))
      };

      const res = await call<any>("/customer/orders", {
        method: "POST",
        body: JSON.stringify(orderData)
      });
      
      // Success
      clearCart();
      
      alert("Order placed successfully! Order ID: " + res.id);
      // Ideally navigate to Order Status page. For now, back to map.
      navigate(`/event/${eventId}`);
      
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow px-4 py-3 sticky top-0 z-10 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-gray-600">← Back</button>
        <h1 className="font-bold text-lg">Checkout</h1>
      </header>

      <div className="flex-1 p-4 overflow-y-auto pb-32">
        {/* Estimation breakdown */}
        <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg p-3 mb-4 text-sm">
          <div>Queue ahead: ~{Math.round(queueMin)} min</div>
          <div>Your items: ~{Math.round(orderPrepMin)} min</div>
          <div className="font-medium">Total: ~{Math.round(queueMin + orderPrepMin)} min</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h2 className="font-bold text-gray-800 border-b pb-2 mb-3">Order Summary</h2>
          <p className="text-sm text-gray-500 mb-2">Vendor: <span className="font-medium text-gray-800">{vendorName}</span></p>
          
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.menuItemId} className="flex justify-between text-sm">
                <div className="flex gap-2">
                  <span className="font-medium text-gray-600">{item.quantity}x</span>
                  <span>{item.name}</span>
                </div>
                <div className="font-medium">
                  ${((item.price * item.quantity) / 100).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t mt-4 pt-2 flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>${(totalAmount / 100).toFixed(2)}</span>
          </div>
        </div>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
      </div>

      <div className="bg-white border-t p-4 fixed bottom-0 left-0 right-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <button 
          onClick={handlePlaceOrder}
          disabled={loading}
          className={`w-full bg-orange-600 text-white py-3 rounded-lg font-bold text-lg transition-colors ${loading ? "opacity-70 cursor-not-allowed" : "hover:bg-orange-700"}`}
        >
          {loading ? "Placing Order..." : "Place Order"}
        </button>
      </div>
    </div>
  );
}
