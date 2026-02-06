import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';

const VendorMenu = () => {
  const { id } = useParams();
  const [vendor, setVendor] = useState<any>(null);
  const [menu, setMenu] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const vRes = await apiClient.get<any>(`/vendors/${id}`);
      setVendor(vRes);
      const mRes = await apiClient.get<any[]>(`/vendors/${id}/menu`);
      setMenu(mRes);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOrder = async (itemId: number) => {
      try {
          await apiClient.post('/orders', {
              vendorId: parseInt(id!),
              items: [{ menuItemId: itemId, quantity: 1 }]
          });
          alert('Order placed successfully!');
          navigate('/orders');
      } catch (err) {
          console.error(err);
          alert('Failed to place order');
      }
  }

  if (!vendor) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <button onClick={() => navigate('/')} className="mb-4 text-gray-600 hover:text-gray-900">&larr; Back</button>
      <h1 className="text-3xl font-bold mb-2">{vendor.name}</h1>
      <p className="text-gray-600 mb-8">{vendor.description}</p>

      <h2 className="text-xl font-bold mb-4">Menu</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {menu.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded shadow flex justify-between items-center">
            <div>
              <h3 className="font-bold">{item.name}</h3>
              <p className="text-sm text-gray-500">{item.description}</p>
              <p className="text-orange-600 font-bold mt-1">${item.price}</p>
            </div>
            <button 
                onClick={() => handleOrder(item.id)}
                className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            >
              Order
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VendorMenu;
