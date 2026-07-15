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

// Mock products hard-coded to avoid WooCommerce API issues
const MOCK_PRODUCTS: WooProduct[] = [
  {
    id: 2941,
    name: "CUSTOMFB",
    sku: "CUSTOMFB",
    price: "145",
    description: "Custom Glove - Full Back",
    images: [],
  },
  {
    id: 2940,
    name: "CUSTOMC",
    sku: "CUSTOMC",
    price: "145",
    description: "Custom Glove - Classic",
    images: [],
  },
  {
    id: 2939,
    name: "CUSTOMF",
    sku: "CUSTOMF",
    price: "145",
    description: "Custom Glove - Franchise",
    images: [],
  },
  {
    id: 2452,
    name: "Glove Configurator",
    sku: "GLOVECONFIG",
    price: "145",
    description: "Advanced Glove Customization",
    images: [],
  },
];

export async function fetchWooProducts(): Promise<WooProduct[]> {
  // Return mock products (WooCommerce API has rate limiting issues)
  return MOCK_PRODUCTS;
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}
