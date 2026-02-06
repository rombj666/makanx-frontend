import React from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../state/CartContext";

export default function CartPage() {
  const navigate = useNavigate();
  const { items, updateQuantity, removeFromCart } = useCart();

  const totalAmount = items.reduce((acc, item) => acc + item.price * item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-4">
        <div className="text-4xl mb-4">🛒</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-6 text-center">Looks like you haven't added any items yet.</p>
        <button 
          onClick={() => navigate(-1)}
          className="bg-orange-500 text-white px-6 py-2 rounded font-medium"
        >
          Go Back
        </button>
      </div>
    );
  }

  // Group by vendor (should be single vendor, but good to show)
  const vendorName = items[0].vendorName;

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      <header className="bg-white shadow px-4 py-3 sticky top-0 z-10 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="text-gray-600">← Back</button>
        <h1 className="font-bold text-lg">My Cart</h1>
      </header>

      <div className="flex-1 p-4 overflow-y-auto pb-32">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
          <h2 className="font-bold text-gray-800 border-b pb-2 mb-3">Order from {vendorName}</h2>
          
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.menuItemId} className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-800">{item.name}</h3>
                  <div className="text-orange-600 text-sm font-medium">
                    ${(item.price / 100).toFixed(2)}
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center border rounded bg-gray-50">
                    <button 
                      onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                      className="px-2 py-1 text-gray-600 hover:bg-gray-200"
                    >
                      -
                    </button>
                    <span className="px-2 min-w-[1.5rem] text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button 
                      onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                      className="px-2 py-1 text-gray-600 hover:bg-gray-200"
                    >
                      +
                    </button>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.menuItemId)}
                    className="text-xs text-red-500 hover:text-red-700 underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white border-t p-4 fixed bottom-0 left-0 right-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-600">Total</span>
          <span className="text-xl font-bold text-gray-900">${(totalAmount / 100).toFixed(2)}</span>
        </div>
        <button 
          onClick={() => navigate("/checkout")}
          className="w-full bg-orange-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-orange-700 transition-colors"
        >
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
}
