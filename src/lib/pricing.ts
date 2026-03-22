export interface Product {
  id: string;
  name: string;
  category: string;
  base_price: number;
  stock_price: number | null;
  stock_min_qty: number | null;
  min_order_qty: number;
  leather_options: string[] | null;
  leather_price_overrides: Record<string, number> | null;
  japanese_kip_upcharge: number;
  flag_upcharge: number;
  position_options: string[] | null;
  has_hand_option: boolean;
  show_recipe_url: boolean;
  description: string;
  lead_time: string;
  is_active: boolean;
}

export interface CartItemConfig {
  leather_type: string;
  hand: string | null;
  position: string | null;
  has_flag: boolean;
  quantity: number;
  builder_recipe_url: string;
  notes: string;
}

export interface CartItem {
  id: string; // unique cart item ID
  product: Product;
  config: CartItemConfig;
  unitPrice: number;
  lineTotal: number;
  stockUnlocked: boolean;
}

export interface PriceResult {
  unitPrice: number;
  lineTotal: number;
  stockUnlocked: boolean;
}

/**
 * Count how many units of the "same model" are in the cart.
 * Same model = same product_id + same leather_type.
 * Mix of RHT/LHT both count.
 */
export function countSameModel(
  productId: string,
  leatherType: string,
  cartItems: CartItem[]
): number {
  return cartItems
    .filter(
      (item) =>
        item.product.id === productId &&
        item.config.leather_type === leatherType
    )
    .reduce((sum, item) => sum + item.config.quantity, 0);
}

/**
 * Calculate the price for a single cart item.
 */
export function calculateItemPrice(
  product: Product,
  config: CartItemConfig,
  sameModelQty: number
): PriceResult {
  // Step 1: Determine base price
  let basePrice = product.base_price;

  // Check leather_price_overrides first (for trainers with tier pricing)
  if (product.leather_price_overrides && config.leather_type) {
    const override = product.leather_price_overrides[config.leather_type];
    if (override !== undefined) {
      basePrice = override;
    }
  }

  // Check stock pricing
  let stockUnlocked = false;
  if (
    product.stock_price !== null &&
    product.stock_min_qty !== null &&
    sameModelQty >= product.stock_min_qty
  ) {
    basePrice = product.stock_price;
    stockUnlocked = true;
  }

  // Step 2: Add upcharges
  let unitPrice = basePrice;

  if (config.leather_type === "Japanese Kip" && product.japanese_kip_upcharge) {
    unitPrice += product.japanese_kip_upcharge;
  }

  if (config.has_flag && product.flag_upcharge) {
    unitPrice += product.flag_upcharge;
  }

  return {
    unitPrice,
    lineTotal: unitPrice * config.quantity,
    stockUnlocked,
  };
}

/**
 * Get stock pricing nudge info for a product + leather combo.
 * Returns null if stock pricing doesn't apply.
 */
export function getStockNudge(
  product: Product,
  leatherType: string,
  sameModelQty: number
): { needed: number; stockPrice: number } | null {
  if (product.stock_price === null || product.stock_min_qty === null) return null;
  if (sameModelQty >= product.stock_min_qty) return null; // already unlocked

  return {
    needed: product.stock_min_qty - sameModelQty,
    stockPrice: product.stock_price,
  };
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}
