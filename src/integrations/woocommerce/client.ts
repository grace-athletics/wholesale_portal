import { createClient } from "@supabase/supabase-js";

const WOOCOMMERCE_URL = "http://myglovebrand.com";
const CONSUMER_KEY = "ck_2e6336c61c95daa21b45f328a11b41f1a83730a1";
const CONSUMER_SECRET = "cs_80780a3c18bf3e0e0a3138757c315e36d65c827c";

export interface WooProduct {
  id: number;
  name: string;
  sku: string;
  price: string;
  description: string;
  images: Array<{ src: string }>;
}

export interface CartItem {
  productId: number;
  productName: string;
  sku: string;
  quantity: number;
  material: "steerhide" | "korea_kip" | "japan_kip";
  hasFlag: boolean;
  recipeId?: string;
  price: number;
  tier: 1 | 2;
}

// Pricing configuration
const PRICING = {
  steerhide: { tier1: 145, tier2: 115 },
  korea_kip: { tier1: 165, tier2: 145 },
  japan_kip: { tier1: 200, tier2: 180 },
  flag: 5,
};

export function calculatePrice(
  material: "steerhide" | "korea_kip" | "japan_kip",
  hasFlag: boolean,
  quantity: number
): { price: number; tier: 1 | 2 } {
  const tier = quantity >= 5 ? (2 as const) : (1 as const);
  const basePricing = PRICING[material];
  const basePrice = tier === 1 ? basePricing.tier1 : basePricing.tier2;
  const flagPrice = hasFlag ? PRICING.flag : 0;
  const totalPrice = basePrice + flagPrice;

  return { price: totalPrice, tier };
}

export async function fetchWooProducts(): Promise<WooProduct[]> {
  try {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    const response = await fetch(`${apiUrl}/api/woo/products`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const products = await response.json();
    return Array.isArray(products) ? products : [];
  } catch (error) {
    console.error("Failed to fetch WooCommerce products:", error);
    return [];
  }
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}
