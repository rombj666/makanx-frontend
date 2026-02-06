import React, { createContext, useContext, useEffect, useState } from "react";

export type CartItem = {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  vendorId: string;
  vendorName: string;
  boothId: string;
  eventId: string;
};

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, delta: number) => void;
  clearCart: () => void;
  itemCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem("makanx_cart");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("makanx_cart", JSON.stringify(items));
  }, [items]);

  const addToCart = (newItem: CartItem) => {
    setItems((prev) => {
      // Logic: Only allow items from same event? For MVP, maybe yes.
      // Or separate carts per vendor?
      // User requirement: "persist cart in localStorage (eventId + boothId scoped)"
      // So if I add item from different booth, should I warn or clear?
      // MVP: If different booth/event, warn or replace. Let's just append for now, 
      // but Checkout might need to handle single order restriction.
      // Actually, standard food delivery apps allow 1 order from 1 vendor at a time usually.
      // Let's enforce: Cart can only hold items from ONE booth.
      
      const existingBoothId = prev.length > 0 ? prev[0].boothId : null;
      if (existingBoothId && existingBoothId !== newItem.boothId) {
        if (!window.confirm("Start a new basket? Adding items from a different booth will clear your current cart.")) {
          return prev;
        }
        return [newItem];
      }

      const existingItem = prev.find((i) => i.menuItemId === newItem.menuItemId);
      if (existingItem) {
        return prev.map((i) =>
          i.menuItemId === newItem.menuItemId
            ? { ...i, quantity: i.quantity + newItem.quantity }
            : i
        );
      }
      return [...prev, newItem];
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setItems((prev) => prev.filter((i) => i.menuItemId !== menuItemId));
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setItems((prev) =>
      prev.map((i) => {
        if (i.menuItemId === menuItemId) {
          const newQty = Math.max(1, i.quantity + delta);
          return { ...i, quantity: newQty };
        }
        return i;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        itemCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
