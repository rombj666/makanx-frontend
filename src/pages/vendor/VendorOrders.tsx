import React, { useEffect, useState } from "react";
import { useAuth } from "../../state/AuthContext";
import { apiClient } from "../../api/client";

interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  menuItem: {
    name: string;
  };
}

interface Order {
  id: string;
  createdAt: string;
  status: "PENDING" | "PREPARING" | "READY" | "COMPLETED";
  estimatedPrepMin?: number;
  estimatedReadyAt?: string | null;
  totalAmount: number;
  items: OrderItem[];
  customer: {
    name: string;
  };
}

const VendorOrders: React.FC = () => {
  const { token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      const data = await apiClient.get<Order[]>("/vendor/orders", token);
      setOrders(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000); // Poll every 5s
    return () => clearInterval(interval);
  }, [token]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await apiClient.patch(
        `/vendor/orders/${orderId}/status`,
        { status },
        token
      );
      // Optimistic update or refetch
      fetchOrders();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === "ALL") return true;
    return o.status === filter;
  });

  const activeOrders = orders.filter(o => o.status === "PENDING" || o.status === "PREPARING");
  const workloadCount = activeOrders.length;
  const queueMinutes = activeOrders.reduce((sum, o) => sum + (o.estimatedPrepMin || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 text-yellow-800";
      case "PREPARING": return "bg-blue-100 text-blue-800";
      case "READY": return "bg-green-100 text-green-800";
      case "COMPLETED": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold">Orders</h2>
        <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded px-3 py-2 text-sm">
          Workload: {workloadCount} active · Estimated queue: ~{Math.round(queueMinutes)} min
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {["ALL", "PENDING", "PREPARING", "READY", "COMPLETED"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading && orders.length === 0 ? (
        <div className="text-center py-8">Loading orders...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">No orders found.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOrders.map((order) => (
            <div key={order.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow p-4 flex flex-col">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(order.createdAt).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg">${(order.totalAmount / 100).toFixed(2)}</div>
                  <div className="text-xs text-gray-500">#{order.id.slice(-4)}</div>
                </div>
              </div>

              <div className="flex-1 mb-4">
                {order.customer?.name && (
                  <div className="text-sm text-gray-600 mb-2">
                    Customer: <span className="font-medium">{order.customer.name}</span>
                  </div>
                )}
                <ul className="space-y-1">
                  {order.items.map((item) => (
                    <li key={item.id} className="text-sm flex justify-between">
                      <span>
                        <span className="font-medium">{item.quantity}x</span> {item.menuItem.name}
                      </span>
                      {/* <span className="text-gray-500">${(item.unitPrice / 100).toFixed(2)}</span> */}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t mt-auto">
                {order.status === "PENDING" && (
                  <button
                    onClick={() => updateStatus(order.id, "PREPARING")}
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition-colors"
                  >
                    Accept (Start Preparing)
                  </button>
                )}
                {order.status === "PREPARING" && (
                  <button
                    onClick={() => updateStatus(order.id, "READY")}
                    className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 transition-colors"
                  >
                    Mark Ready
                  </button>
                )}
                {order.status === "READY" && (
                  <button
                    onClick={() => updateStatus(order.id, "COMPLETED")}
                    className="w-full bg-gray-800 text-white py-2 rounded hover:bg-gray-900 transition-colors"
                  >
                    Complete Order
                  </button>
                )}
                {order.status === "COMPLETED" && (
                  <div className="text-center text-sm text-gray-500 font-medium py-2">
                    Order Completed
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VendorOrders;
