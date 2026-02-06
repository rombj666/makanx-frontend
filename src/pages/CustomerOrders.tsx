import React, { useEffect, useState } from 'react';
import { useAuth } from '../state/AuthContext';
import { apiClient } from '../api/client';
import { Link } from 'react-router-dom';

const CustomerOrders = () => {
    const { logout } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);

    useEffect(() => {
        loadOrders();
        const interval = setInterval(loadOrders, 5000);
        return () => clearInterval(interval);
    }, []);

    const loadOrders = async () => {
        try {
            const res = await apiClient.get<any[]>('/orders/my-orders');
            setOrders(res);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
             <nav className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold text-orange-600">MakanX</h1>
                            <a href="/" className="ml-6 text-gray-500 hover:text-gray-900">Map</a>
                            <a href="/orders" className="ml-4 text-gray-900 font-bold">My Orders</a>
                        </div>
                        <div className="flex items-center">
                            <button onClick={logout} className="text-sm text-red-600 hover:text-red-800">Logout</button>
                        </div>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <h2 className="text-2xl font-bold mb-6">My Orders</h2>
                <div className="space-y-4">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-white p-6 rounded shadow">
                            <div className="flex justify-between">
                                <div>
                                    <h3 className="font-bold">Order #{order.id}</h3>
                                    <p className="text-sm text-gray-500">Vendor: {order.vendor?.name}</p>
                                    <ul className="mt-2 text-sm">
                                        {order.items.map((item: any) => (
                                            <li key={item.id}>{item.quantity}x {item.menuItem.name}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                        order.status === 'READY' ? 'bg-green-100 text-green-800' :
                                        order.status === 'COMPLETED' ? 'bg-gray-100 text-gray-800' :
                                        'bg-yellow-100 text-yellow-800'
                                    }`}>
                                        {order.status}
                                    </span>
                                    {['PENDING', 'PREPARING', 'READY'].includes(order.status) && (
                                        <div className="mt-2 text-right">
                                            <Link 
                                                to={`/orders/${order.id}`}
                                                className="inline-block text-sm bg-orange-100 text-orange-700 px-3 py-1 rounded hover:bg-orange-200"
                                            >
                                                Track Status
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default CustomerOrders;
