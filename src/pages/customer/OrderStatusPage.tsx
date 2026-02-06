import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useApi } from "../../api/client";
 
type OrderDetail = {
  id: string;
  status: "PENDING" | "PREPARING" | "READY" | "COMPLETED";
  estimatedReadyAt?: string | null;
  estimatedPrepMin?: number;
  booth?: { label?: string | null };
};
 
export default function OrderStatusPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { call } = useApi();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [banner, setBanner] = useState<string>("");
  const lastStatus = useRef<string>("");
 
  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    const fetchOnce = async () => {
      try {
        const data = await call<OrderDetail>(`/customer/orders/${orderId}`);
        if (cancelled) return;
        setOrder(data);
        if (lastStatus.current && lastStatus.current !== data.status) {
          if (data.status === "READY") {
            const code = orderId.slice(-6);
            setBanner(`✅ Your order is READY at Booth ${data.booth?.label ?? ""}. Code: ${code}`);
          } else if (data.status === "COMPLETED") {
            setBanner("✅ Order completed. Thanks!");
          }
        }
        lastStatus.current = data.status;
      } catch (e) {
        // ignore
      }
    };
    fetchOnce();
    const id = setInterval(fetchOnce, 7000);
    return () => { cancelled = true; clearInterval(id); };
  }, [orderId, call]);
 
  if (!order) return <div className="p-6">Loading...</div>;
 
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow px-4 py-3 flex justify-between items-center">
        <button onClick={() => navigate(-1)} className="text-gray-600">← Back</button>
        <h1 className="font-bold">Order #{order.id.slice(-4)}</h1>
        <button onClick={() => navigate("/event/" + (new URLSearchParams(window.location.search).get("eventId") || ""))} className="text-orange-600">Map</button>
      </header>
      {banner && (
        <div className="bg-green-50 border-y border-green-200 text-green-800 px-4 py-2 text-sm">
          {banner}
        </div>
      )}
      <div className="p-4">
        <div className="bg-white rounded border p-4">
          <div className="mb-2">Status: <span className="font-medium">{order.status}</span></div>
          {order.estimatedReadyAt && (
            <div className="text-sm text-gray-600">Target ready by {new Date(order.estimatedReadyAt).toLocaleTimeString()}</div>
          )}
        </div>
      </div>
    </div>
  );
}
