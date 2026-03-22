import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  CartItem,
  CartItemConfig,
  Product,
  calculateItemPrice,
  countSameModel,
} from "@/lib/pricing";

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, config: CartItemConfig) => void;
  removeItem: (itemId: string) => void;
  updateItemQty: (itemId: string, qty: number) => void;
  clearCart: () => void;
  cartTotal: number;
  totalSavings: number;
  recalculate: () => void;
}

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = "mgb-cart";

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  /** Recalculate all prices (call after any cart mutation) */
  const recalculateItems = useCallback((currentItems: CartItem[]): CartItem[] => {
    return currentItems.map((item) => {
      const sameModelQty = countSameModel(
        item.product.id,
        item.config.leather_type,
        currentItems
      );
      const price = calculateItemPrice(item.product, item.config, sameModelQty);
      return { ...item, ...price };
    });
  }, []);

  const addItem = useCallback(
    (product: Product, config: CartItemConfig) => {
      setItems((prev) => {
        const newItem: CartItem = {
          id: generateId(),
          product,
          config,
          unitPrice: 0,
          lineTotal: 0,
          stockUnlocked: false,
        };
        const updated = [...prev, newItem];
        return recalculateItems(updated);
      });
    },
    [recalculateItems]
  );

  const removeItem = useCallback(
    (itemId: string) => {
      setItems((prev) => recalculateItems(prev.filter((i) => i.id !== itemId)));
    },
    [recalculateItems]
  );

  const updateItemQty = useCallback(
    (itemId: string, qty: number) => {
      setItems((prev) =>
        recalculateItems(
          prev.map((i) =>
            i.id === itemId ? { ...i, config: { ...i.config, quantity: qty } } : i
          )
        )
      );
    },
    [recalculateItems]
  );

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const recalculate = useCallback(() => {
    setItems((prev) => recalculateItems(prev));
  }, [recalculateItems]);

  const cartTotal = items.reduce((sum, i) => sum + i.lineTotal, 0);

  // Calculate savings vs base price
  const totalSavings = items.reduce((sum, item) => {
    if (item.stockUnlocked && item.product.stock_price !== null) {
      const baseDiff = item.product.base_price - item.product.stock_price;
      return sum + baseDiff * item.config.quantity;
    }
    return sum;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateItemQty,
        clearCart,
        cartTotal,
        totalSavings,
        recalculate,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
